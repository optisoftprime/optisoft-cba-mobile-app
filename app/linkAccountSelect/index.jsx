// screens/LinkAccountSelect.jsx
//
// Step 3 (final) of the in-app "Change Primary Account" flow. The accounts were
// returned by validate-account-number in step 1 and carried through the flow as
// a JSON param (no persistence). The user picks one; we call markAccountPrimary
// (same endpoint as registration). On success we DON'T trust the client — we
// invalidate the home queries so the dashboard + user details refetch fresh from
// the backend, then land on the home dashboard.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, BackHandler, Alert, Keyboard } from 'react-native';
import Header from 'components/header';
import Dropdown from 'components/dropDown';
import { navigateBack, navigateTo } from 'app/navigate';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import Toast from 'react-native-toast-message';
import { markAccountPrimary } from 'api/auth';

export default function LinkAccountSelect() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();
  const queryClient = useQueryClient();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Accounts arrive as a JSON string param (transient — nothing is persisted).
  useEffect(() => {
    let list = [];
    try {
      list = params?.accounts ? JSON.parse(params.accounts) : [];
    } catch (_e) {
      list = [];
    }
    setAccounts(list);
    // Pre-select the user's current primary account, if present.
    const matching = list.find((a) => a?.accountNumber === params?.accountNumber);
    setSelectedAccountNumber(matching?.accountNumber ?? list[0]?.accountNumber ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => navFn());
    });
  }, []);

  const goBack = () => {
    Alert.alert(t('linkAccount.leavePageTitle'), t('linkAccount.leavePageMessage'), [
      { text: t('linkAccount.noStay'), style: 'cancel' },
      {
        text: t('linkAccount.yesLeave'),
        style: 'destructive',
        onPress: () => settleThenNavigate(navigateBack),
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        goBack();
        return true;
      });
      return () => backHandler.remove();
    }, [])
  );

  const handleContinue = async () => {
    const selected = accounts?.find((a) => a?.accountNumber === selectedAccountNumber);
    if (!selected) {
      Toast.show({
        type: 'error',
        text1: t('linkAccount.selectAccountTitle'),
        text2: t('linkAccount.selectAccountMessage'),
      });
      return;
    }

    setIsSubmitting(true);
    const response = await markAccountPrimary(null, {
      accountNumber: selected?.accountNumber,
      phoneNumber: selected?.phoneNumber,
    });

    if (response?.ok) {
      Toast.show({
        type: 'success',
        text1: t('linkAccount.primaryUpdatedTitle'),
        text2: t('linkAccount.primaryUpdatedMessage'),
      });
      // It's a fintech app — never assume the change stuck. Invalidate the home
      // queries so the dashboard + user details refetch from the backend and the
      // UI reflects the server's actual state (both queryFns re-sync storage).
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['userDetails'] });
      setIsSubmitting(false);
      settleThenNavigate(() => navigateTo('appLayout'));
      return;
    }

    Toast.show({
      type: 'error',
      text1: t('linkAccount.couldNotSetPrimaryTitle'),
      text2: response?.message || t('linkAccount.pleaseTryAgain'),
    });
    setIsSubmitting(false);
  };

  const accountOptions = accounts.map((a) => ({
    label: `${a?.accountName ?? t('linkAccount.account')} — ${a?.accountNumber ?? ''}`,
    value: a?.accountNumber,
  }));
  const selectedAccount = accounts.find((a) => a?.accountNumber === selectedAccountNumber);

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('linkAccount.selectHeaderTitle')}
          onLeftPress={goBack}
          showLeftIcon
          color={colors.textPrimary}
        />

        <View className="mb-6 px-5">
          <Text className="text-[13px] leading-5 text-ink-muted">
            {t('linkAccount.selectDescription')}
          </Text>
        </View>

        {!accounts?.length ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center text-[15px] font-semibold text-ink">
              {t('linkAccount.noAccounts')}
            </Text>
          </View>
        ) : (
          <View className="flex-1 px-5">
            <Dropdown
              label={t('linkAccount.accountLabel')}
              placeholder={t('linkAccount.accountPlaceholder')}
              value={selectedAccountNumber}
              options={accountOptions}
              onSelect={setSelectedAccountNumber}
              isOpen={isDropdownOpen}
              onToggle={() => !isSubmitting && setIsDropdownOpen((prev) => !prev)}
              isLoading={isSubmitting}
              search={accounts.length > 5}
            />

            {selectedAccount && (
              <View className="mt-4 rounded-2xl border border-line bg-card p-4" style={shadows.sm}>
                <Text className="text-xs font-medium text-ink-soft">
                  {t('linkAccount.selectedAccount')}
                </Text>
                <Text className="mt-1 text-[15px] font-semibold text-ink">
                  {selectedAccount?.accountName}
                </Text>
                <Text className="text-[13px] text-ink-muted">{selectedAccount?.accountNumber}</Text>
                {!!selectedAccount?.phoneNumber && (
                  <Text className="mt-1 text-xs text-ink-soft">{selectedAccount?.phoneNumber}</Text>
                )}
              </View>
            )}
          </View>
        )}

        <View className="mt-auto px-5 pb-6 pt-4">
          <TouchBtn
            onPress={handleContinue}
            isLoading={isSubmitting}
            loadingText={t('linkAccount.settingPrimary')}
            disabled={!accounts?.length || !selectedAccountNumber}
            label={t('linkAccount.setAsPrimary')}
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
