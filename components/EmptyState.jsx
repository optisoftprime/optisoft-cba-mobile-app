// components/EmptyState.jsx
import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';

/**
 * EmptyState — same look as components/ui/empty-state (the home screen's):
 * the icon on a soft round tile, a title, and an optional line underneath.
 *
 * Props:
 *  - title      : string — main heading
 *  - subtitle   : string — supporting text below title
 *  - iconName   : string — Ionicons name (default: 'file-tray-outline')
 *  - iconSize   : number — icon size (default: 28)
 *  - iconColor  : string — icon color (default: theme soft ink)
 */
export default function EmptyState({
  title,
  subtitle,
  iconName = 'file-tray-outline',
  iconSize = 28,
  iconColor,
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Resolve with the theme / i18n as fallback so explicit props still win.
  const resolvedTitle = title ?? t('components.nothingHere');
  const resolvedIconColor = iconColor ?? colors.inkSoft;

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-card-muted">
        <Ionicons name={iconName} size={Math.min(iconSize, 32)} color={resolvedIconColor} />
      </View>
      <Text className="mt-4 text-center text-[15px] font-semibold text-ink">{resolvedTitle}</Text>
      {subtitle ? (
        <Text className="mt-1.5 text-center text-[13px] leading-5 text-ink-muted">{subtitle}</Text>
      ) : null}
    </View>
  );
}
