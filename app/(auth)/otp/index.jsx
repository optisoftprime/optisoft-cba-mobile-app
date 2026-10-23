// screens/OTPVerification.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
  Keyboard,
} from 'react-native';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import Toast from 'react-native-toast-message';
import { save, load } from 'config/storage';
import { OTP_RESEND_COOLDOWN_SECONDS } from 'config/backendConfig';
import {
  validateOtp,
  validateResetPasswordOtp,
  publicRegenerateOtp,
  forgotPassword,
} from 'api/auth';
import { Illustration } from 'components/ui/illustration';

export default function OTPVerification() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  // 5-minute resend cooldown — the Resend button stays disabled until this
  // counts down to 0. Length lives in config/backendConfig.
  const [timer, setTimer] = useState(OTP_RESEND_COOLDOWN_SECONDS);
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log('OTP Screen Params:', JSON.stringify(params, null, 2));
    setUserId(params?.userId || '');
  }, []);

  useEffect(() => {
    save('appState', {
      stage: 'otp',
      params: {
        phoneNumber: params?.phoneNumber,
        accountNumber: params?.accountNumber,
        nextScreen: params?.nextScreen,
        // Preserve the username for the forgot-password path — without it a
        // crash-resumed OTP screen can't call validateResetPasswordOtp.
        userId: params?.userId,
      },
    });
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // The OTP boxes hold focus + the keyboard/SMS-autofill popup. Navigating away
  // mid-focus crashes Fabric (`addViewAt … child already has a parent`). Blur
  // first, then defer navigation two frames so the input detaches before the
  // screen unmounts. All navigation off this screen goes through here.
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navFn();
      });
    });
  }, []);

  const handleCancelConfirm = () => {
    Alert.alert(t('otp.cancelProcessTitle'), t('otp.cancelProcessMessage'), [
      { text: t('otp.noStay'), style: 'cancel' },
      {
        text: t('otp.yesCancel'),
        style: 'destructive',
        onPress: () => {
          save('appState', null);
          save('registrationState', null);
          save('resetPasswordState', null);
          settleThenNavigate(navigateBack);
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCancelConfirm();
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Resend the code — only allowed once the 2-minute cooldown (timer) hits 0.
  // Flow-aware: the registration path re-generates the OTP by account number
  // (new /public/re-generate-otp endpoint); the forgot-password path re-requests
  // the reset OTP by username.
  const handleResend = async () => {
    if (timer > 0 || isResending || isLoading) return;

    setIsResending(true);
    try {
      const isReset = !!params?.userId || params?.nextScreen === 'resetPassword';

      let response;
      if (isReset) {
        const resolvedUserId =
          userId || params?.userId || (await load('resetPasswordState'))?.userId;
        if (!resolvedUserId) {
          Toast.show({
            type: 'error',
            text1: t('otp.errorTitle'),
            text2: t('otp.sessionExpired'),
          });
          return;
        }
        response = await forgotPassword(null, { userId: resolvedUserId });
      } else {
        const accountNumber =
          params?.accountNumber || (await load('registrationState'))?.accountNumber;
        if (!accountNumber) {
          Toast.show({
            type: 'error',
            text1: t('otp.errorTitle'),
            text2: t('otp.sessionExpired'),
          });
          return;
        }
        response = await publicRegenerateOtp({ accountNumber });
      }

      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('otp.codeSentTitle'),
          text2: t('otp.codeSentMessage'),
        });
        setOtp(['', '', '', '', '', '']);
        setTimer(OTP_RESEND_COOLDOWN_SECONDS); // restart the cooldown
      } else {
        Toast.show({
          type: 'error',
          text1: t('otp.couldNotResendTitle'),
          text2: response?.message || t('otp.pleaseTryAgain'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('otp.somethingWrongTitle'),
        text2: t('otp.unableToResend'),
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (value, index) => {
    // SMS autofill / paste delivers the whole code into a single box. If more
    // than one digit arrives at once, spread it across the boxes and focus the
    // last filled one so the user doesn't have to type anything.
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length) {
        const filled = ['', '', '', '', '', ''];
        digits.forEach((d, i) => (filled[i] = d));
        setOtp(filled);
        inputRefs.current[Math.min(digits.length, 6) - 1]?.focus();
      }
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move forward only if a digit was entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index]) {
        // Clear current box but stay focused here
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Current box already empty — go back and clear previous
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // userId
  const handleContinue = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      Toast.show({
        type: 'error',
        text1: t('otp.invalidOtpTitle'),
        text2: t('otp.invalidOtpMessage'),
      });
      return;
    }

    const accountNumber = params?.accountNumber || (await load('registrationState'))?.accountNumber;

    if (!accountNumber) {
      Toast.show({
        type: 'error',
        text1: t('otp.errorTitle'),
        text2: t('otp.sessionExpired'),
      });
      save('appState', null);
      save('registrationState', null);
      settleThenNavigate(navigateBack);
      return;
    }

    setIsLoading(true);

    const response = await validateOtp(null, { otp: otpValue, accountNumber });

    if (response?.ok) {
      Toast.show({
        type: 'success',
        text1: t('otp.otpVerifiedTitle'),
        text2: t('otp.otpVerifiedMessage'),
      });
      save('appState', null);
      // Register flow: nextScreen is 'setPrimaryAccount' (account selection is
      // now the step AFTER OTP). Forward the identifiers it needs. Reset loading
      // before the (push) navigation so a back-navigation lands on a clean screen.
      setIsLoading(false);
      settleThenNavigate(() =>
        navigateTo(params?.nextScreen || 'landingScreen', {
          accountNumber,
          phoneNumber: params?.phoneNumber,
        })
      );
      return;
    } else {
      Toast.show({
        type: 'error',
        text1: t('otp.verificationFailedTitle'),
        text2: response?.message || t('otp.invalidOtp'),
      });
    }

    setIsLoading(false);
  };

  const handlePasswordOtpContinue = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      Toast.show({
        type: 'error',
        text1: t('otp.invalidOtpTitle'),
        text2: t('otp.invalidOtpMessage'),
      });
      return;
    }

    const accountNumber = params?.accountNumber || (await load('registrationState'))?.accountNumber;

    // Recover the username: prefer live state / route params, then fall back to
    // the durable resetPasswordState store so a crash-resumed session (where
    // component state was lost) can still verify and continue.
    const resolvedUserId = userId || params?.userId || (await load('resetPasswordState'))?.userId;

    if (!resolvedUserId) {
      Toast.show({
        type: 'error',
        text1: t('otp.errorTitle'),
        text2: t('otp.sessionExpired'),
      });
      save('appState', null);
      save('resetPasswordState', null);
      settleThenNavigate(navigateBack);
      return;
    }

    setIsLoading(true);

    const response = await validateResetPasswordOtp(null, {
      otp: otpValue,
      username: resolvedUserId,
    });

    if (response?.ok) {
      Toast.show({
        type: 'success',
        text1: t('otp.otpVerifiedTitle'),
        text2: t('otp.otpVerifiedMessage'),
      });
      // Clear only the resume pointer — keep resetPasswordState so the
      // reset-password screen can still recover the username on a crash.
      save('appState', null);
      setIsLoading(false);
      settleThenNavigate(() =>
        navigateTo(params?.nextScreen ?? 'landingScreen', {
          accountNumber,
          userId: resolvedUserId,
        })
      );
      return;
    } else {
      Toast.show({
        type: 'error',
        text1: t('otp.verificationFailedTitle'),
        text2: response?.message || t('otp.invalidOtp'),
      });
    }

    setIsLoading(false);
  };

  console.log('OTP Screen Params2:', params);

  // This OTP screen is shared by two flows, which verify against different
  // endpoints:
  //  - forgot-password (forgetPassword → otp): passes `userId` + nextScreen
  //    'resetPassword'; verifies with validateResetPasswordOtp (by username)
  //    via handlePasswordOtpContinue.
  //  - registration (registration → otp): passes `accountNumber` +
  //    nextScreen 'setPrimaryAccount'; verifies with validateOtp (by account
  //    number) via handleContinue, then forwards to primary-account selection.
  // Choose the verifier from the params so the register path stops calling the
  // username-based reset endpoint (which it has no username for). `userId` is
  // present only on the reset path, both on first entry and after a crash-resume
  // (it's saved into appState.params on mount).
  const isPasswordReset = !!params?.userId || params?.nextScreen === 'resetPassword';

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('otp.title')}
          onLeftPress={handleCancelConfirm}
          showLeftIcon={true}
          color={colors.ink}
        />

        <View className="mb-6 items-center px-5">
          <Illustration
            source={require('../../../assets/illus-otp.png')}
            darkSource={require('../../../assets/illus-otp-dark.png')}
            style={{ width: 250, height: 250 }}
            resizeMode="contain"
          />
        </View>

        <View className="mb-8 px-5">
          <Text className="text-center text-sm leading-5 text-ink-muted">
            {t('otp.sentTo')}
            <Text className="font-semibold text-ink">{params?.phoneNumber}</Text>
          </Text>
        </View>

        <View className="mb-8 flex-row justify-center px-5">
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              value={digit}
              onChangeText={(value) => handleOtpChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="numeric"
              maxLength={6}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              importantForAutofill="yes"
              editable={!isLoading}
              caretHidden={true}
              className={`mx-1 rounded-xl border text-center text-2xl font-bold text-ink ${
                digit ? 'border-primary bg-primary-light' : 'border-line bg-card'
              }`}
              style={{ width: 45, height: 56, borderWidth: 1.5 }}
            />
          ))}
        </View>

        {/* Resend — disabled until the 2-minute cooldown (timer) reaches 0 */}
        <View className="mb-8 items-center px-5">
          <Text className="mb-1 text-[13px] text-ink-muted">{t('otp.didntReceive')}</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={timer > 0 || isResending || isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text
              className={`text-sm font-semibold ${
                timer > 0 || isResending ? 'text-ink-soft' : 'text-primary'
              }`}>
              {isResending
                ? t('otp.resending')
                : timer > 0
                  ? t('otp.resendIn', { time: formatTime(timer) })
                  : t('otp.resendCode')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-auto px-5 pb-6">
          <TouchBtn
            onPress={isPasswordReset ? handlePasswordOtpContinue : handleContinue}
            isLoading={isLoading}
            loadingText={t('otp.verifying')}
            label={t('otp.continue')}
            disabled={otp.join('').length !== 6}
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-xl py-4"
            activeOpacity={0.8}
            containerClassName=""
          />
        </View>
      </ScrollView>
    </View>
  );
}
