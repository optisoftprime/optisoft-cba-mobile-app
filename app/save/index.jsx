import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import Header from 'components/header';
import { navigateTo } from 'app/navigate';
import WalletBalanceCard from 'components/walletCard';
import { useTheme } from 'config/ThemeContext';
import { getUserSavingTransactions } from 'api/save';
import { formatAmount } from 'helper';

// The four savings products. `icon` replaces the old illustration images so
// each plan reads clearly at a glance; `tone` is one of the dashboard's tinted
// tile tokens (bg-tile-1..4), so the hub matches the home screen. `link` opens that product's
// info screen, whose "View … Savings" button forwards the matching productType
// to the savings-transactions list so its filter lands pre-selected.
const savingsPlans = [
  {
    id: 'fixed',
    titleKey: 'savings.hubFixedTitle',
    descKey: 'savings.hubFixedDesc',
    tone: 'bg-tile-1',
    icon: 'lock',
    link: 'rizeSpringSavingData',
  },
  {
    id: 'target',
    titleKey: 'savings.hubTargetTitle',
    descKey: 'savings.hubTargetDesc',
    tone: 'bg-tile-4',
    icon: 'bullseye-arrow',
    link: 'targetSavingData',
  },
  {
    id: 'group',
    titleKey: 'savings.hubGroupTitle',
    descKey: 'savings.hubGroupDesc',
    tone: 'bg-tile-2',
    icon: 'account-group',
    link: 'projectSavingData',
  },
  {
    id: 'compulsory',
    titleKey: 'savings.hubCompulsoryTitle',
    descKey: 'savings.hubCompulsoryDesc',
    tone: 'bg-tile-3',
    icon: 'shield-check',
    link: 'childrenSavingData',
  },
];

export default function SavingsPage() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();

  // Total balance across ALL savings — no product-type filter applied.
  const { data: savings = [] } = useQuery({
    queryKey: ['userSavingTransactions', 'all'],
    queryFn: async () => {
      const response = await getUserSavingTransactions({});
      if (response?.ok && response?.data?.data) return response.data.data;
      return [];
    },
    staleTime: 0,
  });

  const totalBalance = savings.length
    ? formatAmount(savings.reduce((sum, s) => sum + (Number(s?.amount) || 0), 0))
    : '--';

  const handlePlanPress = (plan) => {
    if (plan?.link) navigateTo(plan.link);
  };

  return (
    <ScrollView className="flex-1 bg-background" showsVerticalScrollIndicator={false}>
      <Header title={t('savings.hubTitle')} showLeftIcon={true} color={colors.textPrimary} />

      <WalletBalanceCard
        walletName={t('savings.hubWalletName')}
        balance={totalBalance}
        showWalletName={true}
        showBalance={true}
        showBalanceToggle={true}
        showDescription={false}
        showDescriptionButton={false}
        showPoints={false}
        showWalletNumber={false}
        showCopyWallet={false}
        showTopRightButton={false}
        containerClassName="mx-5 mb-8"
      />

      {/* Savings Plans */}
      <View className="mb-8 px-5">
        <Text className="mb-3 text-[17px] font-bold text-ink">{t('savings.hubPlansHeading')}</Text>
        <View className="flex-row flex-wrap justify-between">
          {savingsPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              className={`mb-4 w-[48%] items-center rounded-2xl p-5 ${plan.tone}`}
              style={shadows.sm}
              onPress={() => handlePlanPress(plan)}
              activeOpacity={0.8}>
              <View className="mb-3 h-14 w-14 items-center justify-center rounded-2xl bg-card">
                <MaterialCommunityIcons name={plan.icon} size={28} color={colors.primaryDark} />
              </View>
              <Text className="text-center text-sm font-semibold text-ink">{t(plan.titleKey)}</Text>
              <Text className="mt-1 text-center text-xs leading-4 text-ink-muted">
                {t(plan.descKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
