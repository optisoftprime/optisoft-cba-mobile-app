import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, BackHandler, Alert } from 'react-native';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import { confirmResetPassword } from 'api/auth';
import Toast from 'react-native-toast-message';
import TouchBtn from 'components/touchBtn';
import TextInputComponent from 'components/textInputs';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { save, load } from 'config/storage';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Illustration } from 'components/ui/illustration';

export default function ResetPassword() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const params = useLocalSearchParams();

  // Persist the resume pointer so a closed / crashed app comes straight back
  // to this screen. `userId` (the username) is the only thing
  // confirmResetPassword needs, and it also lives in the durable
  // resetPasswordState store as a fallback.
  useEffect(() => {
    save('appState', {
      stage: 'resetPassword',
      params: { userId: params?.userId },
    });
  }, []);

  const clearResetState = () => {
    save('appState', null);
    save('resetPasswordState', null);
  };

  const handleCancelConfirm = () => {
    Alert.alert(t('login.leavePageTitle'), t('login.leavePageMessage'), [
      { text: t('login.noStay'), style: 'cancel' },
      {
        text: t('login.yesLeave'),
        style: 'destructive',
        onPress: () => {
          clearResetState();
          navigateBack();
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleCancelConfirm();
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  const handleContinue = async () => {
    // Recover the username from route params, falling back to the durable
    // resetPasswordState store so a crash-resumed session (component state
    // lost) can still complete the reset.
    const userId = params?.userId || (await load('resetPasswordState'))?.userId;

    if (!userId) {
      Toast.show({
        type: 'error',
        text1: t('login.errorTitle'),
        text2: t('login.sessionExpiredStartOver'),
      });
      clearResetState();
      navigateBack();
      return;
    }

    setIsLoading(true);

    try {
      const response = await confirmResetPassword(null, {
        userId,
        newPassword: newPassword,
      });

      console.log(JSON.stringify(response, response?.message, null, 2));

      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('login.passwordResetTitle'),
          text2: response?.message || t('login.passwordResetSuccess'),
        });
        clearResetState();
        navigateTo('landingScreen');
        return;
      }

      Toast.show({
        type: 'error',
        text1: t('login.resetPasswordFailedTitle'),
        text2: response?.message || t('login.somethingWentWrong'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('login.resetPasswordFailedTitle'),
        text2: error?.message || t('login.somethingWentWrong'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    clearResetState();
    navigateBack();
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('login.resetPasswordTitle')}
          onLeftPress={handleCancelConfirm}
          showLeftIcon
          color={colors.ink}
        />

        {/* Form Content */}
        <View className="flex-1 px-5">
          {/* Subtitle */}
          <Text className="mb-6 text-sm leading-5 text-ink-muted">
            {t('login.resetPasswordSubtitle')}
          </Text>

          {/* Illustration */}
          <View className="mb-6 items-center">
            <Illustration
              source={require('../../../assets/illus-password.png')}
              darkSource={require('../../../assets/illus-password-dark.png')}
              className="h-56 w-full"
              resizeMode="contain"
            />
          </View>

          {/* New Password Input */}
          <TextInputComponent
            label={t('login.newPasswordLabel')}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
            placeholder={t('login.newPasswordPlaceholder')}
            showPasswordToggle
            onToggleSecureTextEntry={() => setShowNewPassword(!showNewPassword)}
            iconColor={colors.primary}
            isLoading={isLoading}
          />

          {/* Confirm Password Input */}
          <TextInputComponent
            label={t('login.confirmPasswordLabel')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            placeholder={t('login.confirmPasswordPlaceholder')}
            showPasswordToggle
            onToggleSecureTextEntry={() => setShowConfirmPassword(!showConfirmPassword)}
            iconColor={colors.primary}
            isLoading={isLoading}
          />
        </View>

        {/* Buttons - Fixed at Bottom */}
        <View className="px-5 pb-6 pt-4">
          {/* Continue Button */}
          <TouchBtn
            onPress={handleContinue}
            isLoading={isLoading}
            loadingText={t('login.verifying')}
            label={t('login.continue')}
            disabled={
              isLoading || !newPassword || !confirmPassword || newPassword !== confirmPassword
            }
            textClassName="text-base font-semibold"
            buttonClassName="mb-3 items-center rounded-xl py-4"
            activeOpacity={0.8}
            containerClassName=""
          />

          {/* Cancel Button */}
          <TouchBtn
            onPress={handleCancel}
            label={t('login.cancel')}
            textClassName="text-base font-semibold"
            textColor={colors.ink}
            buttonClassName="items-center rounded-xl py-4"
            backgroundColor={colors.card}
            borderColor={colors.line}
            borderWidth={1}
            activeOpacity={0.8}
            containerClassName=""
          />
        </View>
      </ScrollView>
    </View>
  );
}
