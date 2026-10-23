// components/repaymentModal.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import TouchBtn from 'components/touchBtn';
import Input from 'components/textInputs';
import { useTheme } from 'config/ThemeContext';
import useKeyboardHeight from 'app/hooks/useKeyboardHeight';
import { formatAmount, trimMessage, formatWithCommas, stripCommas } from 'helper';
import { repayLoan } from 'api/loans';
import { useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

// ─── Detail Row (local copy, used only inside the result modal) ───────────────

function DetailRow({ label, value, valueStyle, colors }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}>
      <Text style={{ fontSize: 13, color: colors.inkMuted, flex: 1 }}>{label}</Text>
      <Text
        style={[
          { fontSize: 13, fontWeight: '600', color: colors.ink, textAlign: 'right', flex: 1 },
          valueStyle,
        ]}
        numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

// ─── Repayment Modal ────────────────────────────────────────────────────────
// Self-contained: owns the "enter amount" step and the "result" step.
// Parent just controls whether it's open, and is notified via `onSuccess`
// whenever a repayment actually goes through so it can update its own
// copy of the loan (status, progress, schedule) without waiting for a
// full navigation round-trip / refetch.

export default function RepaymentModal({ visible, onClose, item, statusConfig, onSuccess }) {
  const { colors, shadows, isDark } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  // Android: the modal's window isn't resized for the keyboard, so the sheet
  // lifts by the measured height (see app/hooks/useKeyboardHeight).
  const keyboardHeight = useKeyboardHeight();
  const [repaymentOption, setRepaymentOption] = useState('Full'); // 'Full' | 'Partial'
  const [amount, setAmount] = useState(
    item?.totalRepaymentAmount != null ? formatWithCommas(String(item.totalRepaymentAmount)) : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);

  const resetForm = () => {
    setRepaymentOption('Full');
    setAmount(
      item?.totalRepaymentAmount != null ? formatWithCommas(String(item.totalRepaymentAmount)) : ''
    );
    setAmountError('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose?.();
  };

  const handleSelectOption = (option) => {
    setRepaymentOption(option);
    setAmountError('');
    if (option === 'Full') {
      setAmount(
        item?.totalRepaymentAmount != null
          ? formatWithCommas(String(item.totalRepaymentAmount))
          : ''
      );
    } else {
      setAmount('');
    }
  };

  const handleAmountChange = (text) => {
    setAmount(formatWithCommas(text));
    if (amountError) setAmountError('');
  };

  const handleConfirmRepayment = async () => {
    if (repaymentOption === 'Partial' && (!amount || Number(stripCommas(amount)) <= 0)) {
      setAmountError(t('components.repayment.invalidAmountMessage'));
      Toast.show({
        type: 'error',
        text1: t('components.repayment.invalidAmount'),
        text2: t('components.repayment.invalidAmountMessage'),
      });
      return;
    }

    Keyboard.dismiss();
    setIsSubmitting(true);

    const payload = {
      loanId: item?.loanId ?? item?.id,
      amount: Number(stripCommas(amount)),
      option: repaymentOption,
    };

    const response = await repayLoan(payload);

    setIsSubmitting(false);

    if (response?.ok) {
      setTransactionResult({
        success: true,
        message: t('components.repayment.successMessage'),
        option: repaymentOption,
        amount: Number(stripCommas(amount)),
        reference: response?.data?.referenceId ?? response?.data?.data?.referenceId,
      });

      // Tell the parent screen a repayment just succeeded. We pass along
      // whatever loan data the API echoed back — some backends return the
      // updated loan under `data`, some under `data.data`. The parent uses
      // it ONLY if it contains a real loanStatus; otherwise it refetches
      // the authoritative loan from the backend. The status is never
      // assumed from the request succeeding.
      const updatedLoan = response?.data?.data ?? response?.data ?? null;
      onSuccess?.(updatedLoan, { option: repaymentOption, amount: Number(stripCommas(amount)) });

      // A repayment moves money, so every cached view of it is now stale:
      // the wallet balance + recent transactions (dashboard), the loans list
      // and the transaction history. Mark them stale so each refetches from
      // the backend the next time it's shown — same as a completed transfer.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['myLoans'] });
      queryClient.invalidateQueries({ queryKey: ['transactionHistory'] });
    } else {
      setTransactionResult({
        success: false,
        message: trimMessage(response?.message) || t('components.repayment.failureMessage'),
        option: repaymentOption,
        amount: Number(stripCommas(amount)),
      });
    }

    setResultModalVisible(true);
  };

  const handleResultDone = () => {
    setResultModalVisible(false);
    setTransactionResult(null);
    resetForm();
    onClose?.();
  };

  const handleTryAgain = () => {
    setResultModalVisible(false);
    setTransactionResult(null);
  };

  return (
    <>
      {/* Amount / option entry */}
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
          style={{ flex: 1 }}>
          {/* Tapping the dimmed backdrop closes the sheet (handleClose is a
                        no-op while a repayment is submitting). */}
          <TouchableWithoutFeedback onPress={handleClose}>
            <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <TouchableWithoutFeedback onPress={() => {}}>
                <View
                  className="px-6 pt-3"
                  style={{
                    paddingBottom: 32,
                    maxHeight: '90%',
                    marginBottom: keyboardHeight,
                    backgroundColor: colors.card,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                  }}>
                  <View className="mb-4 items-center">
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        borderRadius: 2,
                        backgroundColor: colors.line,
                      }}
                    />
                  </View>

                  <View className="mb-1 flex-row items-center justify-between">
                    <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
                      {t('components.repayment.title')}
                    </Text>
                    <TouchableOpacity
                      onPress={handleClose}
                      disabled={isSubmitting}
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

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag">
                    {/* Loan summary */}
                    <View
                      className="mb-6 mt-3 flex-row items-center rounded-2xl p-4"
                      style={{
                        backgroundColor: colors.cardMuted,
                        borderWidth: 1,
                        borderColor: colors.line,
                      }}>
                      <View
                        className="mr-3 h-10 w-10 items-center justify-center rounded-full"
                        style={{ backgroundColor: statusConfig?.badge?.bgColor }}>
                        <Ionicons
                          name="card-outline"
                          size={20}
                          color={statusConfig?.badge?.textColor}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold" style={{ color: colors.ink }}>
                          {t('components.repayment.loanLabel', { code: item?.loanCode ?? '—' })}
                        </Text>
                        <Text className="text-xs" style={{ color: colors.inkMuted }}>
                          {t('components.repayment.totalRepayment', {
                            amount: formatAmount(item?.totalRepaymentAmount),
                          })}
                        </Text>
                      </View>
                    </View>

                    {!isSubmitting ? (
                      <>
                        {/* Option toggle */}
                        <Text className="mb-2 text-sm font-semibold" style={{ color: colors.ink }}>
                          {t('components.repayment.option')}
                        </Text>
                        <View className="mb-5 flex-row gap-3">
                          {['Full', 'Partial'].map((option) => {
                            const selected = repaymentOption === option;
                            return (
                              <TouchableOpacity
                                key={option}
                                onPress={() => handleSelectOption(option)}
                                activeOpacity={0.8}
                                className="flex-1 items-center rounded-xl border py-3"
                                style={{
                                  borderColor: selected ? colors.primary : colors.line,
                                  backgroundColor: selected ? colors.primaryLight : colors.card,
                                }}>
                                <Text
                                  className="text-sm font-semibold"
                                  style={{ color: selected ? colors.primary : colors.ink }}>
                                  {option === 'Full'
                                    ? t('components.repayment.full')
                                    : t('components.repayment.partial')}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {/* Amount */}
                        <Input
                          label={t('components.repayment.amount')}
                          value={amount}
                          onChangeText={handleAmountChange}
                          placeholder="₦0.00"
                          keyboardType="decimal-pad"
                          editable={repaymentOption === 'Partial'}
                          error={amountError}
                          isLoading={false}
                          containerStyle={{ marginBottom: 24 }}
                        />

                        <TouchBtn
                          onPress={handleConfirmRepayment}
                          label={t('components.repayment.confirm')}
                          textClassName="text-base font-semibold"
                          textColor={colors.onPrimary}
                          buttonClassName="items-center rounded-lg py-4"
                          backgroundColor={colors.primary}
                          containerClassName=""
                          activeOpacity={0.8}
                        />
                      </>
                    ) : (
                      <View className="items-center py-12">
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text className="mt-4 text-sm" style={{ color: colors.inkMuted }}>
                          {t('components.repayment.processing')}
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* Result */}
      <Modal
        visible={resultModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}>
        <View
          className="flex-1 items-center justify-center px-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View
            className="w-full p-6"
            style={[{ backgroundColor: colors.card, borderRadius: 24 }, shadows.md]}>
            <View className="mb-4 items-center">
              <View
                className="h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: transactionResult?.success
                    ? colors.successSoft
                    : colors.dangerSoft,
                }}>
                <Ionicons
                  name={transactionResult?.success ? 'checkmark' : 'close'}
                  size={34}
                  color={transactionResult?.success ? colors.success : colors.danger}
                />
              </View>
            </View>

            <Text
              className="mb-1 text-center"
              style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>
              {transactionResult?.success
                ? t('components.repayment.successTitle')
                : t('components.repayment.failureTitle')}
            </Text>

            <Text
              className="mb-5 text-center"
              style={{ fontSize: 14, lineHeight: 20, color: colors.inkMuted }}>
              {transactionResult?.message}
            </Text>

            {transactionResult?.success && (
              <View
                className="mb-6 rounded-2xl px-4 py-1"
                style={{
                  backgroundColor: colors.cardMuted,
                  borderWidth: 1,
                  borderColor: colors.line,
                }}>
                <DetailRow
                  label={t('components.repayment.loanId')}
                  value={item?.loanCode}
                  colors={colors}
                />
                <DetailRow
                  label={t('components.repayment.optionLabel')}
                  value={transactionResult?.option}
                  colors={colors}
                />
                <DetailRow
                  label={t('components.repayment.amount')}
                  value={`₦${formatAmount(transactionResult?.amount)}`}
                  colors={colors}
                />
                <DetailRow
                  label={t('components.repayment.reference')}
                  value={transactionResult?.reference}
                  colors={colors}
                />
              </View>
            )}

            {transactionResult?.success ? (
              <TouchBtn
                onPress={handleResultDone}
                label={t('components.repayment.done')}
                textClassName="text-base font-semibold"
                textColor={colors.onPrimary}
                buttonClassName="items-center rounded-lg py-4"
                backgroundColor={colors.primary}
                containerClassName=""
                activeOpacity={0.8}
              />
            ) : (
              <View>
                <TouchBtn
                  onPress={handleTryAgain}
                  label={t('components.repayment.tryAgain')}
                  textClassName="text-base font-semibold"
                  textColor={colors.onPrimary}
                  buttonClassName="items-center rounded-lg py-4"
                  backgroundColor={colors.primary}
                  containerClassName=""
                  activeOpacity={0.8}
                />
                <TouchableOpacity
                  onPress={handleResultDone}
                  className="mt-3 items-center rounded-xl py-4"
                  style={{
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.line,
                  }}>
                  <Text className="text-base font-semibold" style={{ color: colors.ink }}>
                    {t('components.repayment.cancel')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
