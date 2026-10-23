// components/header.jsx
//
// The top of every inner screen, in the same language as the home screen's
// header: a round outlined back button, the title left-aligned beside it, an
// optional round action on the right, and an optional subtitle underneath.
//
// The props are unchanged from the old centred header, so every screen keeps
// working. Two of them now only matter at the edges:
//   • `size`  — still honoured (a Tailwind text-size class), default reads as
//               a 20px title.
//   • `color` — the title colour. When a screen sits on the brand colour and
//               passes a light colour ('white'), the buttons switch to a
//               translucent-white treatment so they stay visible.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';

const LIGHT_ON_BRAND = ['white', '#fff', '#ffffff', '#FFF', '#FFFFFF'];

function RoundButton({ icon, size, color, onPress, onBrand, accessibilityLabel }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      className={`h-10 w-10 items-center justify-center rounded-full ${
        onBrand
          ? 'bg-on-primary/15 active:bg-on-primary/25'
          : 'border border-line bg-card active:bg-card-muted'
      }`}>
      <Ionicons name={icon} size={Math.min(size, 22)} color={color} />
    </Pressable>
  );
}

export default function Header({
  title = 'Title',
  color,
  size = 'text-[20px]',
  subtitle = null,
  containerStyle = {},
  // Left side props
  leftIcon = 'arrow-back',
  leftIconSize = 22,
  leftIconColor,
  onLeftPress = () => navigateBack(),
  showLeftIcon = true,
  // Right side props
  rightIcon = null,
  rightIconSize = 22,
  rightIconColor,
  onRightPress = () => {},
  showRightIcon = false,
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Resolve color props with the theme as fallback so explicit props still win.
  const titleColor = color ?? colors.textPrimary;
  const onBrand = LIGHT_ON_BRAND.includes(String(titleColor));
  const resolvedLeftIconColor = leftIconColor ?? (onBrand ? colors.onPrimary : colors.ink);
  const resolvedRightIconColor = rightIconColor ?? (onBrand ? colors.onPrimary : colors.ink);

  return (
    <View
      className="px-4 pb-4"
      style={[{ paddingTop: Math.max(insets.top, 24) + 12 }, containerStyle]}>
      <View className="flex-row items-center gap-3">
        {showLeftIcon ? (
          <RoundButton
            icon={leftIcon}
            size={leftIconSize}
            color={resolvedLeftIconColor}
            onPress={onLeftPress}
            onBrand={onBrand}
            accessibilityLabel={t('common.back')}
          />
        ) : null}

        <Text
          className={`${size} flex-1 font-bold`}
          style={{ color: titleColor }}
          numberOfLines={2}>
          {title}
        </Text>

        {showRightIcon && rightIcon ? (
          <RoundButton
            icon={rightIcon}
            size={rightIconSize}
            color={resolvedRightIconColor}
            onPress={onRightPress}
            onBrand={onBrand}
          />
        ) : null}
      </View>

      {subtitle ? (
        <Text
          className="mt-3 text-[13px] leading-5"
          style={{
            color: onBrand ? colors.onPrimary : colors.textSecondary,
            opacity: onBrand ? 0.85 : 1,
          }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}
