import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { formatAmount } from 'helper';

// ─── Product summary pill shown beneath the product dropdown ─────────────────

export function ProductSummaryCard({ product }) {
  const { t } = useTranslation();
  if (!product) return null;
  return (
    <View className="mt-3 rounded-xl bg-primary-light px-3 py-2.5">
      <Text className="text-xs font-medium text-primary-dark">
        {t('loans.productSummary', {
          min: product.minimumLoanAmount?.toLocaleString(),
          max: product.maximumLoanAmount?.toLocaleString(),
          rate: product.interestRate,
          type: product.interestType?.replace(/_/g, ' '),
        })}
      </Text>
    </View>
  );
}

// ─── Fees breakdown card ──────────────────────────────────────────────────────

export function FeesCard({ fees }) {
  const { t } = useTranslation();
  if (!fees?.length) return null;
  return (
    <View className="mb-6 rounded-2xl border border-line bg-card p-4">
      <Text className="mb-3 text-[15px] font-semibold text-ink">{t('loans.fees')}</Text>
      {fees.map((fee) => (
        <View key={fee.label} className="mb-1 flex-row items-center justify-between">
          <Text className="text-sm text-ink-muted">• {fee.label}</Text>
          <Text className="text-sm font-medium text-ink">{fee.value}</Text>
        </View>
      ))}
    </View>
  );
}

// ─── Loan breakdown preview card (backend-computed, pre-booking) ──────────────
// Every figure here comes straight from the loan-preview endpoint. The only
// derived value is "Amount you'll receive" = principalAmount − fees.total, which
// is the backend's own definition of netDisbursementAmount (the preview returns
// principalAmount and fees.total; it doesn't send the net as a single field yet).

function BreakdownRow({ label, value, strong, muted }) {
  return (
    <View className="mb-1 flex-row items-center justify-between">
      <Text className={`text-sm ${muted ? 'text-ink-soft' : 'text-ink-muted'}`}>{label}</Text>
      <Text className={`text-sm text-ink ${strong ? 'font-bold' : 'font-medium'}`}>{value}</Text>
    </View>
  );
}

export function LoanPreviewCard({ preview, loading, error }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  if (loading) {
    return (
      <View className="mb-6 flex-row items-center justify-center rounded-2xl border border-line bg-card p-4">
        <ActivityIndicator size="small" color={colors.primary} />
        <Text className="ml-2 text-sm text-ink-muted">{t('loans.calculatingBreakdown')}</Text>
      </View>
    );
  }

  // Silently hide when there's nothing to show (no input yet, or preview failed)
  // — the user can still proceed; the real figures also appear after booking.
  if (error || !preview) return null;

  const fees = preview.fees ?? {};
  const totalFees = Number(fees.total) || 0;
  const principal = Number(preview.principalAmount) || 0;
  const amountToReceive = principal - totalFees;

  const feeRows = [
    { label: t('loans.processingFee'), value: fees.processingFee },
    { label: t('loans.insuranceFee'), value: fees.insuranceFee },
    { label: t('loans.managementFee'), value: fees.managementFee },
    { label: t('loans.vatOnManagementFee'), value: fees.vatOnManagementFee },
    { label: t('loans.disbursementFee'), value: fees.disbursementFee },
  ].filter((f) => Number(f.value) > 0);

  return (
    <View className="mb-6 rounded-2xl border border-line bg-card p-4">
      <Text className="mb-3 text-[15px] font-semibold text-ink">{t('loans.loanBreakdown')}</Text>

      {/* Amount the customer actually receives (principal − fees) */}
      <View className="mb-3 flex-row items-center justify-between rounded-xl bg-primary-light px-3 py-2.5">
        <Text className="text-sm font-medium text-primary-dark">{t('loans.amountToReceive')}</Text>
        <Text className="text-base font-extrabold text-primary-dark">
          {formatAmount(amountToReceive)}
        </Text>
      </View>

      {feeRows.map((f) => (
        <BreakdownRow key={f.label} label={`• ${f.label}`} value={formatAmount(f.value)} muted />
      ))}
      {totalFees > 0 && (
        <BreakdownRow label={t('loans.totalFees')} value={formatAmount(totalFees)} strong />
      )}

      <View className="my-2 h-px bg-line" />

      <BreakdownRow label={t('loans.totalInterest')} value={formatAmount(preview.totalInterest)} />
      <BreakdownRow
        label={t('loans.totalRepayment')}
        value={formatAmount(preview.totalRepaymentAmount)}
        strong
      />

      {preview.installmentAmount != null && preview.totalInstallments != null && (
        <Text className="mt-2 text-xs text-ink-soft">
          {t('loans.installmentSummary', {
            count: preview.totalInstallments,
            amount: formatAmount(preview.installmentAmount),
          })}
        </Text>
      )}
    </View>
  );
}
