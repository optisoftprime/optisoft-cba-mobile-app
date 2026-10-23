// screens/PayCable.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Keyboard,
} from 'react-native';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import TouchBtn from 'components/touchBtn';
import QuickAmountGrid from 'components/QuickAmountGrid';
import { formatWithCommas, stripCommas } from 'helper';
import { GotvLogoSvg } from 'svgs/gotvLogo';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import TransactionPinModal from 'components/transactionPinModal';
import TransactionResultModal from 'components/transactionResultModal';
import { executeBillServices, validateMeter } from 'api/payment';
import { orgKey } from 'config/backendConfig';
import Toast from 'react-native-toast-message';
import { HeroBanner } from 'components/ui/photo-card';

const PIN_LENGTH = 4;
const QUICK_AMOUNTS = [1000, 2000, 5000, 10000, 15000, 20000];

// TV providers shown as tappable logo cards. Providers with a `logo` render the
// image; ones without (GOtv — its logo hasn't been added to assets yet) fall
// back to a brand-coloured text label. Drop a gotv logo in assets and add a
// `logo: require(...)` line here to swap it in.
const PROVIDER_OPTIONS = [
  { label: 'DSTV', value: 'dstv', logo: require('../../../assets/dstv-logo.png') },
  { label: 'GOtv', value: 'gotv', Logo: GotvLogoSvg },
  // `logoDark`: the same logo with its black wordmark turned white, for dark
  // mode (the tile is the card colour, and black text vanishes on it).
  {
    label: 'StarTimes',
    value: 'startimes',
    logo: require('../../../assets/startimes-logo.png'),
    logoDark: require('../../../assets/startimes-logo-dark.png'),
  },
  { label: 'Showmax', value: 'showmax', logo: require('../../../assets/showmax-logo.png') },
];

// Provider accent colors for the summary card icon
const PROVIDER_COLORS = {
  dstv: { bg: '#0057A8', icon: '#fff' },
  gotv: { bg: '#E8251F', icon: '#fff' },
  startimes: { bg: '#F7941D', icon: '#fff' },
  showmax: { bg: '#1A1A2E', icon: '#fff' },
};

const formatAmount = (value) => {
  const num = Number(String(value ?? '').replace(/,/g, ''));
  if (!value || Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PayCable() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState('');
  const [smartCardNumber, setSmartCardNumber] = useState('');
  const [amount, setAmount] = useState('');

  // ── Verification state ─────────────────────────────────────────────────────
  const [isValidating, setIsValidating] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [verifyError, setVerifyError] = useState('');

  // ── PIN state ──────────────────────────────────────────────────────────────
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Result state ───────────────────────────────────────────────────────────
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);

  const providerLabel = PROVIDER_OPTIONS.find((p) => p.value === selectedProvider)?.label ?? '';
  const providerTheme = PROVIDER_COLORS[selectedProvider] ?? {
    bg: colors.inkMuted,
    icon: colors.onPrimary,
  };

  // Show card/amount fields only after provider is selected
  const showCardFields = !!selectedProvider;

  // Selecting a provider resets the downstream verification + amount.
  const handleSelectProvider = (value) => {
    setSelectedProvider(value);
    setSmartCardNumber('');
    setAccountInfo(null);
    setVerifyError('');
    setAmount('');
  };

  // ── Smart card number change ────────────────────────────────────────────────
  const handleCardNumberChange = (val) => {
    setSmartCardNumber(val);
    setAccountInfo(null);
    setVerifyError('');
    setAmount('');
  };

  // ── Verify smart card on blur ───────────────────────────────────────────────
  const handleCardBlur = async () => {
    if (!smartCardNumber || smartCardNumber.length < 5) return;
    try {
      setIsValidating(true);
      setVerifyError('');
      setAccountInfo(null);

      const response = await validateMeter({
        meterNumber: smartCardNumber,
        discoType: selectedProvider,
        meterType: 'tv',
      });

      if (response?.code === '000' && response?.content?.Customer_Name) {
        setAccountInfo(response.content);
      } else {
        setVerifyError(t('utilities.cardVerifyFailed'));
      }
    } catch (err) {
      setVerifyError(err?.response?.data?.message || t('utilities.cardVerificationFailed'));
    } finally {
      setIsValidating(false);
    }
  };

  // ── Validation + open PIN sheet ─────────────────────────────────────────────
  const handleContinue = () => {
    if (!selectedProvider) {
      Toast.show({
        type: 'error',
        text1: t('utilities.selectProviderTitle'),
        text2: t('utilities.selectTvProviderMessage'),
      });
      return;
    }
    if (!smartCardNumber) {
      Toast.show({
        type: 'error',
        text1: t('utilities.enterSmartCardTitle'),
        text2: t('utilities.enterSmartCardMessage'),
      });
      return;
    }
    if (!accountInfo) {
      Toast.show({
        type: 'error',
        text1: t('utilities.cardNotVerifiedTitle'),
        text2: t('utilities.cardNotVerifiedMessage'),
      });
      return;
    }
    if (!amount || Number(stripCommas(amount)) <= 0) {
      Toast.show({
        type: 'error',
        text1: t('utilities.enterAmountTitle'),
        text2: t('utilities.enterAmountMessage'),
      });
      return;
    }
    Keyboard.dismiss();
    setPinModalVisible(true);
  };

  // ── API call ────────────────────────────────────────────────────────────────
  const handleBillServices = async (transactionPin) => {
    const payload = {
      service: 'TV',
      amount: stripCommas(amount),
      customerPhoneNumber: null,
      customerMeterNumberOrAccountNumber: smartCardNumber,
      variationType: selectedProvider.toUpperCase(),
      variationCode: selectedProvider,
      discoType: selectedProvider,
      customerAccountNumber: smartCardNumber,
      orgKey,
      transactionPin,
    };

    try {
      setIsSubmitting(true);
      setPinError('');

      const response = await executeBillServices(payload);

      setIsSubmitting(false);
      setPin('');
      setPinModalVisible(false);

      if (response?.success) {
        setTransactionResult({
          success: true,
          message: response?.data?.message || t('utilities.tvSubscriptionSuccess'),
          productDescription: response?.data?.productDescription,
          referenceId: response?.data?.referenceId,
        });
      } else {
        setTransactionResult({
          success: false,
          message: response?.message || response?.data?.message || t('utilities.transactionFailed'),
        });
      }
      setResultModalVisible(true);
    } catch (error) {
      setIsSubmitting(false);
      setPin('');
      setPinModalVisible(false);
      setTransactionResult({
        success: false,
        message:
          error?.response?.data?.message || error?.message || t('utilities.somethingWentWrong'),
      });
      setResultModalVisible(true);
    }
  };

  // ── Keypad ──────────────────────────────────────────────────────────────────
  const handleKeyPress = (key) => {
    if (isSubmitting) return;
    if (key === 'backspace') {
      setPinError('');
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (pin.length >= PIN_LENGTH) return;
    const nextPin = pin + key;
    setPinError('');
    setPin(nextPin);
    if (nextPin.length === PIN_LENGTH) handleBillServices(nextPin);
  };

  const closePinModal = () => {
    if (isSubmitting) return;
    setPinModalVisible(false);
    setPin('');
    setPinError('');
  };

  const handleResultDone = () => {
    const wasSuccess = transactionResult?.success;
    setResultModalVisible(false);
    setTransactionResult(null);
    if (wasSuccess) {
      setSelectedProvider('');
      setSmartCardNumber('');
      setAmount('');
      setAccountInfo(null);
    }
  };

  const handleTryAgain = () => {
    setResultModalVisible(false);
    setTransactionResult(null);
    setPin('');
    setPinError('');
    setPinModalVisible(true);
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const amountNum = Number(stripCommas(amount)) || 0;
  const isFormValid = !!selectedProvider && !!smartCardNumber && !!accountInfo && amountNum > 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Header
          title={t('utilities.tvSubscriptionTitle')}
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
          leftIconColor={colors.textPrimary}
        />

        {/* Hero banner — drawn from the brand colours (components/ui/photo-card). */}
        <HeroBanner
          icon="tv-outline"
          title={t('utilities.cableTitle')}
          subtitle={t('utilities.cableDescription')}
        />

        <View className="flex-1 gap-5 px-4 pt-5">
          {/* Provider selection — tap a logo */}
          <View>
            <Text className="mb-3 text-sm font-semibold" style={{ color: colors.textPrimary }}>
              {t('utilities.provider')}
            </Text>
            <View className="flex-row flex-wrap justify-between">
              {PROVIDER_OPTIONS.map((prov) => {
                const isActive = selectedProvider === prov.value;
                const LogoComp = prov.Logo;
                return (
                  <TouchableOpacity
                    key={prov.value}
                    onPress={() => handleSelectProvider(prov.value)}
                    activeOpacity={0.85}
                    className="relative mb-3 items-center justify-center rounded-xl"
                    style={{
                      width: '48.5%',
                      height: 68,
                      borderWidth: isActive ? 2 : 1.5,
                      borderColor: isActive ? colors.primary : colors.border,
                      backgroundColor: colors.cardBackground,
                    }}>
                    {LogoComp ? (
                      <LogoComp width={130} height={28} />
                    ) : prov.logo ? (
                      <Image
                        source={isDark && prov.logoDark ? prov.logoDark : prov.logo}
                        style={{ width: '68%', height: 34 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: '800',
                          color: prov.brandColor ?? colors.textPrimary,
                        }}>
                        {prov.label}
                      </Text>
                    )}
                    {isActive && (
                      <View
                        className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors.primary }}>
                        <Ionicons name="checkmark" size={14} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Smart Card + Amount — revealed after provider selected */}
          {showCardFields && (
            <>
              {/* Smart Card / Account Number */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {t('utilities.smartCardNumber')}
                </Text>
                <View className="relative">
                  <TextInput
                    className="rounded-lg border px-4 py-3 pr-12 text-base"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.cardBackground,
                      color: colors.textPrimary,
                    }}
                    value={smartCardNumber}
                    onChangeText={handleCardNumberChange}
                    onBlur={handleCardBlur}
                    placeholder={t('utilities.enterSmartCardNumber')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                  {/* Status icon */}
                  <View className="absolute right-3 top-3.5">
                    {isValidating ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : accountInfo ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    ) : verifyError ? (
                      <Ionicons name="close-circle" size={22} color={colors.error} />
                    ) : null}
                  </View>
                </View>

                {/* Verify error */}
                {!!verifyError && (
                  <Text className="mt-1 text-xs" style={{ color: colors.error }}>
                    {verifyError}
                  </Text>
                )}

                {/* Verified account info card */}
                {accountInfo && (
                  <View
                    className="mt-2 rounded-xl border px-4 py-3"
                    style={{ borderColor: colors.success, backgroundColor: colors.cardBackground }}>
                    <View className="mb-1 flex-row items-center">
                      <Ionicons name="tv-outline" size={15} color={colors.success} />
                      <Text className="ml-1 text-xs font-bold" style={{ color: colors.success }}>
                        {accountInfo.Customer_Name}
                      </Text>
                    </View>
                    {!!accountInfo.Address && (
                      <Text
                        className="text-xs"
                        style={{ color: colors.textSecondary }}
                        numberOfLines={2}>
                        {accountInfo.Address}
                      </Text>
                    )}
                    {!!accountInfo.Customer_District && (
                      <Text className="mt-0.5 text-xs" style={{ color: colors.textSecondary }}>
                        {accountInfo.Customer_District}
                      </Text>
                    )}
                  </View>
                )}
              </View>

              {/* Amount — revealed only after account is verified */}
              {accountInfo && (
                <View className="mb-6">
                  <Text
                    className="mb-3 text-sm font-semibold"
                    style={{ color: colors.textPrimary }}>
                    {t('utilities.amount')}
                  </Text>
                  <QuickAmountGrid
                    amounts={QUICK_AMOUNTS}
                    value={amount}
                    onSelect={(v) => setAmount(formatWithCommas(v))}
                  />
                  <View
                    className="mt-1 flex-row items-center rounded-xl border px-4"
                    style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
                    <Text
                      className="text-base font-semibold"
                      style={{ color: colors.textSecondary }}>
                      ₦
                    </Text>
                    <TextInput
                      className="flex-1 px-2 py-3 text-base"
                      style={{ color: colors.textPrimary }}
                      value={amount}
                      onChangeText={(text) =>
                        setAmount(formatWithCommas(text.replace(/[^0-9]/g, '')))
                      }
                      placeholder={t('utilities.enterAmount')}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom summary + Continue */}
      <View
        className="border-t px-4 pb-5 pt-3"
        style={{ borderTopColor: colors.border, backgroundColor: colors.background }}>
        {(providerLabel || amountNum > 0) && (
          <View className="mb-3 flex-row items-center justify-between">
            <Text
              numberOfLines={1}
              className="flex-1 pr-3 text-xs"
              style={{ color: colors.textSecondary }}>
              {providerLabel || t('utilities.tvSubscriptionTitle')}
              {accountInfo?.Customer_Name ? ` • ${accountInfo.Customer_Name}` : ''}
            </Text>
            <Text className="text-base font-bold" style={{ color: colors.primary }}>
              ₦{formatAmount(amount)}
            </Text>
          </View>
        )}
        <TouchBtn
          onPress={handleContinue}
          label={t('utilities.continue')}
          disabled={!isFormValid}
          backgroundColor={colors.primary}
          textColor="white"
          buttonClassName="items-center rounded-lg py-4"
          textClassName="text-base font-semibold"
          containerClassName=""
          activeOpacity={0.8}
        />
      </View>

      {/* PIN Modal */}
      <TransactionPinModal
        visible={pinModalVisible}
        onClose={closePinModal}
        pin={pin}
        pinError={pinError}
        isSubmitting={isSubmitting}
        onKeyPress={handleKeyPress}
        pinLength={PIN_LENGTH}
        summary={{
          icon: () => <Ionicons name="tv" size={16} color={providerTheme.icon} />,
          iconBackgroundColor: providerTheme.bg,
          title: providerLabel,
          subtitle: t('utilities.tvSubscriptionTitle'),
          amountLabel: `₦${formatAmount(amount)}`,
          details: [
            { label: t('utilities.customer'), value: accountInfo?.Customer_Name },
            { label: t('utilities.cardNumber'), value: smartCardNumber },
          ],
        }}
      />

      {/* Result Modal */}
      <TransactionResultModal
        visible={resultModalVisible}
        success={transactionResult?.success}
        successTitle={t('utilities.subscriptionSuccessful')}
        failureTitle={t('utilities.subscriptionFailed')}
        message={transactionResult?.message}
        details={[
          { label: t('utilities.provider'), value: providerLabel },
          { label: t('utilities.customer'), value: accountInfo?.Customer_Name },
          { label: t('utilities.cardNumber'), value: smartCardNumber },
          { label: t('utilities.amount'), value: `₦${formatAmount(amount)}` },
          { label: t('utilities.product'), value: transactionResult?.productDescription },
          { label: t('utilities.reference'), value: transactionResult?.referenceId },
        ]}
        onDone={handleResultDone}
        onTryAgain={handleTryAgain}
      />
    </View>
  );
}
