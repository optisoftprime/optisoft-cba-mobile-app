// screens/LinkAccountOtp.jsx
//
// Step 2 of the in-app "Change Primary Account" flow. Mirrors the registration
// OTP screen's UX (6 boxes, SMS-autofill/paste, 2-minute resend cooldown) but is
// TRANSIENT: it writes no appState/registrationState and has no forgot-password
// branch. Verifies with validateOtp (by account number) — the exact verifier the
// register OTP path uses — then → linkAccountSelect.
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
import { OTP_RESEND_COOLDOWN_SECONDS } from 'config/backendConfig';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import Toast from 'react-native-toast-message';
import { validateOtp, publicRegenerateOtp } from 'api/auth';
import { Illustration } from 'components/ui/illustration';

export default function LinkAccountOtp() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const accountNumber = params?.accountNumber;
  const phoneNumber = params?.phoneNumber;

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  // 2-minute (120s) resend cooldown.
  const [timer, setTimer] = useState(OTP_RESEND_COOLDOWN_SECONDS);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  // Blur + defer navigation two frames so the focused OTP box detaches before
  // the screen tears down (Fabric addViewAt guard).
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => navFn());
    });
  }, []);

  const handleCancelConfirm = () => {
    Alert.alert(t('linkAccount.cancelProcessTitle'), t('linkAccount.cancelProcessMessage'), [
      { text: t('linkAccount.noStay'), style: 'cancel' },
      {
        text: t('linkAccount.yesCancel'),
        style: 'destructive',
        onPress: () => settleThenNavigate(navigateBack),
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

  // Resend the OTP by account number (same public endpoint registration uses).
  const handleResend = async () => {
    if (timer > 0 || isResending || isLoading) return;
    if (!accountNumber) {
      Toast.show({
        type: 'error',
        text1: t('linkAccount.errorTitle'),
        text2: t('linkAccount.sessionExpired'),
      });
      return;
    }

    setIsResending(true);
    try {
      const response = await publicRegenerateOtp({ accountNumber });
      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('linkAccount.codeSentTitle'),
          text2: t('linkAccount.codeSentMessage'),
        });
        setOtp(['', '', '', '', '', '']);
        setTimer(OTP_RESEND_COOLDOWN_SECONDS);
      } else {
        Toast.show({
          type: 'error',
          text1: t('linkAccount.couldNotResendTitle'),
          text2: response?.message || t('linkAccount.pleaseTryAgain'),
        });
      }
    } catch (_e) {
      Toast.show({
        type: 'error',
        text1: t('linkAccount.somethingWentWrong'),
        text2: t('linkAccount.unableToResend'),
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleOtpChange = (value, index) => {
    // SMS autofill / paste delivers the whole code into one box — spread it.
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

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handleContinue = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      Toast.show({
        type: 'error',
        text1: t('linkAccount.invalidOtpTitle'),
        text2: t('linkAccount.enterAllDigits'),
      });
      return;
    }
    if (!accountNumber) {
      Toast.show({
        type: 'error',
        text1: t('linkAccount.errorTitle'),
        text2: t('linkAccount.sessionExpired'),
      });
      settleThenNavigate(navigateBack);
      return;
    }

    setIsLoading(true);
    const response = await validateOtp(null, { otp: otpValue, accountNumber });

    if (response?.ok) {
      Toast.show({
        type: 'success',
        text1: t('linkAccount.otpVerifiedTitle'),
        text2: t('linkAccount.proceedingNext'),
      });
      setIsLoading(false);
      // Forward the accounts (still a JSON string) to the selection step.
      settleThenNavigate(() =>
        navigateTo('linkAccountSelect', {
          accountNumber,
          phoneNumber,
          accounts: params?.accounts,
        })
      );
      return;
    }

    Toast.show({
      type: 'error',
      text1: t('linkAccount.verificationFailedTitle'),
      text2: response?.message || t('linkAccount.invalidOtp'),
    });
    setIsLoading(false);
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('linkAccount.verifyOtpTitle')}
          onLeftPress={handleCancelConfirm}
          showLeftIcon
          color={colors.textPrimary}
        />

        <View className="mb-6 items-center px-5">
          <Illustration
            source={require('../../assets/illus-otp.png')}
            darkSource={require('../../assets/illus-otp-dark.png')}
            style={{ width: 250, height: 250 }}
            resizeMode="contain"
          />
        </View>

        <View className="mb-8 px-5">
          <Text className="text-center text-[13px] leading-5 text-ink-muted">
            {t('linkAccount.otpSentTo')}{' '}
            <Text className="font-semibold text-ink">{phoneNumber}</Text>
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
              className="mx-1 rounded-xl text-center text-2xl font-bold"
              style={{
                width: 45,
                height: 56,
                backgroundColor: digit ? colors.primaryLight : colors.card,
                color: colors.ink,
                borderWidth: 1.5,
                borderColor: digit ? colors.primary : colors.line,
              }}
            />
          ))}
        </View>

        <View className="mb-8 items-center px-5">
          <Text className="mb-1 text-[13px] text-ink-muted">{t('linkAccount.didntReceive')}</Text>
          <TouchableOpacity
            onPress={handleResend}
            disabled={timer > 0 || isResending || isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text
              className="text-sm font-semibold"
              style={{ color: timer > 0 || isResending ? colors.textMuted : colors.primary }}>
              {isResending
                ? t('linkAccount.resending')
                : timer > 0
                  ? t('linkAccount.resendIn', { time: formatTime(timer) })
                  : t('linkAccount.resendCode')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-auto px-5 pb-6">
          <TouchBtn
            onPress={handleContinue}
            isLoading={isLoading}
            loadingText={t('linkAccount.verifying')}
            label={t('linkAccount.continue')}
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
