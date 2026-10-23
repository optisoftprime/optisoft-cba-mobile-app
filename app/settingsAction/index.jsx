// screens/Action.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Toast from 'react-native-toast-message';
import { navigateBack, navigateReplace } from 'app/navigate';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import ConfirmDangerModal from 'components/modals/confirmModal';
import { logout, deactivateUser } from 'api/userProfile';
import { clearAll } from 'config/storage';

export default function Action() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    // Server-side: revoke the refresh token so it can't be used again
    // even if it somehow persisted on the client.
    const result = await logout(null, {});

    if (result.ok) {
      // Full logout — wipe SecureStore, AsyncStorage, and the TanStack
      // Query cache entirely. No refresh token, no biometric-unlock
      // secret, nothing survives. "Log Out" must mean logged out.
      await clearAll();

      Toast.show({
        type: 'success',
        text1: t('settings.loggedOutTitle'),
        text2: t('settings.loggedOutMessage'),
      });

      setIsLoggingOut(false);
      setLogoutModalVisible(false);

      // Send to the full login screen — username + password required.
      // Do NOT send to an unlock/biometric screen from an explicit logout.
      navigateReplace('landingScreen');
    } else {
      Toast.show({
        type: 'error',
        text1: t('settings.logoutFailedTitle'),
        text2: result.message || t('settings.somethingWentWrong'),
      });
      setIsLoggingOut(false);
    }
  };

  const handleDeactivate = async () => {
    setIsDeactivating(true);

    const result = await deactivateUser(null, {});

    if (result.ok) {
      await clearAll();
      Toast.show({
        type: 'success',
        text1: t('settings.deactivatedTitle'),
        text2: t('settings.deactivatedMessage'),
      });
      setIsDeactivating(false);
      setDeactivateModalVisible(false);
      navigateReplace('landingScreen');
    } else {
      Toast.show({
        type: 'error',
        text1: t('settings.deactivationFailedTitle'),
        text2: result.message || t('settings.somethingWentWrong'),
      });
      setIsDeactivating(false);
    }
  };

  const actions = [
    {
      id: 'logout',
      icon: 'log-out-outline',
      title: t('settings.logoutAction'),
      subtitle: t('settings.logoutActionSub'),
      onPress: () => setLogoutModalVisible(true),
    },
    {
      id: 'deactivate',
      icon: 'close-circle-outline',
      title: t('settings.deactivateAction'),
      subtitle: t('settings.deactivateActionSub'),
      onPress: () => setDeactivateModalVisible(true),
    },
  ];

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('settings.actionTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.ink}
        leftIconColor={colors.ink}
      />

      <ScrollView className="mt-3 flex-1 px-4" showsVerticalScrollIndicator={false}>
        <View className="gap-y-3">
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              onPress={action.onPress}
              className="flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5"
              activeOpacity={0.7}>
              <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-danger-soft">
                <Ionicons name={action.icon} size={20} color={colors.danger} />
              </View>

              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-ink">{action.title}</Text>
                <Text className="mt-0.5 text-xs text-ink-muted" numberOfLines={1}>
                  {action.subtitle}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </TouchableOpacity>
          ))}
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Logout confirmation */}
      <ConfirmDangerModal
        visible={logoutModalVisible}
        onClose={() => !isLoggingOut && setLogoutModalVisible(false)}
        onConfirm={handleLogout}
        isLoading={isLoggingOut}
        icon="log-out-outline"
        title={t('settings.logoutConfirmTitle')}
        subtitle={t('settings.logoutConfirmSub')}
        confirmLabel={t('settings.logoutConfirmLabel')}
        cancelLabel={t('settings.cancel')}
      />

      {/* Deactivate confirmation */}
      <ConfirmDangerModal
        visible={deactivateModalVisible}
        onClose={() => !isDeactivating && setDeactivateModalVisible(false)}
        onConfirm={handleDeactivate}
        isLoading={isDeactivating}
        icon="close-circle-outline"
        title={t('settings.deactivateConfirmTitle')}
        subtitle={t('settings.deactivateConfirmSub')}
        confirmLabel={t('settings.deactivateConfirmLabel')}
        cancelLabel={t('settings.cancel')}
      />
    </View>
  );
}
