// screens/BuyData.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import { useFocusEffect } from 'expo-router';
import {
  KeyboardAwareScrollView,
  KeyboardController,
  AndroidSoftInputModes,
} from 'react-native-keyboard-controller';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import DataBundlePicker from 'components/DataBundlePicker';
import { Ionicons } from '@expo/vector-icons';
import { MtnLogoSvg, AirtelSvgLogo, NineMobileSvgLogo, GloLogoSvg } from 'svgs/networkSvg';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import TransactionPinModal from 'components/transactionPinModal';
import TransactionResultModal from 'components/transactionResultModal';
import { executeBillServices } from 'api/payment';
import { orgKey } from 'config/backendConfig';
import Toast from 'react-native-toast-message';
import { getUser } from 'config/storage';
import { HeroBanner } from 'components/ui/photo-card';

const PIN_LENGTH = 4;

// ─── Data plans per network ───────────────────────────────────────────────────
const NETWORK_PLANS = {
  mtn: [
    {
      variation_code: 'mtn-10mb-100',
      name: '110MB Daily Plan (1 Day)',
      variation_amount: '100.00',
    },
    {
      variation_code: 'mtn-230mb-200',
      name: '230MB Daily Plan (1 Day)',
      variation_amount: '200.00',
    },
    {
      variation_code: 'mtn-1500mb-1000',
      name: '1.5GB Weekly Plan (7 Days)',
      variation_amount: '1000.00',
    },
    {
      variation_code: 'mtn-5.5gb-3500',
      name: '7GB Monthly Plan',
      variation_amount: '3500.00',
    },
    {
      variation_code: 'mtn-3.5gb-1500',
      name: '3.5GB Weekly Plan (7 Days)',
      variation_amount: '1500.00',
    },
    {
      variation_code: 'mtn-data-6500',
      name: '16.5GB Monthly Plan',
      variation_amount: '6500.00',
    },
    {
      variation_code: 'mtn-20gb-7500',
      name: '20GB Monthly Plan',
      variation_amount: '7500.00',
    },
    {
      variation_code: 'mtn-32gb-11000',
      name: '36GB Monthly Plan',
      variation_amount: '11000.00',
    },
    {
      variation_code: 'mtn-75gb-20000',
      name: '75GB Monthly Plan',
      variation_amount: '18000.00',
    },
    {
      variation_code: 'mtn-2.7gb-2000',
      name: '2.7GB + 2GB All Night Streaming + 200MB YouTube Music',
      variation_amount: '2000.00',
    },
    {
      variation_code: 'mtn-1800mb-1500',
      name: '1.8GB Weekly Plan',
      variation_amount: '1500.00',
    },
    {
      variation_code: 'mtn-120gb-24000',
      name: '120GB (30 Days)',
      variation_amount: '24000.00',
    },
    {
      variation_code: 'mtn-480gb-90000',
      name: '480GB (3 Months)',
      variation_amount: '90000.00',
    },
    {
      variation_code: 'mtn-1gb-350',
      name: '1GB + 1.5mins (1 Day)',
      variation_amount: '500.00',
    },
  ],
  glo: [
    {
      variation_code: 'glo-daily-50',
      name: '40MB + 5MB Night (1 Day)',
      variation_amount: '50.00',
    },
    {
      variation_code: 'glo-daily-100',
      name: '120MB + 5MB Night (1 Day)',
      variation_amount: '100.00',
    },
  ],

  airtel: [
    {
      variation_code: 'airt-50',
      name: '250MB Night Plan (12 - 5 AM)',
      variation_amount: '50.00',
    },
    {
      variation_code: 'airt-100',
      name: '200MB Social Plan (2 Days)',
      variation_amount: '100.00',
    },
    {
      variation_code: 'airt-200',
      name: '230MB Daily Plan (2 Days)',
      variation_amount: '200.00',
    },
    {
      variation_code: 'airt-daily-100',
      name: '110MB Daily Plan (1 Day)',
      variation_amount: '100.00',
    },
    {
      variation_code: 'airt-500',
      name: '500MB Weekly Plan (7 Days)',
      variation_amount: '500.00',
    },
    {
      variation_code: 'airt-1000-7',
      name: '1.5GB Weekly Plan (7 Days)',
      variation_amount: '1000.00',
    },
    {
      variation_code: 'airt-1500-7',
      name: '3.5GB Weekly Plan (7 Days)',
      variation_amount: '1500.00',
    },
    {
      variation_code: 'airt-2000',
      name: '3GB Monthly Plan (30 Days)',
      variation_amount: '2000.00',
    },
    {
      variation_code: 'airt-2500',
      name: '4GB Monthly Plan (30 Days)',
      variation_amount: '2500.00',
    },
    {
      variation_code: 'airt-3000',
      name: '8GB Monthly Plan (30 Days)',
      variation_amount: '3000.00',
    },
    {
      variation_code: 'airt-4000',
      name: '10GB Monthly Plan (30 Days)',
      variation_amount: '4000.00',
    },
    {
      variation_code: 'airt-5000',
      name: '13GB Monthly Plan (30 Days)',
      variation_amount: '5000.00',
    },
    {
      variation_code: 'airt-6000-30',
      name: '18GB Monthly Plan (30 Days)',
      variation_amount: '6000.00',
    },
    {
      variation_code: 'airt-8000',
      name: '25GB Monthly Plan (30 Days)',
      variation_amount: '8000.00',
    },
    {
      variation_code: 'airt-10000',
      name: '35GB Monthly Plan (30 Days)',
      variation_amount: '10000.00',
    },
    {
      variation_code: 'airt-15000',
      name: '60GB Monthly Plan (30 Days)',
      variation_amount: '15000.00',
    },
    {
      variation_code: 'airt-20000',
      name: '100GB Monthly Plan (30 Days)',
      variation_amount: '20000.00',
    },
    {
      variation_code: 'airt-30000',
      name: '160GB Monthly Plan (30 Days)',
      variation_amount: '30000.00',
    },
    {
      variation_code: 'airt-40000',
      name: '210GB Data (30 Days)',
      variation_amount: '40000.00',
    },
    {
      variation_code: 'airt-50000',
      name: '200GB Monthly Plan (90 Days)',
      variation_amount: '50000.00',
    },
    {
      variation_code: 'airt-60000',
      name: '350GB Plan (120 Days)',
      variation_amount: '60000.00',
    },
    {
      variation_code: 'airt-100000',
      name: '680GB Data (365 Days)',
      variation_amount: '100000.00',
    },
    {
      variation_code: 'airt-600',
      name: '1.5GB Binge Plan (2 Days)',
      variation_amount: '600.00',
    },
    {
      variation_code: 'airt-750-2',
      name: '2GB Binge Plan (2 Days)',
      variation_amount: '750.00',
    },
    {
      variation_code: 'airt-1500-2',
      name: '5GB Binge Plan (2 Days)',
      variation_amount: '1500.00',
    },
    {
      variation_code: 'airt-1000-2',
      name: '4GB Plan + 2GB YouTube Night (2 Days)',
      variation_amount: '1000.00',
    },
    {
      variation_code: 'airt-3000-7',
      name: '10GB Weekly Plan (7 Days)',
      variation_amount: '3000.00',
    },
    {
      variation_code: 'airt-5000-7',
      name: '18GB Weekly Plan (7 Days)',
      variation_amount: '5000.00',
    },
    {
      variation_code: 'airt-binge-500-1',
      name: '1GB Binge Plan',
      variation_amount: '500.00',
    },
    {
      variation_code: 'airt-800-7',
      name: '1GB Weekly Plan (7 Days)',
      variation_amount: '800.00',
    },
    {
      variation_code: 'airt-75-1',
      name: '75MB Daily Plan (1 Day)',
      variation_amount: '75.00',
    },
    {
      variation_code: 'airt-300-1',
      name: '300MB Daily Plan (1 Day)',
      variation_amount: '300.00',
    },
    {
      variation_code: 'airt-social-300-3',
      name: '1GB Social Plan (3 Days)',
      variation_amount: '300.00',
    },
    {
      variation_code: 'airt-social-500-7',
      name: '1.5GB Social Plan',
      variation_amount: '500.00',
    },
    {
      variation_code: 'airt-1500-30',
      name: '2GB Monthly Plan (30 Days)',
      variation_amount: '1500.00',
    },
    {
      variation_code: 'airt-2500-7',
      name: '6GB Weekly Plan (7 Days)',
      variation_amount: '2500.00',
    },
    {
      variation_code: 'airt-mifi-5000-30',
      name: '13GB MiFi Plan (30 Days)',
      variation_amount: '5000.00',
    },
    {
      variation_code: 'airt-mifi-10000-30',
      name: '35GB MiFi Plan (30 Days)',
      variation_amount: '10000.00',
    },
    {
      variation_code: 'airt-mifi-15000-30',
      name: '60GB MiFi Plan (30 Days)',
      variation_amount: '15000.00',
    },
    {
      variation_code: 'airt-mifi-20000-30',
      name: '100GB Router Plan (30 Days)',
      variation_amount: '20000.00',
    },
    {
      variation_code: 'airt-mifi-30000-30',
      name: 'Unlimited 20MBPS Router (30 Days)',
      variation_amount: '30000.00',
    },
    {
      variation_code: 'airt-mifi-50000-30',
      name: 'Unlimited 60MBPS Router (30 Days)',
      variation_amount: '50000.00',
    },
    {
      variation_code: 'airt-mifi-80000-90',
      name: 'Unlimited 60MBPS Router (90 Days)',
      variation_amount: '80000.00',
    },
    {
      variation_code: 'airt-mifi-135000-90',
      name: 'Unlimited 60MBPS Router Premium (90 Days)',
      variation_amount: '135000.00',
    },
    {
      variation_code: 'airt-mifi-150000-120',
      name: 'Unlimited 20MBPS Router (120 Days)',
      variation_amount: '150000.00',
    },
    {
      variation_code: 'airt-350-500',
      name: '500MB Daily Plan (2 Days)',
      variation_amount: '350.00',
    },
  ],
  t2mobile: [
    {
      variation_code: 'eti-100',
      name: 'T2 83MB - 100 Naira - 1 day',
      variation_amount: '100.00',
    },
    {
      variation_code: 'eti-150',
      name: 'T2 150MB  + 100MB Night Data - 150 Naira - 1 day',
      variation_amount: '150.00',
    },
    {
      variation_code: 'eti-500',
      name: 'T2 650MB - 500 Naira - 3 days',
      variation_amount: '500.00',
    },
    {
      variation_code: 'eti-1000',
      name: '9mobile 2GB - 1,000 Naira - 30 Days',
      variation_amount: '1000.00',
    },
    {
      variation_code: 'eti-4000',
      name: 'T2 8.4GB - 4,000 Naira - 30 days',
      variation_amount: '4000.00',
    },
    {
      variation_code: 'eti-2000',
      name: 'T2 4.5GB - 2000 Naira - 30 Days',
      variation_amount: '2000.00',
    },
    {
      variation_code: 'eti-5000',
      name: 'T2 11.4GB - 5,000 Naira - 30 Days',
      variation_amount: '5000.00',
    },
    {
      variation_code: 'eti-3000',
      name: 'T2 6.2G - 3,000 Naira - 30 days',
      variation_amount: '3000.00',
    },
    {
      variation_code: 'eti-1200',
      name: 'T2 2.3GB - 1,200 Naira - 30 Days',
      variation_amount: '1200.00',
    },
    {
      variation_code: 'eti-50',
      name: 'T2 40MB - 50 Naira - 1 day',
      variation_amount: '50.00',
    },
    {
      variation_code: 'eti-2500',
      name: 'T2 5.2GB - 2,500 Naira - 30 days',
      variation_amount: '2500.00',
    },
    {
      variation_code: 't2-250mb-200',
      name: 'T2 N200 - 250MB Anytime Data Plan (7 Days)',
      variation_amount: '200.00',
    },
  ],
};

// ─── Networks ─────────────────────────────────────────────────────────────────
const NETWORKS = [
  { id: 'mtn', name: 'MTN', color: '#FFCC00', icon: () => <MtnLogoSvg /> },
  { id: 't2mobile', name: 'T2 MOBILE', color: '#FF4500', icon: () => <NineMobileSvgLogo /> },
  { id: 'airtel', name: 'AIRTEL', color: '#E60000', icon: () => <AirtelSvgLogo /> },
  { id: 'glo', name: 'GLO', color: '#00A651', icon: () => <GloLogoSvg /> },
];

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatAmount = (value) => {
  const num = Number(value);
  if (!value || Number.isNaN(num)) return '0.00';
  return num.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BuyData() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Match the transfer screen: switch ONLY this screen to adjustResize so the
  // KeyboardAwareScrollView can lift the amount field above the keyboard. The
  // app default stays `pan`; restore it on blur so no other screen is affected.
  useFocusEffect(
    useCallback(() => {
      KeyboardController.setInputMode(AndroidSoftInputModes.SOFT_INPUT_ADJUST_RESIZE);
      return () => KeyboardController.setDefaultMode();
    }, [])
  );

  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  // The signed-in user's own number — prefilled into the input and used to show
  // the "My Number" badge while the input still holds it.
  const [userPhone, setUserPhone] = useState('');

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);

  // Plans available for the selected network
  const availablePlans = selectedNetwork ? (NETWORK_PLANS[selectedNetwork.id] ?? []) : [];

  const handleSelectNetwork = (network) => {
    // Reset plan whenever network changes
    if (selectedNetwork?.id !== network.id) {
      setSelectedPlan(null);
    }
    setSelectedNetwork(network);
  };

  const handleSelectPlan = (plan) => {
    setSelectedPlan(plan ?? null);
  };

  // ── Validation + open PIN sheet ──────────────────────────────────────────
  const handleContinue = () => {
    if (!selectedNetwork) {
      Toast.show({
        type: 'error',
        text1: t('utilities.selectNetworkTitle'),
        text2: t('utilities.selectNetworkMessage'),
      });
      return;
    }
    if (availablePlans.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('utilities.noPlansTitle'),
        text2: t('utilities.noPlansMessage'),
      });
      return;
    }
    if (!selectedPlan) {
      Toast.show({
        type: 'error',
        text1: t('utilities.selectPlanTitle'),
        text2: t('utilities.selectPlanMessage'),
      });
      return;
    }
    if (phoneNumber.length < 11) {
      Toast.show({
        type: 'error',
        text1: t('utilities.invalidPhoneTitle'),
        text2: t('utilities.invalidPhoneMessage'),
      });
      return;
    }
    Keyboard.dismiss();
    setPinModalVisible(true);
  };

  // Prefill the phone number with the signed-in user's own number on mount.
  // getUser() returns the profile saved at login (mobilePhone is the number).
  useEffect(() => {
    let active = true;
    (async () => {
      const user = await getUser();
      const phone = String(user?.mobilePhone ?? '').replace(/[^0-9]/g, '');
      if (active && phone) {
        setUserPhone(phone);
        setPhoneNumber(phone);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // A valid Nigerian number is 11 digits. The input is prefilled with the
  // user's own number and shows the "My Number" badge while it stays unchanged.
  const isPhoneValid = phoneNumber.trim().length === 11;
  const isMyNumber = !!userPhone && phoneNumber === userPhone;
  const isFormValid =
    !!selectedNetwork && availablePlans.length > 0 && !!selectedPlan && isPhoneValid;

  // ── API call ─────────────────────────────────────────────────────────────
  const handleBillServices = async (transactionPin) => {
    const payload = {
      service: 'Data',
      amount: selectedPlan.variation_amount,
      customerPhoneNumber: phoneNumber,
      customerMeterNumberOrAccountNumber: null,
      variationType: selectedNetwork.id.toUpperCase(),
      variationCode: selectedPlan.variation_code,
      discoType: null,
      customerAccountNumber: null,
      orgKey,
      transactionPin,
    };

    try {
      setIsSubmitting(true);
      setPinError('');

      const response = await executeBillServices(payload);

      console.log(response, 'data response');

      setIsSubmitting(false);
      setPin('');
      setPinModalVisible(false);

      if (response?.data?.success) {
        setTransactionResult({
          success: true,
          message: response?.data?.responseBody?.message && t('utilities.dataPurchaseSuccess'),
          productDescription: response?.data?.responseBody?.productDescription,
          referenceId: response?.data?.responseBody?.referenceId,
        });
      } else {
        setTransactionResult({
          success: false,
          message:
            response?.message ||
            response?.data?.responseBody?.message ||
            t('utilities.transactionFailed'),
        });
      }
      setResultModalVisible(true);
    } catch (error) {
      setIsSubmitting(false);
      setPin('');
      setPinModalVisible(false);

      console.log(error, 'errorerror');
      setTransactionResult({
        success: false,
        message: error?.message || t('utilities.somethingWentWrong'),
      });
      setResultModalVisible(true);
    }
  };

  // ── Keypad ───────────────────────────────────────────────────────────────
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
      setSelectedNetwork(null);
      // Re-prefill with the user's own number rather than clearing it.
      setPhoneNumber(userPhone);
      setSelectedPlan(null);
    }
  };

  const handleTryAgain = () => {
    setResultModalVisible(false);
    setTransactionResult(null);
    setPin('');
    setPinError('');
    setPinModalVisible(true);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}>
        <Header
          title={t('utilities.buyDataTitle')}
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
          leftIconColor={colors.textPrimary}
        />

        {/* Hero banner — drawn from the brand colours (components/ui/photo-card). */}
        <HeroBanner
          icon="globe-outline"
          title={t('utilities.dataTitle')}
          subtitle={t('utilities.dataDescription')}
        />

        <View className="flex-1 px-4 pt-5">
          {/* Network Selection */}
          <Text className="mb-3 text-sm font-semibold" style={{ color: colors.textPrimary }}>
            {t('utilities.selectNetwork')}
          </Text>
          <View className="mb-5 flex-row justify-between">
            {NETWORKS.map((network) => {
              const isActive = selectedNetwork?.id === network.id;
              return (
                <TouchableOpacity
                  key={network.id}
                  onPress={() => handleSelectNetwork(network)}
                  className="items-center"
                  activeOpacity={0.7}>
                  <View
                    className="relative mb-2 h-16 w-16 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: network.color,
                      borderWidth: isActive ? 2 : 0,
                      borderColor: isActive ? colors.primary : 'transparent',
                    }}>
                    {network.icon()}
                    {isActive && (
                      <View
                        className="absolute -right-1 -top-1 h-6 w-6 items-center justify-center rounded-full"
                        style={{ backgroundColor: colors.primary }}>
                        <Ionicons name="checkmark" size={16} color="white" />
                      </View>
                    )}
                  </View>
                  <Text className="text-xs font-medium" style={{ color: colors.textSecondary }}>
                    {network.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Phone Number */}
          <View className="mb-2 flex-row items-center" style={{ gap: 8 }}>
            <Text className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
              {t('utilities.phoneNumber')}
            </Text>
            {isMyNumber && (
              <View
                className="flex-row items-center rounded-md px-2 py-0.5"
                style={{ backgroundColor: colors.border, gap: 3 }}>
                <Ionicons name="person-circle" size={12} color={colors.primary} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>
                  {t('utilities.myNumber')}
                </Text>
              </View>
            )}
          </View>
          <View
            className="mb-6 flex-row items-center rounded-xl border px-3"
            style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
            <Ionicons name="call-outline" size={18} color={colors.textMuted} />
            <TextInput
              className="flex-1 px-3 py-3 text-base"
              style={{ color: colors.textPrimary }}
              value={phoneNumber}
              onChangeText={(text) => setPhoneNumber(text.replace(/[^0-9]/g, ''))}
              placeholder="09098765432"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={11}
            />
          </View>

          {/* Data bundles */}
          <Text className="mb-3 text-sm font-semibold" style={{ color: colors.textPrimary }}>
            {t('utilities.chooseDataPlan')}
          </Text>
          {!selectedNetwork ? (
            <View
              className="items-center rounded-xl border border-dashed px-4 py-10"
              style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
              <Ionicons name="wifi-outline" size={30} color={colors.textMuted} />
              <Text className="mt-2 text-center text-sm" style={{ color: colors.textMuted }}>
                {t('utilities.selectNetworkToSeePlans')}
              </Text>
            </View>
          ) : availablePlans.length === 0 ? (
            <View
              className="items-center rounded-xl border border-dashed px-4 py-10"
              style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
              <Text className="text-center text-sm" style={{ color: colors.textMuted }}>
                {t('utilities.noPlansForNetwork', { network: selectedNetwork.name })}
              </Text>
            </View>
          ) : (
            <DataBundlePicker
              plans={availablePlans}
              selectedCode={selectedPlan?.variation_code}
              onSelect={handleSelectPlan}
            />
          )}
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom summary + Continue */}
      <View
        className="border-t px-4 pb-5 pt-3"
        style={{ borderTopColor: colors.border, backgroundColor: colors.background }}>
        {selectedPlan && (
          <View className="mb-3 flex-row items-center justify-between">
            <Text
              numberOfLines={1}
              className="flex-1 pr-3 text-xs"
              style={{ color: colors.textSecondary }}>
              {selectedPlan.name}
            </Text>
            <Text className="text-base font-bold" style={{ color: colors.primary }}>
              ₦{formatAmount(selectedPlan.variation_amount)}
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
          icon: selectedNetwork?.icon,
          iconBackgroundColor: selectedNetwork?.color,
          title: selectedPlan?.name || t('utilities.dataPlan'),
          subtitle: phoneNumber,
          amountLabel: `₦${formatAmount(selectedPlan?.variation_amount)}`,
        }}
      />

      {/* Result Modal */}
      <TransactionResultModal
        visible={resultModalVisible}
        success={transactionResult?.success}
        successTitle={t('utilities.purchaseSuccessful')}
        failureTitle={t('utilities.purchaseFailed')}
        message={transactionResult?.message}
        details={[
          { label: t('utilities.plan'), value: selectedPlan?.name },
          { label: t('utilities.network'), value: selectedNetwork?.name },
          { label: t('utilities.phoneNumber'), value: phoneNumber },
          {
            label: t('utilities.amount'),
            value: `₦${formatAmount(selectedPlan?.variation_amount)}`,
          },
          { label: t('utilities.product'), value: transactionResult?.productDescription },
          { label: t('utilities.referenceId'), value: transactionResult?.referenceId },
        ]}
        onDone={handleResultDone}
        onTryAgain={handleTryAgain}
      />
    </View>
  );
}
