// screens/LoginScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  BackHandler,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigateReplace, navigateTo } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { login } from 'api/auth';
import Toast from 'react-native-toast-message';
import { save, saveSecure, getUser } from 'config/storage';
import { queryClient } from 'app/_layout';
import TouchBtn from 'components/touchBtn';
import { useFocusEffect } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import { fetchUserDetails } from 'api/userProfile';
import { useIsMounted } from 'app/hooks/useIsMounted';
import { BrandLogo } from 'components/ui/brand-logo';
import { BrandBackdrop } from 'components/ui/brand-backdrop';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const isMounted = useIsMounted();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null); // 'fingerprint' | 'face' | null
  const [isTokenValid, setIsTokenValid] = useState(false);

  const isFormReady = username.trim().length > 0 && password.trim().length > 0;
  const isAnyLoading = isLoading || isBiometricLoading;

  // Check if existing token is still valid on mount. Silent: the user only opened
  // the login screen — an expired saved session must not pop a "Session Expired"
  // toast or redirect them; it is simply treated as no session.
  useEffect(() => {
    async function checkTokenValidity() {
      const response = await fetchUserDetails(null, { silent: true });
      if (response?.ok) {
        setIsTokenValid(true);
      }
    }
    checkTokenValidity();
  }, []);

  // Check biometric availability + saved session
  useEffect(() => {
    async function checkBiometricAndSession() {
      const [user, hasHardware, isEnrolled, supportedTypes] = await Promise.all([
        getUser(),
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);

      const sessionExists = !!user?.accountNumber || !!user?.firstName || !!user?.username;

      const canUseBiometric = hasHardware && isEnrolled;
      setBiometricAvailable(canUseBiometric);
      setHasSavedSession(sessionExists);

      if (canUseBiometric && supportedTypes?.length > 0) {
        // FACIAL_RECOGNITION = 2, FINGERPRINT = 1
        const hasFace = supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        );
        setBiometricType(hasFace ? 'face' : 'fingerprint');
      }
    }

    checkBiometricAndSession();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setHidden(true, 'none');
      NavigationBar.setVisibilityAsync('hidden');
    }, [])
  );

  // Hardware back button always routes to the landing screen, instead of
  // falling back to default stack-pop behavior. Blocked while a
  // login/biometric request is in flight so it can't be interrupted.
  useFocusEffect(
    React.useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isAnyLoading) return true;

        navigateReplace('landingScreen');
        return true; // we handled it — prevent default back behavior
      });
      return () => backHandler.remove();
    }, [isAnyLoading])
  );

  const handleLogin = async () => {
    setIsLoading(true);

    const trimmedUsername = username.trim();

    try {
      const response = await login(null, {
        username: trimmedUsername,
        password: password.trim(),
      });

      console.log(JSON.stringify(response, null, 2));

      if (response?.ok) {
        const accessToken = response?.data?.data?.token;
        const refreshToken = response?.data?.data?.refreshToken;

        await saveSecure('auth', {
          accessToken,
          refreshToken,
        });

        // Single source of truth for "who's logged in" — used by UnlockScreen
        await save('userLogs', {
          username: response?.data?.data?.username,
        });

        // Full username/password login = a fresh session. Wipe the TanStack
        // Query cache so no data from a previous user/session lingers — every
        // query in appLayout refetches from the server with the new token.
        // (Only on this password path — biometric unlock resumes the same
        // user's session and should keep its cache.)
        queryClient.clear();

        // The session is already saved above, so login "succeeded" even if the
        // user navigated away mid-request. Only pull them into the app if they're
        // STILL on this screen — otherwise a late success would hijack wherever
        // they went (QA: tap login, go back to register, still landed on home).
        if (!isMounted()) return;
        navigateTo('appLayout');
        return;
      }

      // Don't route or toast on a screen the user has already left.
      if (!isMounted()) return;

      // Route unverified accounts into the OTP flow. Match by substring so a
      // slightly different backend wording still triggers it (previously a
      // fragile exact === against a truncated string).
      if (response?.message?.toLowerCase().includes('not been activated')) {
        navigateTo('stageThree', {
          username: trimmedUsername,
          onRegistration: false,
          nextScreen: 'login',
        });
        return;
      }
      Toast.show({
        type: 'error',
        text1: t('login.loginFailedTitle'),
        text2: response?.message || t('login.somethingWentWrongRetry'),
      });
    } catch (error) {
      if (!isMounted()) return;
      Toast.show({
        type: 'error',
        text1: t('login.loginFailedTitle'),
        text2: error?.message || t('login.somethingWentWrong'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setIsBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          biometricType === 'face'
            ? t('login.biometricFacePrompt')
            : t('login.biometricFingerprintPrompt'),
        fallbackLabel: t('login.biometricFallbackPin'),
        cancelLabel: t('login.cancel'),
        disableDeviceFallback: false,
      });

      if (result?.success) {
        if (!isMounted()) return;
        navigateTo('appLayout');
      } else {
        if (result?.error === 'lockout' || result?.error === 'lockout_permanent') {
          Toast.show({
            type: 'error',
            text1: t('login.tooManyAttemptsTitle'),
            text2: t('login.biometricLockedMessage'),
          });
        } else if (
          result?.error !== 'user_cancel' &&
          result?.error !== 'system_cancel' &&
          result?.error !== 'app_cancel'
        ) {
          Toast.show({
            type: 'error',
            text1: t('login.verificationFailedTitle'),
            text2: t('login.verifyIdentityFailedManual'),
          });
        }
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: t('login.biometricErrorTitle'),
        text2: t('login.unexpectedErrorManual'),
      });
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const showBiometricButton = hasSavedSession && biometricAvailable && isTokenValid;

  const biometricIcon =
    biometricType === 'face'
      ? isBiometricLoading
        ? 'ellipsis-horizontal'
        : 'scan-outline'
      : isBiometricLoading
        ? 'ellipsis-horizontal'
        : 'finger-print';

  return (
    <View className="flex-1 bg-primary">
      {/* The client's brand gradient (components/ui/brand-backdrop). */}
      <BrandBackdrop />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 80,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isAnyLoading}
        keyboardShouldPersistTaps="handled">
        {/* Header — brand wordmark on its own line, then greeting + subtitle. */}
        <View className="mb-10">
          {/* White wordmark: this screen's background is the brand colour. */}
          <BrandLogo on="brand" size={40} style={{ marginBottom: 22, alignSelf: 'flex-start' }} />
          <Text className="mb-1.5 text-[30px] font-bold text-on-primary">
            {t('login.welcomeBackTitle')}
          </Text>
          <Text className="text-[15px] leading-[22px] text-on-primary/70">
            {t('login.signInSubtitle')}
          </Text>
        </View>

        {/* Form */}
        <View className="w-full">
          {/* Username */}
          <View className="mb-5">
            <Text className="mb-2 text-[13px] font-semibold tracking-[0.3px] text-on-primary/85">
              {t('login.usernameLabel')}
            </Text>
            <TextInput
              className="rounded-xl border border-on-primary/25 bg-on-primary/10 px-4 py-[15px] text-[15px] text-on-primary"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              // Explicit autofill hints — without these Android guesses which
              // saved credential goes where and can drop the password into the
              // username box (and vice-versa). Pin each field to its role.
              autoComplete="username"
              textContentType="username"
              importantForAutofill="yes"
              editable={!isAnyLoading}
              placeholder={t('login.usernamePlaceholder')}
              placeholderTextColor={`${colors.onPrimary}66`}
            />
          </View>

          {/* Password */}
          <View className="mb-8">
            <Text className="mb-2 text-[13px] font-semibold tracking-[0.3px] text-on-primary/85">
              {t('login.passwordLabel')}
            </Text>
            <View className="flex-row items-center rounded-xl border border-on-primary/25 bg-on-primary/10">
              <TextInput
                className="flex-1 px-4 py-[15px] text-[15px] text-on-primary"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                // Pin this field to the password role for autofill (see username above).
                autoComplete="current-password"
                textContentType="password"
                importantForAutofill="yes"
                editable={!isAnyLoading}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={`${colors.onPrimary}66`}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                className="px-4 py-[15px]"
                disabled={isAnyLoading}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={`${colors.onPrimary}A6`}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Login + Biometric button */}
          <View className="mb-7 flex-row items-center gap-3">
            <View className="flex-1">
              <TouchBtn
                onPress={handleLogin}
                label={t('common.login')}
                isLoading={isLoading}
                loadingText={t('login.pleaseWait')}
                disabled={!isFormReady || isBiometricLoading}
                backgroundColor={colors.onPrimary}
                borderColor={colors.onPrimary}
                textColor={colors.primary}
                loadingColor={colors.primary}
                textClassName="text-base font-semibold"
                buttonClassName="w-full items-center rounded-xl py-4"
                containerClassName=""
              />
            </View>

            {showBiometricButton && (
              <TouchableOpacity
                onPress={handleBiometricLogin}
                disabled={isAnyLoading}
                className={`h-[54px] w-[54px] items-center justify-center rounded-2xl border-[1.5px] border-on-primary/30 bg-on-primary/15 ${
                  isAnyLoading ? 'opacity-50' : ''
                }`}
                activeOpacity={0.7}>
                <Ionicons name={biometricIcon} size={26} color={colors.onPrimary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Forgot password — a quiet, centered link right under the button. */}
          <TouchableOpacity
            onPress={() => navigateTo('forgetPassword')}
            disabled={isAnyLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="mb-[26px] self-center">
            <Text className="text-sm font-semibold text-on-primary/85">
              {t('login.forgotPassword')}
            </Text>
          </TouchableOpacity>

          {/* "New here?" divider */}
          <View className="mb-[18px] flex-row items-center">
            <View className="h-px flex-1 bg-on-primary/20" />
            <Text className="mx-3 text-xs font-semibold tracking-[1px] text-on-primary/60">
              {t('login.newHere')}
            </Text>
            <View className="h-px flex-1 bg-on-primary/20" />
          </View>

          {/* Two glass pill actions instead of dot-separated text links. */}
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => navigateReplace('openNewAccount')}
              disabled={isAnyLoading}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] border-on-primary/30 bg-on-primary/10 py-3.5 ${
                isAnyLoading ? 'opacity-50' : ''
              }`}>
              <Ionicons name="wallet-outline" size={18} color={colors.onPrimary} />
              <Text className="text-sm font-semibold text-on-primary">
                {t('common.openAccount')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigateReplace('registration')}
              disabled={isAnyLoading}
              activeOpacity={0.7}
              className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl border-[1.5px] border-on-primary/30 bg-on-primary/10 py-3.5 ${
                isAnyLoading ? 'opacity-50' : ''
              }`}>
              <Ionicons name="person-add-outline" size={18} color={colors.onPrimary} />
              <Text className="text-sm font-semibold text-on-primary">{t('common.register')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
