// screens/CodeVerified.jsx
import React, { useCallback } from 'react';
import { View, Text, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { navigateReplace } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import { useFocusEffect } from 'expo-router';
import { remove } from 'config/storage';

export default function CodeVerified() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Terminal screen — the account is created and verified by this point. Drop
  // the resume pointer and the cached onboarding / PII data so nothing stale is
  // left in storage after onboarding finishes.
  const clearOnboardingState = () => {
    remove('appState');
    remove('onboardingAccountDetails');
  };

  const handleContinue = () => {
    clearOnboardingState();
    navigateReplace('landingScreen');
  };

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        clearOnboardingState();
        navigateReplace('landingScreen');
        return true;
      };

      const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => sub.remove();
    }, [])
  );

  return (
    <View className="flex-1 bg-background">
      {/* Progress Bar */}
      <View className="px-6 pb-4 pt-12">
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <View className={`h-full rounded-full bg-primary`} style={{ width: '100%' }} />
        </View>
        <Text className="mt-2 text-center text-xs text-ink-muted">{t('openAccount.step4of4')}</Text>
      </View>

      {/* Main Content */}
      <View className="flex-1 items-center justify-center px-8">
        {/* Success Icon */}
        <View className="mb-8">
          <View className="h-32 w-32 items-center justify-center rounded-full bg-success-soft">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-success">
              <MaterialIcons name="check" size={44} color={colors.onPrimary} />
            </View>
          </View>
        </View>

        {/* Title */}
        <Text className="mb-3 text-center text-2xl font-bold text-ink">
          {t('openAccount.codeVerifiedTitle')}
        </Text>

        {/* Subtitle */}
        <Text className="mb-16 text-center text-[15px] leading-6 text-ink-muted">
          {t('openAccount.codeVerifiedSubtitle')}
        </Text>
      </View>

      {/* Continue Button - Fixed at Bottom */}
      <View className="px-6 pb-8">
        <TouchBtn
          onPress={handleContinue}
          label={t('openAccount.continue')}
          backgroundColor={colors.primary}
          textClassName="text-base font-bold"
          buttonClassName="w-full items-center rounded-xl py-4"
          containerClassName=""
        />
      </View>
    </View>
  );
}
