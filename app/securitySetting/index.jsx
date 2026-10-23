// screens/SecuritySettings.jsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import { isEnabled } from 'config/features';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import FeatureGate from 'components/FeatureGate';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function SecuritySettings() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const securityOptions = [
    {
      id: 'security_pin',
      icon: 'key-outline',
      title: t('security.pinTitle'),
      subtitle: t('security.pinSubtitle'),
      disabled: false,
      // Setup / change a PIN the user already knows (working screen — untouched).
      onPress: () => navigateTo('resetTransactionPin'),
    },
    {
      id: 'forgot_pin',
      icon: 'lock-open-outline',
      title: t('security.forgotPinButtonTitle'),
      subtitle: t('security.forgotPinButtonSubtitle'),
      disabled: false,
      // Reset a PIN the user has forgotten, via an OTP to their phone.
      onPress: () => navigateTo('forgotTransactionPin'),
    },
    {
      id: 'biometrics',
      icon: 'finger-print-outline',
      title: t('security.biometricsTitle'),
      subtitle: t('security.biometricsSubtitle'),
      disabled: false,
      onPress: () => navigateTo('setUpFace'),
    },
    {
      id: 'security_question',
      icon: 'help-circle-outline',
      title: t('security.questionTitle'),
      subtitle: t('security.questionSubtitle'),
      disabled: false,
      onPress: () => navigateTo('securityQuestion'),
    },
    {
      id: 'two_factor',
      icon: 'mail-outline',
      title: t('security.twoFactorTitle'),
      subtitle: t('security.twoFactorSubtitle'),
      // Backend not live yet: config/features.js → twoFactor.
      disabled: !isEnabled('twoFactor'),
      onPress: () => navigateTo('twoFa'),
    },
    {
      id: 'login_activity',
      icon: 'log-in-outline',
      title: t('security.loginActivityTitle'),
      subtitle: t('security.loginActivitySubtitle'),
      // No screen or backend yet: config/features.js → loginActivity.
      disabled: !isEnabled('loginActivity'),
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('security.selfServiceTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.ink}
        leftIconColor={colors.ink}
      />

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <View className="gap-y-3">
          {securityOptions.map((option) => (
            <View key={option.id}>
              {/* FeatureGate must wrap the TouchableOpacity directly. It was
                  wrapping the outer View before, so it never intercepted the
                  inner press — disabled items (2FA, Login Activity) still
                  navigated. Now a disabled tap is caught and toasts "not
                  available" instead. */}
              <FeatureGate
                enabled={!option.disabled}
                message={t('security.underDevelopment', { feature: option.title })}>
                <TouchableOpacity
                  onPress={option.onPress}
                  className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5"
                  activeOpacity={0.7}>
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                    <Ionicons name={option.icon} size={20} color={colors.primary} />
                  </View>

                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-ink">{option.title}</Text>
                    <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                      {option.subtitle}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
                </TouchableOpacity>
              </FeatureGate>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
