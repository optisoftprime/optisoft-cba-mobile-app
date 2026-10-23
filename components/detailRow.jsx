// components/detailRow.jsx
//
// Label/value row. Rendered inside RN <Modal>s (e.g. transactionResultModal),
// where theme classes don't resolve, so colours come from useTheme().
import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from 'config/ThemeContext';

export default function DetailRow({ label, value, last }) {
  const { colors } = useTheme();

  return (
    <View
      className="flex-row items-center justify-between py-3"
      style={last ? undefined : { borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ fontSize: 13, color: colors.inkMuted }}>{label}</Text>
      <Text
        className="max-w-[60%] text-right"
        style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}
        numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );
}
