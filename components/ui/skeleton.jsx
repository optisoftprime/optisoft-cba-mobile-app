import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { useTheme } from 'config/ThemeContext';

/**
 * A pulsing placeholder the shape of the thing that is loading.
 *
 * Skeletons rather than a spinner: the screen keeps its layout, so nothing
 * jumps when the data lands and the user can already see what is coming.
 *
 * Coloured from `colors`, not a class — Animated.View isn't one of the
 * components NativeWind wraps, so a className on it would be ignored.
 */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  const { colors } = useTheme();
  // useState with a lazy initialiser, not a ref: the value has to be stable
  // across renders, and reading `ref.current` during render is disallowed.
  const [pulse] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.cardMuted, opacity: pulse },
        style,
      ]}
    />
  );
}

/** A bordered card with skeleton lines inside — one list row, loading. */
export function SkeletonCard({ lines = 3, children }) {
  return (
    <View className="mb-3 rounded-xl border border-line bg-card p-4">
      {children ??
        Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            width={index === 0 ? '55%' : index === lines - 1 ? '35%' : '75%'}
            height={index === 0 ? 16 : 12}
            style={{ marginTop: index === 0 ? 0 : 10 }}
          />
        ))}
    </View>
  );
}
