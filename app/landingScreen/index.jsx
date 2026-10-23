// screens/WelcomeScreen.jsx
import { navigateTo } from 'app/navigate';
import React, { useCallback } from 'react';
import { View, Text, ImageBackground, Alert, BackHandler } from 'react-native';
import { useTranslation } from 'react-i18next';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { GlobalStatusBar } from 'config/statusBar';
import { useFocusEffect } from 'expo-router';
import { getUserLogs } from 'config/storage';
import Toast from 'react-native-toast-message';

export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleLogin = async () => {
    // If there's a saved session, send the user to the quick-unlock screen
    // (password or biometrics) instead of the full username/password form.
    const user = await getUserLogs();

    if (user?.username) {
      navigateTo('welcomeBack');
    } else {
      navigateTo('login');
    }
  };

  const handleRegister = () => navigateTo('registrationSteps');
  const handleOpenAccount = () => navigateTo('openNewAccount');
  // "Get Help" is reserved for a separate (not-yet-built) feature — NOT the FAQ.
  // Behave like the other inactive features: toast that it's unavailable.
  const handleHelp = () =>
    Toast.show({
      type: 'info',
      text1: t('landing.helpTitle'),
      text2: t('landing.helpMessage'),
    });
  const handleQuit = () => {
    Alert.alert(t('landing.quitTitle'), t('landing.quitMessage'), [
      { text: t('common.no'), style: 'cancel' },
      { text: t('common.yes'), style: 'destructive', onPress: () => BackHandler.exitApp() },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        handleQuit();
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  return (
    <ImageBackground
      source={require('../../assets/landing-hero.png')}
      className="flex-1"
      resizeMode="cover">
      <GlobalStatusBar style={'white-content'} />
      <View className="flex-1" style={{ backgroundColor: colors.heroOverlay }}>
        <View className="flex-1 justify-between px-5 pb-10 pt-16">
          {/* Hero Section */}
          <View className="mt-10">
            <Text
              className="mb-4 text-4xl font-bold leading-[44px]"
              style={{ color: colors.white }}>
              {t('landing.title')}
            </Text>
            <Text className="text-[15px] leading-6 opacity-95" style={{ color: colors.white }}>
              {t('landing.subtitle')}
            </Text>
          </View>

          {/* Buttons Section */}
          <View className="w-full">
            <TouchBtn
              onPress={handleLogin}
              label={t('common.login')}
              backgroundColor={colors.white}
              borderColor={colors.white}
              textColor={colors.primary}
              textClassName="text-base font-semibold"
              buttonClassName="mb-4 items-center rounded-xl py-4"
              activeOpacity={0.8}
              containerClassName=""
            />
            <TouchBtn
              onPress={handleRegister}
              label={t('common.register')}
              backgroundColor={`${colors.white}40`}
              borderColor={`${colors.white}40`}
              textColor={colors.white}
              textClassName="text-base font-semibold"
              buttonClassName="mb-6 items-center rounded-xl py-4"
              activeOpacity={0.8}
              containerClassName=""
            />
            <View className="flex-row justify-between px-1">
              <TouchBtn
                onPress={handleOpenAccount}
                label={t('common.openAccount')}
                backgroundColor="transparent"
                textColor={colors.white}
                textClassName="text-sm font-medium"
                buttonClassName=""
                containerClassName=""
              />
              <TouchBtn
                onPress={handleHelp}
                label={t('common.getHelp')}
                backgroundColor="transparent"
                textColor={colors.white}
                textClassName="text-sm font-medium"
                buttonClassName=""
                containerClassName=""
              />
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}
