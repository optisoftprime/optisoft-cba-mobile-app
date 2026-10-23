// screens/BankTransfer.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import { formatWithCommas, stripCommas } from 'helper';
import Dropdown from 'components/dropDown';
import { useTheme } from 'config/ThemeContext';
import { withFeature } from 'components/layout/coming-soon';

function BankTransfer() {
  const { colors } = useTheme();
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [isValidAccount, setIsValidAccount] = useState(false);
  const [amount, setAmount] = useState('');
  const [narration, setNarration] = useState('');

  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const bankOptions = [
    { label: 'Access Bank', value: 'access_bank' },
    { label: 'GTBank', value: 'gtbank' },
    { label: 'First Bank', value: 'first_bank' },
    { label: 'Zenith Bank', value: 'zenith_bank' },
    { label: 'UBA', value: 'uba' },
    { label: 'Fidelity Bank', value: 'fidelity_bank' },
  ];

  const handleAccountNumberChange = (text) => {
    setAccountNumber(text);

    // Simulate account validation when 10 digits are entered
    if (text.length === 10 && selectedBank) {
      setAccountName('Abraham Mclawdon David');
      setIsValidAccount(true);
    } else {
      setAccountName('');
      setIsValidAccount(false);
    }
  };

  const handleContinue = () => {
    console.log('Bank Transfer details:', {
      selectedBank,
      accountNumber,
      accountName,
      amount: stripCommas(amount),
      narration,
    });
    navigateTo('transactionReceipt');
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        <Header
          title="Bank Transfer"
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.ink}
        />

        <View className="flex-1 px-4 pt-6">
          {/* Bank Dropdown */}
          <Dropdown
            label="Bank"
            placeholder="Select Bank"
            value={selectedBank}
            options={bankOptions}
            onSelect={(value) => {
              setSelectedBank(value);
              setShowBankDropdown(false);
              // Reset account validation when bank changes
              setAccountName('');
              setIsValidAccount(false);
            }}
            isOpen={showBankDropdown}
            onToggle={() => setShowBankDropdown(!showBankDropdown)}
          />

          {/* Account Number */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-ink">Account Number</Text>
            <TextInput
              className="rounded-xl border border-line bg-card px-4 py-3.5 text-base text-ink"
              value={accountNumber}
              onChangeText={handleAccountNumberChange}
              placeholder="0987654321"
              placeholderTextColor={colors.inkSoft}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          {/* Account Name Display */}
          {isValidAccount && (
            <View className="mb-4 flex-row items-center">
              <Text className="text-sm font-medium text-success">{accountName}</Text>
              <View className="ml-2 h-5 w-5 items-center justify-center rounded-full bg-success-soft">
                <Text className="text-xs font-bold text-on-success-soft">✓</Text>
              </View>
            </View>
          )}

          {/* Amount */}
          <View className="mb-4">
            <Text className="mb-2 text-sm font-semibold text-ink">Amount</Text>
            <TextInput
              className="rounded-xl border border-line bg-card px-4 py-3.5 text-base text-ink"
              value={amount}
              onChangeText={(text) => setAmount(formatWithCommas(text))}
              placeholder="₦0.00"
              placeholderTextColor={colors.inkSoft}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Narration */}
          <View className="mb-6">
            <Text className="mb-2 text-sm font-semibold text-ink">Narration</Text>
            <TextInput
              className="rounded-xl border border-line bg-card px-4 py-3.5 text-base text-ink"
              value={narration}
              onChangeText={setNarration}
              placeholder="Enter narration"
              placeholderTextColor={colors.inkSoft}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>
        </View>

        {/* Continue Button - Fixed at Bottom */}
        <View className="px-4 pb-6">
          <TouchableOpacity
            onPress={handleContinue}
            className="items-center rounded-xl bg-primary py-4"
            activeOpacity={0.8}>
            <Text className="text-base font-semibold text-on-primary">Continue</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('bankTransfer', BankTransfer);
