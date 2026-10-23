// screens/UnlockScreen.jsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  BackHandler,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { navigateTo, navigateReplace } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { login, refreshToken as refreshTokenApi } from 'api/auth';
import Toast from 'react-native-toast-message';
import { saveSecure, getUserLogs, loadSecure, clearAllFull } from 'config/storage';
import * as SecureStore from 'expo-secure-store';
import TouchBtn from 'components/touchBtn';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as NavigationBar from 'expo-navigation-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import { BrandLogo } from 'components/ui/brand-logo';
import { BrandBackdrop } from 'components/ui/brand-backdrop';

const { width, height } = Dimensions.get('window');

const BIOMETRICS_ENABLED_KEY = 'biometricsEnabled';

export default function UnlockScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  // The splash (app/index.jsx) may pre-run the biometric + session checks and
  // pass the result in as params so this screen can skip the network re-check.
  const params = useLocalSearchParams();

  const [user, setUser] = useState(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isBiometricLoading, setIsBiometricLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null); // 'face' | 'fingerprint' | null

  const isAnyLoading = isLoading || isBiometricLoading;
  const isFormReady = password.trim().length > 0 && !isInitializing;

  // Probe whether the stored refresh token can still mint a fresh access token.
  // Used to decide whether biometric unlock should even be offered (see init).
  // refresh-token is a PUBLIC route, so a failed call here will NOT trigger the
  // interceptor's session-expired clearAll()/redirect — it just tells us the
  // session is dead so we can hide the fingerprint instead of letting the user
  // authenticate and then get bounced to login on the first 401.
  const canReviveSession = async () => {
    try {
      const auth = await loadSecure('auth');
      if (!auth?.refreshToken) return false;

      const refreshResponse = await refreshTokenApi({ refreshToken: auth.refreshToken });
      const refreshSucceeded = refreshResponse?.ok && refreshResponse?.data?.success === true;

      if (!refreshSucceeded) return false;

      // Session is alive — persist the freshly minted tokens so the unlock path
      // (and the app it enters) starts from a valid access token.
      const newAccessToken = refreshResponse.data.data.token;
      const newRefreshToken = refreshResponse.data.data.refreshToken || auth.refreshToken;
      await saveSecure('auth', {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
      return true;
    } catch (error) {
      // A network/unknown error is NOT proof the token has expired — stay lenient
      // and still offer biometrics; the in-handler refresh will surface any real
      // problem and fall back to the password field.
      return true;
    }
  };

  // ── Load saved user + check biometric capability + check user OPT-IN ──────
  useEffect(() => {
    async function init() {
      try {
        // ── Fast path ──────────────────────────────────────────────────────
        // The splash already ran the biometric-capability check and revived the
        // session, passing the outcome in as params. Trust it and skip the
        // (network) canReviveSession() re-check so this screen renders instantly
        // instead of spinning again.
        if (params?.preChecked === '1') {
          const savedUser = await getUserLogs();
          setUser(savedUser);
          if (!savedUser?.username) {
            navigateReplace('login');
            return;
          }
          const bio = params?.bio; // 'face' | 'fingerprint' | 'none'
          if (bio && bio !== 'none') {
            setBiometricType(bio);
            setBiometricAvailable(params?.sessionAlive === '1');
          } else {
            setBiometricAvailable(false);
          }
          return;
        }

        // ── Fallback path ──────────────────────────────────────────────────
        // Reached directly (e.g. from the landing screen's Login button) — run
        // the full capability + session-revive checks here.
        const [savedUser, hasHardware, isEnrolled, supportedTypes, biometricsFlag] =
          await Promise.all([
            getUserLogs(),
            LocalAuthentication.hasHardwareAsync(),
            LocalAuthentication.isEnrolledAsync(),
            LocalAuthentication.supportedAuthenticationTypesAsync(),
            SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY),
          ]);

        setUser(savedUser);

        // No saved session at all — nothing to unlock, send to full login
        if (!savedUser?.username) {
          navigateReplace('login');
          return;
        }

        // Biometrics is only usable if:
        // 1. device has the hardware
        // 2. device has something enrolled (Face/Fingerprint set up at OS level)
        // 3. the USER explicitly opted in via SetupBiometrics — this is the
        //    flag the Settings toggle writes; without checking it, the toggle
        //    does nothing and biometrics auto-fires for anyone with Face ID
        //    set up for their phone in general, not for this app specifically.
        const userOptedIn = biometricsFlag === 'true';
        const canUseBiometric = hasHardware && isEnrolled && userOptedIn;

        if (canUseBiometric) {
          const hasFace = supportedTypes?.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
          );
          setBiometricType(hasFace ? 'face' : 'fingerprint');

          // Even with the hardware + opt-in in place, only surface biometric
          // unlock if the saved session can actually be revived. If the refresh
          // token has expired, unlocking would pass the fingerprint/face check
          // and then immediately bounce the user to login on the first 401/403 —
          // exactly the annoyance we're removing. Hide it when the session is
          // dead; the password field below still does a fresh login.
          const sessionRevivable = await canReviveSession();
          setBiometricAvailable(sessionRevivable);
        } else {
          setBiometricAvailable(false);
        }
      } catch (error) {
        console.log('Unlock screen initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    }
    init();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      StatusBar.setHidden(true, 'none');
      NavigationBar.setVisibilityAsync('hidden');
    }, [])
  );

  // Hardware back button now routes to the landing screen (same behavior
  // as LoginScreen) instead of doing nothing. Still blocked while a
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

  // Biometric unlock is USER-INITIATED — the user taps the fingerprint/face
  // icon to trigger it (see handleBiometricLogin on the icon below). We do NOT
  // auto-prompt on mount/launch: QA flagged the OS prompt firing by itself on
  // app open (BUG-014) as unexpected. The icon only shows when biometrics are
  // actually available (opted in + enrolled + session revivable).

  // ── Password unlock ────────────────────────────────────────────────────────
  const handlePasswordLogin = async () => {
    if (!user?.username) {
      Toast.show({
        type: 'error',
        text1: t('login.sessionExpiredTitle'),
        text2: t('login.sessionExpiredUsernamePassword'),
      });
      navigateReplace('login');
      return;
    }

    setIsLoading(true);
    const response = await login(null, {
      username: user.username,
      password: password.trim(),
    });

    if (response?.ok) {
      const accessToken = response?.data?.data?.token;
      const refreshToken = response?.data?.data?.refreshToken;
      await saveSecure('auth', { accessToken, refreshToken });
      navigateTo('appLayout');
    } else {
      Toast.show({
        type: 'error',
        text1: t('login.incorrectPasswordTitle'),
        text2: response?.message || t('login.pleaseTryAgain'),
      });
      setIsLoading(false);
    }
  };

  // ── Biometric unlock ───────────────────────────────────────────────────────
  const handleBiometricLogin = async () => {
    if (!user?.username) {
      Toast.show({
        type: 'error',
        text1: t('login.sessionExpiredTitle'),
        text2: t('login.sessionExpiredUsernamePassword'),
      });
      navigateReplace('login');
      return;
    }

    setIsBiometricLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:
          biometricType === 'face'
            ? t('login.biometricFacePrompt')
            : t('login.biometricFingerprintPrompt'),
        fallbackLabel: t('login.biometricFallbackPassword'),
        cancelLabel: t('login.cancel'),
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Biometrics confirmed. Now silently get a fresh access token
        // using the stored refresh token before entering the app.
        // This handles the post-logout case where accessToken is null
        // but refreshToken is still valid.
        const auth = await loadSecure('auth');

        if (auth?.refreshToken) {
          try {
            const refreshResponse = await refreshTokenApi({
              refreshToken: auth.refreshToken,
            });

            const refreshSucceeded = refreshResponse?.ok && refreshResponse?.data?.success === true;

            if (refreshSucceeded) {
              const newAccessToken = refreshResponse.data.data.token;
              const newRefreshToken = refreshResponse.data.data.refreshToken || auth.refreshToken;

              await saveSecure('auth', {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
              });

              // Fresh token in place — safe to enter app
              navigateTo('appLayout');
            } else {
              // Refresh token itself has expired — full re-login required
              Toast.show({
                type: 'error',
                text1: t('login.sessionExpiredCapsTitle'),
                text2: t('login.sessionExpiredPassword'),
              });
              navigateReplace('login');
            }
          } catch (refreshError) {
            // Network error or backend down — let them try password instead
            Toast.show({
              type: 'error',
              text1: t('login.couldNotVerifySessionTitle'),
              text2: t('login.enterPasswordToContinue'),
            });
          }
        } else {
          // No refresh token at all (very first login ever, or full sign-out)
          // — access token might still be valid from a recent password login
          if (auth?.accessToken) {
            // Access token exists, let the axios interceptor handle expiry
            // reactively if needed
            navigateTo('appLayout');
          } else {
            // Truly nothing — send to full login
            Toast.show({
              type: 'error',
              text1: t('login.sessionExpiredCapsTitle'),
              text2: t('login.sessionExpiredPassword'),
            });
            navigateReplace('login');
          }
        }
      } else {
        if (result.error === 'lockout' || result.error === 'lockout_permanent') {
          Toast.show({
            type: 'error',
            text1: t('login.tooManyAttemptsTitle'),
            text2: t('login.biometricLockedMessage'),
          });
        } else if (
          result.error !== 'user_cancel' &&
          result.error !== 'system_cancel' &&
          result.error !== 'app_cancel'
        ) {
          Toast.show({
            type: 'error',
            text1: t('login.verificationFailedTitle'),
            text2: t('login.verifyIdentityFailedPassword'),
          });
        }
        // user_cancel / system_cancel: silent — user just wants the password field
      }
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: t('login.biometricErrorTitle'),
        text2: t('login.unexpectedErrorPassword'),
      });
    } finally {
      setIsBiometricLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    // Full wipe — username, tokens, everything. Next app open will route
    // to LoginScreen (full username + password) not UnlockScreen.
    await clearAllFull();
    navigateReplace('login');
  };

  const biometricIcon =
    biometricType === 'face'
      ? isBiometricLoading
        ? 'ellipsis-horizontal'
        : 'scan-outline'
      : isBiometricLoading
        ? 'ellipsis-horizontal'
        : 'finger-print';

  // Greeting now uses username only — API doesn't return firstName
  const greetingName = user?.username
    ? user.username.charAt(0).toUpperCase() + user.username.slice(1).toLowerCase()
    : 'Back';

  return (
    <View className="flex-1 bg-primary">
      {/* The client's brand gradient (components/ui/brand-backdrop). */}
      <BrandBackdrop />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: 24,
          paddingTop: 70,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isAnyLoading}
        keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View className="mb-5 items-center">
          <BrandLogo on="brand" size={44} />
        </View>

        {/* Header */}
        <View className="mb-10">
          <Text className="mb-1.5 text-[32px] font-bold text-on-primary">
            {user?.username
              ? t('login.welcomeBackName', { name: greetingName })
              : t('login.welcomeBackTitle')}
          </Text>
          <Text className="text-[15px] leading-[22px] text-on-primary/70">
            {t('login.unlockSubtitle')}
          </Text>
        </View>

        {isInitializing ? (
          <View className="items-center py-10">
            <ActivityIndicator size="small" color={colors.onPrimary} />
          </View>
        ) : (
          <View className="w-full">
            {/* Password field */}
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
                  editable={!isAnyLoading}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={`${colors.onPrimary}66`}
                  autoCapitalize="none"
                  autoCorrect={false}
                  // Pin to the password role so autofill can't drop a username here.
                  autoComplete="current-password"
                  textContentType="password"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  onSubmitEditing={isFormReady ? handlePasswordLogin : undefined}
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

            {/* Unlock + Biometric button row — same layout as LoginScreen's
                Login + biometric row, so the button is finally the right
                size and sits in a familiar place. */}
            <View className="mb-7 flex-row items-center gap-3">
              <View className="flex-1">
                <TouchBtn
                  onPress={handlePasswordLogin}
                  label={t('login.unlock')}
                  isLoading={isLoading}
                  loadingText={t('login.verifying')}
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

              {biometricAvailable && (
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
          </View>
        )}

        {/* Switch account */}
        <View className="flex-1 items-center justify-end">
          <TouchableOpacity
            onPress={handleSwitchAccount}
            disabled={isAnyLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text className="text-sm text-on-primary/75">
              {t('login.notName', { name: greetingName })}{' '}
              <Text className="font-semibold text-on-primary">{t('login.switchAccount')}</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
