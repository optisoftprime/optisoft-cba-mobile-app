import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { useTheme } from 'config/ThemeContext';

/**
 * Full-screen brand background for the sign-in screens (login, welcome back,
 * registration steps): the client's panel gradient with two soft circles.
 *
 * Replaces a fixed blue photo that sat under a brand-colour overlay — with any
 * client whose brand is not blue, that came out muddy. Drawn from the theme, it
 * matches every client and both themes. Render it first, behind the content.
 */
export function BrandBackdrop() {
  const { colors } = useTheme();

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <LinearGradient
        colors={[colors.panelFrom, colors.panelTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      />
      <View className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-on-panel/10" />
      <View className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-on-panel/5" />
    </View>
  );
}
