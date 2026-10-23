// screens/Congratulations.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { navigateTo } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'config/ThemeContext';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { load, remove } from 'config/storage';
import Toast from 'react-native-toast-message';

export default function Congratulations() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [dowloadingDetails, setDownloadingDetails] = useState(false);
  const [customerDetails, setCustomerDetails] = useState(null);

  useEffect(() => {
    const getCustomerDetails = async () => {
      const onboardingAccountDetails = await load('onboardingAccountDetails');
      const accountDetails = onboardingAccountDetails?.customerAccountDetails;
      setCustomerDetails(accountDetails);
    };

    getCustomerDetails();
  }, []);

  console.log(customerDetails, customerDetails?.accountDetails?.accountNumber, 'customerDetails');

  const handleDownloadDetails = async () => {
    setDownloadingDetails(true);
    try {
      const html = `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 24px;">
            <h1>Account Details</h1>

            <hr />

            <p><strong>First Name:</strong> ${customerDetails?.firstName ?? ''}</p>
            <p><strong>Last Name:</strong> ${customerDetails?.lastName ?? ''}</p>
            <p><strong>Email:</strong> ${customerDetails?.email ?? ''}</p>
            <p><strong>Phone Number:</strong> ${customerDetails?.phoneNumber ?? ''}</p>

            <h2>Bank Account Information</h2>

            <p><strong>Account Name:</strong> ${customerDetails?.accountDetails?.accountName ?? ''}</p>
            <p><strong>Account Number:</strong> ${customerDetails?.accountDetails?.accountNumber ?? ''}</p>

            <hr />

            <p style="font-size:12px;color:#666;">
              Generated on ${new Date().toLocaleString()}
            </p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });

      console.log('PDF saved to:', uri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('openAccount.downloadAccountDetails'),
        });
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      Toast.show({
        type: 'error',
        text1: t('openAccount.downloadFailedTitle'),
        text2: t('openAccount.downloadFailedMessage'),
      });
    } finally {
      setDownloadingDetails(false);
    }
  };

  const handleCopyAccountNumber = async () => {
    const accountNumber = customerDetails?.accountDetails?.accountNumber;

    if (!accountNumber) return;

    try {
      await Clipboard.setStringAsync(accountNumber);
      Toast.show({
        type: 'success',
        text1: t('openAccount.copiedTitle'),
        text2: t('openAccount.copiedMessage'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('openAccount.copyFailedTitle'),
        text2: t('openAccount.copyFailedMessage'),
      });
    }
  };

  const handleGoToDashboard = () => {
    // Terminal (registration path) — onboarding is complete, so clear the
    // resume pointer and the cached onboarding / PII data before login.
    remove('appState');
    remove('onboardingAccountDetails');
    navigateTo('login');
  };

  return (
    <View className="flex-1 bg-background">
      {/* Progress Bar */}
      <View className="px-6 pb-4 pt-12">
        <View className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <View className={`h-full rounded-full bg-primary`} style={{ width: '100%' }} />
        </View>
        <Text className="mt-2 text-center text-xs text-ink-muted">{t('openAccount.step3of3')}</Text>
      </View>

      {/* Main Content */}
      <View className="flex-1 items-center px-6 pt-8">
        {/* Celebration Icon */}
        <View className="mb-6">
          <Image
            source={require('../../../assets/confetti.png')}
            style={{ width: 120, height: 120 }}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text className="mb-2 text-center text-2xl font-bold text-ink">
          {t('openAccount.congratulationsTitle')}
        </Text>

        {/* Subtitle */}
        <Text className="mb-8 text-center text-[15px] leading-6 text-ink-muted">
          {t('openAccount.congratulationsSubtitle')}
        </Text>

        {/* Account Number Card — the brand panel, as on the home wallet */}
        <View className="mb-6 w-full overflow-hidden rounded-3xl bg-primary p-6" style={shadows.md}>
          <View className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-on-primary/10" />
          <View className="absolute -bottom-20 right-10 h-40 w-40 rounded-full bg-on-primary/5" />

          <Text className="mb-4 text-center text-sm font-medium text-on-primary/85">
            {t('openAccount.yourAccountNumber')}
          </Text>

          <TouchableOpacity
            onPress={handleCopyAccountNumber}
            className="mb-4 items-center justify-center">
            <Text className="mb-1 text-[11px] text-on-primary/75">
              {customerDetails?.firstName} {customerDetails?.lastName}
            </Text>

            <View className="flex-row items-center">
              <Text className="mr-2 text-2xl font-bold tracking-wider text-on-primary">
                {customerDetails?.accountDetails?.accountNumber ?? '--'}
              </Text>

              <View className="h-8 w-8 items-center justify-center rounded-full bg-on-primary/15">
                <MaterialCommunityIcons name="content-copy" size={16} color={colors.onPrimary} />
              </View>
            </View>
          </TouchableOpacity>

          <Text className="text-center text-xs text-on-primary/75">
            {t('openAccount.tapToCopy')}
          </Text>
        </View>

        {/* Checklist */}
        <View className="mb-8 w-full rounded-2xl border border-line bg-card px-4">
          <View className="flex-row items-center border-b border-line py-3.5">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-success-soft">
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
            </View>
            <Text className="ml-3 text-sm text-ink">{t('openAccount.accountGenerated')}</Text>
          </View>
          <View className="flex-row items-center py-3.5">
            <View className="h-8 w-8 items-center justify-center rounded-full bg-success-soft">
              <MaterialIcons name="check-circle" size={18} color={colors.success} />
            </View>
            <Text className="ml-3 text-sm text-ink">{t('openAccount.phoneVerified')}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View className="px-6 pb-8">
        {/* Go to Dashboard Button */}
        <TouchBtn
          onPress={handleGoToDashboard}
          label={t('common.login')}
          backgroundColor={colors.primary}
          textClassName="text-base font-bold"
          buttonClassName="mb-3 w-full items-center rounded-xl py-4"
          containerClassName=""
        />

        {/* Download Account Details Button */}
        <TouchBtn
          onPress={handleDownloadDetails}
          label={
            !dowloadingDetails
              ? t('openAccount.downloadAccountDetails')
              : t('openAccount.downloading')
          }
          isLoading={dowloadingDetails}
          disabled={dowloadingDetails || !customerDetails}
          textClassName="text-base font-bold"
          buttonClassName="w-full items-center rounded-xl py-4 px-4"
          backgroundColor={colors.card}
          borderColor={colors.line}
          borderWidth={1}
          textColor={colors.ink}
          loadingColor={colors.primary}
          containerClassName=""
        />
      </View>
    </View>
  );
}
