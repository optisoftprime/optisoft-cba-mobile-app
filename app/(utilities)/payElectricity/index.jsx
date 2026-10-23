// screens/PayElectricity.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import Dropdown from 'components/dropDown';
import TouchBtn from 'components/touchBtn';
import QuickAmountGrid from 'components/QuickAmountGrid';
import { formatWithCommas, stripCommas } from 'helper';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import TransactionPinModal from 'components/transactionPinModal';
import TransactionResultModal from 'components/transactionResultModal';
import { executeBillServices, validateMeter } from 'api/payment';
import { orgKey } from 'config/backendConfig';
import Toast from 'react-native-toast-message';
import { fetchUserDetails } from 'api/userProfile';
import { useQuery } from '@tanstack/react-query';
import { HeroBanner } from 'components/ui/photo-card';

const PIN_LENGTH = 4;
const QUICK_AMOUNTS = [1000, 2000, 3000, 5000, 10000, 20000];

const PROVIDER_OPTIONS = [
  { label: 'Ikeja Electricity', value: 'IKEDC', slug: 'ikeja-electric' },
  { label: 'Eko Electricity', value: 'EKEDC', slug: 'eko-electric' },
  { label: 'Kano Electricity', value: 'KEDCO', slug: 'kano-electric' },
  { label: 'Port Harcourt Electricity', value: 'PHED', slug: 'portharcourt-electric' },
  { label: 'Jos Electricity', value: 'JED', slug: 'jos-electric' },
  { label: 'Ibadan Electricity', value: 'IBEDC', slug: 'ibadan-electric' },
  { label: 'Kaduna Electricity', value: 'KAEDCO', slug: 'kaduna-electric' },
  { label: 'Enugu Electricity', value: 'EEDC', slug: 'enugu-electric' },
  { label: 'Abuja Electricity', value: 'AEDC', slug: 'abuja-electric' },
];

const formatAmount = (value) => {
  const num = Number(String(value ?? '').replace(/,/g, ''));
  if (!value || Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default function PayElectricity() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const METER_TYPE_OPTIONS = [
    { label: t('utilities.prepaid'), value: 'PREPAID', icon: 'flash-outline' },
    { label: t('utilities.postpaid'), value: 'POSTPAID', icon: 'document-text-outline' },
  ];

  // ── Form state ────────────────────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedMeterType, setSelectedMeterType] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showMeterTypeDropdown, setShowMeterTypeDropdown] = useState(false);

  // ── Meter validation state ────────────────────────────────────────────────
  const [isValidatingMeter, setIsValidatingMeter] = useState(false);
  const [meterInfo, setMeterInfo] = useState(null); // validated customer info
  const [meterError, setMeterError] = useState('');

  // ── PIN state ─────────────────────────────────────────────────────────────
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Result state ──────────────────────────────────────────────────────────
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);

  // Show meter fields only once both dropdowns are filled
  const showMeterFields = !!selectedProvider && !!selectedMeterType;

  const { data: userDetails } = useQuery({
    queryKey: ['userDetails'],
    queryFn: async () => {
      const result = await fetchUserDetails();

      if (!result?.ok) throw new Error(result?.message);

      const profile = result?.data?.data;
      return profile;
    },
    staleTime: 1000 * 60 * 10,
  });

  // ── Reset meter info whenever meter number changes ────────────────────────
  const handleMeterNumberChange = (val) => {
    setMeterNumber(val);
    setMeterInfo(null);
    setMeterError('');
  };

  // ── Validate meter on blur ────────────────────────────────────────────────
  const handleMeterBlur = async () => {
    if (!meterNumber || meterNumber.length < 6) return;
    try {
      setIsValidatingMeter(true);
      setMeterError('');
      setMeterInfo(null);

      const response = await validateMeter({
        meterNumber,
        disco: selectedProvider,
        meterType: selectedMeterType,
      });
      console.log(
        response,
        response.Customer_Name,
        response.Meter_Type,
        'validate meter data response '
      );

      if (response?.data.Customer_Name && response?.data.Customer_Name) {
        setMeterInfo(response.data);
      } else {
        setMeterError(t('utilities.meterVerifyFailed'));
      }
    } catch (err) {
      setMeterError(err?.response?.data?.message || t('utilities.meterValidationFailed'));
    } finally {
      setIsValidatingMeter(false);
    }
  };

  // ── Validation + open PIN sheet ───────────────────────────────────────────
  const handleContinue = () => {
    if (!selectedProvider) {
      Toast.show({
        type: 'error',
        text1: t('utilities.selectProviderTitle'),
        text2: t('utilities.selectElectricityProviderMessage'),
      });
      return;
    }
    if (!selectedMeterType) {
      Toast.show({
        type: 'error',
        text1: t('utilities.selectMeterTypeTitle'),
        text2: t('utilities.selectMeterTypeMessage'),
      });
      return;
    }
    if (!meterNumber) {
      Toast.show({
        type: 'error',
        text1: t('utilities.enterMeterNumberTitle'),
        text2: t('utilities.enterMeterNumberMessage'),
      });
      return;
    }
    if (!meterInfo) {
      Toast.show({
        type: 'error',
        text1: t('utilities.meterNotVerifiedTitle'),
        text2: t('utilities.meterNotVerifiedMessage'),
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

  // ── API call ──────────────────────────────────────────────────────────────
  const handleBillServices = async (transactionPin) => {
    const payload = {
      service: 'Electricity',
      amount: stripCommas(amount),
      customerPhoneNumber: userDetails.mobilePhone,
      customerMeterNumberOrAccountNumber: meterNumber,
      variationType: selectedMeterType.toUpperCase(),
      variationCode: selectedProvider,
      discoType: selectedProvider,
      customerAccountNumber: null,
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
          message:
            response?.data?.responseBody?.message || t('utilities.electricityPaymentSuccess'),
          productDescription: response?.data?.responseBody?.productDescription,
          referenceId: response?.data?.responseBody?.referenceId,
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

  // ── Keypad ────────────────────────────────────────────────────────────────
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
      setSelectedMeterType('');
      setMeterNumber('');
      setAmount('');
      setMeterInfo(null);
    }
  };

  const handleTryAgain = () => {
    setResultModalVisible(false);
    setTransactionResult(null);
    setPin('');
    setPinError('');
    setPinModalVisible(true);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const providerLabel = PROVIDER_OPTIONS.find((p) => p.value === selectedProvider)?.label ?? '';
  const amountNum = Number(stripCommas(amount)) || 0;
  const isFormValid =
    !!selectedProvider && !!selectedMeterType && !!meterNumber && !!meterInfo && amountNum > 0;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <ScrollView
        className="flex-1 space-y-4"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <Header
          title={t('utilities.electricityTitle')}
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
          leftIconColor={colors.textPrimary}
        />

        {/* Hero banner — drawn from the brand colours (components/ui/photo-card). */}
        <HeroBanner
          icon="flash-outline"
          title={t('utilities.electricityTitle')}
          subtitle={t('utilities.electricityDescription')}
        />

        <View className="flex-1 gap-5 px-4 pt-5">
          {/* Provider Dropdown */}
          <Dropdown
            label={t('utilities.provider')}
            placeholder={t('utilities.selectProviderPlaceholder')}
            value={selectedProvider}
            options={PROVIDER_OPTIONS}
            onSelect={(value) => {
              setSelectedProvider(value);
              setShowProviderDropdown(false);
              // reset downstream state
              setSelectedMeterType('');
              setMeterNumber('');
              setMeterInfo(null);
              setMeterError('');
              setAmount('');
            }}
            isOpen={showProviderDropdown}
            onToggle={() => setShowProviderDropdown((p) => !p)}
          />

          {/* Meter Type — just two options, so show them as selectable cards
              rather than a dropdown. */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold" style={{ color: colors.textPrimary }}>
              {t('utilities.meterType')}
            </Text>
            <View className="flex-row" style={{ gap: 12 }}>
              {METER_TYPE_OPTIONS.map((opt) => {
                const selected = selectedMeterType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      setSelectedMeterType(opt.value);
                      // reset meter info if type changes
                      setMeterNumber('');
                      setMeterInfo(null);
                      setMeterError('');
                    }}
                    activeOpacity={0.85}
                    className="flex-1 flex-row items-center rounded-xl px-4 py-4"
                    style={{
                      backgroundColor: selected ? colors.primary : colors.cardBackground,
                      borderWidth: 1.5,
                      borderColor: selected ? colors.primary : colors.border,
                    }}>
                    <View
                      className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: selected ? 'rgba(255,255,255,0.22)' : colors.border,
                      }}>
                      <Ionicons
                        name={opt.icon}
                        size={18}
                        color={selected ? colors.onPrimary : colors.textSecondary}
                      />
                    </View>
                    <Text
                      className="flex-1 text-sm font-semibold"
                      style={{ color: selected ? colors.onPrimary : colors.textPrimary }}
                      numberOfLines={1}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.onPrimary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Meter Number + Amount — revealed after both dropdowns filled */}
          {showMeterFields && (
            <>
              {/* Meter Number */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-semibold" style={{ color: colors.textPrimary }}>
                  {t('utilities.meterNumber')}
                </Text>
                <View className="relative">
                  <TextInput
                    className="rounded-lg border px-4 py-3 pr-12 text-base"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: colors.cardBackground,
                      color: colors.textPrimary,
                    }}
                    value={meterNumber}
                    onChangeText={handleMeterNumberChange}
                    onBlur={handleMeterBlur}
                    placeholder={t('utilities.enterMeterNumber')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                  />
                  {/* Status icon inside input */}
                  <View className="absolute right-3 top-3.5">
                    {isValidatingMeter ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : meterInfo ? (
                      <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                    ) : meterError ? (
                      <Ionicons name="close-circle" size={22} color={colors.error} />
                    ) : null}
                  </View>
                </View>

                {/* Meter error */}
                {!!meterError && (
                  <Text className="mt-1 text-xs" style={{ color: colors.error }}>
                    {meterError}
                  </Text>
                )}

                {/* Verified customer info card */}
                {meterInfo && (
                  <View
                    className="mt-2 rounded-xl border px-4 py-3"
                    style={{ borderColor: colors.success, backgroundColor: colors.cardBackground }}>
                    <View className="mb-1 flex-row items-center">
                      <Ionicons name="person-circle-outline" size={16} color={colors.success} />
                      <Text className="ml-1 text-xs font-bold" style={{ color: colors.success }}>
                        {meterInfo.Customer_Name}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Amount — only shown after meter is verified */}
              {meterInfo && (
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
              {providerLabel || t('utilities.electricityTitle')}
              {meterInfo?.Customer_Name ? ` • ${meterInfo.Customer_Name}` : ''}
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
          icon: () => <Ionicons name="flash" size={18} color={colors.warning} />,
          iconBackgroundColor: colors.warningSoft,
          title: providerLabel,
          subtitle: selectedMeterType,
          amountLabel: `₦${formatAmount(amount)}`,
          details: [
            { label: t('utilities.customer'), value: meterInfo?.Customer_Name },
            { label: t('utilities.meter'), value: meterNumber },
          ],
        }}
      />

      {/* Result Modal */}
      <TransactionResultModal
        visible={resultModalVisible}
        success={transactionResult?.success}
        successTitle={t('utilities.paymentSuccessful')}
        failureTitle={t('utilities.paymentFailed')}
        message={transactionResult?.message}
        details={[
          { label: t('utilities.provider'), value: providerLabel },
          { label: t('utilities.customer'), value: meterInfo?.Customer_Name },
          { label: t('utilities.meterNumber'), value: meterNumber },
          { label: t('utilities.meterType'), value: selectedMeterType },
          { label: t('utilities.amount'), value: `₦${formatAmount(amount)}` },
          { label: t('utilities.product'), value: transactionResult?.productDescription },
          { label: t('utilities.referenceId'), value: transactionResult?.referenceId },
        ]}
        onDone={handleResultDone}
        onTryAgain={handleTryAgain}
      />
    </View>
  );
}
