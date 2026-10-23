import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  BackHandler,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import TouchBtn from 'components/touchBtn';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { GlobalStatusBar } from 'config/statusBar';
import Toast from 'react-native-toast-message';
import { load, remove, save } from 'config/storage';
import { generateOnRegOtp, validateOtp, validateResetPasswordOtp } from 'api/auth';
import { trimMessage } from 'helper';
import { MaterialIcons } from '@expo/vector-icons';

import { Illustration } from 'components/ui/illustration';

export default function VerifyPhoneNumber() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(105);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState();
  const [otpVerified, setOtpVerified] = useState(false);
  const inputRefs = useRef([]);
  const hasResent = useRef(false);
  const params = useLocalSearchParams();
  const [customerDetail, setCustomerDetails] = useState(null);
  // onReg = true when we arrived here from the registration flow (stage 3),
  // false when we arrived here from the login flow. Captured once in a ref
  // so it doesn't change even if params happen to re-render.
  const onReg = useRef(params?.onRegistration === true || params?.onRegistration === 'true');
  const isResendingRef = useRef(false);
  // Guards the auto-send-on-mount effect below so it only ever fires once,
  // even if this component re-renders before the request resolves.
  const hasSentInitialOtp = useRef(false);

  // optSent tracks whether an OTP has actually reached the user's phone yet:
  //  - registration path: the backend already sends the first OTP as a side
  //    effect of accountSetup succeeding, so nothing needs to be triggered
  //    here — optSent starts `true`.
  //  - login / unverified-account path: NOTHING has been sent yet at this
  //    point. The failed-login step only routes the user here, it doesn't
  //    send a code — so optSent starts `false`, and the effect below fires
  //    a real send request (same call the "Resend" button uses) as soon as
  //    this screen mounts.
  const [optSent, setOptSent] = useState(!!onReg.current);

  // Persist a resume pointer for the OTP step. By the time the user is here the
  // account has already been created server-side (accountSetup succeeded in
  // stageOne), so a crash/close MUST be able to come back here — otherwise the
  // user is stranded with a created-but-unverified account. `accountNumber`
  // survives via onboardingAccountDetails; `username` and the `onRegistration`
  // flag are params-only, so they're saved here too. Cleared in
  // handleCancelConfirm and after a successful verify (remove('appState')).
  useEffect(() => {
    save('appState', {
      stage: 'stageThree',
      params: {
        username: params?.username,
        onRegistration: onReg.current,
        phoneNumber: params?.phoneNumber,
        nextScreen: params?.nextScreen,
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Same Fabric hazard as stageOne: the OTP inputs hold focus + the keyboard,
  // so navigating away mid-focus lets react-native-screens tear the screen down
  // with the IME still attached → `addViewAt / child already has a parent`.
  // Blur first, then navigate two frames later once the input has detached.
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navFn();
      });
    });
  }, []);

  const handleCancelConfirm = () => {
    Alert.alert(t('openAccount.cancelProcessTitle'), t('openAccount.cancelProcessMessage'), [
      { text: t('openAccount.noStay'), style: 'cancel' },
      {
        text: t('openAccount.yesCancel'),
        style: 'destructive',
        onPress: () => {
          remove('appState');
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
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e?.nativeEvent?.key === 'Backspace') {
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

  // Shared by both the auto-send-on-mount effect (login path) and the
  // "Resend" button. `announce` controls whether a success toast is shown —
  // the very first send on mount is silent (the user hasn't asked for
  // anything yet), but an explicit resend tap should confirm it worked.
  const sendOtp = useCallback(
    async ({ announce } = { announce: true }) => {
      if (isResendingRef.current) return;
      isResendingRef.current = true;
      setIsResending(true);

      try {
        const response = await generateOnRegOtp({ username: params?.username });

        if (response?.ok) {
          // Flips the screen from the "sending code" loader to the actual
          // OTP input form — see the render logic below.
          setOptSent(true);
          setPhoneNumber(response?.data?.data?.phoneNumber);
          if (announce) {
            Toast.show({
              type: 'success',
              text1: t('openAccount.otpSentTitle'),
              text2: t('openAccount.otpSentMessage'),
            });
          }
          setTimer(105);
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        } else {
          Toast.show({
            type: 'error',
            text1: t('openAccount.failedToSendOtp'),
            text2: response?.message || t('openAccount.pleaseTryAgain'),
          });
        }
      } catch (error) {
        Toast.show({
          type: 'error',
          text1: t('openAccount.somethingWentWrong'),
          text2: t('openAccount.unableToSendCode', { message: error?.message }),
        });
      } finally {
        isResendingRef.current = false;
        setIsResending(false);
        // Always leave the "Sending verification code…" loader once a send
        // attempt finishes — even on failure — so the user lands on the OTP
        // form (which has the Resend button) instead of being stranded on the
        // spinner with no way forward (there's no hardware back on iOS).
        setOptSent(true);
      }
    },
    [params?.username]
  );

  const handleResendCode = useCallback(() => {
    sendOtp({ announce: true });
  }, [sendOtp]);

  // On the login/unverified-account path, nothing has sent an OTP yet by
  // the time this screen mounts — trigger the first send automatically,
  // silently (no "OTP Sent" toast, since the user didn't tap anything).
  useEffect(() => {
    if (onReg.current) return;
    if (hasSentInitialOtp.current) return;
    hasSentInitialOtp.current = true;
    sendOtp({ announce: false });
  }, [sendOtp]);

  const handleNextStep = () => {
    settleThenNavigate(() => {
      if (onReg.current) {
        navigateTo('stageFive');
      } else {
        navigateTo('login');
      }
    });
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');

    if (otpValue.length !== 6) {
      Toast.show({
        type: 'error',
        text1: t('openAccount.invalidOtpTitle'),
        text2: t('openAccount.invalidOtpMessage'),
      });
      return;
    }

    // Resolve the identifier the chosen endpoint needs and bail BEFORE firing
    // the request if it's missing — otherwise the API is called with an
    // undefined accountNumber/username and fails opaquely.
    let accountNumber = customerDetail?.customerAccountDetails?.accountDetails?.accountNumber;

    // customerDetail loads asynchronously on mount. If the user manages to
    // verify before it resolves, read the persisted onboarding data directly so
    // we don't false-negative on an accountNumber that's actually in storage.
    if (onReg.current && !accountNumber) {
      const stored = await load('onboardingAccountDetails');
      accountNumber = stored?.customerAccountDetails?.accountDetails?.accountNumber;
    }

    if (onReg.current && !accountNumber) {
      Toast.show({
        type: 'error',
        text1: t('openAccount.accountNumberNotFoundTitle'),
        text2: t('openAccount.accountNumberNotFoundMessage'),
      });
      return;
    }

    if (!onReg.current && !params?.username) {
      Toast.show({
        type: 'error',
        text1: t('openAccount.missingUsernameTitle'),
        text2: t('openAccount.missingUsernameMessage'),
      });
      return;
    }

    setIsLoading(true);

    try {
      // Registration flow (onReg.current === true) verifies against
      // validateOtp with { otp, accountNumber } — the account number comes
      // from onboardingAccountDetails saved to storage right after
      // accountSetup succeeds.
      //
      // Login / unverified-account flow (onReg.current === false) verifies
      // against validateResetPasswordOtp with { otp, username } — username is
      // the only identifier we have on that path, passed in via nav params.
      //
      // Both the function chosen AND the payload shape must key off the
      // same onReg.current flag, or they can end up mismatched (calling
      // the accountNumber endpoint with only a username, etc).
      const response = await (onReg.current ? validateOtp : validateResetPasswordOtp)(
        null,
        onReg.current
          ? { otp: otpValue, accountNumber }
          : { otp: otpValue, username: params?.username }
      );

      if (response?.ok) {
        setOtpVerified(true);
        Toast.show({
          type: 'success',
          text1: t('openAccount.otpVerifiedTitle'),
          text2: t('openAccount.otpVerifiedMessage'),
        });

        await remove('appState');

        if (!onReg.current) {
          settleThenNavigate(() =>
            navigateTo(params?.nextScreen || 'openAccountSuccess', {
              ...params,
            })
          );
        }
      } else {
        Toast.show({
          type: 'error',
          text1: t('openAccount.verificationFailedTitle'),
          text2: trimMessage(response?.message) || t('openAccount.verificationFailedMessage'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('openAccount.somethingWentWrong'),
        text2: error?.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const getCustomerDetails = async () => {
      const onboardingAccountDetails = await load('onboardingAccountDetails');
      setCustomerDetails(onboardingAccountDetails);

      // If we weren't handed a phoneNumber via params (registration path
      // currently doesn't pass one), fall back to whatever accountSetup
      // stored for this user so the "sent to X" text below isn't stuck on
      // the generic fallback string.
      if (!params?.phoneNumber) {
        const storedPhoneNumber = onboardingAccountDetails?.customerAccountDetails?.phoneNumber;
        if (storedPhoneNumber) {
          setPhoneNumber(storedPhoneNumber);
        }
      }
    };

    getCustomerDetails();
  }, []);

  const isContinueDisabled = otpVerified ? isLoading : otp.join('').length !== 6 || isLoading;

  // Show the "sending code" loader whenever an OTP hasn't successfully
  // reached the user yet (covers both the login path's automatic initial
  // send, and any in-flight resend on either path).
  const showSendingLoader = !optSent || isResending;

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style={isDark ? 'light-content' : 'dark-content'} />

      {/* Progress Bar */}
      <View className="px-6 pb-4 pt-12">
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <View className="h-full rounded-full bg-primary" style={{ width: '75%' }} />
        </View>
        <Text className="mt-2 text-center text-xs text-ink-muted">{t('openAccount.step2of3')}</Text>
      </View>

      {showSendingLoader ? (
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator size="large" color={colors.primary} />

          <Text className="mt-6 text-center text-xl font-semibold text-ink">
            {t('openAccount.sendingCodeTitle')}
          </Text>

          <Text className="mt-3 text-center text-sm leading-6 text-ink-muted">
            {t('openAccount.sendingCodeMessage')}
          </Text>
        </View>
      ) : (
        <>
          {!otpVerified && (
            <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
              <Header
                title={t('openAccount.verifyPhoneTitle')}
                subtitle={t('openAccount.enterCodeSentTo', {
                  phone: params?.phoneNumber || phoneNumber || t('openAccount.yourPhone'),
                })}
                showLeftIcon={true}
                onLeftPress={handleCancelConfirm}
                color={colors.textPrimary}
                leftIconColor={colors.textPrimary}
                containerStyle={{ marginTop: -25 }}
              />

              <View className="px-4">
                {/* Illustration */}
                <View className="mb-6 items-center">
                  <Illustration
                    source={require('../../../assets/illus-otp.png')}
                    darkSource={require('../../../assets/illus-otp-dark.png')}
                    style={{ width: 280, height: 280 }}
                    resizeMode="contain"
                  />
                </View>

                {/* Description */}
                <View className="mb-8">
                  <Text className="text-center text-sm leading-5 text-ink-muted">
                    {t('openAccount.otpSentTo')}{' '}
                    <Text className="font-semibold text-ink">
                      {params?.phoneNumber || phoneNumber || t('openAccount.yourPhoneNumber')}
                    </Text>
                  </Text>
                </View>

                {/* OTP Input Boxes */}
                <View className="mb-8 flex-row justify-center">
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
                        width: 48,
                        height: 56,
                        backgroundColor: digit ? colors.primaryLight : colors.card,
                        color: colors.ink,
                        borderWidth: digit ? 2 : 1,
                        borderColor: digit ? colors.primary : colors.line,
                      }}
                    />
                  ))}
                </View>

                {/* Resend Code */}
                <View className="mb-8 items-center">
                  <Text className="mb-1 text-sm text-ink-muted">
                    {t('openAccount.didntReceiveCode')}
                  </Text>
                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={timer > 0 || isLoading || isResending}>
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: timer > 0 || isLoading ? colors.textMuted : colors.primary }}>
                      {isResending
                        ? t('openAccount.resending')
                        : t('openAccount.resendWithTime', {
                            time: timer > 0 ? formatTime(timer) : '',
                          })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          )}

          {otpVerified && (
            <View className="flex-1 items-center justify-center px-8">
              {/* Success Icon */}
              <View className="mb-8">
                <View className="h-32 w-32 items-center justify-center rounded-full bg-success-soft">
                  <View className="h-20 w-20 items-center justify-center rounded-full bg-success">
                    <MaterialIcons name="check" size={44} color={colors.onPrimary} />
                  </View>
                </View>
              </View>

              {/* Title */}
              <Text className="mb-3 text-center text-2xl font-bold text-ink">
                {t('openAccount.codeVerifiedTitle')}
              </Text>

              {/* Subtitle */}
              <Text className="mb-16 text-center text-[15px] leading-6 text-ink-muted">
                {t('openAccount.accountVerifiedSubtitle')}
              </Text>
            </View>
          )}

          {/* Continue Button */}
          <View className="px-6 pb-8">
            <TouchBtn
              onPress={otpVerified ? handleNextStep : handleVerifyOtp}
              label={
                otpVerified
                  ? onReg.current
                    ? t('openAccount.continue')
                    : t('openAccount.proceedToLogin')
                  : t('openAccount.verifyCode')
              }
              isLoading={isLoading}
              loadingTexta="Verifying..."
              backgroundColor={colors.primary}
              disabled={isContinueDisabled}
              textClassName="text-base font-bold"
              buttonClassName="w-full items-center rounded-xl py-4"
              containerClassName=""
            />
          </View>
        </>
      )}
    </View>
  );
}
