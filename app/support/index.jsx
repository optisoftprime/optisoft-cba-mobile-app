// screens/SupportLegal.jsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { isEnabled } from 'config/features';
import FeatureGate from 'components/FeatureGate';

export default function SupportLegal() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const supportOptions = [
    {
      id: 'faq',
      icon: 'help-circle-outline',
      title: t('support.faqTitle'),
      subtitle: t('support.faqSub'),
      onPress: () => navigateTo('faq'),
    },
    {
      id: 'liveChat',
      icon: 'chatbubbles-outline',
      title: t('support.liveChatTitle'),
      subtitle: t('support.liveChatSub'),
      onPress: () => navigateTo('liveChat'),
      disabled: !isEnabled('liveChat'),
    },
    {
      id: 'submitTicket',
      icon: 'ticket-outline',
      title: t('support.submitTicketTitle'),
      subtitle: t('support.submitTicketSub'),
      onPress: () => navigateTo('createTicket'),
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <Header title={t('support.hubTitle')} onLeftPress={navigateBack} showLeftIcon={true} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mt-4 gap-y-3 px-4">
          {supportOptions.map((item) => (
            <FeatureGate
              key={item.id}
              enabled={!item.disabled}
              message={t('dashboard.featureUnderDevelopment', { feature: item.title })}>
              <TouchableOpacity
                onPress={item.onPress}
                className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5"
                activeOpacity={0.7}>
                <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                  <Ionicons name={item.icon} size={20} color={colors.primary} />
                </View>

                <View className="flex-1">
                  <Text className="text-[15px] font-semibold text-ink">{item.title}</Text>
                  <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
              </TouchableOpacity>
            </FeatureGate>
          ))}
        </View>

        <View className="h-6" />
      </ScrollView>
    </View>
  );
}
