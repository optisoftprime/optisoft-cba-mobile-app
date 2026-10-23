// screens/LinkAccount.jsx
//
// Step 1 of the in-app "Change Primary Account" flow (NOT the registration
// flow — this one is transient and never persists resume state). The user taps
// "Link Account"; we run the SAME endpoint the registration first screen uses
// (publicValidateAccountNumber) but with the account number pulled from storage
// instead of typed. That validates the account, returns all of the customer's
// accounts, and auto-sends the OTP. Then → linkAccountOtp.
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from 'components/header';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import { navigateBack, navigateTo } from 'app/navigate';
import Toast from 'react-native-toast-message';
import { getUser } from 'config/storage';
import { publicValidateAccountNumber } from 'api/auth';

export default function LinkAccount() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // The account number is taken from the logged-in user (saved on dashboard
  // load) — the user never types it here.
  useEffect(() => {
    (async () => {
      const user = await getUser();
      setAccountNumber(user?.accountNumber ?? '');
      setAccountName(user?.accountName ?? '');
      setLoadingUser(false);
    })();
  }, []);

  // Blur + defer two frames before navigating away (Fabric addViewAt guard,
  // same helper the registration flow uses).
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => navFn());
    });
  }, []);

  const handleLink = async () => {
    if (!accountNumber) {
      Toast.show({
        type: 'error',
        text1: t('linkAccount.noAccountFoundTitle'),
        text2: t('linkAccount.noAccountFoundMessage'),
      });
      return;
    }

    setIsLoading(true);
    // Same endpoint as registration step 1: validates the account, returns ALL
    // of the customer's accounts, and triggers the OTP automatically.
    const response = await publicValidateAccountNumber({ accountNumber });

    if (response?.ok) {
      const accounts = response?.data?.data ?? [];

      if (!accounts.length) {
        Toast.show({
          type: 'error',
          text1: t('linkAccount.accountNotFoundTitle'),
          text2: response?.message || t('linkAccount.accountNotFoundMessage'),
        });
        setIsLoading(false);
        return;
      }

      // The OTP goes to the account's registered phone — use it for the OTP
      // screen's display (fall back to the first returned account).
      const matched = accounts.find((a) => a?.accountNumber === accountNumber);
      const phoneNumber = matched?.phoneNumber ?? accounts[0]?.phoneNumber ?? '';

      setIsLoading(false);
      // Carry the accounts through the flow via params (no persistence).
      settleThenNavigate(() =>
        navigateTo('linkAccountOtp', {
          accountNumber,
          phoneNumber,
          accounts: JSON.stringify(accounts),
        })
      );
      return;
    }

    Toast.show({
      type: 'error',
      text1: t('linkAccount.failedTitle'),
      text2: response?.message || t('linkAccount.somethingWentWrong'),
    });
    setIsLoading(false);
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('linkAccount.headerTitle')}
          onLeftPress={() => settleThenNavigate(navigateBack)}
          showLeftIcon
          color={colors.textPrimary}
        />

        <View className="flex-1 px-5 pt-4">
          <View className="mb-6 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary-light">
              <Ionicons name="swap-horizontal" size={36} color={colors.primary} />
            </View>
          </View>

          <Text className="mb-2 text-center text-[20px] font-bold text-ink">
            {t('linkAccount.heading')}
          </Text>
          <Text className="mb-6 text-center text-[13px] leading-5 text-ink-muted">
            {t('linkAccount.description')}
          </Text>

          <View className="rounded-2xl border border-line bg-card p-4" style={shadows.sm}>
            <Text className="text-xs font-medium text-ink-soft">
              {t('linkAccount.currentPrimary')}
            </Text>
            {loadingUser ? (
              <View className="mt-2 h-4 w-40 rounded-md bg-card-muted" />
            ) : (
              <>
                <Text className="mt-1 text-[15px] font-semibold text-ink">
                  {accountName || t('linkAccount.yourAccount')}
                </Text>
                <Text className="text-[13px] text-ink-muted">{accountNumber || '----------'}</Text>
              </>
            )}
          </View>
        </View>

        <View className="px-5 pb-6 pt-4">
          <TouchBtn
            onPress={handleLink}
            isLoading={isLoading}
            loadingText={t('linkAccount.pleaseWait')}
            disabled={loadingUser || !accountNumber}
            label={t('linkAccount.linkAccountButton')}
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
