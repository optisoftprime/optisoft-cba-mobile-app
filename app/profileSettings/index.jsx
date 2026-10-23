// screens/PersonalInformation.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Header from 'components/header';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getUser } from 'config/storage';
import { fetchUserDetails } from 'api/userProfile';
import Toast from 'react-native-toast-message';
import * as Clipboard from 'expo-clipboard';
import { navigateBack } from 'app/navigate';
import { useAccountFormat, getDisplayAccountNumber } from 'app/hooks/useAccountFormat';

function formatDate(dateString, notProvided) {
  if (!dateString) return notProvided;
  const parsed = new Date(dateString);
  if (isNaN(parsed.getTime())) return dateString;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatAddress(addressDto, notProvided) {
  if (!addressDto) return notProvided;
  const { street, city, lga, state, country } = addressDto;
  return [street, city, lga, state, country].filter(Boolean).join(', ') || notProvided;
}

function InfoCard({ icon, label, value, loading, copyable }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const handleCopy = async () => {
    if (!value || value === t('settings.notProvided')) return;
    try {
      await Clipboard.setStringAsync(String(value));
      Toast.show({ type: 'success', text1: t('settings.copiedSuffix', { label }) });
    } catch (err) {
      Toast.show({ type: 'error', text1: t('settings.couldNotCopy'), text2: err?.message });
    }
  };

  return (
    <View className="mb-3 flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-xs text-ink-muted">{label}</Text>
        {loading ? (
          <View className="mt-1 h-4 w-32 rounded-md bg-card-muted" />
        ) : (
          <Text className="text-[15px] font-semibold text-ink">{value}</Text>
        )}
      </View>
      {copyable && !loading ? (
        <TouchableOpacity
          onPress={handleCopy}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-primary-light"
          activeOpacity={0.7}>
          <Ionicons name="copy-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function PersonalInformation() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Match the Profile tab's account-number rule so the SAME number shows on both
  // screens (BUG-016). When the org's format is PHONE_NUMBER the account is shown
  // as the user's phone; otherwise the raw account number.
  const { data: accountFormat } = useAccountFormat();
  const displayAccountNumber =
    getDisplayAccountNumber(accountFormat?.accountNumberFormat, profile) ||
    t('settings.notProvided');

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(false);
    const notProvided = t('settings.notProvided');
    try {
      const [response, localUser] = await Promise.all([fetchUserDetails(), getUser()]);

      if (response?.ok && response?.data?.data) {
        const data = response.data.data;
        setProfile({
          username: data.username || localUser?.username || notProvided,
          accountName: localUser?.accountName || notProvided,
          accountNumber: localUser?.accountNumber || notProvided,
          mobilePhone: data.mobilePhone || localUser?.mobilePhone || null,
          fullName: [data.firstName, data.middleName, data.lastName].filter(Boolean).join(' '),
          dateOfBirth: formatDate(data.dateOfBirth, notProvided),
          gender: data.gender || notProvided,
          address: formatAddress(data.addressDto, notProvided),
          bvn: data.BVN || notProvided,
          nin: data.NIN || notProvided,
        });
      } else {
        throw new Error(response?.data?.message || response?.message || 'Unable to load profile');
      }
    } catch (err) {
      setError(true);
      Toast.show({
        type: 'error',
        text1: t('settings.loadProfileFailed'),
        text2: err?.message || t('settings.pleaseTryAgain'),
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const showSkeleton = loading && !profile;

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('settings.personalInfoTitle')}
        onLeftPress={() => navigateBack()}
        showLeftIcon={true}
        color={colors.ink}
        leftIconColor={colors.ink}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <View className="flex-1 px-4 pt-3">
          {error && !profile ? (
            <View className="flex-1 items-center justify-center py-20">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-danger-soft">
                <Ionicons name="alert-circle-outline" size={32} color={colors.danger} />
              </View>
              <Text className="mb-4 mt-3 text-center text-sm text-ink-muted">
                {t('settings.loadProfileError')}
              </Text>
              <TouchableOpacity
                onPress={loadProfile}
                className="rounded-xl bg-primary px-6 py-3"
                activeOpacity={0.8}>
                <Text className="text-sm font-semibold text-on-primary">{t('settings.retry')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <InfoCard
                icon="at-outline"
                label={t('settings.username')}
                value={profile?.username}
                loading={showSkeleton}
              />
              <InfoCard
                icon="wallet-outline"
                label={t('settings.accountName')}
                value={profile?.accountName}
                loading={showSkeleton}
              />
              <InfoCard
                icon="card-outline"
                label={t('settings.accountNumber')}
                value={displayAccountNumber}
                loading={showSkeleton}
                copyable
              />
              <InfoCard
                icon="person-outline"
                label={t('settings.name')}
                value={profile?.fullName}
                loading={showSkeleton}
              />
              <InfoCard
                icon="calendar-outline"
                label={t('settings.dateOfBirth')}
                value={profile?.dateOfBirth}
                loading={showSkeleton}
              />
              <InfoCard
                icon="person-outline"
                label={t('settings.gender')}
                value={profile?.gender}
                loading={showSkeleton}
              />
              <InfoCard
                icon="location-outline"
                label={t('settings.residentialAddress')}
                value={profile?.address}
                loading={showSkeleton}
              />
              <InfoCard
                icon="call-outline"
                label={t('settings.bvn')}
                value={profile?.bvn}
                loading={showSkeleton}
              />
              <InfoCard
                icon="finger-print-outline"
                label={t('settings.nin')}
                value={profile?.nin}
                loading={showSkeleton}
              />

              {loading && profile ? (
                <View className="mt-2 flex-row items-center justify-center py-2">
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text className="ml-2 text-xs text-ink-soft">{t('settings.refreshing')}</Text>
                </View>
              ) : null}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
