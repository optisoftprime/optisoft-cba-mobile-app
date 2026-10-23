import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { navigateTo } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { Avatar } from 'components/ui/avatar';

/** A round, outlined icon button for the header's right side. */
function HeaderIconButton({ icon, onPress, accessibilityLabel, badge = 0 }) {
  const { colors } = useTheme();
  const count = Number(badge) || 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full border border-line bg-card active:bg-card-muted">
      <Ionicons name={icon} size={20} color={colors.ink} />

      {count > 0 ? (
        <View className="absolute -right-1 -top-1 min-w-[18px] items-center justify-center rounded-full bg-danger px-1">
          <Text className="text-[10px] font-bold text-on-danger">{count > 9 ? '9+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The top of the home screen: who is signed in, today's date, and quick access
 * to help and notifications. Sits on the page background rather than a brand
 * banner, so the wallet card below is the one block of colour on the screen.
 */
export function HomeHeader({ name, greeting, subtitle, unreadCount = 0 }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    // Same top spacing as components/header, so every screen's header lines up.
    <View className="bg-background" style={{ paddingTop: Math.max(insets.top, 24) + 12 }}>
      <View className="flex-row items-center gap-3 px-4 pb-4">
        <Avatar name={name} size={46} />

        <View className="flex-1">
          <Text className="text-[13px] text-ink-muted" numberOfLines={1}>
            {subtitle}
          </Text>
          <Text className="mt-0.5 text-[18px] font-bold text-ink" numberOfLines={1}>
            {greeting}
          </Text>
        </View>

        <View className="flex-row items-center gap-2">
          <HeaderIconButton
            icon="help-circle-outline"
            accessibilityLabel={t('common.help')}
            onPress={() => navigateTo('faq')}
          />
          <HeaderIconButton
            icon="notifications-outline"
            badge={unreadCount}
            accessibilityLabel={
              unreadCount > 0
                ? t('common.notificationsUnread', { count: unreadCount })
                : t('common.notifications')
            }
            onPress={() => navigateTo('notification')}
          />
        </View>
      </View>
    </View>
  );
}
