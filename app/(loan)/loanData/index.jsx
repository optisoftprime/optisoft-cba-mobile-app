// screens/LoanInfo.jsx
import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigateBack, navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { PhotoCard } from 'components/ui/photo-card';

export default function LoanInfo() {
  const { colors, shadows, isDark } = useTheme();
  const { t } = useTranslation();

  const benefits = [t('loans.benefit1'), t('loans.benefit2'), t('loans.benefit3')];
  const rewards = [t('loans.reward1'), t('loans.reward2')];

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <TouchableOpacity
        onPress={navigateBack}
        activeOpacity={0.8}
        className="ml-4 mt-12 h-10 w-10 items-center justify-center rounded-full border border-line bg-card">
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
      </TouchableOpacity>

      <ScrollView className="mt-3 flex-1 px-4">
        <PhotoCard source={require('../../../assets/savings-hero.png')} height={180} />

        <Text className="mb-5 text-3xl font-bold text-ink">{t('loans.heroTitle')}</Text>

        <View className="mb-4 rounded-2xl border border-line bg-card p-4" style={shadows.sm}>
          <Text className="mb-3 text-[17px] font-bold text-ink">{t('loans.benefitsTitle')}</Text>
          <View className="gap-y-3">
            {benefits.map((item) => (
              <View key={item} className="flex-row items-start">
                <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary-light">
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                </View>
                <Text className="flex-1 text-sm leading-6 text-ink-muted">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mb-8 rounded-2xl border border-line bg-card p-4" style={shadows.sm}>
          <Text className="mb-3 text-[17px] font-bold text-ink">
            {t('loans.interestRewardsTitle')}
          </Text>
          <View className="gap-y-3">
            {rewards.map((item) => (
              <View key={item} className="flex-row items-start">
                <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-primary-light">
                  <Ionicons name="checkmark" size={14} color={colors.primary} />
                </View>
                <Text className="flex-1 text-sm leading-6 text-ink-muted">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="gap-y-3 px-4 pb-8 pt-4">
        <TouchBtn
          onPress={() => navigateTo('loans')}
          label={t('loans.viewMyLoans')}
          backgroundColor={colors.card}
          textColor={colors.ink}
          borderColor={colors.line}
          borderWidth={1}
          textClassName="text-base font-bold"
          buttonClassName="w-full items-center rounded-xl py-4"
          containerClassName=""
        />

        <TouchBtn
          onPress={() => navigateTo('loanForm')}
          label={t('loans.startApplication')}
          backgroundColor={colors.primary}
          textColor={colors.onPrimary}
          textClassName="text-base font-bold"
          buttonClassName="w-full items-center rounded-xl py-4"
          containerClassName=""
        />
      </View>
    </View>
  );
}
