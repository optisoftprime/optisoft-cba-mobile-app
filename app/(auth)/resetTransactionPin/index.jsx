import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import Toast from 'react-native-toast-message';
import {
  setupTransactionPin,
  resetTransactionPin,
  getTransactionPinStatus,
  generateOtp, // POST /api/v1/auth/onboarding/otp/generate — must be added to api/auth.js (currently only a commented stub, see conversation)
  validateResetPasswordOtp, // POST /api/v1/auth/onboarding/otp/validate-with-user-name — already active in api/auth.js
} from 'api/auth';
import { getUser, getUserLogs } from 'config/storage';
import { MaterialIcons } from '@expo/vector-icons';
import { Illustration } from 'components/ui/illustration';

// ─────────────────────────────────────────────────────────────
// CONFIG — edit here if lengths, copy, or the OTP "source" change
// ─────────────────────────────────────────────────────────────
const PIN_LENGTH = 4;
const OTP_LENGTH = 6;
const OTP_SOURCE = 'sms'; // TODO CONFIRM: what value backend expects for `source` in /otp/generate

// Step definitions are built from the translator so their copy is localised.
// Passed `t` explicitly (no hooks at module scope).
const buildSetSteps = (t) => [
  {
    key: 'newPin',
    length: PIN_LENGTH,
    title: t('security.setPinTitle'),
    subtitle: t('security.setPinSubtitle'),
    cta: t('security.continue'),
  },
  {
    key: 'confirmPin',
    length: PIN_LENGTH,
    title: t('security.confirmPinTitle'),
    subtitle: t('security.confirmPinSubtitle'),
    cta: t('security.continue'),
  },
];

const buildResetSteps = (t) => [
  {
    key: 'request',
    title: t('security.resetPinTitle'),
    subtitle: t('security.resetPinSubtitle'),
    cta: t('security.requestPinChange'),
  },
  {
    key: 'otp',
    length: OTP_LENGTH,
    title: t('security.enterOtpTitle'),
    subtitle: t('security.enterOtpSubtitle'),
    cta: t('security.verify'),
  },
  {
    key: 'oldPin',
    length: PIN_LENGTH,
    title: t('security.currentPinTitle'),
    subtitle: t('security.currentPinSubtitle'),
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
    cta: t('security.confirmPinCta'),
  },
];

// Keys whose boxes should offer SMS-code autofill. Deliberately excludes
// PIN steps — autofilling a security PIN from an SMS isn't appropriate,
// only the actual OTP step should ever suggest it.
const AUTOFILL_KEYS = ['otp'];

// Horizontal px this row of boxes has to live inside: screen width minus the
// ScrollView's own px-5 (20px each side). Used to size boxes so they never
// overflow regardless of how many digits a step needs (4 for PIN, 6 for OTP).
const SCREEN_WIDTH = Dimensions.get('window').width;
const ROW_HORIZONTAL_PADDING = 40; // px-5 on each side (20 + 20)
const BOX_GAP = 10; // total horizontal space (margin*2) reserved per box

function getBoxSize(length) {
  const available = SCREEN_WIDTH - ROW_HORIZONTAL_PADDING;
  const rawSize = available / (length || 1) - BOX_GAP;
  return Math.max(46, Math.min(68, rawSize));
}

// ─────────────────────────────────────────────────────────────
// API MAPPING — the two endpoints you specified, isolated here
// so any backend contract change only touches these two
// functions, not the component logic below.
// ─────────────────────────────────────────────────────────────
async function requestPinResetOtp(username) {
  // POST /api/v1/auth/onboarding/otp/generate
  return generateOtp(null, {
    source: OTP_SOURCE,
    username,
    otpLength: OTP_LENGTH,
  });
}

async function verifyPinResetOtp(username, otp) {
  // POST /api/v1/auth/onboarding/otp/validate-with-user-name
  return validateResetPasswordOtp(null, {
    otp,
    username,
  });
}

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

  // Where the "active" box should be: the first empty slot, or the last
  // box if everything is already filled (so tapping anywhere while full
  // still lets you edit the last digit rather than jumping oddly).
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
            // Enforce sequential entry: if the user taps a box other than
            // the first empty one, redirect focus there instead.
            if (index !== targetIndex) {
              refs.current?.[targetIndex]?.focus?.();
            }
          }}
          keyboardType="numeric"
          maxLength={allowAutofill ? OTP_LENGTH : 1} // allow the full code through on autofill so it isn't truncated to 1 char
          caretHidden
          secureTextEntry
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

// getUserLogs() is the real source of the username right now (e.g. { username: "aremogabriel" }).
// getUser() (the profile endpoint) doesn't return a username field yet — backend fix pending —
// so it's kept only as a fallback in case getUserLogs() is ever unavailable.
async function resolveUsername() {
  try {
    const logs = await getUserLogs();
    if (logs?.username) return logs.username;
  } catch (error) {
    console.log('getUserLogs failed, falling back to getUser:', error?.message);
  }
  const user = await getUser();
  return user?.username;
}

export default function ResetTransactionPin() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  // What the caller *thinks* is true, based on the `hasPin` param it was
  // navigated in with. This is only a starting guess — the backend status
  // check below is the source of truth and can override it.
  const intendedMode = params?.hasPin === 'true' ? 'reset' : 'set';

  const [isCheckingPinStatus, setIsCheckingPinStatus] = useState(true);
  const [mode, setMode] = useState(intendedMode);

  const steps = mode === 'reset' ? buildResetSteps(t) : buildSetSteps(t);

  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pinSuccessful, setPinSuccessful] = useState(false);

  const [values, setValues] = useState({
    otp: Array(OTP_LENGTH).fill(''),
    oldPin: Array(PIN_LENGTH).fill(''),
    newPin: Array(PIN_LENGTH).fill(''),
    confirmPin: Array(PIN_LENGTH).fill(''),
  });

  const refs = useRef({ otp: [], oldPin: [], newPin: [], confirmPin: [] });

  const currentStep = steps?.[stepIndex];

  // Check whether the user already has a transaction PIN set as soon as the
  // screen mounts, and reconcile that against what the caller *intended*
  // (via the `hasPin` param):
  //
  // - Caller intended "reset" but no PIN actually exists yet: you can't
  //   reset something that was never set, so force `set` mode. The header
  //   ("Set Transaction PIN") makes the correction obvious without needing
  //   an extra toast.
  // - Caller intended "set" but a PIN already exists: force `reset` mode
  //   and explicitly toast this, since silently switching flows here would
  //   be confusing — the user came in expecting to create a fresh PIN.
  useEffect(() => {
    let isMounted = true;

    const checkPinStatus = async () => {
      try {
        const response = await getTransactionPinStatus();
        if (!isMounted) return;

        if (response?.ok) {
          const pinIsSet = !!response?.data?.data?.pinIsSet;
          const actualMode = pinIsSet ? 'reset' : 'set';

          if (actualMode !== intendedMode && actualMode === 'reset') {
            Toast.show({
              type: 'info',
              text1: t('security.pinAlreadySetTitle'),
              text2: t('security.pinAlreadySetMessage'),
            });
          }

          setMode(actualMode);
        }
        // If the check fails, we silently keep whatever mode the `hasPin`
        // param already gave us above — no need to block the user with an
        // error over a status check they can't do anything about.
      } catch (error) {
        console.log('Failed to check transaction PIN status:', error?.message);
      } finally {
        if (isMounted) setIsCheckingPinStatus(false);
      }
    };

    checkPinStatus();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => backHandler.remove();
    }, [stepIndex])
  );

  const focusFirstInput = (key) => setTimeout(() => refs.current?.[key]?.[0]?.focus?.(), 100);

  const goToStep = (index) => {
    setStepIndex(index);
    const nextKey = steps?.[index]?.key;
    if (nextKey && nextKey !== 'request') focusFirstInput(nextKey);
  };

  // Header back button (and hardware back) both route through here.
  // - On the very first step: exit the screen via navigateBack().
  // - On any later step: clear the field we're leaving and step back one.
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

  // Handles both normal single-digit typing AND autofill/paste, where the
  // OS can deliver the entire code as one multi-character string to
  // whichever box happens to be focused.
  const handleChange = (key) => (rawValue, index) => {
    const digitsOnly = (rawValue ?? '').replace(/[^0-9]/g, '');
    const stepLength = steps?.find((s) => s?.key === key)?.length ?? 0;

    // Deletion
    if (!digitsOnly) {
      setValues((prev) => {
        const updated = [...(prev?.[key] ?? [])];
        updated[index] = '';
        return { ...prev, [key]: updated };
      });
      return;
    }

    // Autofill/paste: multiple digits landed in one box at once —
    // distribute them across all boxes for this field starting at 0.
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

    // Normal single-digit entry
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

  // Step 1: request an OTP be sent to the user's registered phone.
  const handleRequestOtp = async () => {
    setIsLoading(true);
    try {
      const username = await resolveUsername();
      const response = await requestPinResetOtp(username);
      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.otpSentTitle'),
          text2: t('security.otpSentMessage'),
        });
        goToStep(stepIndex + 1);
      } else {
        showError(t('security.otpSendFailed'), response?.message);
      }
    } catch (error) {
      showError(t('security.errorOccurred'), error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: verify the OTP the user entered. Only on success do we move
  // them on to actually entering PIN details.
  const handleVerifyOtp = async () => {
    setIsLoading(true);
    try {
      const username = await resolveUsername();
      const response = await verifyPinResetOtp(username, values?.otp?.join('') ?? '');
      if (response?.ok) {
        goToStep(stepIndex + 1);
      } else {
        showError(
          t('security.invalidCodeTitle'),
          response?.message ?? t('security.pleaseTryAgain')
        );
        setValues((prev) => ({ ...prev, otp: Array(OTP_LENGTH).fill('') }));
        refs.current?.otp?.[0]?.focus?.();
      }
    } catch (error) {
      showError(t('security.errorOccurred'), error?.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3/4/5 (reset) or step 1/2 (set): submit the actual PIN change.
  const handleSubmit = async () => {
    if (values?.newPin?.join('') !== values?.confirmPin?.join('')) {
      showError(t('security.pinMismatchTitle'), t('security.pinMismatchMessage'));
      setValues((prev) => ({ ...prev, confirmPin: Array(PIN_LENGTH).fill('') }));
      refs.current?.confirmPin?.[0]?.focus?.();
      return;
    }

    setIsLoading(true);
    try {
      const username = await resolveUsername();

      const response =
        mode === 'reset'
          ? await resetTransactionPin(username, {
              currentPin: values?.oldPin?.join('') ?? '',
              newPin: values?.newPin?.join('') ?? '',
            })
          : await setupTransactionPin(username, { pin: values?.newPin?.join('') ?? '' });

      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.pinSetTitle'),
          text2: response?.message ?? t('security.pinSetMessage'),
        });
        setPinSuccessful(true);
        navigateTo('appLayout');
      } else {
        showError(t('security.errorOccurred'), response?.message);
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
        return handleRequestOtp();
      case 'otp':
        return handleVerifyOtp();
      case 'confirmPin':
        return handleSubmit();
      default:
        return goToStep(stepIndex + 1);
    }
  };

  const isContinueDisabled = () => {
    if (isLoading) return true;
    if (currentStep?.key === 'request') return false;
    return (values?.[currentStep?.key]?.join('')?.length ?? 0) !== currentStep?.length;
  };

  // Friendly loading state while we check whether the user already has a
  // PIN set, before deciding which flow (set vs reset) to show them.
  if (isCheckingPinStatus) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-8">
        <GlobalStatusBar style={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text className="mt-6 text-center text-xl font-semibold text-ink">
          {t('security.checkingPinStatus')}
        </Text>
        <Text className="mt-3 text-center text-sm leading-6 text-ink-muted">
          {t('security.checkingPinStatusSub')}
        </Text>
      </View>
    );
  }

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
                  ? t('security.settingPin')
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
