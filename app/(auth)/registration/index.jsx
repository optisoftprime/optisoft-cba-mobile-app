// screens/RegistrationForm.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import TextInputComponent from 'components/textInputs';
import { GlobalStatusBar } from 'config/statusBar';
import { publicValidateAccountNumber } from 'api/auth';
import Toast from 'react-native-toast-message';
import { save } from 'config/storage';

export default function RegistrationForm() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [accountNumber, setAccountNumber] = useState('');
  const [isAgreed, setIsAgreed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isFormReady = accountNumber?.replace(/\s/g, '')?.length === 10 && isAgreed;

  // Blur the focused input, then defer navigation two frames so the keyboard /
  // autofill popup detaches BEFORE react-native-screens tears the screen down.
  // Navigating mid-focus is what crashes Fabric with `addViewAt … child already
  // has a parent`. Every navigation off this screen goes through here.
  const settleThenNavigate = useCallback((navFn) => {
    Keyboard.dismiss();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        navFn();
      });
    });
  }, []);

  const handleContinue = async () => {
    Keyboard.dismiss();
    setIsLoading(true);
    const cleanedAccountNumber = accountNumber?.replace(/\s/g, '')?.trim();

    // Validates the account number, returns ALL of the customer's accounts,
    // and triggers the registration OTP automatically (backend side effect).
    const response = await publicValidateAccountNumber({ accountNumber: cleanedAccountNumber });

    if (response?.ok) {
      const accounts = response?.data?.data ?? [];

      // Guard against a "valid HTTP, invalid account" response (200 with
      // success:false / no accounts). Without this the user would advance to an
      // OTP that was never sent and only dead-end at the select-account step.
      if (!accounts.length) {
        Toast.show({
          type: 'error',
          text1: t('register.accountNotFoundTitle'),
          text2: response?.message || t('register.accountNotFoundMessage'),
        });
        setIsLoading(false);
        return;
      }

      // The OTP goes to the entered account's phone — use it for the OTP
      // screen's display (fall back to the first returned account).
      const matched = accounts.find((a) => a?.accountNumber === cleanedAccountNumber);
      const phoneNumber = matched?.phoneNumber ?? accounts[0]?.phoneNumber ?? '';

      console.log(response?.data, 'response in register');

      // Persist the accounts + identifiers so the select-primary screen can use
      // them WITHOUT re-fetching, and so the flow survives a crash-resume.
      await save('registrationState', {
        accountNumber: cleanedAccountNumber,
        phoneNumber,
        accounts,
      });

      // Flow: enter account number → OTP (sent automatically) → pick primary.
      // Reset loading BEFORE navigating: this is a push (the screen stays in the
      // back stack), so leaving it loading would show a stuck spinner if the
      // user comes back.
      setIsLoading(false);
      settleThenNavigate(() =>
        navigateTo('otp', {
          phoneNumber,
          accountNumber: cleanedAccountNumber,
          nextScreen: 'setPrimaryAccount',
        })
      );
      return;
    } else {
      Toast.show({
        type: 'error',
        text1: t('register.failedTitle'),
        text2: response?.message || t('register.somethingWrong'),
      });
    }

    setIsLoading(false);
  };

  const toggleCheckbox = () => setIsAgreed(!isAgreed);

  function goBack() {
    settleThenNavigate(navigateBack);
  }

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style="dark-content" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title={t('register.formHeader')}
          onLeftPress={goBack}
          showLeftIcon={true}
          color={colors.ink}
        />

        <View className="flex-1 px-5">
          <TextInputComponent
            label={t('register.accountNumberLabel')}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder={t('register.accountNumberPlaceholder')}
            keyboardType="numeric"
            maxLength={10}
            isLoading={isLoading}
          />

          <TouchableOpacity
            onPress={toggleCheckbox}
            className="mb-6 flex-row items-start"
            activeOpacity={0.7}
            disabled={isLoading}>
            <View
              className={`mr-3 mt-0.5 h-5 w-5 items-center justify-center rounded-md border-2 ${
                isAgreed ? 'border-primary bg-primary' : 'border-line bg-card'
              }`}>
              {isAgreed && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
            </View>
            <Text className="flex-1 text-[13px] leading-5 text-ink-muted">
              {t('register.termsAgreement')}
              <Text className="font-semibold text-primary">{t('register.termsLink')}</Text>
            </Text>
          </TouchableOpacity>
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
