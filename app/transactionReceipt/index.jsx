// screens/TransactionReceipt.jsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';

import { Curves } from 'svgs/transactionReceiptCurve';
import TouchBtn from 'components/touchBtn';
import { useTheme } from 'config/ThemeContext';
import { brand } from 'config/brand';
import { BrandLogo } from 'components/ui/brand-logo';
import { withFeature } from 'components/layout/coming-soon';

function TransactionReceipt() {
  const { colors } = useTheme();

  const receiptData = {
    senderName: 'John Dave',
    senderBankName: brand.appName,
    senderAccountNumber: '09087654321',
    recipientName: 'Abraham Daalson',
    recipientBankName: 'Zenith Bank',
    recipientAccountNumber: '0987654321',
    amountSent: '₦34,500.00',
    transactionDateTime: '23/09/2026  09:10:AM',
    transactionId: '2456787653427B983',
    narration: 'Upkeep',
  };

  const handleDownload = () => {
    console.log('Download receipt');
  };

  const handleShare = () => {
    console.log('Share receipt');
  };

  return (
    <View className="flex-1 bg-primary">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}>
        {/* Header Wave Design */}
        <View className="items-center pb-4 pt-8">
          {/* App Logo */}
          {/* No badge: the white logo sits straight on the brand header. */}
          <BrandLogo on="brand" size={30} style={{ marginBottom: 16 }} />

          <Text className="text-2xl font-bold text-on-primary">Transaction Receipt</Text>
          <Text className="mt-1 text-sm text-on-primary/90">August 24, 2024 09:45:32</Text>
        </View>

        {/* Top Curves */}
        <View>
          <Curves paper={colors.card} edge={colors.primary} />
        </View>

        {/* Receipt Details */}
        <View className="flex-1 bg-card px-5 pb-6">
          {/* Transaction Details */}
          <View className="space-y-3">
            <ReceiptRow label="Sender's Name" value={receiptData.senderName} />
            <ReceiptRow label="Sender's Bank Name" value={receiptData.senderBankName} />
            <ReceiptRow label="Sender's Account Number" value={receiptData.senderAccountNumber} />
            <ReceiptRow label="Recipient's Name" value={receiptData.recipientName} />
            <ReceiptRow label="Recipient's Bank Name" value={receiptData.recipientBankName} />
            <ReceiptRow
              label="Recipient's Account Number"
              value={receiptData.recipientAccountNumber}
            />
            <ReceiptRow label="Amount Sent" value={receiptData.amountSent} />
            <ReceiptRow label="Transaction Date/Time" value={receiptData.transactionDateTime} />
            <ReceiptRow label="Transaction ID" value={receiptData.transactionId} />
            <ReceiptRow label="Narration" value={receiptData.narration} />
          </View>
        </View>

        {/* Bottom Curves - Rotated 180 degrees */}
        <View style={{ transform: [{ rotate: '180deg' }] }}>
          <Curves paper={colors.card} edge={colors.primary} />
        </View>

        {/* Action Buttons */}
        <View className="bg-primary px-5 pb-6 pt-4">
          <TouchBtn
            onPress={handleDownload}
            label="Download"
            backgroundColor={colors.onPrimary}
            textColor={colors.primary}
            textClassName="text-base font-semibold"
            buttonClassName="mb-3 items-center rounded-lg py-4"
            activeOpacity={0.8}
            containerClassName=""
          />

          <TouchBtn
            onPress={handleShare}
            label="Share"
            backgroundColor="transparent"
            borderColor={colors.onPrimary}
            borderWidth={2}
            textColor={colors.onPrimary}
            textClassName="text-base font-semibold"
            buttonClassName="items-center rounded-lg py-4"
            activeOpacity={0.8}
            containerClassName=""
          />
        </View>
      </ScrollView>
    </View>
  );
}

// Helper component for receipt rows
function ReceiptRow({ label, value }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row justify-between py-2">
      <Text className="flex-1 text-sm text-ink-muted">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold" style={{ color: colors.primary }}>
        {value}
      </Text>
    </View>
  );
}

// Backend not live yet — renders "Coming soon" until config/features.js enables it.
export default withFeature('bankTransfer', TransactionReceipt);
