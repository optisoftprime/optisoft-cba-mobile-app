// screens/LoanList.jsx
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import Header from 'components/header';
import { navigateBack, navigateReplace, navigateTo } from 'app/navigate';
import WalletBalanceCard from 'components/walletCard';
import EmptyState from 'components/EmptyState';
import Dropdown from 'components/dropDown';
import { useTheme } from 'config/ThemeContext';
import { getMyLoans } from 'api/loans';
import { formatAmount, formatDate, formatTenure } from 'helper';
import { ProductArt } from 'components/ui/product-art';

const getLoanStatusConfig = (status, colors, t) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'completed' || s === 'paid')
    return {
      statusColor: colors.success,
      progressOverride: 100,
      progressColor: colors.success,
      progressLabel: t('loans.fullyPaid'),
      button: {
        label: t('loans.viewDetails'),
        bgColor: colors.successSoft,
        textColor: colors.onSuccessSoft,
        icon: 'checkmark-circle-outline',
        disabled: false,
      },
    };
  if (s === 'declined')
    return {
      statusColor: colors.error,
      progressOverride: 0,
      progressColor: colors.error,
      progressLabel: t('loans.notApplicable'),
      button: {
        label: t('loans.viewDetails'),
        bgColor: colors.dangerSoft,
        textColor: colors.onDangerSoft,
        icon: 'close-circle-outline',
        disabled: false,
      },
    };
  if (s === 'processing')
    return {
      statusColor: colors.warning,
      progressOverride: null,
      progressColor: colors.warning,
      progressLabel: null,
      button: {
        label: t('loans.viewDetails'),
        bgColor: colors.warningSoft,
        textColor: colors.onWarningSoft,
        icon: 'time-outline',
        disabled: false,
      },
    };
  if (s === 'approved')
    return {
      statusColor: colors.primary,
      progressOverride: null,
      progressColor: colors.primary,
      progressLabel: null,
      button: {
        label: t('loans.viewDetails'),
        bgColor: colors.primary,
        textColor: colors.onPrimary,
        icon: 'document-text-outline',
        disabled: false,
      },
    };
  if (s === 'due')
    return {
      statusColor: colors.error,
      progressOverride: null,
      progressColor: colors.error,
      progressLabel: null,
      button: {
        label: t('loans.makeRepayment'),
        bgColor: colors.danger,
        textColor: colors.onDanger,
        icon: 'card-outline',
        disabled: false,
      },
    };
  if (s === 'running')
    return {
      statusColor: colors.success,
      progressOverride: null,
      progressColor: colors.primary,
      progressLabel: null,
      button: {
        label: t('loans.makeRepayment'),
        bgColor: colors.primary,
        textColor: colors.onPrimary,
        icon: 'card-outline',
        disabled: false,
      },
    };
  return {
    statusColor: colors.inkMuted,
    progressOverride: null,
    progressColor: colors.primary,
    progressLabel: null,
    button: {
      label: t('loans.viewDetails'),
      bgColor: colors.primary,
      textColor: colors.onPrimary,
      icon: 'document-text-outline',
      disabled: false,
    },
  };
};

function LoanCard({ loan, onPressDetails, colors, shadows, t }) {
  const paidCount =
    loan?.repaymentScheduledDates?.filter((r) => r?.paid || r?.paidOff)?.length ?? 0;
  const totalCount = loan?.repaymentScheduledDates?.length ?? 0;
  const realProgress = totalCount === 0 ? 0 : Math.round((paidCount / totalCount) * 100);
  const config = getLoanStatusConfig(loan?.loanStatus, colors, t);
  const progress = config.progressOverride !== null ? config.progressOverride : realProgress;
  const { button } = config;
  const progressLabel =
    config.progressLabel ?? t('loans.repaymentsCount', { paid: paidCount, total: totalCount });

  // Every button — irrespective of loan status — takes the user to the
  // loan transaction detail screen. Status only changes the label/color.
  const handlePress = () => {
    if (button?.disabled) return;
    onPressDetails?.(loan);
  };

  return (
    <View
      className="mb-4 overflow-hidden rounded-2xl border border-line bg-card p-4"
      style={shadows?.sm}>
      <View className="flex-row">
        <ProductArt icon="cash-outline" />
        <View className="flex-1">
          <Text className="mb-1 text-xs font-semibold text-ink">
            <Text className="font-normal text-ink-muted">{t('loans.amountLabel')}: </Text>
            {formatAmount(loan?.principalAmount)}
          </Text>
          <Text className="mb-1 text-xs font-semibold text-ink">
            <Text className="font-normal text-ink-muted">{t('loans.totalRepayment')}: </Text>
            {formatAmount(loan?.totalRepaymentAmount)}
          </Text>
          <Text className="mb-1 text-xs font-semibold text-ink">
            <Text className="font-normal text-ink-muted">{t('loans.interestRate')}: </Text>
            {loan?.interestRate}%
          </Text>
          <Text className="mb-1 text-xs font-semibold text-ink">
            <Text className="font-normal text-ink-muted">{t('loans.tenure')}: </Text>
            {formatTenure(t, loan?.tenureType, loan?.tenureDuration)}
          </Text>
          <Text className="mb-1 text-xs font-semibold text-ink">
            <Text className="font-normal text-ink-muted">{t('loans.nextRepayment')}: </Text>
            {formatDate(loan?.nextRepaymentDate)}
          </Text>
          <Text className="mb-2 text-xs text-ink">
            <Text className="text-ink-muted">{t('loans.status')}: </Text>
            <Text style={{ color: config.statusColor, fontWeight: '600' }}>
              {loan?.loanStatus ?? '—'}
            </Text>
          </Text>

          <View className="mb-1 h-2 overflow-hidden rounded-full bg-card-muted">
            <View
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: config.progressColor }}
            />
          </View>
          <Text className="mb-2 text-right text-xs font-semibold text-ink-muted">
            {progressLabel}
          </Text>

          <TouchableOpacity
            onPress={handlePress}
            disabled={button?.disabled}
            activeOpacity={button?.disabled ? 1 : 0.75}
            className="flex-row items-center justify-center rounded-xl py-2"
            style={{
              backgroundColor: button?.bgColor,
              gap: 4,
              opacity: button?.disabled ? 0.9 : 1,
            }}>
            <Ionicons name={button?.icon} size={14} color={button?.textColor} />
            <Text className="text-xs font-semibold" style={{ color: button?.textColor }}>
              {button?.label}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function LoanList() {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const [filterValue, setFilterValue] = useState('All');
  const [filterOpen, setFilterOpen] = useState(false);

  const LOAN_FILTER_OPTIONS = [
    { label: t('loans.filterAll'), value: 'All' },
    { label: t('loans.filterProcessing'), value: 'Processing' },
    { label: t('loans.filterApproved'), value: 'Approved' },
    { label: t('loans.filterDeclined'), value: 'Declined' },
    { label: t('loans.filterPaid'), value: 'Paid' },
    { label: t('loans.filterPerforming'), value: 'Performing' },
    { label: t('loans.filterNotPerforming'), value: 'Not_Performing' },
    { label: t('loans.filterCompleted'), value: 'Completed' },
    { label: t('loans.filterRunning'), value: 'Running' },
    { label: t('loans.filterOverDue'), value: 'Over_Due' },
  ];

  const selectedFilterLabel =
    LOAN_FILTER_OPTIONS.find((o) => o.value === filterValue)?.label ?? t('loans.filterAll');

  const {
    data: loans = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['myLoans', filterValue],
    queryFn: async () => {
      const params = filterValue !== 'All' ? { status: filterValue } : {};
      const response = await getMyLoans(params);
      console.log(JSON.stringify(response, null, 2));
      if (response?.ok && response?.data?.data) return response.data.data;
      Toast.show({ type: 'error', text1: t('loans.failedToLoad'), text2: response?.message });
      return [];
    },
    staleTime: 0,
  });

  // Refetch every time this screen regains focus — e.g. when the user
  // navigates back from loanTransactionDetail after a successful
  // repayment. Without this, the list keeps showing stale status/progress
  // because useQuery only runs on mount and on manual pull-to-refresh.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  // "Loan Total" = the summed principal (the "Amount" each card shows) of every
  // loan currently in the list. Shows "--" when the list is empty, not ₦0.00.
  const loanTotal = loans.length
    ? formatAmount(loans.reduce((sum, l) => sum + (Number(l?.principalAmount) || 0), 0))
    : '--';

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        <Header
          title={t('loans.myLoansTitle')}
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
          leftIconColor={colors.textPrimary}
        />

        <WalletBalanceCard
          walletName={t('loans.loanTotal')}
          balance={loanTotal}
          showWalletName={true}
          showBalance={true}
          showBalanceToggle={true}
          showDescription={false}
          showDescriptionButton={false}
          showPoints={false}
          showWalletNumber={false}
          showCopyWallet={false}
          showTopRightButton={false}
          containerClassName="mx-5 mb-2"
        />

        <View className="px-5">
          {/* Modal only — no trigger rendered, driven by filterOpen */}
          <Dropdown
            label={t('loans.filterLoans')}
            placeholder={t('loans.filterAll')}
            value={filterValue}
            options={LOAN_FILTER_OPTIONS}
            onSelect={(val) => setFilterValue(val)}
            isOpen={filterOpen}
            onToggle={() => setFilterOpen((prev) => !prev)}
            search={false}
            hideTrigger
          />

          <View className="mb-6 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigateReplace('loanForm')}
              className="items-center py-3">
              <Text className="text-sm font-semibold text-primary">{t('loans.applyNewLoan')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setFilterOpen(true)}
              className="flex-row items-center gap-1 rounded-full bg-primary-light px-3 py-1.5">
              <Text className="text-xs font-semibold text-primary-dark">{selectedFilterLabel}</Text>
              <Ionicons name="chevron-down" size={14} color={colors.primaryDark} />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <EmptyState
              title={t('loans.loadingTitle')}
              subtitle={t('loans.loadingSubtitle')}
              iconName="time-outline"
            />
          ) : loans.length === 0 ? (
            <EmptyState
              title={t('loans.noLoansTitle')}
              subtitle={
                filterValue !== 'All'
                  ? t('loans.noFilteredLoans', { filter: selectedFilterLabel.toLowerCase() })
                  : t('loans.noLoansSubtitle')
              }
              iconName="cash-outline"
            />
          ) : (
            loans.map((loan, index) => (
              <LoanCard
                key={loan?.loanCode ?? index}
                loan={loan}
                colors={colors}
                shadows={shadows}
                t={t}
                onPressDetails={(l) =>
                  navigateTo('loanTransactionDetail', { item: JSON.stringify(l) })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
