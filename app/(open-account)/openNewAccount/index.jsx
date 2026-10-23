import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';

export default function OpenNewAccount() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    navigateTo('stageOne');
  };

  return (
    <ScrollView className="flex-1 bg-primary">
      <View className="min-h-screen flex-1 items-center justify-center px-5 py-12">
        {/* Card Container */}
        <View className="w-full items-center rounded-3xl bg-card p-8" style={shadows.md}>
          {/* Star Icon */}
          <View className="h-20 w-20 items-center justify-center rounded-2xl bg-warning-soft">
            <MaterialCommunityIcons name="star" size={44} color={colors.warning} />
          </View>

          {/* Title */}
          <Text className="mb-2 mt-6 text-2xl font-bold text-ink">
            {t('openAccount.openNewAccountTitle')}
          </Text>

          {/* Subtitle */}
          <Text className="mb-8 text-center text-sm leading-5 text-ink-muted">
            {t('openAccount.openNewAccountSubtitle')}
          </Text>

          {/* Features List */}
          <View className="mb-8 w-full rounded-2xl border border-line bg-card-muted px-4 py-1">
            {/* Feature 1 */}
            <View className="flex-row items-center border-b border-line py-3">
              <MaterialCommunityIcons name="check-circle" size={21} color={colors.primary} />
              <Text className="ml-3 flex-1 text-sm text-ink">{t('openAccount.feature1')}</Text>
            </View>

            {/* Feature 2 */}
            <View className="flex-row items-center border-b border-line py-3">
              <MaterialCommunityIcons name="check-circle" size={21} color={colors.primary} />
              <Text className="ml-3 flex-1 text-sm text-ink">{t('openAccount.feature2')}</Text>
            </View>

            {/* Feature 3 */}
            <View className="flex-row items-center py-3">
              <MaterialCommunityIcons name="check-circle" size={21} color={colors.primary} />
              <Text className="ml-3 flex-1 text-sm text-ink">{t('openAccount.feature3')}</Text>
            </View>
          </View>

          {/* Get Started Button */}
          <View className="w-full">
            <TouchBtn
              onPress={handleGetStarted}
              label={t('common.getStarted')}
              backgroundColor={colors.primary}
              textClassName="text-base font-bold"
              buttonClassName="w-full items-center rounded-xl py-4"
              containerClassName=""
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
