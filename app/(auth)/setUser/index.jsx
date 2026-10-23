// screens/SetUsernamePassword.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, BackHandler, ScrollView, Keyboard } from 'react-native';
import Header from 'components/header';
import { navigateBack, navigateReplace } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import TextInputComponent from 'components/textInputs';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { save, load } from 'config/storage';
import { register } from 'api/auth';
import Toast from 'react-native-toast-message';

export default function SetUsernamePassword() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [showConfirmPassword, setShowConfirmPassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const params = useLocalSearchParams();

  const isFormReady =
    username.trim().length > 0 && password.length >= 6 && confirmPassword.length >= 6;

  // Save state so app can resume here if closed
  useEffect(() => {
    save('appState', {
      stage: 'setUser',
      params: {
        accountNumber: params?.accountNumber,
      },
    });
  }, []);

  // The username/password inputs hold focus + the keyboard and, on the password
  // fields, the Android autofill popup. Navigating away mid-focus crashes Fabric
  // (`addViewAt … child already has a parent`) — worse here because success
  // REPLACES (unmounts) this screen. Blur first, then defer navigation two frames
  // so the input detaches before the screen unmounts.
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navFn();
      });
    });
  }, []);

  const handleCancelConfirm = () => {
    Alert.alert(t('register.leavePageTitle'), t('register.leavePageMessage'), [
      { text: t('register.noStay'), style: 'cancel' },
      {
        text: t('register.yesLeave'),
        style: 'destructive',
        onPress: () => {
          save('appState', null);
          save('registrationState', null);
          settleThenNavigate(navigateBack);
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
    Keyboard.dismiss();
    try {
      const accountNumber =
        params?.accountNumber || (await load('registrationState'))?.accountNumber;

      if (!accountNumber) {
        Toast.show({
          type: 'error',
          text1: t('register.errorTitle'),
          text2: t('register.sessionExpired'),
        });
        save('appState', null);
        save('registrationState', null);
        settleThenNavigate(navigateBack);
        return;
      }

      if (password !== confirmPassword) {
        Toast.show({
          type: 'error',
          text1: t('register.passwordMismatchTitle'),
          text2: t('register.passwordsDoNotMatch'),
        });
        return;
      }

      if (password.length < 6) {
        Toast.show({
          type: 'error',
          text1: t('register.weakPasswordTitle'),
          text2: t('register.weakPasswordMessage'),
        });
        return;
      }

      setIsLoading(true);

      const response = await register(null, {
        username: username.trim(),
        password,
        accountNumber,
      });

      console.log(JSON.stringify(response, null, 2));

      if (response?.ok) {
        Toast.show({
          type: 'success',
          text1: t('register.accountCreatedTitle'),
          text2: t('register.accountCreatedMessage'),
        });
        save('appState', null);
        save('registrationState', null);
        // Security questions require an access token, so they're set AFTER
        // login (via an in-app button), not during registration. Send the
        // newly registered user to the login screen. Keep the button loading
        // through the replace: flipping it back would re-render every input at
        // the instant this screen unmounts (a Fabric reconciliation hazard).
        settleThenNavigate(() => navigateReplace('login'));
        return;
      } else {
        Toast.show({
          type: 'error',
          text1: t('register.registrationFailedTitle'),
          text2: response?.message || t('register.somethingWrong'),
        });
        setIsLoading(false);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('register.registrationFailedTitle'),
        text2: error?.message || t('register.somethingWrong'),
      });
      setIsLoading(false);
    }
  };

  // setInterval(() => {
  //   console.log(params?.accountNumber);
  // }, 3000);

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('register.setUserHeader')}
          onLeftPress={handleCancelConfirm}
          showLeftIcon={true}
          subtitle={t('register.setUserSubtitle')}
          color={colors.ink}
        />

        <View className="flex-1 px-5 pt-2">
          <TextInputComponent
            label={t('register.usernameLabel')}
            value={username}
            onChangeText={setUsername}
            placeholder={t('register.usernamePlaceholder')}
            isLoading={isLoading}
            autoCapitalize="none"
          />

          <TextInputComponent
            label={t('register.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('register.passwordPlaceholder')}
            showPasswordToggle={true}
            secureTextEntry={showPassword} // 👈 removed the !
            onToggleSecureTextEntry={() => setShowPassword(!showPassword)}
            isLoading={isLoading}
          />

          <TextInputComponent
            label={t('register.confirmPasswordLabel')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('register.confirmPasswordPlaceholder')}
            showPasswordToggle={true}
            secureTextEntry={showConfirmPassword}
            onToggleSecureTextEntry={() => setShowConfirmPassword(!showConfirmPassword)}
            isLoading={isLoading}
            error={
              confirmPassword.length > 0 && password !== confirmPassword
                ? t('register.passwordsDoNotMatch')
                : null
            }
          />
        </View>

        <View className="px-5 pb-6 pt-4">
          <TouchBtn
            onPress={handleContinue}
            isLoading={isLoading}
            loadingText={t('register.pleaseWait')}
            disabled={!isFormReady}
            label={t('register.continue')}
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-xl py-4"
            activeOpacity={0.8}
            containerClassName=""
          />
        </View>
      </ScrollView>
    </View>
  );
}
