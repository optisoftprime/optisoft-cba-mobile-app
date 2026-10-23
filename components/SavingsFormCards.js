import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';

export function ProductSummaryCard({ product }) {
  const { colors } = useTheme();
  if (!product) return null;
  return (
    <View className="mt-3 rounded-lg p-3" style={{ backgroundColor: colors.primary + '14' }}>
      <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
        Min: ₦{product.minTransactionLimit?.toLocaleString()} · Max: ₦
        {product.maxTransactionLimit?.toLocaleString()} · Rate: {product.interestRate}% ·{' '}
        {product.savingProductType} · Tenor: {product.minimumTenor}–{product.maximumTenor}{' '}
        {product.tenorDisplayIn?.replace('IN_', '').toLowerCase()}
      </Text>
    </View>
  );
}

export function SavingsInfoCard({ product }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  if (!product || !product.productDescription) return null;
  return (
    <View className="mb-4 rounded-lg p-4" style={{ backgroundColor: colors.primary + '14' }}>
      <Text className="mb-1 font-semibold" style={{ color: colors.textPrimary }}>
        {t('components.aboutProduct')}
      </Text>
      <Text className="text-sm" style={{ color: colors.textSecondary }}>
        {product.productDescription}
      </Text>
    </View>
  );
}
