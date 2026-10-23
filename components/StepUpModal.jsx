// components/StepUpModal.jsx
//
// Reusable "Confirm it's you" step-up sheet for sensitive security actions
// (removing a device, etc.). The user picks EXACTLY ONE credential — the backend
// tries them PIN → security-question → OTP and stops at the first present, so we
// only ever send one. `onConfirm(credential)` hands the parent the single
// credential object; the parent runs the API call and controls `submitting`.
//
// Mount it CONDITIONALLY (e.g. {target && <StepUpModal … />}) — the inner RN
// Modal is always visible, so unmounting it from the parent is what closes it
// (keeps it Fabric-safe; no always-mounted visible={false} Modal).
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import TouchBtn from 'components/touchBtn';
import Dropdown from 'components/dropDown';
import TextInputComponent from 'components/textInputs';
import { useTheme } from 'config/ThemeContext';
import { generateOtp, getSecurityQuestions } from 'api/auth';
import { getUserLogs } from 'config/storage';
import useKeyboardHeight from 'app/hooks/useKeyboardHeight';
import { OTP_RESEND_COOLDOWN_SECONDS } from 'config/backendConfig';

// OTP resend wait — the app-wide value (5 min), same as rizespring.
const OTP_COOLDOWN_SECONDS = OTP_RESEND_COOLDOWN_SECONDS;
const METHODS = [
  { key: 'pin', labelKey: 'security.tpMethodPin', icon: 'keypad-outline' },
  { key: 'question', labelKey: 'security.tpMethodQuestion', icon: 'help-circle-outline' },
  { key: 'otp', labelKey: 'security.tpMethodOtp', icon: 'chatbox-ellipses-outline' },
];
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function StepUpModal({
  onClose,
  onConfirm,
  submitting = false,
  title,
  description,
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const keyboardHeight = useKeyboardHeight();

  const [username, setUsername] = useState(null);
  const [method, setMethod] = useState('pin');
  const [transactionPin, setTransactionPin] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [otp, setOtp] = useState('');
  const [questionOpen, setQuestionOpen] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  useEffect(() => {
    (async () => setUsername((await getUserLogs())?.username ?? null))();
  }, []);

  useEffect(() => {
    if (otpCooldown <= 0) return undefined;
    const id = setTimeout(() => setOtpCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearTimeout(id);
  }, [otpCooldown]);

  const { data: sqData, isError: sqError } = useQuery({
    queryKey: ['securityQuestions', username],
    enabled: !!username, // the endpoint needs the username header
    queryFn: async () => {
      const r = await getSecurityQuestions({ username });
      if (!r?.ok) throw new Error(r?.message || 'failed');
      return r?.data?.data ?? [];
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

  useEffect(() => {
    if (method === 'question' && !questionsAvailable) setMethod('pin');
  }, [method, questionsAvailable]);

  const showError = (m) =>
    Toast.show({ type: 'error', text1: t('security.tpErrorTitle'), text2: m });
  const missing = () =>
    Toast.show({
      type: 'error',
      text1: t('security.tpMissingFields'),
      text2: t('security.tpMissingFieldsMsg'),
    });

  const handleSendOtp = async () => {
    if (otpCooldown > 0 || sendingOtp) return;
    setSendingOtp(true);
    try {
      const r = await generateOtp(null, { source: 'sms', username, otpLength: 6 });
      if (r?.ok) {
        Toast.show({
          type: 'success',
          text1: t('security.tpOtpSent'),
          text2: t('security.tpOtpSentMsg'),
        });
        setOtpCooldown(OTP_COOLDOWN_SECONDS);
      } else {
        showError(r?.message);
      }
    } catch (e) {
      showError(e?.message);
    } finally {
      setSendingOtp(false);
    }
  };

  const handleConfirm = () => {
    Keyboard.dismiss();
    let cred;
    if (method === 'pin') {
      if (!transactionPin.trim()) return missing();
      cred = { transactionPin: transactionPin.trim() };
    } else if (method === 'question') {
      if (!securityQuestion || !securityAnswer.trim()) return missing();
      cred = { securityQuestion, securityAnswer: securityAnswer.trim() };
    } else {
      if (!otp.trim()) return missing();
      cred = { otp: otp.trim() };
    }
    onConfirm(cred);
  };

  const otpLabel = sendingOtp
    ? t('security.tpSending')
    : otpCooldown > 0
      ? t('security.tpResendIn', { time: fmt(otpCooldown) })
      : t('security.tpSendCode');

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      {/* Simple keyboard handling (same as the rest of the app's input sheets):
          an RN <Modal> renders in its own window, which under Android "pan" is
          inert — so we lift the sheet by the measured keyboard height. iOS keeps
          KeyboardAvoidingView. See app/hooks/useKeyboardHeight. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}
        style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Tap-outside-to-close backdrop (sits behind the sheet). */}
        <TouchableWithoutFeedback onPress={submitting ? undefined : onClose}>
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          />
        </TouchableWithoutFeedback>
        <View
          className="px-5 pt-3"
          style={{
            paddingBottom: 28,
            maxHeight: '90%',
            marginBottom: keyboardHeight,
            backgroundColor: colors.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}>
          <View className="mb-4 items-center">
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View className="mb-5 flex-row items-center">
              <View
                className="mr-3 h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: colors.primaryLight }}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              </View>
              <View className="flex-1">
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
                  {title ?? t('security.tpStepUpTitle')}
                </Text>
                <Text className="mt-0.5" style={{ fontSize: 13, color: colors.inkMuted }}>
                  {description ?? t('security.tpChooseMethod')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                disabled={submitting}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.cardMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Ionicons name="close" size={18} color={colors.ink} />
              </TouchableOpacity>
            </View>

            <View className="mb-6 flex-row" style={{ gap: 10 }}>
              {availableMethods.map((m) => {
                const sel = method === m.key;
                return (
                  <TouchableOpacity
                    key={m.key}
                    onPress={() => setMethod(m.key)}
                    activeOpacity={0.85}
                    className="flex-1 items-center rounded-2xl py-3.5"
                    style={{
                      backgroundColor: sel ? colors.primaryLight : colors.cardMuted,
                      borderWidth: 1.5,
                      borderColor: sel ? colors.primary : colors.line,
                    }}>
                    <Ionicons
                      name={m.icon}
                      size={22}
                      color={sel ? colors.primary : colors.inkMuted}
                    />
                    <Text
                      className="mt-1.5 text-xs font-semibold"
                      style={{ color: sel ? colors.primary : colors.ink }}>
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
                <View className="mb-2 flex-row items-start">
                  <Ionicons
                    name="warning-outline"
                    size={14}
                    color={colors.warning}
                    style={{ marginTop: 2 }}
                  />
                  <Text className="ml-1.5 flex-1 text-xs" style={{ color: colors.warning }}>
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
                    {otpLabel}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchBtn
              onPress={handleConfirm}
              label={t('security.tpConfirm')}
              isLoading={submitting}
              loadingText={t('security.tpWorking')}
              textClassName="text-base font-semibold"
              buttonClassName="items-center rounded-xl py-4"
              containerClassName="mt-2"
              textColor={colors.onPrimary}
              loadingColor={colors.onPrimary}
              activeOpacity={0.85}
            />
            <TouchableOpacity
              onPress={onClose}
              disabled={submitting}
              className="mt-3 items-center rounded-xl py-4"
              style={{ backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line }}>
              <Text className="text-base font-semibold" style={{ color: colors.ink }}>
                {t('security.tpCancel')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
