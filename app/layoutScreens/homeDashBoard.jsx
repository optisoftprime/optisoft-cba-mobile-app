import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  BackHandler,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { navigateReplace, navigateTo } from 'app/navigate';
import Toast from 'react-native-toast-message';
import { trimMessage, formatAmount, formatTier, getUpgradeLabel } from 'helper';
import { getDashBoardData, getOrgAccountFormat } from 'api/home';
import { getDisplayAccountNumber } from 'app/hooks/useAccountFormat';
import { isEnabled } from 'config/features';
import { fetchUserDetails } from 'api/userProfile';
import { updateUser } from 'config/storage';
import { useTheme } from 'config/ThemeContext';
import { useUnreadNotificationCount } from '../hooks/notifications';
import TransactionDetailModal from './../../components/transactionDetailsModal';
import { HomeHeader } from 'components/dashboard/home-header';
import { QuickAction } from 'components/dashboard/quick-action';
import { WalletPanel } from 'components/dashboard/wallet-panel';
import { Avatar } from 'components/ui/avatar';
import { EmptyState } from 'components/ui/empty-state';
import { SectionHeading } from 'components/ui/section-heading';
import { Skeleton } from 'components/ui/skeleton';

/** Quick actions and services sit four to a row, as on the agent app. */
const ROW_SIZE = 4;

function chunk(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function groupTransactionsByDate(transactions, t) {
  const groups = {};
  for (const tx of transactions) {
    const date = new Date(tx?.transactionDate);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let label;
    if (date.toDateString() === today.toDateString()) {
      label = t('dashboard.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      label = t('dashboard.yesterday');
    } else {
      label = date.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
    }

    if (!groups[label]) groups[label] = [];
    groups[label].push(tx);
  }

  return groups;
}

/** The transaction list's shape while it loads — nothing moves when data lands. */
function TransactionSkeleton() {
  return (
    <View className="overflow-hidden rounded-xl border border-line bg-card">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className={`flex-row items-center px-4 py-3.5 ${i < 2 ? 'border-b border-line' : ''}`}>
          <Skeleton width={40} height={40} radius={20} />
          <View className="ml-3 flex-1">
            <Skeleton width="60%" height={13} />
            <Skeleton width="40%" height={11} style={{ marginTop: 8 }} />
          </View>
          <Skeleton width={72} height={13} />
        </View>
      ))}
    </View>
  );
}

function TransactionRow({ tx, onPress, last }) {
  const { t } = useTranslation();
  const isDeposit = tx.transactionType === 'Deposit';
  const title = tx?.recipient || tx?.description || t('dashboard.transactionFallback');

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress(tx)}
      className={`flex-row items-center px-4 py-3.5 active:bg-card-muted ${
        last ? '' : 'border-b border-line'
      }`}>
      <Avatar name={tx?.customerName || title} size={40} />

      <View className="ml-3 flex-1">
        <Text className="text-[14px] font-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-1 text-xs text-ink-muted" numberOfLines={1}>
          {tx?.transactionType} · {formatTime(tx?.transactionDate)}
        </Text>
      </View>

      <Text className={`ml-3 text-[14px] font-bold ${isDeposit ? 'text-success' : 'text-ink'}`}>
        {isDeposit ? '+' : ''}
        {formatAmount(tx?.amount)}
      </Text>
    </Pressable>
  );
}

/** A Goodies tile — a tinted summary card that opens its feature. */
function GoodieTile({ title, value, subtitle, badge, icon, tone, onPress }) {
  const { colors, shadows } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`flex-1 rounded-2xl px-4 py-3.5 active:opacity-80 ${tone}`}
      style={shadows.md}>
      <View className="flex-row items-center gap-1.5">
        <Ionicons name={icon} size={16} color={colors.primaryDark} />
        <Text className="shrink text-[13px] font-medium text-ink/70" numberOfLines={1}>
          {title}
        </Text>
      </View>
      <Text
        className="mt-2 text-xl font-bold text-ink"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}>
        {value}
      </Text>
      {subtitle ? <Text className="mt-1 text-xs text-ink-muted">{subtitle}</Text> : null}
      {badge ? (
        <View className="mt-2 self-start rounded-full bg-card px-3 py-1">
          <Text className="text-[11px] font-semibold text-primary-dark">{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export default function HomePage() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const hasPromptedRef = useRef(false);

  function handleTransactionPress(tx) {
    setSelectedTransaction(tx);
    setModalVisible(true);
  }

  function handleCloseModal() {
    setModalVisible(false);
    setSelectedTransaction(null);
  }

  // Refresh user profile silently every time the screen regains focus
  useFocusEffect(
    React.useCallback(() => {
      async function syncUserProfile() {
        try {
          const result = await fetchUserDetails();
          if (!result?.ok) return;

          const profile = result?.data?.data;

          await updateUser({
            firstName: profile?.firstName,
            lastName: profile?.lastName,
            middleName: profile?.middleName,
            mobilePhone: profile?.mobilePhone,
            gender: profile?.gender,
            dateOfBirth: profile?.dateOfBirth,
            address: profile?.addressDto,
            customerKycTier: profile?.customerKycTier,
            tierUpgradeStatusResponse: profile?.tierUpgradeStatusResponse,
          });

          queryClient.setQueryData(['userDetails'], profile);
        } catch (_) {}
      }

      syncUserProfile();
    }, [])
  );

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        Alert.alert(
          t('dashboard.exitTitle'),
          t('dashboard.exitMessage'),
          [
            { text: t('dashboard.exitCancel'), style: 'cancel', onPress: () => null },
            {
              text: t('dashboard.exitConfirm'),
              style: 'destructive',
              onPress: () => BackHandler.exitApp(),
            },
          ],
          { cancelable: true }
        );
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [t])
  );

  const { data: userDetails } = useQuery({
    queryKey: ['userDetails'],
    queryFn: async () => {
      const result = await fetchUserDetails();
      if (!result?.ok) throw new Error(result?.message);

      const profile = result?.data?.data;

      await updateUser({
        firstName: profile?.firstName,
        lastName: profile?.lastName,
        middleName: profile?.middleName,
        mobilePhone: profile?.mobilePhone,
        gender: profile?.gender,
        dateOfBirth: profile?.dateOfBirth,
        address: profile?.addressDto,
        customerKycTier: profile?.customerKycTier,
        tierUpgradeStatusResponse: profile?.tierUpgradeStatusResponse,
      });

      return profile;
    },
    staleTime: 1000 * 60 * 10,
  });

  const {
    data: dashData,
    isLoading,
    isRefetching,
    isError: isDashError,
    error: dashError,
    errorUpdatedAt: dashErrorAt,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await getDashBoardData();

      // The server failed (error status, network): stay on the dashboard and
      // surface its message — the effect below shows it. Never redirect here:
      // a backend outage is not a missing account.
      if (!response?.ok) {
        throw new Error(response?.message || t('dashboard.accountNotFound'));
      }

      const data = response?.data?.data;
      const accountNumber = data?.accountNumber;
      const accountName = data?.accountName;
      const walletBalance = data?.walletBalance;

      // The server answered but there is genuinely no account: tell the user
      // why before sending them back to the start.
      if (!accountNumber || !accountName || walletBalance == null) {
        Toast.show({
          type: 'error',
          text1: t('dashboard.errorTitle'),
          text2: t('dashboard.accountNotFound'),
        });
        navigateReplace('landingScreen');
        throw new Error('Critical account data missing');
      }

      await updateUser({ accountName, accountNumber, walletBalance });

      return data;
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
    retry: false,
  });

  // Tell the user when the dashboard can't load. (TanStack Query v5 removed
  // `onError` from useQuery — the old toast there never ran, so failures were
  // silent.) Keyed on errorUpdatedAt so each failure toasts once, not per render.
  useEffect(() => {
    if (!isDashError || dashError?.message === 'Critical account data missing') return;
    Toast.show({
      type: 'error',
      text1: t('dashboard.errorTitle'),
      text2: trimMessage(dashError?.message),
    });
  }, [isDashError, dashErrorAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: accountFormat } = useQuery({
    queryKey: ['orgAccountFormat'],
    queryFn: async () => {
      const response = await getOrgAccountFormat();
      const accountFormat = response?.data?.data;
      if (!accountFormat) throw new Error('Failed to fetch organization account format');
      return accountFormat;
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: dashData?.accountFormat ?? [],
    retry: false,
  });

  const limitedTransactions = dashData?.transactionHistory?.slice(0, 5) ?? [];
  const transactionGroups = limitedTransactions.length
    ? groupTransactionsByDate(limitedTransactions, t)
    : null;

  const firstName =
    userDetails?.firstName ??
    dashData?.accountName?.split(' ')?.[0] ??
    t('dashboard.greetingFallbackName');
  const accountTier = formatTier(userDetails?.customerKycTier);
  const upgradeLabel = getUpgradeLabel(userDetails?.customerKycTier);
  // BUG-023: a tier-upgrade request awaiting review must suppress the active
  // "Upgrade to Tier X" CTA on the dashboard (same source of truth as the KYC
  // screen — tierUpgradeStatusResponse: [{ tierName, status }]).
  const hasPendingUpgrade = Array.isArray(userDetails?.tierUpgradeStatusResponse)
    ? userDetails.tierUpgradeStatusResponse.some((s) => s?.status === 'PENDING')
    : false;

  const { data: countData } = useUnreadNotificationCount();
  const unreadCount = countData?.data ?? countData ?? 0;

  // The header avatar's initials come from the full name when we have it.
  const fullName =
    [userDetails?.firstName, userDetails?.lastName].filter(Boolean).join(' ') ||
    dashData?.accountName ||
    firstName;

  // Every tile takes the brand colour from the theme (QuickAction), as on the
  // agent app — no per-tile pastel colours to keep in step with dark mode.
  const services = [
    {
      name: t('dashboard.serviceTransfer'),
      icon: 'swap-horizontal-outline',
      link: 'transferType',
      disabled: false,
    },
    { name: t('dashboard.serviceSavings'), icon: 'wallet-outline', link: 'save', disabled: false },
    // RizeCoop removed for this build.
    // { name: t('dashboard.serviceRizeCopp'), icon: 'chatbubbles-outline', link: 'rizeCoopOptions', disabled: true },
    { name: t('dashboard.serviceLoan'), icon: 'cash-outline', link: 'loanData', disabled: false },
    {
      name: t('dashboard.serviceSelfService'),
      icon: 'shield-checkmark-outline',
      link: 'securitySetting',
      disabled: false,
    },
    // Utilities removed from the grid — airtime/data/electricity/cable are now
    // surfaced directly in the "Quick Pay" row above.
  ];

  // Utilities surfaced straight on the dashboard — tap to buy/pay directly,
  // instead of going through the Utilities hub first.
  const quickActions = [
    {
      id: 'airtime',
      label: t('dashboard.quickAirtime'),
      icon: 'phone-portrait-outline',
      link: 'buyAirtime',
    },
    { id: 'data', label: t('dashboard.quickData'), icon: 'globe-outline', link: 'buyData' },
    {
      id: 'electricity',
      label: t('dashboard.quickElectricity'),
      icon: 'flash-outline',
      link: 'payElectricity',
    },
    { id: 'cable', label: t('dashboard.quickCable'), icon: 'tv-outline', link: 'payCable' },
  ];

  const goodies = [
    {
      title: t('dashboard.goodieRewards'),
      value: '3,450 points',
      badge: t('dashboard.goldTier'),
      icon: 'gift-outline',
      tone: 'bg-tile-2',
      link: 'rewards',
      disabled: !isEnabled('rewards'),
    },
    {
      title: t('dashboard.goodieReferrals'),
      value: '₦0.00',
      subtitle: t('dashboard.referAndEarn'),
      icon: 'people-outline',
      tone: 'bg-tile-1',
      link: 'referal',
      disabled: false,
    },
  ];

  // A disabled feature stays in place, faded, and explains itself on tap —
  // the same treatment FeatureGate gives elsewhere.
  const openOrExplain = (item, name) => () => {
    if (item.disabled) {
      Toast.show({
        type: 'info',
        text1: t('dashboard.notAvailableTitle'),
        text2: t('dashboard.featureUnderDevelopment', { feature: name }),
      });
      return;
    }
    navigateTo(item.link);
  };

  // Phone (user-details) and account number (dashboard) come from different
  // endpoints, so merge them before formatting — this is what keeps the home
  // card's account number identical to Profile / Profile Settings (BUG-016).
  const displayAccountNumber = getDisplayAccountNumber(accountFormat?.accountNumberFormat, {
    mobilePhone: userDetails?.mobilePhone,
    accountNumber: dashData?.accountNumber,
  });

  const today = new Date().toLocaleDateString('en-NG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              queryClient.invalidateQueries({ queryKey: ['dashboard'] });
              queryClient.invalidateQueries({ queryKey: ['userDetails'] });
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }>
        <HomeHeader
          name={fullName}
          greeting={t('dashboard.greeting', { name: firstName })}
          subtitle={today}
          unreadCount={unreadCount}
        />

        <View className="px-4">
          <WalletPanel
            balance={
              dashData?.walletBalance != null
                ? formatAmount(dashData.walletBalance)
                : // loading, or failed with nothing cached: never show a fake ₦0.00
                  '₦ --'
            }
            accountNumber={displayAccountNumber}
            accountTier={isLoading ? t('dashboard.tierLoading') : accountTier}
            upgradeLabel={isLoading ? null : upgradeLabel}
            upgradePending={!isLoading && hasPendingUpgrade}
            onUpgradePress={upgradeLabel ? () => navigateTo('upgradeAccount') : null}
          />
        </View>

        {/* Quick Pay — utility actions (airtime/data/bills) surfaced right on
            the dashboard so users can jump straight in. */}
        <View className="mt-7 px-4">
          <SectionHeading title={t('dashboard.quickPayTitle')} />
          <View className="flex-row gap-3">
            {quickActions.map((qa) => (
              <QuickAction
                key={qa.id}
                label={qa.label}
                icon={qa.icon}
                onPress={() => navigateTo(qa.link)}
              />
            ))}
          </View>
        </View>

        <View className="mt-7 px-4">
          <SectionHeading title={t('dashboard.servicesTitle')} />
          <View className="gap-3">
            {chunk(services, ROW_SIZE).map((row, rowIndex) => (
              <View key={rowIndex} className="flex-row gap-3">
                {row.map((service) => (
                  <QuickAction
                    key={service.link}
                    label={service.name}
                    icon={service.icon}
                    className={service.disabled ? 'opacity-50' : ''}
                    onPress={openOrExplain(service, service.name)}
                  />
                ))}
                {/* Spacers keep a short last row on the same grid. */}
                {Array.from({ length: ROW_SIZE - row.length }).map((_, i) => (
                  <View key={`spacer-${i}`} className="flex-1" />
                ))}
              </View>
            ))}
          </View>
        </View>

        <View className="mt-7 px-4">
          <SectionHeading title={t('dashboard.goodiesTitle')} />
          <View className="flex-row gap-3">
            {goodies.map((goodie) => (
              <GoodieTile
                key={goodie.link}
                title={goodie.title}
                value={goodie.value}
                subtitle={goodie.subtitle}
                badge={goodie.badge}
                icon={goodie.icon}
                tone={`${goodie.tone} ${goodie.disabled ? 'opacity-50' : ''}`}
                onPress={openOrExplain(goodie, goodie.title)}
              />
            ))}
          </View>
        </View>

        <View className="mt-7 px-4">
          <SectionHeading
            title={t('dashboard.transactionHistoryTitle')}
            actionLabel={t('dashboard.viewAll')}
            actionAsPill
            onPressAction={() => navigateTo('allTransactions')}
          />

          {isLoading ? (
            <TransactionSkeleton />
          ) : transactionGroups ? (
            Object.entries(transactionGroups).map(([dateLabel, txs]) => (
              <View key={dateLabel} className="mb-4">
                <Text className="mb-2 text-xs font-medium text-ink-muted">{dateLabel}</Text>
                <View className="overflow-hidden rounded-xl border border-line bg-card">
                  {txs.map((tx, index) => (
                    <TransactionRow
                      key={tx?.id ?? tx?.transactionId}
                      tx={tx}
                      last={index === txs.length - 1}
                      onPress={handleTransactionPress}
                    />
                  ))}
                </View>
              </View>
            ))
          ) : (
            <View className="rounded-xl border border-line bg-card">
              <EmptyState
                compact
                icon="receipt-outline"
                title={t('dashboard.noTransactionsTitle')}
                message={t('dashboard.noTransactionsSubtitle')}
              />
            </View>
          )}
        </View>
      </ScrollView>

      <TransactionDetailModal
        visible={modalVisible}
        onClose={handleCloseModal}
        transaction={selectedTransaction}
      />
    </View>
  );
}
