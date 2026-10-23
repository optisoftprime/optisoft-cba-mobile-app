// screens/SetupBiometrics.jsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import Header from 'components/header';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';

const BIOMETRICS_ENABLED_KEY = 'biometricsEnabled';

export default function SetupBiometrics() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [biometricType, setBiometricType] = useState('Biometrics');
  const [isEnabled, setIsEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Determine the friendly name for the biometric type available ──────────
  // NOTE: supportedAuthenticationTypesAsync() reports what the HARDWARE can do,
  // not what the user actually enrolled. Most Android phones report face
  // hardware even when the user only set up a fingerprint, so checking FACIAL
  // first mislabels fingerprint users as "Face ID" (QA-reported). Fingerprint is
  // the primary biometric on Android (and "Face ID" is Apple branding anyway),
  // so prefer it there; on iOS the reported type matches what's configured.
  const detectBiometricLabel = async () => {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const hasFingerprint = types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT);
    const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
    const hasIris = types.includes(LocalAuthentication.AuthenticationType.IRIS);

    if (Platform.OS === 'android') {
      if (hasFingerprint) setBiometricType('Fingerprint');
      else if (hasFace) setBiometricType('Face Unlock');
      else if (hasIris) setBiometricType('Iris Scan');
      else setBiometricType('Biometrics');
      return;
    }

    // iOS
    if (hasFace) setBiometricType('Face ID');
    else if (hasFingerprint) setBiometricType('Touch ID');
    else if (hasIris) setBiometricType('Iris Scan');
    else setBiometricType('Biometrics');
  };

  // ── Initial check: hardware, enrollment, current saved preference ─────────
  const checkBiometricStatus = useCallback(async () => {
    try {
      setIsChecking(true);

      const compatible = await LocalAuthentication.hasHardwareAsync();
      setHasHardware(compatible);

      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);
        await detectBiometricLabel();
      }

      const savedPref = await SecureStore.getItemAsync(BIOMETRICS_ENABLED_KEY);
      setIsEnabled(savedPref === 'true');
    } catch (error) {
      console.log('Biometric check error:', error);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkBiometricStatus();
  }, [checkBiometricStatus]);

  // ── Enable: prompt biometric scan, then save flag ──────────────────────────
  const handleEnable = async () => {
    try {
      setIsProcessing(true);

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('face.confirmPrompt', { type: biometricType }),
        cancelLabel: t('face.cancel'),
        disableDeviceFallback: false,
        fallbackLabel: t('face.useDevicePin'),
      });

      if (result.success) {
        await SecureStore.setItemAsync(BIOMETRICS_ENABLED_KEY, 'true');
        setIsEnabled(true);
        Toast.show({
          type: 'success',
          text1: t('face.biometricEnabledTitle', { type: biometricType }),
          text2: t('face.biometricEnabledMessage'),
        });
      } else if (result.error === 'lockout') {
        Toast.show({
          type: 'error',
          text1: t('face.tooManyAttemptsTitle'),
          text2: t('face.tooManyAttemptsMessage'),
        });
      } else {
        // user_cancel, system_cancel, not_available, etc.
        Toast.show({
          type: 'error',
          text1: t('face.verificationCancelledTitle'),
          text2: t('face.verificationCancelledMessage'),
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('face.somethingWentWrong'),
        text2: t('face.couldNotVerify'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Disable: just clear the stored flag ─────────────────────────────────────
  const handleDisable = async () => {
    try {
      setIsProcessing(true);
      await SecureStore.deleteItemAsync(BIOMETRICS_ENABLED_KEY);
      setIsEnabled(false);
      Toast.show({
        type: 'success',
        text1: t('face.biometricDisabledTitle', { type: biometricType }),
        text2: t('face.biometricDisabledMessage'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('face.somethingWentWrong'),
        text2: t('face.couldNotDisable'),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Toggle handler ───────────────────────────────────────────────────────────
  const handleToggle = (value) => {
    if (isProcessing) return;
    if (value) {
      handleEnable();
    } else {
      handleDisable();
    }
  };

  const biometricIconName = biometricType === 'Face ID' ? 'scan-outline' : 'finger-print-outline';

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('face.setupTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-5 pt-6">
          {isChecking ? (
            <View className="items-center justify-center py-20">
              <ActivityIndicator size="large" color={colors.primary} />
              <Text className="mt-4 text-sm text-ink-muted">{t('face.checkingCapabilities')}</Text>
            </View>
          ) : !hasHardware ? (
            // ── Device has no biometric hardware ───────────────────────────
            <View className="items-center py-16">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-card-muted">
                <Ionicons name="finger-print-outline" size={36} color={colors.inkSoft} />
              </View>
              <Text className="mb-2 text-center text-[17px] font-bold text-ink">
                {t('face.notSupportedTitle')}
              </Text>
              <Text className="px-6 text-center text-[13px] leading-5 text-ink-muted">
                {t('face.notSupportedMessage')}
              </Text>
            </View>
          ) : !isEnrolled ? (
            // ── Hardware exists but nothing enrolled in device settings ─────
            <View className="items-center py-16">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-warning-soft">
                <Ionicons name="alert-circle-outline" size={36} color={colors.warning} />
              </View>
              <Text className="mb-2 text-center text-[17px] font-bold text-ink">
                {t('face.noBiometricSetUp', { type: biometricType })}
              </Text>
              <Text className="px-6 text-center text-[13px] leading-5 text-ink-muted">
                {t('face.noBiometricMessage', { type: biometricType })}
              </Text>
              <TouchableOpacity
                onPress={checkBiometricStatus}
                className="mt-6 rounded-xl bg-primary px-6 py-3"
                activeOpacity={0.8}>
                <Text className="text-sm font-semibold text-on-primary">
                  {t('face.iveSetItUp')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Ready to enable/disable ──────────────────────────────────────
            <>
              <View className="items-center py-8">
                <View
                  className={`mb-4 h-20 w-20 items-center justify-center rounded-full ${
                    isEnabled ? 'bg-success-soft' : 'bg-primary-light'
                  }`}>
                  <Ionicons
                    name={biometricIconName}
                    size={40}
                    color={isEnabled ? colors.success : colors.primary}
                  />
                </View>
                <Text className="mb-1 text-center text-[17px] font-bold text-ink">
                  {t('face.biometricLogin', { type: biometricType })}
                </Text>
                <Text className="px-8 text-center text-[13px] leading-5 text-ink-muted">
                  {isEnabled
                    ? t('face.enabledDescription', { type: biometricType })
                    : t('face.disabledDescription', { type: biometricType })}
                </Text>
              </View>

              {/* Toggle row */}
              <View
                className="mt-4 flex-row items-center justify-between rounded-2xl border border-line bg-card p-4"
                style={shadows.sm}>
                <View className="mr-3 flex-1 flex-row items-center">
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
                    <Ionicons name={biometricIconName} size={20} color={colors.primary} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-ink">
                      {t('face.enableBiometric', { type: biometricType })}
                    </Text>
                    <Text className="mt-0.5 text-xs text-ink-muted">
                      {isEnabled ? t('face.currentlyActive') : t('face.currentlyInactive')}
                    </Text>
                  </View>
                </View>

                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={isEnabled}
                    onValueChange={handleToggle}
                    trackColor={{ false: colors.line, true: colors.primary }}
                    thumbColor={colors.white}
                  />
                )}
              </View>

              {/* Info note */}
              <View className="mt-4 flex-row items-start rounded-2xl bg-info-soft p-4">
                <Ionicons name="information-circle-outline" size={18} color={colors.info} />
                <Text className="ml-2 flex-1 text-xs leading-5 text-on-info-soft">
                  {t('face.privacyNote')}
                </Text>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
