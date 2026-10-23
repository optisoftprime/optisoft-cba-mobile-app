// screens/Utilities.jsx
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { navigateBack, navigateTo } from 'app/navigate';
import Header from 'components/header';
import SelectionCard from 'components/SelectionCard';
import { useTheme } from 'config/ThemeContext';
import { useTranslation } from 'react-i18next';

export default function Utilities() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const utilityOptions = [
    {
      id: 'airtime',
      title: t('utilities.airtimeTitle'),
      description: t('utilities.airtimeDescription'),
      iconName: 'phone-portrait-outline',
      onPress: () => navigateTo('buyAirtime'),
    },
    {
      id: 'data',
      title: t('utilities.dataTitle'),
      description: t('utilities.dataDescription'),
      iconName: 'globe-outline',
      onPress: () => navigateTo('buyData'),
    },
    {
      id: 'paybills',
      title: t('utilities.payBillsTitle'),
      description: t('utilities.payBillsDescription'),
      iconName: 'receipt-outline',
      onPress: () => navigateTo('billType'),
    },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={t('utilities.utilitiesTitle')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-[13px] text-ink-muted">{t('utilities.whatToDo')}</Text>

        {utilityOptions.map((option) => (
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
