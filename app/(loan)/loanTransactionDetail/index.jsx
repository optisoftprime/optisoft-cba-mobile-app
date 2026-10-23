// screens/LoanTransactionDetail.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Header from 'components/header';
import RepaymentModal from 'components/repaymentModal';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { getMyLoans } from 'api/loans';
import { formatAmount, formatDate, formatTenure, getLoanStatusConfig } from 'helper';

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({ label, value, valueStyle, last = false }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3.5 ${last ? '' : 'border-b border-line'}`}>
      <Text className="flex-1 text-[13px] text-ink-muted">{label}</Text>
      <Text
        className="flex-1 text-right text-[13px] font-semibold text-ink"
        style={valueStyle}
        numberOfLines={2}>
        {value ?? '—'}
      </Text>
    </View>
  );
}

// ─── Summary Tile ─────────────────────────────────────────────────────────────

function SummaryTile({ label, value, color }) {
  const { colors, shadows } = useTheme();
  return (
    <View
      className="flex-1 items-center rounded-2xl border border-line bg-card px-2 py-3.5"
      style={shadows.sm}>
      <Text className="mb-1 text-center text-[11px] text-ink-muted">{label}</Text>
      <Text
        style={{ fontSize: 13, fontWeight: '700', color: color ?? colors.ink, textAlign: 'center' }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.65}>
        {value}
      </Text>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// The status badge / repay button take their colours from the theme (the
// shared helper's config still carries the labels and icons), so they read
// correctly in both light and dark mode.
function getStatusTone(status, colors) {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed' || s === 'paid' || s === 'running')
    return { bg: colors.successSoft, fg: colors.onSuccessSoft };
  if (s === 'declined' || s === 'due') return { bg: colors.dangerSoft, fg: colors.onDangerSoft };
  if (s === 'processing') return { bg: colors.warningSoft, fg: colors.onWarningSoft };
  if (s === 'approved') return { bg: colors.infoSoft, fg: colors.onInfoSoft };
  return { bg: colors.cardMuted, fg: colors.inkMuted };
}

// The schedule dates come back from the API as "DD-MM-YYYY HH:mm:ss"
// (e.g. "24-05-2026 17:33:14"), unlike the other date fields on the loan
// which are already ISO strings. `new Date()` can't parse the DD-MM-YYYY
// form reliably (it's ambiguous with MM-DD-YYYY), which is what was
// producing "Invalid Date". Convert it to an ISO-like string first.
function toIsoFromScheduleDate(dateStr) {
  if (!dateStr) return null;
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return null;
  const [day, month, year] = datePart.split('-');
  if (!day || !month || !year) return null;
  return `${year}-${month}-${day}T${timePart ?? '00:00:00'}`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoanTransactionDetail() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  // Parse the loan snapshot passed via navigation ONCE, as the initial
  // value of state (not a plain const). This is what lets us update the
  // screen in place after a successful repayment instead of showing a
  // stale snapshot until the user backs out and back in again.
  const [item, setItem] = useState(() => {
    try {
      return params?.item ? JSON.parse(params.item) : {};
    } catch {
      return {};
    }
  });

  const statusConfig = getLoanStatusConfig(item.loanStatus);
  const canRepay = statusConfig.button.action === 'repayment';
  const statusTone = getStatusTone(item.loanStatus, colors);
  const isDue = (item.loanStatus ?? '').toLowerCase() === 'due';
  const repayButton = isDue
    ? { bg: colors.danger, fg: colors.onDanger }
    : { bg: colors.primary, fg: colors.onPrimary };

  // Amount the customer actually receives: the backend's netDisbursementAmount
  // (principal minus all fees, which are deducted up front at disbursement).
  // Rendered verbatim — the fee math is server-side (the per-fee amounts aren't a
  // simple percentage of principal), so we never recompute it on the client.
  const disbursedAmount =
    item.netDisbursementAmount ?? item.disbursedAmount ?? item.amountDisbursed ?? null;

  // All fees the backend reports, deducted from the principal at disbursement.
  // We only list the ones that are non-zero, and show the backend's totalFees as
  // the sum (never summed on the client).
  const feeRows = [
    { label: t('loans.processingFee'), value: item.processingFeeAmount },
    { label: t('loans.insuranceFee'), value: item.insuranceFee },
    { label: t('loans.managementFee'), value: item.managementFee },
    { label: t('loans.vatOnManagementFee'), value: item.vatOnManagementFee },
    { label: t('loans.disbursementFee'), value: item.disbursementFee },
  ].filter((f) => Number(f.value) > 0);

  const [repaymentModalVisible, setRepaymentModalVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Two loan snapshots are "the same loan" if they share a stable identifier.
  const loanKey = (l) => l?.loanCode ?? l?.loanId ?? l?.id ?? null;

  // Pull-to-refresh: refetch this loan from the backend and update it in place,
  // so a status change (e.g. a just-approved loan) shows without leaving the
  // screen. Matches the loans list / other screens' drag-to-refresh.
  const refreshLoan = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await getMyLoans();
      const list = response?.ok ? response?.data?.data : null;
      if (Array.isArray(list)) {
        setItem((prev) => {
          const fresh = list.find((l) => loanKey(l) != null && loanKey(l) === loanKey(prev));
          return fresh ? { ...prev, ...fresh } : prev;
        });
      }
    } catch {
      // Keep the current snapshot — never fabricate on a failed refresh.
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Called by RepaymentModal after a successful repayment. The repayment
  // request succeeding does NOT tell us the loan's new state — that's the
  // backend's decision (Paid / Running / Completed / still partly owed). So we
  // never assume "Paid"; we take the authoritative loan back from the server:
  //   • if the repay response already echoed a full loan (has loanStatus), use it;
  //   • otherwise refetch the loans list and pick this loan out of it.
  // If the refetch fails we keep the truthful pre-repayment snapshot rather than
  // inventing a status (the list screen also refetches on focus).
  const handleRepaymentSuccess = useCallback(async (updatedLoan) => {
    if (updatedLoan?.loanStatus) {
      setItem((prev) => ({ ...prev, ...updatedLoan }));
      return;
    }

    try {
      setIsSyncing(true);
      const response = await getMyLoans();
      const list = response?.ok ? response?.data?.data : null;
      if (Array.isArray(list)) {
        setItem((prev) => {
          const fresh = list.find((l) => loanKey(l) != null && loanKey(l) === loanKey(prev));
          return fresh ? { ...prev, ...fresh } : prev;
        });
      }
    } catch {
      // Keep the existing (pre-repayment, but real) snapshot — never fabricate.
    } finally {
      setIsSyncing(false);
    }
  }, []);

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('loans.loanDetailsTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshLoan}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        {/* Loan Code + Status */}
        <View className="mb-5 items-center">
          <Text className="mb-2 text-[13px] text-ink-muted">
            {t('loans.loanId')}: <Text className="font-bold text-ink">{item.loanCode ?? '—'}</Text>
          </Text>
          <View
            className="flex-row items-center rounded-full px-3 py-1.5"
            style={{ gap: 6, backgroundColor: statusTone.bg }}>
            <Ionicons name={statusConfig.badge.icon} size={16} color={statusTone.fg} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: statusTone.fg }}>
              {item.loanStatus ?? '—'}
            </Text>
          </View>
          {isSyncing && (
            <Text className="mt-2 text-[11px] text-ink-soft">{t('loans.updatingStatus')}</Text>
          )}
        </View>

        {/* Principal Amount highlight */}
        <View className="mb-5 items-center rounded-3xl bg-primary p-5" style={shadows.md}>
          <Text className="mb-1 text-xs text-on-primary/70">{t('loans.principalAmount')}</Text>
          <Text className="text-[32px] font-extrabold text-on-primary">
            {formatAmount(item.principalAmount)}
          </Text>
          <Text className="mt-1 text-xs text-on-primary/60">
            {t('loans.account')} • {item.accountNumber ?? '—'}
          </Text>
        </View>

        {/* Summary Tiles */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
          <SummaryTile
            label={t('loans.totalRepayment')}
            value={formatAmount(item.totalRepaymentAmount)}
            color={colors.primary}
          />
          <SummaryTile
            label={t('loans.totalInterest')}
            value={formatAmount(item.totalInterestRate)}
            color={colors.warning}
          />
          <SummaryTile
            label={t('loans.totalFees')}
            value={formatAmount(item.totalFees)}
            color={colors.inkMuted}
          />
        </View>

        {/* Fee breakdown — the individual fees that make up totalFees, deducted
            from the principal at disbursement. Only non-zero fees are listed; the
            total is the backend's totalFees (never summed on the client). */}
        {feeRows.length > 0 && (
          <View className="mb-5 rounded-2xl border border-line bg-card px-4" style={shadows.sm}>
            <Text className="border-b border-line py-3.5 text-[15px] font-bold text-ink">
              {t('loans.feesTitle')}
            </Text>
            {feeRows.map((f, i) => (
              <DetailRow key={i} label={f.label} value={formatAmount(f.value)} />
            ))}
            <DetailRow
              label={t('loans.totalFees')}
              value={formatAmount(item.totalFees)}
              valueStyle={{ fontWeight: '700', color: colors.ink }}
              last
            />
          </View>
        )}

        {/* Make Repayment CTA — only for repayable statuses */}
        {canRepay && (
          <TouchableOpacity
            onPress={() => setRepaymentModalVisible(true)}
            activeOpacity={0.85}
            className="mb-5 flex-row items-center justify-center rounded-xl py-3.5"
            style={{ gap: 6, backgroundColor: repayButton.bg }}>
            <Ionicons name={statusConfig.button.icon} size={16} color={repayButton.fg} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: repayButton.fg }}>
              {statusConfig.button.label}
            </Text>
          </TouchableOpacity>
        )}

        {/* Loan Details Card */}
        <View className="mb-4 rounded-2xl border border-line bg-card px-4" style={shadows.sm}>
          <Text className="border-b border-line py-3.5 text-[15px] font-bold text-ink">
            {t('loans.loanInformation')}
          </Text>
          {disbursedAmount != null && (
            <DetailRow label={t('loans.amountDisbursed')} value={formatAmount(disbursedAmount)} />
          )}
          <DetailRow label={t('loans.interestRate')} value={`${item.interestRate ?? '—'}%`} />
          <DetailRow
            label={t('loans.interestType')}
            value={item.interestType?.replace(/_/g, ' ')}
          />
          <DetailRow
            label={t('loans.tenure')}
            value={formatTenure(t, item.tenureType, item.tenureDuration)}
          />
          <DetailRow label={t('loans.repaymentFrequency')} value={item.repaymentFrequency} />
          <DetailRow
            label={t('loans.repaymentStart')}
            value={formatDate(item.repaymentStartDate)}
          />
          <DetailRow
            label={t('loans.nextRepayment')}
            value={formatDate(item.nextRepaymentDate)}
            valueStyle={{ color: colors.primary }}
            last
          />
        </View>

        {/* Repayment Schedule Card — only if dates exist */}
        {item.repaymentScheduledDates?.length > 0 && (
          <View className="rounded-2xl border border-line bg-card px-4" style={shadows.sm}>
            <Text className="border-b border-line py-3.5 text-[15px] font-bold text-ink">
              {t('loans.repaymentSchedule')}
            </Text>
            {item.repaymentScheduledDates.map((schedule, index) => (
              <View
                key={index}
                className={`flex-row items-center py-3 ${
                  index < item.repaymentScheduledDates.length - 1 ? 'border-b border-line' : ''
                }`}
                style={{ gap: 12 }}>
                <View className="h-7 w-7 items-center justify-center rounded-full bg-primary-light">
                  <Text className="text-[11px] font-bold text-primary-dark">{index + 1}</Text>
                </View>
                <Text className="text-[13px] font-medium text-ink">
                  {formatDate(toIsoFromScheduleDate(schedule.repaymentDate))}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <RepaymentModal
        visible={repaymentModalVisible}
        onClose={() => setRepaymentModalVisible(false)}
        item={item}
        statusConfig={statusConfig}
        onSuccess={handleRepaymentSuccess}
      />
    </View>
  );
}
