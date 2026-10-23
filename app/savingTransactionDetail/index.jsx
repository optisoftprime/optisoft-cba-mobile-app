// screens/SavingTransactionDetail.jsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Header from 'components/header';
import FeeBreakdown from 'components/FeeBreakdown';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { formatAmount, formatDate } from 'helper';
import { ProductArt } from 'components/ui/product-art';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusConfig = (status, colors, t) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'approved')
    return {
      color: colors.onSuccessSoft,
      bgColor: colors.successSoft,
      icon: 'checkmark-circle',
      label: t('savings.commonStatusApproved'),
    };
  if (s === 'pending')
    return {
      color: colors.onWarningSoft,
      bgColor: colors.warningSoft,
      icon: 'time',
      label: t('savings.commonStatusPending'),
    };
  if (s === 'declined' || s === 'rejected')
    return {
      color: colors.onDangerSoft,
      bgColor: colors.dangerSoft,
      icon: 'close-circle',
      label: t('savings.commonStatusDeclined'),
    };
  return {
    color: colors.inkMuted,
    bgColor: colors.cardMuted,
    icon: 'ellipse',
    label: status ?? '—',
  };
};

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SavingTransactionDetail() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  // Parse the item passed as JSON string from navigateTo
  let item = {};
  try {
    item = params?.item ? JSON.parse(params.item) : {};
  } catch {
    item = {};
  }

  const statusConfig = getStatusConfig(item.approvalStatus, colors, t);
  const product = item.savingProductRes ?? {};

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('savings.txDetailHeader')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        {/* Product Image + Name */}
        <View className="mb-6 items-center">
          <ProductArt imageUrl={product.imageUrl} size={100} className="mb-3" />
          <Text className="mb-1 text-base font-bold text-ink">{product.productName ?? '—'}</Text>
          <Text className="text-xs text-ink-soft">{product.productCode ?? ''}</Text>
        </View>

        {/* Status Badge */}
        <View className="mb-6 items-center">
          <View
            className="flex-row items-center gap-1.5 rounded-full px-4 py-2"
            style={{ backgroundColor: statusConfig.bgColor }}>
            <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
            <Text className="text-[13px] font-bold" style={{ color: statusConfig.color }}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Amount highlight */}
        <View
          className="mb-6 items-center overflow-hidden rounded-3xl bg-primary p-5"
          style={shadows.md}>
          {/* Decorative circles — same as the wallet card. */}
          <View className="absolute -right-12 -top-16 h-40 w-40 rounded-full bg-on-primary/10" />
          <View className="absolute -bottom-20 left-6 h-36 w-36 rounded-full bg-on-primary/5" />
          <Text className="mb-1 text-xs text-on-primary/70">
            {t('savings.txDetailAmountLabel')}
          </Text>
          <Text
            className="text-[32px] font-extrabold text-on-primary"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}>
            {formatAmount(item.amount)}
          </Text>
        </View>

        {/* Details Card */}
        <View className="rounded-2xl border border-line bg-card px-4" style={shadows.sm}>
          <DetailRow label={t('savings.txDetailTransactionType')} value={item.transactionType} />
          <DetailRow label={t('savings.txDetailSavingsType')} value={product.savingProductType} />
          <DetailRow label={t('savings.txDetailAccountNumber')} value={item.accountNumber} />
          {item.tenure != null && (
            <DetailRow
              label={t('savings.txDetailTenure')}
              value={`${item.tenure} ${t('savings.commonMonthsUnit')}`}
            />
          )}
          <DetailRow
            label={t('savings.txDetailDateCreated')}
            value={formatDate(item.localDateCreatedAt)}
          />
          <DetailRow
            label={t('savings.txDetailLastUpdated')}
            value={formatDate(item.localDateTimeUpdatedAt)}
          />
          <DetailRow
            label={t('savings.txDetailTransactionId')}
            value={`#${item.id}`}
            valueStyle={{ color: colors.primary }}
            last
          />
        </View>

        {/* Dynamic fee box — renders any *fee* field the backend sends on
                    the transaction or its product, so new fees (maintenanceFee,
                    etc.) appear automatically without a new build. Hidden entirely
                    while the backend sends no fees. */}
        <FeeBreakdown sources={[item, product]} />
      </ScrollView>
    </View>
  );
}
