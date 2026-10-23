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
import { getFullRepaymentQuote, repayLoan } from 'api/loans';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// ─── Full repayment quote ─────────────────────────────────────────────────────
// Shows the backend's liquidation quote as-is: every figure is a field of the
// response (amountDueNow, outstandingPrincipal, settlementInterest,
// totalSettlementAmount, interestSaved, accountBalance).

function FullRepaymentQuote({ query, quote, insufficientBalance, colors, t }) {
  if (query.isFetching) {
    return (
      <View className="mb-6 flex-row items-center justify-center py-6" style={{ gap: 10 }}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ fontSize: 13, color: colors.inkMuted }}>
          {t('components.repayment.quoteLoading')}
        </Text>
      </View>
    );
  }

  if (query.isError || !quote) {
    return (
      <View
        className="mb-6 rounded-2xl p-4"
        style={{ backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.line }}>
        <Text style={{ fontSize: 13, color: colors.danger }}>
          {trimMessage(query.error?.message) || t('components.repayment.quoteError')}
        </Text>
        <TouchableOpacity onPress={() => query.refetch()} className="mt-2 self-start">
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
            {t('components.repayment.retry')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const rows = [
    Number(quote.amountDueNow) > 0 && {
      label: t('components.repayment.amountDueNow'),
      value: quote.amountDueNow,
    },
    { label: t('components.repayment.outstandingPrincipal'), value: quote.outstandingPrincipal },
    Number(quote.settlementInterest) > 0 && {
      label: t('components.repayment.settlementInterest'),
      value: quote.settlementInterest,
    },
  ].filter(Boolean);

  return (
    <View className="mb-6">
      <View
        className="rounded-2xl px-4 py-1"
        style={{ backgroundColor: colors.cardMuted, borderWidth: 1, borderColor: colors.line }}>
        {rows.map((row) => (
          <DetailRow
            key={row.label}
            label={row.label}
            value={formatAmount(row.value)}
            colors={colors}
          />
        ))}
        <View className="flex-row items-center justify-between py-3">
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.ink }}>
            {t('components.repayment.totalToPay')}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink }}>
            {formatAmount(quote.totalSettlementAmount)}
          </Text>
        </View>
      </View>

      {quote.liquidation && Number(quote.interestSaved) > 0 && (
        <View
          className="mt-3 flex-row items-center rounded-xl px-3 py-2.5"
          style={{ gap: 8, backgroundColor: colors.successSoft }}>
          <Ionicons name="pricetag-outline" size={16} color={colors.success} />
          <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.success }}>
            {t('components.repayment.interestSaved', {
              amount: formatAmount(quote.interestSaved),
            })}
          </Text>
        </View>
      )}

      {insufficientBalance && (
        <View
          className="mt-3 flex-row rounded-xl px-3 py-2.5"
          style={{ gap: 8, backgroundColor: colors.dangerSoft }}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={{ flex: 1, fontSize: 13, lineHeight: 18, color: colors.danger }}>
            {t('components.repayment.insufficientBalance', {
              balance: formatAmount(quote.accountBalance),
              amount: formatAmount(quote.totalSettlementAmount),
            })}
          </Text>
        </View>
      )}
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
  // Only used for Partial; Full pays the backend's quoted total.
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amountError, setAmountError] = useState('');

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);

  const loanId = item?.loanId ?? item?.id;
  const isFull = repaymentOption === 'Full';

  // Full repayment is a liquidation: the backend quotes the payoff (amount due
  // + outstanding principal + one cycle of interest) and debits exactly that.
  // Fetched fresh every time the sheet opens on Full, never computed here.
  const quoteQuery = useQuery({
    queryKey: ['loanFullRepaymentQuote', loanId],
    queryFn: async () => {
      const response = await getFullRepaymentQuote(loanId);
      if (!response?.ok) throw new Error(response?.message);
      return response?.data?.responseBody ?? response?.data?.data ?? null;
    },
    enabled: Boolean(visible && isFull && loanId != null),
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
  // While a fresh quote is loading, show none: the modal stays mounted, so the
  // previous quote is still cached and could otherwise be shown (and paid).
  const quote = quoteQuery.isFetching ? undefined : quoteQuery.data;
  const fullTotal = quote?.totalSettlementAmount;
  const insufficientBalance = quote?.sufficientBalance === false;

  const resetForm = () => {
    setRepaymentOption('Full');
    setAmount('');
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
    setAmount('');
  };

  const handleAmountChange = (text) => {
    setAmount(formatWithCommas(text));
    if (amountError) setAmountError('');
  };

  const handleConfirmRepayment = async () => {
    if (isFull && (fullTotal == null || insufficientBalance)) return;

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

    // Full sends no amount: the backend charges its own liquidation figure.
    const payload = isFull
      ? { loanId, option: 'Full' }
      : { loanId, amount: Number(stripCommas(amount)), option: 'Partial' };
    const paidAmount = isFull ? fullTotal : Number(stripCommas(amount));

    const response = await repayLoan(payload);

    setIsSubmitting(false);

    if (response?.ok) {
      setTransactionResult({
        success: true,
        message: isFull
          ? t('components.repayment.fullSuccessMessage')
          : t('components.repayment.successMessage'),
        option: repaymentOption,
        amount: paidAmount,
        reference: response?.data?.referenceId ?? response?.data?.data?.referenceId,
      });

      // Tell the parent screen a repayment just succeeded. We pass along
      // whatever loan data the API echoed back — some backends return the
      // updated loan under `data`, some under `data.data`. The parent uses
      // it ONLY if it contains a real loanStatus; otherwise it refetches
      // the authoritative loan from the backend. The status is never
      // assumed from the request succeeding.
      const updatedLoan = response?.data?.data ?? response?.data ?? null;
      onSuccess?.(updatedLoan, { option: repaymentOption, amount: paidAmount });

      // A repayment moves money, so every cached view of it is now stale:
      // the wallet balance + recent transactions (dashboard), the loans list
      // and the transaction history. Mark them stale so each refetches from
      // the backend the next time it's shown — same as a completed transfer.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['myLoans'] });
      queryClient.invalidateQueries({ queryKey: ['transactionHistory'] });
      queryClient.removeQueries({ queryKey: ['loanFullRepaymentQuote', loanId] });
    } else {
      setTransactionResult({
        success: false,
        message: trimMessage(response?.message) || t('components.repayment.failureMessage'),
        option: repaymentOption,
        amount: paidAmount,
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

                        {isFull ? (
                          <FullRepaymentQuote
                            query={quoteQuery}
                            quote={quote}
                            insufficientBalance={insufficientBalance}
                            colors={colors}
                            t={t}
                          />
                        ) : (
                          <Input
                            label={t('components.repayment.amount')}
                            value={amount}
                            onChangeText={handleAmountChange}
                            placeholder="₦0.00"
                            keyboardType="decimal-pad"
                            error={amountError}
                            isLoading={false}
                            containerStyle={{ marginBottom: 24 }}
                          />
                        )}

                        <TouchBtn
                          onPress={handleConfirmRepayment}
                          disabled={isFull && (fullTotal == null || insufficientBalance)}
                          label={
                            isFull && fullTotal != null
                              ? t('components.repayment.payAmount', {
                                  amount: formatAmount(fullTotal),
                                })
                              : t('components.repayment.confirm')
                          }
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
                  value={formatAmount(transactionResult?.amount)}
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
