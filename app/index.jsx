// app/index.jsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import '../global.css';
import { save, load, getUserLogs, loadSecure, saveSecure } from '../config/storage';
import { refreshToken as refreshTokenApi } from 'api/auth';
import { useTheme } from 'config/ThemeContext';
import { BrandLogo } from 'components/ui/brand-logo';

const BIOMETRICS_ENABLED_KEY = 'biometricsEnabled';
const MIN_SPLASH_MS = 1500; // keep the animation on screen at least this long
const REVIVE_TIMEOUT_MS = 4000; // don't let a slow network hang the splash

// Revive the saved session by minting a fresh access token from the stored
// refresh token, and persist it. Returns whether the session looks alive so the
// unlock screen knows whether to offer biometrics. Lenient on network/timeout
// errors (a failed network call is NOT proof the token expired) — the unlock
// screen's own handlers surface any real expiry and fall back to the password.
async function reviveSession() {
  try {
    const auth = await loadSecure('auth');
    if (!auth?.refreshToken) return false;

    const timeout = new Promise((resolve) =>
      setTimeout(() => resolve('timeout'), REVIVE_TIMEOUT_MS)
    );
    const result = await Promise.race([
      refreshTokenApi({ refreshToken: auth.refreshToken }),
      timeout,
    ]);

    if (result === 'timeout') return true; // slow network — stay lenient

    if (result?.ok && result?.data?.success === true) {
      await saveSecure('auth', {
        accessToken: result.data.data.token,
        refreshToken: result.data.data.refreshToken || auth.refreshToken,
      });
      return true;
    }
    return false; // refresh token itself is dead
  } catch {
    return true; // network/unknown error — stay lenient
  }
}

// All startup routing lives here so it happens behind the splash animation.
async function decideDestination() {
  // 1) First ever launch on this device → onboarding.
  const app = await load('app');
  if (!app?.hasOpenedBefore) {
    await save('app', { hasOpenedBefore: true });
    return { destination: '/onboarding' };
  }

  // 2) Mid onboarding / registration flow → resume where they left off.
  //    Skip 'stageOne': the first open-account step saves nothing, so resuming
  //    there just drops the user on an empty form (QA). Only resume to later
  //    stages, which have real saved progress (onboardingAccountDetails).
  const appState = await load('appState');
  if (appState?.stage && appState.stage !== 'stageOne') {
    return { destination: `/${appState.stage}`, params: appState?.params };
  }

  // 3) No saved session → the landing screen (Login / Register / …).
  const userLogs = await getUserLogs();
  if (!userLogs?.username) {
    return { destination: '/landingScreen' };
  }

  // 4) Returning user with a saved session → straight to the quick-unlock
  //    screen. Pre-compute the slow bits now (behind the animation) so the
  //    unlock screen shows instantly with biometrics already resolved.
  const [hasHardware, isEnrolled, supportedTypes, biometricsFlag] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
    SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY),
  ]);

  const canUseBiometric = hasHardware && isEnrolled && biometricsFlag === 'true';
  const bio = canUseBiometric
    ? supportedTypes?.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'face'
      : 'fingerprint'
    : 'none';

  // Only the biometric path needs the session pre-revived (to decide whether to
  // offer the fingerprint/face button). The password path does a full login, so
  // skip the network call for password-only users and keep their splash snappy.
  const sessionAlive = canUseBiometric ? await reviveSession() : false;

  return {
    destination: '/welcomeBack',
    params: { preChecked: '1', sessionAlive: sessionAlive ? '1' : '0', bio },
  };
}

// ─── Loading dots (activity indicator under the logo) ─────────────────────────

function LoadingDots() {
  const { colors } = useTheme();
  const d1 = useRef(new Animated.Value(0.3)).current;
  const d2 = useRef(new Animated.Value(0.3)).current;
  const d3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = (v, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.3,
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
    const a = pulse(d1, 0);
    const b = pulse(d2, 160);
    const c = pulse(d3, 320);
    a.start();
    b.start();
    c.start();
    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, []);

  const dotStyle = (v) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: colors.primary,
    opacity: v,
    transform: [{ scale: v.interpolate({ inputRange: [0.3, 1], outputRange: [0.8, 1.2] }) }],
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.View style={dotStyle(d1)} />
      <Animated.View style={dotStyle(d2)} />
      <Animated.View style={dotStyle(d3)} />
    </View>
  );
}

// ─── Splash ───────────────────────────────────────────────────────────────────

export default function SplashScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.6)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance: fade + spring-scale in.
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Gentle breathing pulse (starts after the entrance settles).
    Animated.sequence([
      Animated.delay(800),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Soft vertical float.
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -6,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Run routing + session revive behind the animation, then navigate.
    let cancelled = false;
    const startedAt = Date.now();

    (async () => {
      let result = { destination: '/landingScreen' };
      try {
        result = await decideDestination();
      } catch (e) {
        console.warn('Splash routing failed, defaulting to landingScreen', e);
      }

      const wait = Math.max(0, MIN_SPLASH_MS - (Date.now() - startedAt));
      setTimeout(() => {
        if (cancelled) return;
        Animated.timing(fadeAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start(
          () => {
            if (cancelled) return;
            if (result.params) {
              router.replace({ pathname: result.destination, params: result.params });
            } else {
              router.replace(result.destination);
            }
          }
        );
      }, wait);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View className="flex-1" style={{ backgroundColor: colors.splashBackground }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View className="flex-1 items-center justify-center">
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [
              { translateY: floatAnim },
              { scale: Animated.multiply(scaleAnim, pulseAnim) },
            ],
          }}>
          {/* Picks the dark- or white-wordmark file from the theme. */}
          <BrandLogo size={52} />
        </Animated.View>

        <View style={{ position: 'absolute', bottom: 90 }}>
          <LoadingDots />
        </View>
      </View>
    </View>
  );
}
