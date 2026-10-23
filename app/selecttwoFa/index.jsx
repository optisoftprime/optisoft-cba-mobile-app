// screens/OtpSelection.jsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Header from 'components/header';
import { navigateBack } from 'app/navigate';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { withFeature } from 'components/layout/coming-soon';

function OtpSelection() {
  const { colors } = useTheme();
  const [selectedMethod, setSelectedMethod] = useState('SMS');

  const otpMethods = [
    { id: 'SMS', label: 'SMS' },
    { id: 'Email', label: 'Email' },
    { id: 'App Authenticator', label: 'App Authenticator' },
  ];

  const handleSelectMethod = (methodId) => {
    setSelectedMethod(methodId);
  };

  const handleContinue = () => {
    console.log('Selected OTP method:', selectedMethod);
    // Navigate to next screen or trigger OTP sending
    // navigateTo('otpVerification', { method: selectedMethod });
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <Header
          title="Select"
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
        />

        <View className="flex-1 px-4 pt-8">
          {otpMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              onPress={() => handleSelectMethod(method.id)}
              className={`mb-3 flex-row items-center rounded-2xl border px-4 py-4 ${
                selectedMethod === method.id
                  ? 'border-primary bg-primary-light'
                  : 'border-line bg-card'
              }`}
              activeOpacity={0.7}>
              <View
                className="mr-3 h-6 w-6 items-center justify-center rounded-full border-2 border-ink-soft"
                style={selectedMethod === method.id ? { borderColor: colors.primary } : {}}>
                {selectedMethod === method.id && (
                  <View
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                )}
              </View>
              <Text className="text-[15px] font-medium text-ink">{method.label}</Text>
            </TouchableOpacity>
          ))}

          {/* Information Text */}
          <Text className="mt-4 text-[13px] leading-5 text-ink-muted">
            You will receive an OTP, when making high risk transaction, When off, confirm with PIN
            or OTP
          </Text>
        </View>

        {/* Continue Button - Fixed at Bottom */}
        <View className="mt-auto px-4 pb-6">
          <TouchBtn
            onPress={handleContinue}
            label="Continue"
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-lg py-4"
            activeOpacity={0.8}
            containerClassName="mt-10"
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('twoFactor', OtpSelection);
