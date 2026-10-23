// components/SelectionCard.jsx
//
// Full-width option card used by the type-selection screens (Transfer Type,
// Utilities, Bill Type): an icon chip, a title + short description, and a
// chevron. Same card language as the home screen — a card-coloured surface
// with a hairline border, the icon in the brand colour on its soft tint.
//
// `colors` (the old per-card gradient) is still accepted so callers don't
// break, but is no longer drawn — every option takes the brand colour.
//
// Accepts a `style` prop (merged last) so it can be wrapped in FeatureGate,
// which clones it with a dimming { opacity: 0.5 } style when the feature is off.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';

export default function SelectionCard({
  title,
  description,
  iconName,
  onPress,
  activeOpacity = 0.85,
  style,
}) {
  const { colors, shadows } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={activeOpacity}
      className="mb-3 flex-row items-center rounded-2xl border border-line bg-card p-4"
      style={[shadows.sm, style]}>
      <View className="mr-4 h-12 w-12 items-center justify-center rounded-xl bg-primary-light">
        <Ionicons name={iconName} size={24} color={colors.primary} />
      </View>

      <View className="flex-1 pr-2">
        <Text className="text-[15px] font-semibold text-ink">{title}</Text>
        {description ? (
          <Text className="mt-1 text-xs leading-4 text-ink-muted" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
    </TouchableOpacity>
  );
}
