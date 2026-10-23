// screens/ForgotTransactionPin.jsx
//
// "Forgot Transaction PIN" flow — for a LOGGED-IN user who can't remember their
// current PIN. Distinct from resetTransactionPin (which requires the current
// PIN). Per the integration guide (forgot-pin module):
//   1. POST /transaction-pin/forgot/initiate  → OTP sent by SMS, returns masked phone
//   2. POST /transaction-pin/forgot/confirm   → OTP verified + new PIN written atomically
// There is no separate "validate OTP" call — the OTP is checked inside confirm,
// so we simply collect it and send it together with the new PIN.
//
// This screen is intentionally self-contained (its own PinBoxes/handlers) so it
// does NOT touch the working resetTransactionPin screen.
import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, ScrollView, BackHandler, Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Header from 'components/header';
import { navigateBack, navigateReplace, navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import Toast from 'react-native-toast-message';
import { MaterialIcons } from '@expo/vector-icons';
import { forgotTransactionPinInitiate, forgotTransactionPinConfirm } from 'api/auth';
import { Illustration } from 'components/ui/illustration';

// The confirm endpoint accepts a 4–6 digit PIN; we keep the app-wide 4-digit
// convention used by setup/reset so the experience is consistent.
const PIN_LENGTH = 4;
const OTP_LENGTH = 6;

const SCREEN_WIDTH = Dimensions.get('window').width;
const ROW_HORIZONTAL_PADDING = 40; // px-5 on each side (20 + 20)
const BOX_GAP = 10;

function getBoxSize(length) {
  const available = SCREEN_WIDTH - ROW_HORIZONTAL_PADDING;
  const rawSize = available / (length || 1) - BOX_GAP;
  return Math.max(46, Math.min(68, rawSize));
}

// Steps are rebuilt from the translator each render so copy stays localised and
// the OTP subtitle can name the masked phone once we have it.
const buildSteps = (t, masked) => [
  {
    key: 'request',
    title: t('security.forgotPinTitle'),
    subtitle: t('security.forgotPinSubtitle'),
    cta: t('security.sendCode'),
  },
  {
    key: 'otp',
    length: OTP_LENGTH,
    title: t('security.enterOtpTitle'),
    subtitle: masked
      ? t('security.forgotOtpSubtitleMasked', { masked })
      : t('security.forgotOtpSubtitle'),
    cta: t('security.continue'),
  },
  {
    key: 'newPin',
    length: PIN_LENGTH,
    title: t('security.newPinTitle'),
    subtitle: t('security.newPinSubtitle'),
    cta: t('security.continue'),
  },
  {
    key: 'confirmPin',
    length: PIN_LENGTH,
    title: t('security.confirmNewPinTitle'),
    subtitle: t('security.confirmNewPinSubtitle'),
    cta: t('security.resetPinCta'),
  },
];

// SMS-code autofill only makes sense on the OTP step.
const AUTOFILL_KEYS = ['otp'];

function PinBoxes({
  value,
  refs,
  onChange,
  onKeyPress,
  isLoading,
  colors,
  length = PIN_LENGTH,
  allowAutofill = false,
}) {
  const boxSize = getBoxSize(length);
  const firstEmptyIndex = value?.findIndex((v) => !v);
  const targetIndex = firstEmptyIndex === -1 ? (length || PIN_LENGTH) - 1 : firstEmptyIndex;

  return (
    <View className="mb-8 flex-row justify-center px-5">
      {Array.from({ length: length || PIN_LENGTH }).map((_, index) => (
        <TextInput
          key={index}
          ref={(ref) => (refs.current[index] = ref)}
          value={value?.[index]}
          onChangeText={(v) => onChange?.(v, index)}
          onKeyPress={(e) => onKeyPress?.(e, index)}
          onFocus={() => {
            if (index !== targetIndex) {
              refs.current?.[targetIndex]?.focus?.();
            }
          }}
          keyboardType="numeric"
          maxLength={allowAutofill ? OTP_LENGTH : 1}
          caretHidden
          secureTextEntry={!allowAutofill}
          editable={!isLoading}
          textContentType={allowAutofill ? 'oneTimeCode' : 'none'}
          autoComplete={allowAutofill ? 'sms-otp' : 'off'}
          className="mx-1 rounded-xl text-center font-bold"
          style={{
            width: boxSize,
            height: boxSize,
            fontSize: boxSize > 55 ? 26 : 20,
            borderWidth: 1.5,
            backgroundColor: value?.[index] ? colors.primaryLight : colors.card,
            borderColor: value?.[index] ? colors.primary : colors.line,
            color: colors.ink,
          }}
        />
      ))}
    </View>
  );
}

export default function ForgotTransactionPin() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const [maskedPhone, setMaskedPhone] = useState('');
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pinSuccessful, setPinSuccessful] = useState(false);

  const [values, setValues] = useState({
    otp: Array(OTP_LENGTH).fill(''),
    newPin: Array(PIN_LENGTH).fill(''),
    confirmPin: Array(PIN_LENGTH).fill(''),
  });

  const refs = useRef({ otp: [], newPin: [], confirmPin: [] });

  const steps = buildSteps(t, maskedPhone);
  const currentStep = steps?.[stepIndex];

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => backHandler.remove();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stepIndex])
  );

  const focusFirstInput = (key) => setTimeout(() => refs.current?.[key]?.[0]?.focus?.(), 100);

  const goToStep = (index) => {
    setStepIndex(index);
    const nextKey = steps?.[index]?.key;
    if (nextKey && nextKey !== 'request') focusFirstInput(nextKey);
  };

  const goBack = () => {
    if (stepIndex === 0) {
      navigateBack();
      return;
    }
    const leavingKey = currentStep?.key;
    if (leavingKey && leavingKey !== 'request') {
      setValues((prev) => ({
        ...prev,
        [leavingKey]: Array(prev?.[leavingKey]?.length ?? 0).fill(''),
      }));
    }
    goToStep(stepIndex - 1);
  };

  const handleChange = (key) => (rawValue, index) => {
    const digitsOnly = (rawValue ?? '').replace(/[^0-9]/g, '');
    const stepLength = steps?.find((s) => s?.key === key)?.length ?? 0;

    if (!digitsOnly) {
      setValues((prev) => {
        const updated = [...(prev?.[key] ?? [])];
        updated[index] = '';
        return { ...prev, [key]: updated };
      });
      return;
    }

    // Autofill/paste: a whole code lands in one box — spread it across the row.
    if (digitsOnly.length > 1) {
      const chars = digitsOnly.slice(0, stepLength).split('');
      setValues((prev) => {
        const updated = Array(stepLength).fill('');
        chars.forEach((c, i) => {
          updated[i] = c;
        });
        return { ...prev, [key]: updated };
      });
      const lastFilledIndex = Math.min(chars.length, stepLength) - 1;
      if (lastFilledIndex >= stepLength - 1) {
        refs.current?.[key]?.[stepLength - 1]?.blur?.();
      } else {
        refs.current?.[key]?.[lastFilledIndex + 1]?.focus?.();
      }
      return;
    }

    setValues((prev) => {
      const updated = [...(prev?.[key] ?? [])];
      updated[index] = digitsOnly;
      return { ...prev, [key]: updated };
    });
    if (index < stepLength - 1) {
      refs.current?.[key]?.[index + 1]?.focus?.();
    } else {
      refs.current?.[key]?.[index]?.blur?.();
    }
  };

  const handleKeyPress = (key) => (e, index) => {
    if (e?.nativeEvent?.key !== 'Backspace') return;
    setValues((prev) => {
      const updated = [...(prev?.[key] ?? [])];
      if (updated[index]) {
        updated[index] = '';
      } else if (index > 0) {
        updated[index - 1] = '';
        refs.current?.[key]?.[index - 1]?.focus?.();
      }
      return { ...prev, [key]: updated };
    });
  };

  const showError = (title, message) => Toast.show({ type: 'error', text1: title, text2: message });

  // Send them to the setup screen when the backend says there's no PIN to reset.
  const sendToSetup = (message) => {
    Toast.show({
      type: 'info',
      text1: t('security.pinNotSetTitle'),
      text2: message || t('security.pinNotSetMessage'),
    });
    navigateReplace('resetTransactionPin');
  };

  // Step 1 — request the OTP. No body; the user is resolved from the JWT.
  const handleInitiate = async () => {
    setIsLoading(true);
    try {
      const response = await forgotTransactionPinInitiate();
      if (response?.ok) {
        const masked = response?.data?.data?.maskedPhoneNumber;
        if (masked) setMaskedPhone(masked);
        Toast.show({
          type: 'success',
          text1: t('security.otpSentTitle'),
          text2: t('security.otpSentMessage'),
        });
        goToStep(stepIndex + 1);
      } else if (response?.status === 409) {
        sendToSetup(response?.message);
      } else {
        showError(t('security.otpSendFailed'), response?.message);
      }
    } catch (error) {
      showError(t('security.errorOccurred'), error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Final step — verify OTP and write the new PIN in a single request.
  const handleConfirm = async () => {
    const otp = values?.otp?.join('') ?? '';
    const newPin = values?.newPin?.join('') ?? '';
    const confirmNewPin = values?.confirmPin?.join('') ?? '';

    // Validate the match client-side first — a failed round trip still costs a
    // token from the confirm rate limit (5 / 15 min).
    if (newPin !== confirmNewPin) {
      showError(t('security.pinMismatchTitle'), t('security.pinMismatchMessage'));
      setValues((prev) => ({ ...prev, confirmPin: Array(PIN_LENGTH).fill('') }));
      refs.current?.confirmPin?.[0]?.focus?.();
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotTransactionPinConfirm({ otp, newPin, confirmNewPin });
      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.pinSetTitle'),
          text2: response?.data?.data?.message ?? t('security.pinSetMessage'),
        });
        setPinSuccessful(true);
        navigateTo('appLayout');
      } else if (response?.status === 409) {
        sendToSetup(response?.message);
      } else {
        // 400 at confirm is almost always a wrong/expired OTP (PIN match + length
        // are validated above). Show the backend message and send them back to
        // the OTP step. Clear the OTP AND the PIN fields — otherwise the new-PIN
        // boxes stay populated with the previous attempt when they come back
        // through.
        showError(
          t('security.invalidCodeTitle'),
          response?.message ?? t('security.pleaseTryAgain')
        );
        setValues((prev) => ({
          ...prev,
          otp: Array(OTP_LENGTH).fill(''),
          newPin: Array(PIN_LENGTH).fill(''),
          confirmPin: Array(PIN_LENGTH).fill(''),
        }));
        goToStep(1);
      }
    } catch (error) {
      showError(t('security.errorOccurred'), error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    switch (currentStep?.key) {
      case 'request':
        return handleInitiate();
      case 'confirmPin':
        return handleConfirm();
      default:
        // otp / newPin: just advance — nothing is submitted until confirm.
        return goToStep(stepIndex + 1);
    }
  };

  const isContinueDisabled = () => {
    if (isLoading) return true;
    if (currentStep?.key === 'request') return false;
    return (values?.[currentStep?.key]?.join('')?.length ?? 0) !== currentStep?.length;
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style={isDark ? 'light-content' : 'dark-content'} />

      {!pinSuccessful ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          showsVerticalScrollIndicator={false}>
          <Header title={currentStep?.title} showLeftIcon onLeftPress={goBack} color={colors.ink} />

          <View className="mb-6 items-center px-5">
            <Illustration
              source={require('../../../assets/illus-security.png')}
              darkSource={require('../../../assets/illus-security-dark.png')}
              style={{ width: 250, height: 250 }}
              resizeMode="contain"
            />
          </View>

          <View className="my-2 mb-7">
            <Text className="mt-5 px-4 text-center text-[15px] leading-6 text-ink-muted">
              {currentStep?.subtitle}
            </Text>
          </View>

          {currentStep?.key !== 'request' && (
            <PinBoxes
              value={values?.[currentStep?.key]}
              refs={{ current: refs.current?.[currentStep?.key] ?? [] }}
              onChange={handleChange(currentStep?.key)}
              onKeyPress={handleKeyPress(currentStep?.key)}
              isLoading={isLoading}
              colors={colors}
              length={currentStep?.length}
              allowAutofill={AUTOFILL_KEYS.includes(currentStep?.key)}
            />
          )}

          <View className="mt-auto px-5 pb-6 pt-4">
            <TouchBtn
              onPress={handleContinue}
              label={currentStep?.cta}
              isLoading={isLoading}
              loadingText={
                currentStep?.key === 'confirmPin'
                  ? t('security.resettingPin')
                  : t('security.pleaseWait')
              }
              disabled={isContinueDisabled()}
              textClassName="text-[15px] font-semibold"
              textColor={colors.onPrimary}
              loadingColor={colors.onPrimary}
              buttonClassName="w-full items-center rounded-xl py-4"
              containerClassName=""
            />
          </View>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          <View className="mb-8">
            <View className="h-28 w-28 items-center justify-center rounded-full bg-success-soft">
              <MaterialIcons name="check-circle" size={64} color={colors.success} />
            </View>
          </View>
          <Text className="mb-3 text-center text-2xl font-bold text-ink">
            {t('security.pinSetSuccessTitle')}
          </Text>
          <Text className="mb-16 text-center text-[15px] leading-6 text-ink-muted">
            {t('security.pinSetSuccessSub')}
          </Text>
        </View>
      )}
    </View>
  );
}
