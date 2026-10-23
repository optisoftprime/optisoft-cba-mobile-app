// screens/TransferPermission.jsx
//
// The customer's own switch that stops money leaving their account to another
// person (peer-to-peer transfers only — bills/airtime/incoming are unaffected).
//
// Design per the backend integration guide:
//  • Turning OFF is immediate and free — no credential, one call. We still show
//    a confirmation that spells out what stops vs. what keeps working.
//  • Turning ON requires re-proving identity with EXACTLY ONE credential:
//    a transaction PIN, a security question, or an OTP (server tries them
//    PIN → question → OTP and stops at the first present — never send more than one).
//  • NOT optimistic: the switch only flips after the 200 (we refetch).
//  • Branch on `stepUpRequiredToEnable`; don't hardcode the step-up.
//  • Backend `message` is shown to the user verbatim.
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Switch,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import Header from 'components/header';
import TouchBtn from 'components/touchBtn';
import Dropdown from 'components/dropDown';
import TextInputComponent from 'components/textInputs';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { OTP_RESEND_COOLDOWN_SECONDS } from 'config/backendConfig';
import { GlobalStatusBar } from 'config/statusBar';
import { getTransferPermission, updateTransferPermission } from 'api/security';
import { generateOtp, getSecurityQuestions } from 'api/auth';
import { getUserLogs } from 'config/storage';
import { formatDate } from 'helper';

// OTP resend wait — the app-wide value (5 min), same as rizespring.
const OTP_COOLDOWN_SECONDS = OTP_RESEND_COOLDOWN_SECONDS;

// Step-up methods — the user picks ONE.
const METHODS = [
  { key: 'pin', labelKey: 'security.tpMethodPin', icon: 'keypad-outline' },
  { key: 'question', labelKey: 'security.tpMethodQuestion', icon: 'help-circle-outline' },
  { key: 'otp', labelKey: 'security.tpMethodOtp', icon: 'chatbox-ellipses-outline' },
];

const fmtCooldown = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function TransferPermission() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const [username, setUsername] = useState(null);
  const [showStepUp, setShowStepUp] = useState(false);
  const [method, setMethod] = useState('pin');
  const [transactionPin, setTransactionPin] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [otp, setOtp] = useState('');
  const [questionOpen, setQuestionOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    (async () => {
      const u = await getUserLogs();
      setUsername(u?.username ?? null);
    })();
  }, []);

  // OTP resend cooldown countdown.
  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const id = setTimeout(() => setOtpCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [otpCooldown]);

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ['transferPermission'],
    queryFn: async () => {
      const res = await getTransferPermission();
      if (res?.ok && res?.data?.data) return res.data.data;
      Toast.show({ type: 'error', text1: t('security.tpLoadFailed'), text2: res?.message });
      return null;
    },
    staleTime: 0,
  });

  const transfersEnabled = data?.transfersEnabled;
  const disabledAt = data?.disabledAt; // absent (not null) when enabled — read defensively
  const stepUpRequired = data?.stepUpRequiredToEnable !== false;

  // Security questions (for the Question method). The endpoint may be down —
  // if it errors or returns nothing, we drop the Question method entirely so the
  // user isn't stuck on an empty dropdown; PIN and OTP still work.
  const { data: sqData, isError: sqError } = useQuery({
    queryKey: ['securityQuestions', username],
    enabled: !!username, // the endpoint needs the username header
    queryFn: async () => {
      const res = await getSecurityQuestions({ username });
      if (!res?.ok) throw new Error(res?.message || 'failed');
      return res?.data?.data ?? [];
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const questionOptions = (Array.isArray(sqData) ? sqData : []).map((q) => {
    const text =
      typeof q === 'string'
        ? q
        : (q?.question ?? q?.securityQuestion ?? q?.name ?? String(q?.id ?? ''));
    return { label: text, value: text };
  });
  const questionsAvailable = !sqError && questionOptions.length > 0;
  const availableMethods = METHODS.filter((m) => m.key !== 'question' || questionsAvailable);

  // If the user is on the Question method but it becomes unavailable, fall back.
  useEffect(() => {
    if (method === 'question' && !questionsAvailable) setMethod('pin');
  }, [method, questionsAvailable]);

  const showError = (message) =>
    Toast.show({ type: 'error', text1: t('security.tpErrorTitle'), text2: message });

  const resetStepUp = () => {
    setShowStepUp(false);
    setMethod('pin');
    setTransactionPin('');
    setSecurityQuestion('');
    setSecurityAnswer('');
    setOtp('');
  };

  const submit = async (payload, successMsg, onOk) => {
    setSubmitting(true);
    try {
      const res = await updateTransferPermission(payload);
      if (res?.ok) {
        Toast.show({ type: 'success', text1: t('security.tpUpdated'), text2: successMsg });
        onOk?.();
        refetch(); // never optimistic — reflect the server's state
      } else {
        showError(res?.message); // backend message, verbatim
      }
    } catch (error) {
      showError(error?.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisable = () => {
    Alert.alert(t('security.tpDisableConfirmTitle'), t('security.tpDisableConfirmMsg'), [
      { text: t('security.tpCancel'), style: 'cancel' },
      {
        text: t('security.tpConfirmDisable'),
        style: 'destructive',
        onPress: () => submit({ enabled: false }, t('security.tpDisabledToast')),
      },
    ]);
  };

  const handleToggle = (next) => {
    if (submitting) return;
    if (next === false) {
      handleDisable();
    } else if (!stepUpRequired) {
      submit({ enabled: true }, t('security.tpEnabledToast'));
    } else {
      setShowStepUp(true);
    }
  };

  const handleSendOtp = async () => {
    if (otpCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    try {
      const res = await generateOtp(null, { source: 'sms', username, otpLength: 6 });
      if (res?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.tpOtpSent'),
          text2: t('security.tpOtpSentMsg'),
        });
        setOtpCooldown(OTP_COOLDOWN_SECONDS);
      } else {
        showError(res?.message);
      }
    } catch (error) {
      showError(error?.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const missing = () =>
    Toast.show({
      type: 'error',
      text1: t('security.tpMissingFields'),
      text2: t('security.tpMissingFieldsMsg'),
    });

  // Build the payload with EXACTLY the one credential the user chose.
  const handleConfirmEnable = () => {
    Keyboard.dismiss();
    let credential;
    if (method === 'pin') {
      if (!transactionPin.trim()) return missing();
      credential = { transactionPin: transactionPin.trim() };
    } else if (method === 'question') {
      if (!securityQuestion || !securityAnswer.trim()) return missing();
      credential = { securityQuestion, securityAnswer: securityAnswer.trim() };
    } else {
      if (!otp.trim()) return missing();
      credential = { otp: otp.trim() };
    }
    submit({ enabled: true, ...credential }, t('security.tpEnabledToast'), resetStepUp);
  };

  const statusColor = transfersEnabled ? colors.success : colors.danger;
  const otpBtnLabel = sendingOtp
    ? t('security.tpSending')
    : otpCooldown > 0
      ? t('security.tpResendIn', { time: fmtCooldown(otpCooldown) })
      : t('security.tpSendCode');

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <Header
        title={t('security.tpTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.ink}
        leftIconColor={colors.ink}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }>
          {isLoading ? (
            <View className="mt-24 items-center">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-4 text-sm text-ink-muted">{t('security.tpLoading')}</Text>
            </View>
          ) : (
            <>
              {/* Status + switch */}
              <View className="mb-5 rounded-2xl border border-line bg-card p-4">
                <View className="flex-row items-center">
                  <View
                    className={`mr-3 h-12 w-12 items-center justify-center rounded-xl ${
                      transfersEnabled ? 'bg-success-soft' : 'bg-danger-soft'
                    }`}>
                    <Ionicons
                      name={transfersEnabled ? 'lock-open-outline' : 'lock-closed-outline'}
                      size={24}
                      color={statusColor}
                    />
                  </View>
                  <View className="flex-1 pr-2">
                    <Text className="text-[15px] font-semibold text-ink">
                      {transfersEnabled
                        ? t('security.tpEnabledTitle')
                        : t('security.tpDisabledTitle')}
                    </Text>
                    <Text className="mt-0.5 text-xs text-ink-muted">
                      {transfersEnabled
                        ? t('security.tpEnabledDesc')
                        : t('security.tpDisabledDesc')}
                    </Text>
                  </View>
                  <Switch
                    value={!!transfersEnabled}
                    onValueChange={handleToggle}
                    disabled={submitting}
                    trackColor={{ true: colors.primary, false: colors.line }}
                    thumbColor={colors.white}
                  />
                </View>

                {!transfersEnabled && !!disabledAt && (
                  <View className="mt-4 flex-row items-center border-t border-line pt-3">
                    <Ionicons name="time-outline" size={14} color={colors.inkSoft} />
                    <Text className="ml-1.5 text-xs text-ink-soft">
                      {t('security.tpDisabledOn', { date: formatDate(disabledAt) })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Step-up ("Confirm it's you") — only when switching ON */}
              {!transfersEnabled && showStepUp && (
                <View className="rounded-2xl border border-line bg-card p-4">
                  {/* header */}
                  <View className="mb-5 flex-row items-center">
                    <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                      <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-ink">
                        {t('security.tpStepUpTitle')}
                      </Text>
                      <Text className="mt-0.5 text-xs text-ink-muted">
                        {t('security.tpChooseMethod')}
                      </Text>
                    </View>
                  </View>

                  {/* Method selector — icon cards, pick exactly one */}
                  <View className="mb-6 flex-row" style={{ gap: 10 }}>
                    {availableMethods.map((m) => {
                      const selected = method === m.key;
                      return (
                        <TouchableOpacity
                          key={m.key}
                          onPress={() => setMethod(m.key)}
                          activeOpacity={0.85}
                          className={`flex-1 items-center rounded-2xl border py-3.5 ${
                            selected
                              ? 'border-primary bg-primary-light'
                              : 'border-line bg-card-muted'
                          }`}>
                          <Ionicons
                            name={m.icon}
                            size={22}
                            color={selected ? colors.primary : colors.inkMuted}
                          />
                          <Text
                            className={`mt-1.5 text-xs font-semibold ${
                              selected ? 'text-primary-dark' : 'text-ink'
                            }`}>
                            {t(m.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {method === 'pin' && (
                    <TextInputComponent
                      label={t('security.tpTransactionPin')}
                      value={transactionPin}
                      onChangeText={setTransactionPin}
                      placeholder={t('security.tpTransactionPinPlaceholder')}
                      keyboardType="number-pad"
                      secureTextEntry
                      maxLength={6}
                      isLoading={submitting}
                      containerStyle={{ marginBottom: 8 }}
                    />
                  )}

                  {method === 'question' && (
                    <>
                      <Dropdown
                        label={t('security.tpSecurityQuestion')}
                        placeholder={t('security.tpSelectQuestion')}
                        value={securityQuestion}
                        options={questionOptions}
                        onSelect={setSecurityQuestion}
                        isOpen={questionOpen && !submitting}
                        onToggle={() => setQuestionOpen((p) => !p)}
                        isLoading={submitting}
                        search
                        style={{ marginBottom: 16 }}
                      />
                      <TextInputComponent
                        label={t('security.tpSecurityAnswer')}
                        value={securityAnswer}
                        onChangeText={setSecurityAnswer}
                        placeholder={t('security.tpSecurityAnswerPlaceholder')}
                        autoCapitalize="none"
                        isLoading={submitting}
                        containerStyle={{ marginBottom: 6 }}
                      />
                      <View className="mb-2 flex-row items-start rounded-xl bg-warning-soft px-3 py-2">
                        <Ionicons
                          name="warning-outline"
                          size={14}
                          color={colors.warning}
                          style={{ marginTop: 2 }}
                        />
                        <Text className="ml-1.5 flex-1 text-xs text-on-warning-soft">
                          {t('security.tpQuestionLockWarn')}
                        </Text>
                      </View>
                    </>
                  )}

                  {method === 'otp' && (
                    <>
                      <TextInputComponent
                        label={t('security.tpOtp')}
                        value={otp}
                        onChangeText={setOtp}
                        placeholder={t('security.tpOtpPlaceholder')}
                        keyboardType="number-pad"
                        maxLength={6}
                        isLoading={submitting}
                        containerStyle={{ marginBottom: 4 }}
                      />
                      <TouchableOpacity
                        onPress={handleSendOtp}
                        disabled={sendingOtp || submitting || otpCooldown > 0}
                        activeOpacity={0.7}
                        className="mb-3 self-end py-1">
                        <Text
                          className="text-sm font-semibold"
                          style={{ color: otpCooldown > 0 ? colors.inkSoft : colors.primary }}>
                          {otpBtnLabel}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchBtn
                    onPress={handleConfirmEnable}
                    label={t('security.tpConfirm')}
                    isLoading={submitting}
                    loadingText={t('security.tpWorking')}
                    textClassName="text-base font-semibold"
                    buttonClassName="items-center rounded-xl py-4"
                    containerClassName="mt-4"
                    textColor={colors.onPrimary}
                    loadingColor={colors.onPrimary}
                    activeOpacity={0.85}
                  />
                  <TouchableOpacity
                    onPress={resetStepUp}
                    disabled={submitting}
                    className="mt-3 items-center py-2">
                    <Text className="text-sm font-semibold text-ink-muted">
                      {t('security.tpCancel')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
