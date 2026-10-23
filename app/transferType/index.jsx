// screens/TransferType.jsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import FeatureGate from 'components/FeatureGate';
import SelectionCard from 'components/SelectionCard';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';
import { isEnabled } from 'config/features';

export default function TransferType() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Option cards (same design as Utilities / Bill Type) that navigate on tap. Bank Transfer isn't built yet, so it's gated: a tap toasts
  // "not available" and the card is dimmed via FeatureGate.
  const transferTypes = [
    {
      id: 'wallet_to_wallet',
      title: t('transfer.walletToWalletTitle'),
      description: t('transfer.walletToWalletDescription'),
      iconName: 'wallet-outline',
      disabled: false,
      onPress: () => navigateTo('transfer'),
    },
    {
      id: 'bank_transfer',
      title: t('transfer.bankTransferTitle'),
      description: t('transfer.bankTransferDescription'),
      iconName: 'business-outline',
      disabled: !isEnabled('bankTransfer'),
      onPress: () => navigateTo('bankTransferForm'),
    },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={t('transfer.transferTypeTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-[13px] text-ink-muted">{t('transfer.chooseHowToSend')}</Text>

        {transferTypes.map((option) => (
          <FeatureGate
            key={option.id}
            enabled={!option.disabled}
            message={t('transfer.underDevelopment', { value: option.title })}>
            <SelectionCard
              title={option.title}
              description={option.description}
              iconName={option.iconName}
              onPress={option.onPress}
            />
          </FeatureGate>
        ))}
      </ScrollView>
    </View>
  );
}
