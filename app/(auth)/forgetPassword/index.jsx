// screens/ForgetPassword.jsx
import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import { forgotPassword } from 'api/auth';
import Toast from 'react-native-toast-message';
import TextInputComponent from 'components/textInputs';
import TouchBtn from 'components/touchBtn';
import { save } from 'config/storage';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ForgetPassword() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [userId, setUserId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = async () => {
    setIsLoading(true);

    try {
      const response = await forgotPassword(null, {
        userId: userId,
      });

      console.log(JSON.stringify(response, null, 2));

      if (response?.ok) {
        // Durable store for the whole reset flow. The OTP and reset-password
        // screens both need `userId` (the username), and persisting it here
        // means an app crash / restart can resume the flow instead of forcing
        // the user to start over. Mirrors `registrationState` in the register
        // flow.
        await save('resetPasswordState', { userId });

        Toast.show({
          type: 'success',
          text1: t('login.passwordResetTitle'),
          text2: response?.data?.message || t('login.passwordResetSent'),
        });
        navigateTo('otp', { userId: userId, nextScreen: 'resetPassword' });
      } else {
        Toast.show({
          type: 'error',
          text1: t('login.resetPasswordFailedTitle'),
          text2: response?.message || t('login.somethingWentWrong'),
        });
      }
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
    navigateBack();
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('login.forgetPasswordTitle')}
          onLeftPress={() => {
            navigateBack();
          }}
          showLeftIcon={true}
          color={colors.ink}
        />

        {/* Form Content */}
        <View className="flex-1 px-5">
          {/* Subtitle */}
          <Text className="mb-5 text-sm leading-5 text-ink-muted">
            {t('login.forgetPasswordSubtitle')}
          </Text>

          {/* User name Input */}
          <TextInputComponent
            label={t('login.userNameLabel')}
            value={userId}
            onChangeText={(text) => {
              setUserId(text);
              console.log('User ID Input:', text);
            }}
            placeholder={t('login.userNamePlaceholder')}
            keyboardType="default"
            isLoading={isLoading}
          />
        </View>

        {/* Buttons - Fixed at Bottom */}
        <View className="px-5 pb-6 pt-4">
          {/* Continue Button */}
          <TouchBtn
            onPress={handleContinue}
            isLoading={isLoading}
            loadingText={t('login.pleaseWait')}
            disabled={!userId.trim()}
            label={t('login.continue')}
            textClassName="text-base font-semibold"
            buttonClassName="mb-3 items-center rounded-xl py-4"
            backgroundColor={colors.primary}
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
