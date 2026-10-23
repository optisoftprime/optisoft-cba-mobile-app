import { getTransactionHistory, downloadStatement } from 'api/transactions';
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import Header from 'components/header';
import { navigateBack } from 'app/navigate';
import { formatAmount } from 'helper';
import Toast from 'react-native-toast-message';
import TransactionDetailModal from './../../components/transactionDetailsModal';
import StatementFormatModal from './../../components/statementFormatModal';
import { formatPaymentDate } from 'utils/dates';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateParam(date) {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);

  return date
    .toLocaleTimeString('en-NG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
}
function groupTransactionsByDate(transactions, t) {
  const groups = {};
  for (const tx of transactions) {
    const date = new Date(tx?.transactionDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let label;
    if (date.toDateString() === today.toDateString()) {
      label = t('transactions.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = t('transactions.yesterday');
    } else {
      label = date.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  }
  return groups;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ width, height, radius = 6, style }) {
  const { colors } = useTheme();
  return (
    <View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.border }, style]}
    />
  );
}

function TransactionSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ borderRadius: 12, backgroundColor: colors.cardBackground, overflow: 'hidden' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: i < 5 ? 1 : 0,
            borderBottomColor: colors.border,
          }}>
          <Skeleton width={48} height={48} radius={24} />
          <View style={{ marginLeft: 12, flex: 1, gap: 6 }}>
            <Skeleton width="60%" height={13} />
            <Skeleton width="40%" height={11} style={{ marginTop: 4 }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Skeleton width={72} height={13} />
            <Skeleton width={52} height={11} style={{ marginTop: 4 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Transaction Item ─────────────────────────────────────────────────────────

function TransactionItem({ tx, onPress }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isSuccessful =
    tx?.status?.toLowerCase() === 'successful' ||
    tx?.status?.toLowerCase() === 'success' ||
    tx?.status?.toLowerCase() === 'approved';

  const initials = tx?.customerName
    ? tx.customerName
        .split(' ')
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join('')
    : '?';

  const isDeposit = tx.transactionType === 'Deposit';
  return (
    <TouchableOpacity
      onPress={() => onPress(tx)}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}>
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: colors.primaryDark }}>
          {initials}
        </Text>
      </View>

      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }}
          numberOfLines={1}>
          {tx?.recipientName || tx?.description || t('transactions.transaction')}
        </Text>
        <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}>
          {/* {tx?.transactionType} • {formatTime(tx?.transactionDate)} */}
          {formatTime(tx?.transactionDate)} • {formatPaymentDate(tx?.transactionDate)}
        </Text>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: isDeposit ? colors.success : colors.textPrimary,
          }}>
          {isDeposit ? '+' : ''}
          {formatAmount(tx?.amount)}
        </Text>
        {/* <Text style={{ marginTop: 2, fontSize: 12, color: isSuccessful ? '#059669' : '#D97706' }}>
                    {tx?.status}
                </Text> */}
      </View>
    </TouchableOpacity>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyTransactions() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <View
        style={{
          marginBottom: 12,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />
      </View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textSecondary }}>
        {t('transactions.noTransactions')}
      </Text>
      <Text style={{ marginTop: 4, fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
        {t('transactions.adjustDateRange')}
      </Text>
    </View>
  );
}

// ─── Date Picker Button ───────────────────────────────────────────────────────

function DatePickerButton({ label, date, onPress }) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: colors.cardBackground,
      }}>
      <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 13, fontWeight: '500', color: colors.textPrimary }}>
          {formatDisplayDate(date)}
        </Text>
        <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AllTransactions() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const today = new Date();
  const twoWeeksAgo = new Date(today);
  twoWeeksAgo.setDate(today.getDate() - 14);

  const [startDate, setStartDate] = useState(twoWeeksAgo);
  const [endDate, setEndDate] = useState(today);
  const [appliedStart, setAppliedStart] = useState(twoWeeksAgo);
  const [appliedEnd, setAppliedEnd] = useState(today);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [isSending, setIsSending] = useState(false);
  const [showFormatModal, setShowFormatModal] = useState(false);

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['transactionHistory', formatDateParam(appliedStart), formatDateParam(appliedEnd)],
    queryFn: async () => {
      const response = await getTransactionHistory({
        startDate: formatDateParam(appliedStart),
        endDate: formatDateParam(appliedEnd),
      });
      console.log(JSON.stringify(response, null, 2));
      if (!response?.ok) throw new Error(response?.message);
      return response?.data?.data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const transactionGroups = data?.length ? groupTransactionsByDate(data, t) : null;

  console.log(JSON.stringify(transactionGroups, null, 2), 'transaction history ');

  function handleApplyFilter() {
    if (startDate > endDate) {
      Toast.show({
        type: 'error',
        text1: t('transactions.invalidRange'),
        text2: t('transactions.invalidRangeSub'),
      });
      return;
    }
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  }

  function handleTransactionPress(tx) {
    setSelectedTransaction(tx);
    setModalVisible(true);
  }

  function handleCloseModal() {
    setModalVisible(false);
    setSelectedTransaction(null);
  }

  async function handleRequestStatement(format) {
    setShowFormatModal(false);
    setIsSending(true);

    try {
      const response = await downloadStatement({
        startDate: formatDateParam(appliedStart),
        endDate: formatDateParam(appliedEnd),
        format,
      });

      console.log(
        JSON.stringify(
          response,
          formatDateParam(appliedStart),
          formatDateParam(appliedEnd),
          null,
          2
        ),
        'download statement response'
      );

      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('transactions.statementSent'),
          text2: t('transactions.statementSentSub'),
        });
      } else {
        Toast.show({
          type: 'error',
          text1: t('transactions.failed'),
          text2: response?.message || t('transactions.statementFailed'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('transactions.error'),
        text2: t('transactions.somethingWrong'),
      });
    } finally {
      setIsSending(false);
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={t('transactions.title')}
        onLeftPress={() => navigateBack()}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      {/* ── Date Filter ── */}
      <View
        style={{
          backgroundColor: colors.cardBackground,
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
          <DatePickerButton
            label={t('transactions.startDate')}
            date={startDate}
            onPress={() => setShowStartPicker(true)}
          />
          <DatePickerButton
            label={t('transactions.endDate')}
            date={endDate}
            onPress={() => setShowEndPicker(true)}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {/* Filter Button */}
          <TouchableOpacity
            onPress={handleApplyFilter}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingVertical: 11,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}>
            <Ionicons name="filter-outline" size={16} color="white" />
            <Text style={{ color: 'white', fontWeight: '600', fontSize: 14 }}>
              {t('transactions.filter')}
            </Text>
          </TouchableOpacity>

          {/* Statement Button */}
          <TouchableOpacity
            onPress={() => setShowFormatModal(true)}
            disabled={isSending}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: isSending ? colors.border : colors.cardBackground,
              borderWidth: 1,
              borderColor: isSending ? colors.border : colors.success,
              borderRadius: 10,
              paddingVertical: 11,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 6,
            }}>
            <Ionicons
              name="mail-outline"
              size={16}
              color={isSending ? colors.textMuted : colors.success}
            />
            <Text
              style={{
                color: isSending ? colors.textMuted : colors.success,
                fontWeight: '600',
                fontSize: 14,
              }}>
              {isSending ? t('transactions.sending') : t('transactions.statement')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Date Pickers ── */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          maximumDate={endDate}
          onChange={(event, selected) => {
            setShowStartPicker(false);
            if (selected) setStartDate(selected);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={startDate}
          maximumDate={today}
          onChange={(event, selected) => {
            setShowEndPicker(false);
            if (selected) setEndDate(selected);
          }}
        />
      )}

      {/* ── Transaction List ── */}
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-4 py-4">
          {isLoading ? (
            <TransactionSkeleton />
          ) : transactionGroups ? (
            Object.entries(transactionGroups).map(([dateLabel, txs]) => (
              <View key={dateLabel} className="mb-4">
                <Text className="mb-2 text-xs" style={{ color: colors.textSecondary }}>
                  {dateLabel}
                </Text>
                <View
                  style={
                    Platform.OS === 'android'
                      ? {
                          borderRadius: 12,
                          backgroundColor: colors.cardBackground,
                          elevation: 2,
                          overflow: 'hidden',
                        }
                      : {
                          borderRadius: 12,
                          backgroundColor: colors.cardBackground,
                          overflow: 'hidden',
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 3,
                        }
                  }>
                  {txs.map((tx) => (
                    <TransactionItem
                      key={tx?.id ?? tx?.transactionId}
                      tx={tx}
                      onPress={handleTransactionPress}
                    />
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View
              style={{
                borderRadius: 12,
                backgroundColor: colors.cardBackground,
                overflow: 'hidden',
                ...(Platform.OS === 'android' ? { elevation: 2 } : {}),
              }}>
              <EmptyTransactions />
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Format Picker Modal ── */}
      <StatementFormatModal
        visible={showFormatModal}
        onClose={() => setShowFormatModal(false)}
        onSelect={handleRequestStatement}
        isDownloading={isSending}
      />

      {/* ── Transaction Detail Modal ── */}
      <TransactionDetailModal
        visible={modalVisible}
        onClose={handleCloseModal}
        transaction={selectedTransaction}
      />
    </View>
  );
}
