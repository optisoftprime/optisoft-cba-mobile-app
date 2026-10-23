// screens/Referral.jsx
//
// Refer & Earn. Reads three per-org endpoints (api/referral.js):
//   GET /referral/code    → { code, programmeName, rewardAmount, ... }
//   GET /referral/summary → { totalReferrals, pending, processing, rewarded, expired }
//   GET /referral/list    → paginated { content, totalPages, ... }
// When the org has no programme these 404 ("not available for your
// organisation") — we show a friendly empty state instead of an error.
import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import Header from 'components/header';
import { navigateBack } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { GlobalStatusBar } from 'config/statusBar';
import { getReferralCode, getReferralSummary, getReferralList } from 'api/referral';
import { formatAmount, formatDate } from 'helper';
import { brand } from 'config/brand';

export default function Referral() {
  const { colors, shadows, isDark } = useTheme();
  const { t } = useTranslation();

  const {
    data: codeData,
    isLoading: codeLoading,
    isError: codeError,
    error: codeErr,
    refetch: refetchCode,
  } = useQuery({
    queryKey: ['referralCode'],
    queryFn: async () => {
      const r = await getReferralCode();
      if (!r.ok) throw new Error(r.message);
      return r.data?.data ?? r.data;
    },
    retry: false,
  });

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['referralSummary'],
    queryFn: async () => {
      const r = await getReferralSummary();
      if (!r.ok) throw new Error(r.message);
      return r.data?.data ?? r.data;
    },
    retry: false,
  });

  const {
    data: listData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isRefetching: listRefetching,
    refetch: refetchList,
  } = useInfiniteQuery({
    queryKey: ['referralList'],
    queryFn: async ({ pageParam = 0 }) => {
      const r = await getReferralList({ page: pageParam, size: 20 });
      if (!r.ok) throw new Error(r.message);
      return r.data?.data ?? r.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.totalPages ?? 0;
      return allPages.length < total ? allPages.length : undefined;
    },
    retry: false,
  });

  const referrals = listData?.pages?.flatMap((pg) => pg?.content ?? []) ?? [];
  const code = codeData?.code;

  const refetchAll = () => {
    refetchCode();
    refetchSummary();
    refetchList();
  };

  // Status pill classes — the *-soft background with its matching text token.
  const statusPill = (status) => {
    const s = String(status ?? '').toUpperCase();
    if (['REWARDED', 'APPROVED', 'COMPLETED', 'PAID', 'SUCCESS'].includes(s))
      return { bg: 'bg-success-soft', text: 'text-on-success-soft' };
    if (['EXPIRED', 'REJECTED', 'CANCELLED', 'FAILED'].includes(s))
      return { bg: 'bg-danger-soft', text: 'text-on-danger-soft' };
    return { bg: 'bg-warning-soft', text: 'text-on-warning-soft' }; // pending / processing / unknown
  };

  const handleCopy = async () => {
    if (!code) return;
    await Clipboard.setStringAsync(String(code));
    Toast.show({ type: 'success', text1: t('referral.copied') });
  };

  const handleShare = async () => {
    if (!code) return;
    try {
      await Share.share({
        message: t('referral.shareMessage', {
          programme: codeData?.programmeName || brand.appName,
          code,
        }),
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  // ── Header block (code card + summary) rendered above the referrals list ──
  const ListHeader = () => (
    <View>
      {/* Referral code card */}
      <View className="mb-6 rounded-3xl bg-primary p-5" style={shadows.md}>
        <Text className="text-xs text-on-primary/80">
          {codeData?.programmeName || t('referral.codeTitle')}
        </Text>
        <Text className="mt-1 text-sm text-on-primary/90">
          {codeData?.rewardAmount > 0
            ? t('referral.earn', { amount: formatAmount(codeData.rewardAmount) })
            : t('referral.earnGeneric')}
        </Text>

        <View className="mt-4 flex-row items-center justify-between rounded-2xl bg-on-primary/15 px-4 py-3">
          <Text className="text-xl font-bold tracking-widest text-on-primary" numberOfLines={1}>
            {code || '—'}
          </Text>
          <TouchableOpacity onPress={handleCopy} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="copy-outline" size={22} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={handleShare}
          activeOpacity={0.85}
          className="mt-4 flex-row items-center justify-center rounded-xl bg-card py-3">
          <Ionicons name="share-social-outline" size={18} color={colors.primary} />
          <Text className="ml-2 text-[15px] font-semibold text-primary">{t('referral.share')}</Text>
        </TouchableOpacity>
      </View>

      {/* Overview / summary */}
      {!!summary && (
        <View className="mb-6">
          <Text className="mb-3 text-[17px] font-bold text-ink">{t('referral.overviewTitle')}</Text>
          <View className="flex-row flex-wrap" style={{ gap: 10 }}>
            {[
              { key: 'statTotal', value: summary.totalReferrals, className: 'text-primary' },
              { key: 'statPending', value: summary.pending, className: 'text-warning' },
              { key: 'statProcessing', value: summary.processing, className: 'text-warning' },
              { key: 'statRewarded', value: summary.rewarded, className: 'text-success' },
              { key: 'statExpired', value: summary.expired, className: 'text-danger' },
            ].map((s) => (
              <View
                key={s.key}
                className="rounded-2xl border border-line bg-card px-4 py-3"
                style={{ minWidth: '30%', flexGrow: 1 }}>
                <Text className={`text-lg font-bold ${s.className}`}>{s.value ?? 0}</Text>
                <Text className="text-xs text-ink-muted">{t(`referral.${s.key}`)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text className="mb-3 text-[17px] font-bold text-ink">{t('referral.listTitle')}</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    // Shape per swagger: { uuid, name, status, joinedAt, qualifiedAt }.
    const name = item?.name || t('referral.unknownReferral');
    const status = item?.status;
    const date = item?.joinedAt ?? item?.qualifiedAt;
    const pill = statusPill(status);
    return (
      <View className="mb-3 flex-row items-center rounded-2xl border border-line bg-card px-4 py-3.5">
        <View className="mr-3 h-10 w-10 items-center justify-center rounded-xl bg-primary-light">
          <Ionicons name="person-outline" size={20} color={colors.primary} />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-semibold text-ink" numberOfLines={1}>
            {name}
          </Text>
          {!!date && (
            <Text className="mt-0.5 text-xs text-ink-muted">
              {t('referral.referredOn', { date: formatDate(date) })}
            </Text>
          )}
        </View>
        {!!status && (
          <View className={`rounded-full px-3 py-1.5 ${pill.bg}`}>
            <Text className={`text-xs font-semibold ${pill.text}`}>{status}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <GlobalStatusBar style={isDark ? 'light-content' : 'dark-content'} />
      <Header
        title={t('referral.title')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.ink}
        leftIconColor={colors.ink}
      />

      {codeLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="mt-4 text-sm text-ink-muted">{t('referral.loading')}</Text>
        </View>
      ) : codeError ? (
        // 404 "not available for your organisation" (or any load failure).
        <View className="flex-1 items-center justify-center px-8">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary-light">
            <Ionicons name="gift-outline" size={32} color={colors.primary} />
          </View>
          <Text className="mt-4 text-center text-[17px] font-bold text-ink">
            {t('referral.unavailableTitle')}
          </Text>
          <Text className="mt-1 text-center text-sm text-ink-muted">
            {codeErr?.message || t('referral.unavailableSub')}
          </Text>
          <TouchableOpacity
            onPress={refetchAll}
            className="mt-5 rounded-full border border-line bg-card px-5 py-2.5">
            <Text className="text-sm font-semibold text-primary">{t('referral.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={referrals}
          keyExtractor={(item, index) => String(item?.uuid ?? index)}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={listRefetching && !isFetchingNextPage}
              onRefresh={refetchAll}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListEmptyComponent={
            <View className="items-center py-10">
              <Ionicons name="people-outline" size={36} color={colors.inkSoft} />
              <Text className="mt-3 text-center text-sm text-ink-muted">{t('referral.empty')}</Text>
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}
