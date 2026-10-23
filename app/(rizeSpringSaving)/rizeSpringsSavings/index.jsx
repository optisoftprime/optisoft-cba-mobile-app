// screens/RizeSpringList.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, TextInput } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import Header from 'components/header';
import { useLocalSearchParams } from 'expo-router';
import { navigateBack, navigateReplace, navigateTo } from 'app/navigate';
import WalletBalanceCard from 'components/walletCard';
import EmptyState from 'components/EmptyState';
import Dropdown from 'components/dropDown';
import { useTheme } from 'config/ThemeContext';
import { getUserSavingTransactions } from 'api/save';
import { formatAmount, formatDate } from 'helper';
import { ProductArt } from 'components/ui/product-art';

// ─── Constants ───────────────────────────────────────────────────────────────

// These map to the productType query param the backend accepts
const PRODUCT_TYPE_OPTIONS = [
  { labelKey: 'savings.commonFilterAll', value: 'All' },
  { labelKey: 'savings.commonFilterFixed', value: 'FIXED' },
  { labelKey: 'savings.commonFilterTarget', value: 'TARGET' },
  { labelKey: 'savings.commonFilterGroup', value: 'GROUP' },
  { labelKey: 'savings.commonFilterCompulsory', value: 'COMPULSORY' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getStatusConfig = (status, colors, t) => {
  const s = (status ?? '').toLowerCase();
  if (s === 'approved')
    return {
      color: colors.success,
      bgColor: colors.successSoft,
      icon: 'checkmark-circle-outline',
      label: t('savings.commonStatusApproved'),
    };
  if (s === 'pending')
    return {
      color: colors.warning,
      bgColor: colors.warningSoft,
      icon: 'time-outline',
      label: t('savings.commonStatusPending'),
    };
  if (s === 'declined' || s === 'rejected')
    return {
      color: colors.danger,
      bgColor: colors.dangerSoft,
      icon: 'close-circle-outline',
      label: t('savings.commonStatusDeclined'),
    };
  return {
    color: colors.textSecondary,
    bgColor: colors.cardMuted,
    icon: 'ellipse-outline',
    label: status ?? '—',
  };
};

// ─── Custom debounce hook ─────────────────────────────────────────────────────

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── SavingCard ───────────────────────────────────────────────────────────────

function SavingCard({ item, onViewDetails }) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const config = getStatusConfig(item.approvalStatus, colors, t);

  return (
    <View
      className="mb-4 overflow-hidden rounded-2xl border border-line bg-card p-4"
      style={shadows.sm}>
      <View className="flex-row">
        <ProductArt imageUrl={item.savingProductRes?.imageUrl} />

        <View className="flex-1">
          <Text className="mb-1 text-xs text-ink-muted">
            <Text className="font-semibold text-ink">{t('savings.rizeSpringProductLabel')}</Text>
            {item.savingProductRes?.productName ?? '—'}
          </Text>
          <Text className="mb-1 text-xs text-ink-muted">
            <Text className="font-semibold text-ink">{t('savings.rizeSpringAmountLabel')}</Text>
            {formatAmount(item.amount)}
          </Text>
          <Text className="mb-1 text-xs text-ink-muted">
            <Text className="font-semibold text-ink">{t('savings.rizeSpringTypeLabel')}</Text>
            {item.transactionType ?? '—'}
          </Text>
          {item.tenure != null && (
            <Text className="mb-1 text-xs text-ink-muted">
              <Text className="font-semibold text-ink">{t('savings.rizeSpringTenureLabel')}</Text>
              {item.tenure} {t('savings.commonMonthsUnit')}
            </Text>
          )}
          <Text className="mb-1 text-xs text-ink-muted">
            <Text className="font-semibold text-ink">{t('savings.rizeSpringDateLabel')}</Text>
            {formatDate(item.localDateCreatedAt)}
          </Text>
          <Text className="mb-3 text-xs text-ink-muted">
            <Text className="font-semibold text-ink">{t('savings.rizeSpringStatusLabel')}</Text>
            <Text style={{ color: config.color, fontWeight: '600' }}>{config.label}</Text>
          </Text>

          <TouchableOpacity
            onPress={() => onViewDetails?.(item)}
            activeOpacity={0.8}
            className="flex-row items-center justify-center gap-1 rounded-xl bg-primary py-2">
            <Ionicons name="document-text-outline" size={14} color={colors.onPrimary} />
            <Text className="text-xs font-semibold text-on-primary">
              {t('savings.rizeSpringViewDetails')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────────

function Toolbar({ onCreatePlan, filterLabel, onOpenFilter, searchValue, onSearchChange }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);
  const inputRef = useRef(null);

  const openSearch = () => {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    onSearchChange('');
  };

  if (searchOpen) {
    return (
      <View className="mb-6 flex-row items-center gap-2 rounded-xl border border-primary bg-card px-3 py-2">
        <Ionicons name="search-outline" size={16} color={colors.inkSoft} />
        <TextInput
          ref={inputRef}
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={t('savings.rizeSpringSearchPlaceholder')}
          placeholderTextColor={colors.inkSoft}
          style={{ flex: 1, fontSize: 13, color: colors.ink }}
          returnKeyType="search"
        />
        <TouchableOpacity onPress={closeSearch}>
          <Ionicons name="close-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mb-6 flex-row items-center justify-between">
      <TouchableOpacity
        onPress={onCreatePlan}
        activeOpacity={0.8}
        className="items-center rounded-full bg-primary-light px-4 py-2">
        <Text className="text-[13px] font-semibold text-primary-dark">
          {t('savings.rizeSpringCreatePlan')}
        </Text>
      </TouchableOpacity>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={openSearch}
          className="h-9 w-9 items-center justify-center rounded-full border border-line bg-card">
          <Ionicons name="search-outline" size={18} color={colors.ink} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOpenFilter}
          className="flex-row items-center gap-1 rounded-full border border-line bg-card px-3 py-2">
          <Text className="text-xs font-semibold text-ink">{filterLabel}</Text>
          <Text className="text-xs text-ink-muted">▾</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function RizeSpringList() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { productType: initialProductType = null } = useLocalSearchParams();

  const [filterOpen, setFilterOpen] = useState(false);
  const [filterValue, setFilterValue] = useState(initialProductType ?? 'All');
  const [searchInput, setSearchInput] = useState('');

  const debouncedSearch = useDebounce(searchInput, 400);

  // Translate the productType options for display; values stay backend-facing.
  const productTypeOptions = PRODUCT_TYPE_OPTIONS.map((o) => ({
    label: t(o.labelKey),
    value: o.value,
  }));

  const selectedFilterLabel =
    productTypeOptions.find((o) => o.value === filterValue)?.label ?? t('savings.commonFilterAll');

  // ── Build query params ──────────────────────────────────────────────────────
  // Only productName and productType are accepted by the backend
  const buildParams = useCallback(() => {
    const params = {};
    if (debouncedSearch.trim()) params.productName = debouncedSearch.trim();
    if (filterValue !== 'All') params.productType = filterValue;
    return params;
  }, [debouncedSearch, filterValue]);

  const {
    data: savings = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['userSavingTransactions', debouncedSearch, filterValue],
    queryFn: async () => {
      const response = await getUserSavingTransactions(buildParams());
      console.log(JSON.stringify(response, null, 2));
      if (response?.ok && response?.data?.data) return response.data.data;
      Toast.show({
        type: 'error',
        text1: t('savings.rizeSpringLoadFailed'),
        text2: response?.message,
      });
      return [];
    },
    staleTime: 0,
  });

  // "Savings Total" = the summed amount (the "Amount" each card shows) of every
  // saving transaction in the list. Shows "--" when the list is empty, not ₦0.00.
  const savingsTotal = savings.length
    ? formatAmount(savings.reduce((sum, s) => sum + (Number(s?.amount) || 0), 0))
    : '--';

  const handleCreateNewPlan = () => navigateReplace('rizeSpringSavingForm');
  const handleViewDetails = (item) =>
    navigateTo('savingTransactionDetail', { item: JSON.stringify(item) });
  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }>
        <Header
          title={t('savings.rizeSpringTxHeader')}
          onLeftPress={navigateBack}
          showLeftIcon={true}
          color={colors.textPrimary}
        />

        {/* Same shape as the Loans card — just savings details. No withdraw
            button, no interest-rate pill; title + total only. */}
        <WalletBalanceCard
          walletName={t('savings.rizeSpringSavingsTotal')}
          balance={savingsTotal}
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

        <View className="px-4">
          {/* Hidden dropdown — triggered by Toolbar filter button */}
          <Dropdown
            label={t('savings.rizeSpringFilterByType')}
            placeholder={t('savings.commonFilterAll')}
            value={filterValue}
            options={productTypeOptions}
            onSelect={(val) => setFilterValue(val)}
            isOpen={filterOpen}
            onToggle={() => setFilterOpen((prev) => !prev)}
            search={false}
            hideTrigger
          />

          <Toolbar
            onCreatePlan={handleCreateNewPlan}
            filterLabel={selectedFilterLabel}
            onOpenFilter={() => setFilterOpen(true)}
            searchValue={searchInput}
            onSearchChange={setSearchInput}
          />

          {/* List */}
          {isLoading ? (
            <EmptyState
              title={t('savings.rizeSpringLoadingTitle')}
              subtitle={t('savings.rizeSpringLoadingSub')}
              iconName="time-outline"
            />
          ) : savings.length === 0 ? (
            <EmptyState
              title={t('savings.rizeSpringEmptyTitle')}
              subtitle={
                debouncedSearch.trim()
                  ? t('savings.rizeSpringNoResultsFor', { query: debouncedSearch.trim() })
                  : filterValue !== 'All'
                    ? t('savings.rizeSpringNoTypeFound', {
                        type: selectedFilterLabel.toLowerCase(),
                      })
                    : t('savings.rizeSpringEmptyDefault')
              }
              iconName="wallet-outline"
            />
          ) : (
            savings.map((item) => (
              <SavingCard key={item.id} item={item} onViewDetails={handleViewDetails} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
