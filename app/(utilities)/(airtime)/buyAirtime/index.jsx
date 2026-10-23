// screens/RechargeDetails.jsx
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
import { Ionicons } from '@expo/vector-icons';
import { MtnLogoSvg, AirtelSvgLogo, NineMobileSvgLogo, GloLogoSvg } from 'svgs/networkSvg';
import TouchBtn from 'components/touchBtn';
import QuickAmountGrid from 'components/QuickAmountGrid';
import { formatWithCommas, stripCommas } from 'helper';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import TransactionPinModal from 'components/transactionPinModal';
import TransactionResultModal from 'components/transactionResultModal';
import { executeBillServices } from 'api/payment';
import { orgKey } from 'config/backendConfig';
import { getUser } from 'config/storage';
import Toast from 'react-native-toast-message';
import { HeroBanner } from 'components/ui/photo-card';

const PIN_LENGTH = 4;
const MIN_AIRTIME = 50; // minimum airtime top-up (₦)
const QUICK_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function RechargeDetails() {
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
  const [amount, setAmount] = useState('');
  // The signed-in user's own number — prefilled and used for the "My Number" badge.
  const [userPhone, setUserPhone] = useState('');
  const [enterPinModalVisible, setEnterPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [transactionResult, setTransactionResult] = useState(null);

  const networks = [
    {
      id: 'mtn',
      name: 'MTN',
      color: '#FFCC00',
      icon: () => <MtnLogoSvg />,
    },
    {
      id: 't2mobile',
      name: 'T2 MOBILE',
      color: '#FF4500',
      icon: () => <NineMobileSvgLogo />,
    },
    {
      id: 'airtel',
      name: 'AIRTEL',
      color: '#E60000',
      icon: () => <AirtelSvgLogo />,
    },
    {
      id: 'glo',
      name: 'GLO',
      color: '#00A651',
      icon: () => <GloLogoSvg />,
    },
  ];

  const selectedNetworkData = networks.find((n) => n.id === selectedNetwork?.id);

  // Prefill the phone number with the signed-in user's own number on mount.
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

  // Validation flags — a valid Nigerian number is 11 digits; airtime has a floor.
  const isPhoneValid = phoneNumber.trim().length === 11;
  const isMyNumber = !!userPhone && phoneNumber === userPhone;
  const amountNum = Number(stripCommas(amount)) || 0;
  const isFormValid = !!selectedNetwork && isPhoneValid && amountNum >= MIN_AIRTIME;

  const formatAmount = (value) => {
    const num = Number(String(value ?? '').replace(/,/g, ''));
    if (!value || Number.isNaN(num)) return '0.00';
    return num.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleBillServices = async (transactionPin) => {
    const payload = {
      service: 'Airtime',
      amount: stripCommas(amount),
      customerPhoneNumber: phoneNumber,
      customerMeterNumberOrAccountNumber: null,
      variationType: selectedNetwork.name,
      variationCode: selectedNetwork.id,
      discoType: null,
      customerAccountNumber: null,
      orgKey,
      transactionPin,
    };

    try {
      setIsSubmitting(true);
      setPinError('');

      const response = await executeBillServices(payload);
      console.log(response, response.data, response.responseCode, 'response in recharge');

      setIsSubmitting(false);
      setPin('');
      setEnterPinModalVisible(false);

      if (response?.data?.success) {
        setTransactionResult({
          success: true,
          message: response?.data?.responseMessage && t('utilities.transactionSuccess'),
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
      console.log(error, error.response, error.message, 'error in data');
      setIsSubmitting(false);
      setPin('');
      setEnterPinModalVisible(false);

      setTransactionResult({
        success: false,
        message: ` ${error?.message} ` || error?.data.message || t('utilities.somethingWentWrong'),
      });

      setResultModalVisible(true);
    }
  };

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

    if (nextPin.length === PIN_LENGTH) {
      handleBillServices(nextPin);
    }
  };

  const closePinModal = () => {
    if (isSubmitting) return;
    setEnterPinModalVisible(false);
    setPin('');
    setPinError('');
  };

  const handleContinue = () => {
    if (!selectedNetwork) {
      Toast.show({
        type: 'error',
        text1: t('utilities.selectNetworkTitle'),
        text2: t('utilities.selectNetworkMessage'),
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

    if (!amount || Number(stripCommas(amount)) <= 0) {
      Toast.show({
        type: 'error',
        text1: t('utilities.invalidAmountTitle'),
        text2: t('utilities.invalidAmountMessage'),
      });
      return;
    }

    Keyboard.dismiss();
    setEnterPinModalVisible(true);
  };

  const handleResultDone = () => {
    const wasSuccess = transactionResult?.success;
    setResultModalVisible(false);
    setTransactionResult(null);

    if (wasSuccess) {
      setSelectedNetwork(null);
      // Re-prefill with the user's own number rather than clearing it.
      setPhoneNumber(userPhone);
      setAmount('');
    }
  };

  const handleTryAgain = () => {
    setResultModalVisible(false);
    setTransactionResult(null);
    setPin('');
    setPinError('');
    setEnterPinModalVisible(true);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <KeyboardAwareScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}>
        <Header
          title={t('utilities.rechargeDetailsTitle')}
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
          leftIconColor={colors.textPrimary}
        />

        {/* Hero banner — drawn from the brand colours (components/ui/photo-card). */}
        <HeroBanner
          icon="phone-portrait-outline"
          title={t('utilities.airtimeTitle')}
          subtitle={t('utilities.airtimeDescription')}
        />

        <View className="flex-1 px-4 pt-5">
          {/* Network Selection */}
          <Text className="mb-3 text-sm font-semibold" style={{ color: colors.textPrimary }}>
            {t('utilities.selectNetwork')}
          </Text>
          <View className="mb-5 flex-row justify-between">
            {networks.map((network) => {
              const isActive = selectedNetwork?.id === network.id;
              return (
                <TouchableOpacity
                  key={network.id}
                  onPress={() => setSelectedNetwork(network)}
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
                className="flex-row items-center rounded-full px-2 py-0.5"
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

          {/* Amount */}
          <Text className="mb-3 text-sm font-semibold" style={{ color: colors.textPrimary }}>
            {t('utilities.amount')}
          </Text>
          <QuickAmountGrid
            amounts={QUICK_AMOUNTS}
            value={amount}
            onSelect={(v) => setAmount(formatWithCommas(v))}
          />

          {/* Custom amount */}
          <View
            className="mb-6 flex-row items-center rounded-xl border px-4"
            style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}>
            <Text className="text-base font-semibold" style={{ color: colors.textSecondary }}>
              ₦
            </Text>
            <TextInput
              className="flex-1 px-2 py-3 text-base"
              style={{ color: colors.textPrimary }}
              value={amount}
              onChangeText={(text) => setAmount(formatWithCommas(text.replace(/[^0-9]/g, '')))}
              placeholder={t('utilities.enterAmount')}
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>
      </KeyboardAwareScrollView>

      {/* Bottom summary + Continue */}
      <View
        className="border-t px-4 pb-5 pt-3"
        style={{ borderTopColor: colors.border, backgroundColor: colors.background }}>
        {(selectedNetwork || amountNum > 0) && (
          <View className="mb-3 flex-row items-center justify-between">
            <Text
              numberOfLines={1}
              className="flex-1 pr-3 text-xs"
              style={{ color: colors.textSecondary }}>
              {selectedNetwork?.name ?? t('utilities.airtime')}
              {phoneNumber ? ` • ${phoneNumber}` : ''}
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
          textClassName="text-base font-semibold"
          buttonClassName="items-center rounded-lg py-4"
          activeOpacity={0.8}
          containerClassName=""
        />
      </View>

      {/* Enter PIN Modal */}
      <TransactionPinModal
        visible={enterPinModalVisible}
        onClose={closePinModal}
        pin={pin}
        pinError={pinError}
        isSubmitting={isSubmitting}
        onKeyPress={handleKeyPress}
        pinLength={PIN_LENGTH}
        summary={{
          icon: selectedNetworkData?.icon,
          iconBackgroundColor: selectedNetworkData?.color,
          title: `${selectedNetworkData?.name || t('utilities.airtime')} ${t('utilities.recharge')}`,
          subtitle: phoneNumber,
          amountLabel: `₦${formatAmount(amount)}`,
        }}
      />

      {/* Transaction Result Modal */}
      <TransactionResultModal
        visible={resultModalVisible}
        success={transactionResult?.success}
        successTitle={t('utilities.paymentSuccessful')}
        failureTitle={t('utilities.paymentFailed')}
        message={transactionResult?.message}
        details={[
          { label: t('utilities.product'), value: transactionResult?.productDescription },
          { label: t('utilities.phoneNumber'), value: phoneNumber },
          { label: t('utilities.amount'), value: `₦${formatAmount(amount)}` },
          { label: t('utilities.referenceId'), value: transactionResult?.referenceId },
        ]}
        onDone={handleResultDone}
        onTryAgain={handleTryAgain}
      />
    </View>
  );
}
