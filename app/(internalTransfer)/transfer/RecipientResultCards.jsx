import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';

// Shown once an account number resolves to a real recipient. Avatar with a
// check badge, a "VERIFIED" pill, and a prominent name + account number. Pass
// `onChange` to render a Change action (used for the multi-account selection).
export function VerifiedRecipientCard({ account, onChange }) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const initial = account?.accountName?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <View className="mb-5 rounded-2xl border border-success/40 bg-card p-4" style={shadows.sm}>
      <View className="flex-row items-center">
        {/* Avatar + check badge */}
        <View className="mr-3.5">
          <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-success-soft">
            <Text className="text-xl font-extrabold text-on-success-soft">{initial}</Text>
          </View>
          <View className="absolute -bottom-0.5 -right-0.5 rounded-full bg-card">
            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
          </View>
        </View>

        {/* Details */}
        <View className="flex-1">
          <View className="mb-1 flex-row items-center self-start rounded-full bg-success-soft px-2 py-0.5">
            <Ionicons name="shield-checkmark" size={11} color={colors.onSuccessSoft} />
            <Text
              className="ml-1 text-[10px] font-extrabold text-on-success-soft"
              style={{ letterSpacing: 0.5 }}>
              {t('transfer.verified')}
            </Text>
          </View>
          <Text className="text-base font-extrabold text-ink" numberOfLines={1}>
            {account?.accountName ?? t('transfer.recipient')}
          </Text>
          <Text className="mt-px text-[13px] text-ink-muted" style={{ letterSpacing: 0.5 }}>
            {account?.accountNumber}
          </Text>
        </View>

        {onChange ? (
          <TouchableOpacity
            onPress={onChange}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="rounded-full bg-primary-light px-3 py-1.5">
            <Text className="text-xs font-bold text-primary-dark">{t('transfer.change')}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// Shown when an entered account number can't be resolved.
export function ValidationErrorCard({ message }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View className="mb-5 flex-row items-start rounded-2xl border border-danger/40 bg-card p-4">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-danger-soft">
        <Ionicons name="alert-circle" size={22} color={colors.danger} />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-sm font-bold text-danger">{t('transfer.couldntVerify')}</Text>
        <Text className="text-[12.5px] leading-[17px] text-ink-muted">
          {message || t('transfer.checkNumberRetry')}
        </Text>
      </View>
    </View>
  );
}
