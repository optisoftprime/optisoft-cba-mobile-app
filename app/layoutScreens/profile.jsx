// screens/Profile.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { getUser } from 'config/storage';
import { formatTier, getUpgradeLabel } from 'helper';
import Toast from 'react-native-toast-message';
import { useAccountFormat, getDisplayAccountNumber } from 'app/hooks/useAccountFormat';
import { useTheme } from 'config/ThemeContext';
import FeatureGate from 'components/FeatureGate';
import { isEnabled } from 'config/features';
import { Avatar } from 'components/ui/avatar';

export default function Profile() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const { data: accountFormat, isLoading } = useAccountFormat();

  const displayAccountNumber = getDisplayAccountNumber(accountFormat?.accountNumberFormat, user);
  useEffect(() => {
    async function fetchUser() {
      const data = await getUser();
      setUser(data);
    }
    fetchUser();
  }, []);

  const handleCopy = async () => {
    if (displayAccountNumber) {
      await Clipboard.setStringAsync(displayAccountNumber);
      Toast.show({
        type: 'success',
        text1: t('profile.copiedTitle'),
        text2: t('profile.copiedMessage'),
      });
    }
  };

  const accountTier = formatTier(user?.customerKycTier);
  const upgradeLabel = getUpgradeLabel(user?.customerKycTier);

  const fullName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : (user?.accountName ?? t('profile.loading'));

  const menuItems = [
    {
      id: 'profile_settings',
      icon: 'person-outline',
      title: t('profile.profileSettingsTitle'),
      subtitle: t('profile.profileSettingsSub'),
      onPress: () => navigateTo('profileSettings'),
      disabled: false,
    },
    {
      id: 'transfer_permission',
      icon: 'lock-closed-outline',
      title: t('profile.transferPermissionTitle'),
      subtitle: t('profile.transferPermissionSub'),
      onPress: () => navigateTo('transferPermission'),
      disabled: false,
    },
    {
      id: 'device_management',
      icon: 'phone-portrait-outline',
      title: t('profile.deviceManagementTitle'),
      subtitle: t('profile.deviceManagementSub'),
      onPress: () => navigateTo('deviceManagement'),
      disabled: false,
    },
    {
      id: 'linked_accounts',
      icon: 'swap-horizontal-outline',
      title: t('profile.changePrimaryTitle'),
      subtitle: t('profile.changePrimarySub'),
      onPress: () => navigateTo('linkAccount'),
      disabled: true,
    },
    {
      id: 'app_settings',
      icon: 'grid-outline',
      title: t('profile.appSettingsTitle'),
      subtitle: t('profile.appSettingsSub'),
      onPress: () => navigateTo('appSettings'),
      disabled: false,
    },
    {
      id: 'support',
      icon: 'help-circle-outline',
      title: t('profile.supportTitle'),
      subtitle: t('profile.supportSub'),
      onPress: () => navigateTo('support'),
      disabled: true,
    },
    {
      id: 'faq',
      icon: 'help-circle-outline',
      title: t('profile.faqTitle'),
      subtitle: t('profile.faqSub'),
      onPress: () => navigateTo('faq'),
      disabled: false,
    },
    {
      id: 'kyc',
      icon: 'person-add-outline',
      title: t('profile.kycTitle'),
      subtitle: t('profile.kycSub'),
      onPress: () => navigateTo('upgradeAccount'),
      disabled: false,
    },
    {
      id: 'rewards',
      icon: 'gift-outline',
      title: t('profile.rewardsTitle'),
      subtitle: t('profile.rewardsSub'),
      onPress: () => navigateTo('rewards'),
      disabled: !isEnabled('rewards'),
    },
    {
      id: 'referral',
      icon: 'people-outline',
      title: t('profile.referralTitle'),
      subtitle: t('profile.referralSub'),
      onPress: () => navigateTo('referal'),
      disabled: false,
    },
    {
      id: 'actions',
      icon: 'exit-outline',
      title: t('profile.actionsTitle'),
      subtitle: t('profile.actionsSub'),
      onPress: () => navigateTo('settingsAction'),
      disabled: false,
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <Header title={t('profile.title')} onLeftPress={() => navigateBack()} showLeftIcon={true} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Identity card — who is signed in, the account to copy, and the KYC
            tier with its upgrade action. */}
        <View className="mx-4 rounded-2xl border border-line bg-card p-4" style={shadows.sm}>
          <View className="flex-row items-center gap-3">
            <Avatar name={fullName} size={56} />

            <View className="flex-1">
              <Text className="text-[17px] font-bold text-ink" numberOfLines={1}>
                {fullName}
              </Text>

              <Pressable
                onPress={handleCopy}
                accessibilityRole="button"
                hitSlop={6}
                className="mt-1.5 flex-row items-center gap-1.5 self-start rounded-full bg-card-muted px-2.5 py-1 active:opacity-70">
                <Text className="text-[12px] text-ink-muted" numberOfLines={1}>
                  {t('profile.accountNo', { number: displayAccountNumber ?? '----------' })}
                </Text>
                <Ionicons name="copy-outline" size={13} color={colors.inkMuted} />
              </Pressable>
            </View>
          </View>

          <View className="mt-4 flex-row items-center justify-between gap-3 border-t border-line pt-3">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} />
              <Text className="text-[13px] font-medium text-ink">{accountTier}</Text>
            </View>

            {upgradeLabel ? (
              <Pressable
                onPress={() => navigateTo('upgradeAccount')}
                accessibilityRole="button"
                className="flex-row items-center gap-1 rounded-full bg-primary-light px-3 py-1.5 active:opacity-80">
                <Ionicons name="arrow-up-circle" size={14} color={colors.primaryDark} />
                <Text className="text-[12px] font-semibold text-primary-dark">{upgradeLabel}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Menu Items */}
        <View className="mt-5 gap-y-3 px-4">
          {menuItems.map((item, index) => (
            <FeatureGate
              key={item.id ?? index}
              enabled={!item.disabled} // remove this wrapper when feature is ready
              message={t('profile.featureUnderDevelopment', { feature: item.title })}>
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
