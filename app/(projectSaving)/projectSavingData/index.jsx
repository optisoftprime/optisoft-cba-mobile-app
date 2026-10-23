// screens/ProjectSavingsInfo.jsx
import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { navigateBack, navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { PhotoCard } from 'components/ui/photo-card';
import { useTheme } from 'config/ThemeContext';

export default function ProjectSavingsInfo() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const handleCreatePlan = () => {
    console.log('Create Plan pressed');
    navigateTo('projectSavingForm');
  };

  const benefits = [
    t('savings.projectBenefit1'),
    t('savings.projectBenefit2'),
    t('savings.projectBenefit3'),
  ];

  const rewards = [t('savings.projectReward1'), t('savings.projectReward2')];

  return (
    <View className="flex-1 bg-primary">
      <StatusBar barStyle={isDark ? 'dark-content' : 'light-content'} />

      <TouchableOpacity
        onPress={navigateBack}
        activeOpacity={0.8}
        className="ml-4 mt-12 h-10 w-10 items-center justify-center rounded-full bg-on-primary/15">
        <Ionicons name="arrow-back" size={22} color={colors.onPrimary} />
      </TouchableOpacity>

      <ScrollView className="mt-3 flex-1 px-4">
        {/* Hero Image Card */}
        <PhotoCard source={require('../../../assets/savings-hero.png')} height={180} />

        {/* Title */}
        <Text className="mb-4 text-3xl font-extrabold text-on-primary">
          {t('savings.projectInfoTitle')}
        </Text>

        {/* Benefits/Features Section */}
        <View className="mb-4 rounded-2xl bg-on-primary/10 p-4">
          <Text className="mb-3 text-[15px] font-bold text-on-primary">
            {t('savings.commonBenefitsFeatures')}
          </Text>
          <View className="space-y-2">
            {benefits.map((item) => (
              <View key={item} className="flex-row items-start">
                <Text className="mr-2 text-on-primary/70">•</Text>
                <Text className="flex-1 text-sm leading-6 text-on-primary/90">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Interest/Rewards Section */}
        <View className="mb-8 rounded-2xl bg-on-primary/10 p-4">
          <Text className="mb-3 text-[15px] font-bold text-on-primary">
            {t('savings.commonInterestRewards')}
          </Text>
          <View className="space-y-2">
            {rewards.map((item) => (
              <View key={item} className="flex-row items-start">
                <Text className="mr-2 text-on-primary/70">•</Text>
                <Text className="flex-1 text-sm leading-6 text-on-primary/90">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Buttons - Fixed at bottom */}
      <View className="gap-y-3 px-4 pb-8 pt-4">
        <TouchBtn
          onPress={() => navigateTo('rizeSpringsSavings', { productType: 'GROUP' })}
          label={t('savings.projectViewSavings')}
          backgroundColor="transparent"
          textColor={colors.onPrimary}
          borderColor={colors.onPrimary}
          borderWidth={1}
          textClassName="text-base font-bold"
          buttonClassName="w-full items-center rounded-xl py-4"
          containerClassName=""
        />

        <TouchBtn
          onPress={handleCreatePlan}
          label={t('savings.projectCreatePlan')}
          backgroundColor={colors.onPrimary}
          textColor={colors.primary}
          textClassName="text-base font-bold"
          buttonClassName="w-full items-center rounded-xl py-4"
          containerClassName=""
        />
      </View>
    </View>
  );
}
