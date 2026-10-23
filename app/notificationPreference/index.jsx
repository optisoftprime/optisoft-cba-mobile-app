// screens/NotificationPreference.jsx
import React, { useCallback, useRef } from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchNotificationPreferences, updateUserNotificationPreferences } from 'api/userProfile';
import Toast from 'react-native-toast-message';

const DEBOUNCE_MS = 600;

function NotificationItem({ iconName, title, description, value, onValueChange }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
        <Ionicons name={iconName} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-[15px] font-semibold text-ink">{title}</Text>
        <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
          {description}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.primary }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.line}
      />
    </View>
  );
}

function SkeletonItem() {
  return (
    <View className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5">
      <View className="mr-3 h-10 w-10 rounded-xl bg-card-muted" />
      <View className="flex-1 gap-y-2">
        <View className="h-3.5 w-32 rounded-md bg-card-muted" />
        <View className="h-2.5 w-20 rounded-md bg-card-muted" />
      </View>
      <View className="h-6 w-11 rounded-full bg-card-muted" />
    </View>
  );
}

export default function NotificationPreference() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const debounceTimers = useRef({});

  const { data, isLoading } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const result = await fetchNotificationPreferences();
      if (!result.ok) throw new Error(result.message);
      return result.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const { mutate } = useMutation({
    mutationFn: async (payload) => {
      const result = await updateUserNotificationPreferences(null, payload);
      if (!result.ok) {
        Toast?.show({
          type: 'error',
          text1: t('notifications.errorOccurred'),
          text2: result?.message || t('notifications.somethingWrong'),
        });
      }
      return result.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['notificationPreferences'] });
      const previous = queryClient.getQueryData(['notificationPreferences']);
      queryClient.setQueryData(['notificationPreferences'], (old) => ({
        ...old,
        pushNotification: payload.pushNotification,
        sendSmsNotification: payload.smsNotification,
        sendEmailNotification: payload.emailNotification,
      }));
      return { previous };
    },
    onError: (_err, _payload, context) => {
      queryClient.setQueryData(['notificationPreferences'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  const handleToggle = useCallback(
    (field, value) => {
      queryClient.setQueryData(['notificationPreferences'], (old) => ({ ...old, [field]: value }));

      if (debounceTimers.current[field]) clearTimeout(debounceTimers.current[field]);

      debounceTimers.current[field] = setTimeout(() => {
        const prefs = queryClient.getQueryData(['notificationPreferences']);
        mutate({
          pushNotification: prefs?.pushNotification ?? true,
          smsNotification: prefs?.sendSmsNotification ?? true,
          emailNotification: prefs?.sendEmailNotification ?? true,
        });
      }, DEBOUNCE_MS);
    },
    [mutate, queryClient]
  );

  const items = [
    {
      id: 'push',
      iconName: 'notifications-outline',
      title: t('notifications.pushTitle'),
      description: t('notifications.pushDesc'),
      field: 'pushNotification',
      value: data?.pushNotification ?? true,
    },
    {
      id: 'sms',
      iconName: 'chatbox-outline',
      title: t('notifications.smsTitle'),
      description: t('notifications.smsDesc'),
      field: 'sendSmsNotification',
      value: data?.sendSmsNotification ?? true,
    },
    {
      id: 'email',
      iconName: 'mail-outline',
      title: t('notifications.emailTitle'),
      description: t('notifications.emailDesc'),
      field: 'sendEmailNotification',
      value: data?.sendEmailNotification ?? true,
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('notifications.preferenceTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      <ScrollView className="mt-4 flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="gap-y-3">
          {isLoading
            ? [1, 2, 3].map((k) => <SkeletonItem key={k} />)
            : items.map((item) => (
                <NotificationItem
                  key={item.id}
                  iconName={item.iconName}
                  title={item.title}
                  description={item.description}
                  value={item.value}
                  onValueChange={(val) => handleToggle(item.field, val)}
                />
              ))}
        </View>
        <View className="h-6" />
      </ScrollView>
    </View>
  );
}
