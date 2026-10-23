// screens/ChooseBillType.jsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import Header from 'components/header';
import { navigateBack, navigateTo } from 'app/navigate';
import SelectionCard from 'components/SelectionCard';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function ChooseBillType() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  // Full-width option cards (same design as Utilities / Transfer Type) that
  // navigate straight to the payment screen on tap — no radio-select + Next.
  const billTypes = [
    {
      id: 'electricity',
      title: t('utilities.electricityTitle'),
      description: t('utilities.electricityDescription'),
      iconName: 'flash-outline',
      onPress: () => navigateTo('payElectricity'),
    },
    {
      id: 'cable',
      title: t('utilities.cableTitle'),
      description: t('utilities.cableDescription'),
      iconName: 'tv-outline',
      onPress: () => navigateTo('payCable'),
    },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={t('utilities.chooseBillTypeTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-[13px] text-ink-muted">{t('utilities.whatToPayFor')}</Text>

        {billTypes.map((option) => (
          <SelectionCard
            key={option.id}
            title={option.title}
            description={option.description}
            iconName={option.iconName}
            onPress={option.onPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
