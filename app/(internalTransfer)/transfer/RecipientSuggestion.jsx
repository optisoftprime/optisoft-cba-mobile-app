import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';

export function RecipientSuggestion({ tx, onPress }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // Dashboard history uses `recipientName`; the older "view all" payload uses
  // `recipient` — fall back across both so the name always shows.
  const recipientName = tx.recipientName ?? tx.recipient ?? '';
  const initials = recipientName
    ? recipientName
        .split(' ')
        .slice(0, 2)
        .map((n) => n.charAt(0).toUpperCase())
        .join('')
    : (tx.recipientAccountNumber?.slice(-2) ?? '?');

  return (
    <TouchableOpacity
      onPress={() => onPress(tx)}
      activeOpacity={0.7}
      className="flex-row items-center border-b border-line bg-card px-4 py-3.5">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-light">
        <Text className="text-[13px] font-semibold text-primary-dark">{initials}</Text>
      </View>

      <View className="flex-1">
        <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
          {recipientName || t('transfer.unknown')}
        </Text>
        <Text className="mt-0.5 text-xs text-ink-muted">
          {tx.recipientAccountNumber} • {tx.accountType}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </TouchableOpacity>
  );
}
