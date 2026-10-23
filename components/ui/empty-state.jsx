import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

import { useTheme } from 'config/ThemeContext';

/**
 * The ONE empty state. Every list that can come back empty uses this — icon,
 * title, optional message — so "nothing here" looks the same everywhere
 * instead of being a bare line of grey text on one screen and a full panel on
 * another.
 *
 * `compact` is for an empty section inside a fuller screen (the dashboard's
 * tasks and activity), where a full-height empty state would shove the rest of
 * the page off screen.
 */
export function EmptyState({ icon = 'file-tray-outline', title, message, compact = false }) {
  const { colors } = useTheme();

  return (
    <View className={`items-center px-8 ${compact ? 'py-8' : 'py-16'}`}>
      <Ionicons name={icon} size={compact ? 28 : 40} color={colors.inkSoft} />
      <Text className="mt-4 text-center text-[15px] font-semibold text-ink">{title}</Text>
      {message ? (
        <Text className="mt-1.5 text-center text-[13px] leading-5 text-ink-muted">{message}</Text>
      ) : null}
    </View>
  );
}
