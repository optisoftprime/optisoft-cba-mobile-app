// screens/setPrimaryAccount.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  Alert,
  Keyboard,
} from 'react-native';
import Header from 'components/header';
import Dropdown from 'components/dropDown';
import { navigateBack, navigateTo } from 'app/navigate';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { GlobalStatusBar } from 'config/statusBar';
import Toast from 'react-native-toast-message';
import { save, load } from 'config/storage';
import { markAccountPrimary } from 'api/auth';

export default function SetPrimaryAccount() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams();

  const [accounts, setAccounts] = useState([]);
  const [selectedAccountNumber, setSelectedAccountNumber] = useState(null);

  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Resume pointer so a closed/crashed app comes back to this step.
  useEffect(() => {
    save('appState', {
      stage: 'setPrimaryAccount',
      params: {
        phoneNumber: params?.phoneNumber,
        accountNumber: params?.accountNumber,
        nextScreen: params?.nextScreen,
      },
    });
  }, []);

  // Accounts are NOT fetched here anymore — they were returned by the
  // validate-account-number call during registration and stashed in
  // registrationState. Read them from there (works on crash-resume too).
  const loadAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    setLoadError(null);

    const stored = await load('registrationState');
    const list = stored?.accounts ?? [];

    if (list.length) {
      setAccounts(list);
      // Pre-select the account the user registered with, if present.
      const matching = list.find((a) => a?.accountNumber === params?.accountNumber);
      setSelectedAccountNumber(matching?.accountNumber ?? list[0]?.accountNumber ?? null);
    } else {
      setLoadError(t('register.loadAccountsError'));
    }

    setIsLoadingAccounts(false);
  }, [params?.accountNumber, t]);

  useEffect(() => {
    loadAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Defensive: this screen is dropdown-only, but the dropdown's search field can
  // hold focus/keyboard. Blur first, then defer navigation two frames so nothing
  // is still attached when the screen tears down — same Fabric `addViewAt` guard
  // used across the flow.
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navFn();
      });
    });
  }, []);

  const goBack = () => {
    Alert.alert(t('register.leavePageTitle'), t('register.leavePageMessage'), [
      { text: t('register.noStay'), style: 'cancel' },
      {
        text: t('register.yesLeave'),
        style: 'destructive',
        onPress: () => {
          // Clear the resume pointer and the durable register store so a
          // back-out doesn't leave the app resuming into a half-finished
          // registration.
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
        text1: t('register.selectAnAccountTitle'),
        text2: t('register.selectAnAccountMessage'),
      });
      return;
    }

    setIsSubmitting(true);

    const response = await markAccountPrimary(null, {
      accountNumber: selected?.accountNumber,
      phoneNumber: selected?.phoneNumber,
    });

    if (response?.ok) {
      await save('registrationState', {
        accountNumber: selected?.accountNumber,
        phoneNumber: selected?.phoneNumber,
      });

      // OTP was already verified before this screen, so primary-account
      // selection is the last onboarding step — go straight to setUser to
      // create the username/password. Reset submitting before the (push)
      // navigation so a back-navigation lands on a clean screen.
      setIsSubmitting(false);
      settleThenNavigate(() =>
        navigateTo('setUser', {
          accountNumber: selected?.accountNumber,
          phoneNumber: selected?.phoneNumber,
        })
      );
      return;
    } else {
      Toast.show({
        type: 'error',
        text1: t('register.couldNotSetPrimaryTitle'),
        text2: response?.message || t('register.pleaseTryAgain'),
      });
    }

    setIsSubmitting(false);
  };

  const renderBody = () => {
    if (isLoadingAccounts) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-center text-[13px] text-ink-muted">
            {t('register.loadingAccounts')}
          </Text>
        </View>
      );
    }

    if (loadError) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="mb-4 text-center text-[13px] text-ink-muted">{loadError}</Text>
          <TouchBtn
            onPress={loadAccounts}
            label={t('register.tryAgain')}
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-xl px-6 py-3"
            containerClassName=""
          />
        </View>
      );
    }

    if (!accounts?.length) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-[13px] text-ink-muted">{t('register.noAccounts')}</Text>
        </View>
      );
    }

    // Each account is { accountNumber, accountName, phoneNumber } per the API.
    const accountOptions = accounts.map((a) => ({
      label: `${a?.accountName ?? t('register.account')} — ${a?.accountNumber ?? ''}`,
      value: a?.accountNumber,
    }));

    const selectedAccount = accounts.find((a) => a?.accountNumber === selectedAccountNumber);

    return (
      <View className="flex-1 px-5">
        <Dropdown
          label={t('register.accountLabel')}
          placeholder={t('register.accountPlaceholder')}
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
              {t('register.selectedAccount')}
            </Text>
            <Text className="mt-1 text-[15px] font-semibold text-ink">
              {selectedAccount?.accountName}
            </Text>
            <Text className="mt-0.5 text-[13px] text-ink-muted">
              {selectedAccount?.accountNumber}
            </Text>
            {!!selectedAccount?.phoneNumber && (
              <Text className="mt-1 text-xs text-ink-soft">{selectedAccount?.phoneNumber}</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('register.selectPrimaryHeader')}
          onLeftPress={goBack}
          showLeftIcon={true}
          color={colors.ink}
        />

        <View className="mb-6 px-5">
          <Text className="text-sm leading-5 text-ink-muted">
            {t('register.selectPrimaryDescription')}
          </Text>
        </View>

        {renderBody()}

        <View className="mt-auto px-5 pb-6 pt-4">
          <TouchBtn
            onPress={handleContinue}
            isLoading={isSubmitting}
            loadingText={t('register.settingPrimary')}
            disabled={isLoadingAccounts || !!loadError || !selectedAccountNumber}
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
