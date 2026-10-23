// screens/Notification.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { navigateBack } from 'app/navigate';
import Toast from 'react-native-toast-message';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '../hooks/notifications';

const TYPE_ICON = {
  GENERAL: 'bell',
  TRANSACTION: 'wallet',
  ACCOUNT: 'account-check',
  SECURITY: 'shield-alert',
  PROMOTION: 'gift',
  SYSTEM: 'cog',
};

// Each type maps to a theme token; the actual colour is read from useTheme()
// so the icons follow light/dark mode.
const TYPE_TONE = {
  GENERAL: 'inkMuted',
  TRANSACTION: 'primary',
  ACCOUNT: 'success',
  SECURITY: 'danger',
  PROMOTION: 'warning',
  SYSTEM: 'inkMuted',
};

// The tinted chip behind each type icon.
const TONE_CHIP = {
  inkMuted: 'bg-card-muted',
  primary: 'bg-primary-light',
  success: 'bg-success-soft',
  danger: 'bg-danger-soft',
  warning: 'bg-warning-soft',
};

export default function Notification() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const typeTone = (type) => TYPE_TONE[type] || 'inkMuted';
  const typeColor = (type) => colors[typeTone(type)];
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useNotifications({ size: 20, unreadOnly });

  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAllRead } = useMarkAllNotificationsRead();

  // Flatten every fetched page into one feed.
  const notifications = data?.pages?.flatMap((pg) => pg?.content ?? []) ?? [];

  // ── Silently mark everything as read the moment the list is viewed ──
  // Fires once per screen mount, no toast, no user action required.
  const hasAutoMarkedRef = useRef(false);

  useEffect(() => {
    if (hasAutoMarkedRef.current) return;
    if (isLoading) return;
    if (!notifications?.length) return;

    const hasUnread = notifications?.some?.((n) => !n?.read);
    if (!hasUnread) return;

    hasAutoMarkedRef.current = true;
    markAllRead(undefined, {
      onError: () => {
        // Silent by design — allow retry on next mount/view if it failed.
        hasAutoMarkedRef.current = false;
      },
    });
  }, [isLoading, notifications, markAllRead]);

  const handleMarkAllAsRead = () => {
    markAllRead(undefined, {
      onSuccess: (count) => {
        Toast.show({
          type: 'success',
          text1: t('notifications.done'),
          text2: t('notifications.markedAsRead', { count: count ?? t('notifications.allLabel') }),
        });
      },
      onError: (err) => {
        Toast.show({
          type: 'error',
          text1: t('notifications.errorTitle'),
          text2: err?.message || t('notifications.markFailed'),
        });
      },
    });
  };

  const handleOpenNotification = (notification) => {
    if (!notification?.read) {
      markRead(notification?.id);
    }
    // Show the full message (rows are truncated to 2 lines).
    setSelectedNotification(notification);
  };

  const handleBack = () => {
    navigateBack();
  };

  const renderItem = ({ item: notification }) => (
    <TouchableOpacity
      onPress={() => handleOpenNotification(notification)}
      className={`border-b border-line px-4 py-4 ${notification?.read ? 'bg-background' : 'bg-card'}`}>
      <View className="flex-row items-start">
        <View
          className={`mr-3 h-10 w-10 items-center justify-center rounded-xl ${TONE_CHIP[typeTone(notification?.type)]}`}>
          <MaterialCommunityIcons
            name={TYPE_ICON[notification?.type] || 'bell'}
            size={20}
            color={typeColor(notification?.type)}
          />
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-start justify-between">
            <Text className="flex-1 text-[15px] font-semibold text-ink">{notification?.title}</Text>
            <Text className="ml-2 text-xs text-ink-soft">{notification?.createdAt}</Text>
          </View>
          <Text className="text-[13px] leading-5 text-ink-muted" numberOfLines={2}>
            {notification?.body}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View className="border-b border-line px-4 pb-4 pt-12">
        <View className="mb-4 flex-row items-center gap-3">
          <TouchableOpacity
            onPress={handleBack}
            className="h-10 w-10 items-center justify-center rounded-full border border-line bg-card">
            <MaterialIcons name="arrow-back" size={22} color={colors.ink} />
          </TouchableOpacity>
          <Text className="flex-1 text-[20px] font-bold text-ink">{t('notifications.title')}</Text>
        </View>

        {/* Action Buttons */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            disabled={isMarkingAllRead}
            className="rounded-full bg-primary-light px-3 py-1.5">
            {isMarkingAllRead ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text className="text-[13px] font-semibold text-primary-dark">
                {t('notifications.markAllRead')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setUnreadOnly((prev) => !prev)}
            className="flex-row items-center rounded-full border border-line bg-card px-3 py-1.5">
            <Text className="mr-1 text-[13px] font-semibold text-ink">
              {unreadOnly ? t('notifications.unread') : t('notifications.all')}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={16} color={colors.inkMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Error state */}
      {!isLoading && isError && (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="alert-circle-outline" size={40} color={colors.danger} />
          <Text className="mt-3 text-center text-sm text-ink-muted">
            {error?.message || t('notifications.loadFailed')}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="mt-4 rounded-full bg-primary-light px-4 py-2">
            <Text className="text-sm font-semibold text-primary-dark">
              {t('notifications.tryAgain')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !isError && notifications.length === 0 && (
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="bell-off-outline" size={40} color={colors.inkSoft} />
          <Text className="mt-3 text-center text-sm text-ink-muted">
            {unreadOnly ? t('notifications.allCaughtUp') : t('notifications.noNotifications')}
          </Text>
        </View>
      )}

      {/* Notification List */}
      {!isLoading && !isError && notifications.length > 0 && (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item?.id)}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              fetchNextPage();
            }
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* Full-message modal — list rows truncate to 2 lines, tap opens the whole thing. */}
      {selectedNotification && (
        <Modal
          visible
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setSelectedNotification(null)}>
          <View
            className="flex-1 items-center justify-center px-6"
            style={{ backgroundColor: `${colors.black}80` }}>
            <View
              className="w-full rounded-2xl p-5"
              style={{
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.line,
                maxHeight: '80%',
              }}>
              <View className="mb-3 flex-row items-start">
                <MaterialCommunityIcons
                  name={TYPE_ICON[selectedNotification?.type] || 'bell'}
                  size={26}
                  color={typeColor(selectedNotification?.type)}
                  style={{ marginTop: 2 }}
                />
                <View className="ml-3 flex-1">
                  <Text className="text-base font-bold" style={{ color: colors.ink }}>
                    {selectedNotification?.title}
                  </Text>
                  {!!selectedNotification?.createdAt && (
                    <Text className="mt-0.5 text-xs" style={{ color: colors.inkSoft }}>
                      {selectedNotification.createdAt}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => setSelectedNotification(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MaterialIcons name="close" size={22} color={colors.inkSoft} />
                </TouchableOpacity>
              </View>

              <ScrollView className="mt-1" showsVerticalScrollIndicator={false}>
                <Text className="text-sm leading-6" style={{ color: colors.inkMuted }}>
                  {selectedNotification?.body}
                </Text>
              </ScrollView>

              <TouchableOpacity
                onPress={() => setSelectedNotification(null)}
                activeOpacity={0.85}
                className="mt-5 items-center rounded-xl py-3.5"
                style={{ backgroundColor: colors.primary }}>
                <Text className="text-base font-semibold" style={{ color: colors.onPrimary }}>
                  {t('notifications.close')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
