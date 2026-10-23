// screens/Registration.jsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { registrationSteps } from 'config/registrationStepsData';
import { navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import { BrandBackdrop } from 'components/ui/brand-backdrop';

export default function Registration() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleGetStarted = () => {
    // Navigate to first registration step
    console.log('Navigate to registration flow');
    navigateTo('registration');
  };

  return (
    <View className="flex-1 bg-primary">
      <GlobalStatusBar style="light-content" />
      {/* The client's brand gradient (components/ui/brand-backdrop). */}
      <BrandBackdrop />
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 60,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="mb-8">
            <Text className="mb-2 text-3xl font-bold text-on-primary">
              {t('register.stepsTitle')}
            </Text>
            <Text className="text-base text-on-primary/85">{t('register.stepsSubtitle')}</Text>
          </View>

          {/* Steps List */}
          <View className="mb-6 flex-1">
            {registrationSteps.map((item, index) => (
              <View
                key={item.step}
                className={`mb-6 flex-row ${index === registrationSteps.length - 1 ? '' : 'pb-6'}`}>
                {/* Step Number Circle */}
                <View className="mr-4">
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-on-primary">
                    <Text className="text-lg font-bold text-primary">{item.step}</Text>
                  </View>
                </View>

                {/* Step Content */}
                <View className="flex-1">
                  <Text className="mb-1.5 text-[17px] font-bold text-on-primary">
                    {t(`register.step${item.step}Title`)}
                  </Text>
                  <Text className="text-[13px] leading-5 text-on-primary/85">
                    {t(`register.step${item.step}Desc`)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Get Started Button */}
          <View className="mt-auto pt-4">
            <TouchBtn
              onPress={handleGetStarted}
              label={t('register.continue')}
              backgroundColor={colors.onPrimary}
              borderColor={colors.onPrimary}
              textColor={colors.primary}
              loadingColor={colors.primary}
              textClassName="text-lg font-semibold"
              buttonClassName="items-center rounded-xl py-4" // This matches your original exactly
              activeOpacity={0.8}
              containerClassName="" // Empty string to remove default px-6 pb-8
            />
          </View>
        </ScrollView>
      </View>
    </View>
  );
}
