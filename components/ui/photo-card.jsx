import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Text, View } from 'react-native';

import { useTheme } from 'config/ThemeContext';

/**
 * A photo in a rounded card — the hero image on the savings / loan info screens.
 *
 * The photo is a TRANSPARENT cut-out (no white studio background), so it sits on
 * the card colour in both themes: no white box in dark mode, no light/dark pair
 * of files to keep in step.
 */
export function PhotoCard({ source, height = 180, className = 'mb-6' }) {
  const { colors } = useTheme();

  return (
    <View
      className={`overflow-hidden rounded-3xl ${className}`}
      style={{ backgroundColor: colors.card }}>
      <Image source={source} style={{ width: '100%', height }} resizeMode="contain" />
    </View>
  );
}

/**
 * The banner at the top of a utility / transfer screen: an icon, a title and a
 * one-line description on the brand gradient.
 *
 * Drawn in code, not a bitmap. The old banners were artwork with text and the
 * previous client's logo printed on a pale background — they could not follow
 * dark mode or another client's brand. This takes the theme's panel colours,
 * so every client and both themes get a matching banner.
 */
export function HeroBanner({ icon, title, subtitle, className = 'px-4 pt-2' }) {
  const { colors, shadows } = useTheme();

  return (
    <View className={className}>
      <View className="overflow-hidden rounded-3xl" style={shadows.md}>
        <LinearGradient
          colors={[colors.panelFrom, colors.panelTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20 }}>
          {/* Oversized faint icon for depth, and the corner circles the wallet card uses. */}
          <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-on-panel/10" />
          <View style={{ position: 'absolute', right: 8, bottom: -18, opacity: 0.14 }}>
            <Ionicons name={icon} size={110} color={colors.onPanel} />
          </View>

          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-on-panel/15">
            <Ionicons name={icon} size={24} color={colors.onPanel} />
          </View>
          <Text className="mt-3 text-[18px] font-bold text-on-panel">{title}</Text>
          {subtitle ? (
            <Text className="mt-1 pr-16 text-[13px] leading-5 text-on-panel/85" numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </LinearGradient>
      </View>
    </View>
  );
}
