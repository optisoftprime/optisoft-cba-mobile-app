// screens/Support.jsx  →  Support tab: "My Tickets" list (the support hub)
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Header from 'components/header';
import EmptyState from 'components/EmptyState';
import { navigateTo } from 'app/navigate';
import { useTheme } from 'config/ThemeContext';
import { LIMIT } from 'config/backendConfig';
import { getTickets } from 'api/support';

// ─── Status / priority visual styling ─────────────────────────────────────────
// Status pills use the theme's status tokens (`bg` / `fg` are class names);
// priority returns a real colour because it also tints an icon.

function statusStyle(status, t) {
  switch (String(status || '').toUpperCase()) {
    case 'OPEN':
      return { bg: 'bg-info-soft', fg: 'text-on-info-soft', label: t('support.statusOpen') };
    case 'IN_PROGRESS':
    case 'IN PROGRESS':
      return {
        bg: 'bg-warning-soft',
        fg: 'text-on-warning-soft',
        label: t('support.statusInProgress'),
      };
    case 'RESOLVED':
      return {
        bg: 'bg-success-soft',
        fg: 'text-on-success-soft',
        label: t('support.statusResolved'),
      };
    case 'CLOSED':
      return { bg: 'bg-card-muted', fg: 'text-ink-muted', label: t('support.statusClosed') };
    default:
      return {
        bg: 'bg-card-muted',
        fg: 'text-ink-muted',
        label: status || t('support.statusUnknown'),
      };
  }
}

function priorityStyle(priority, t, colors) {
  switch (String(priority || '').toUpperCase()) {
    case 'LOW':
      return { fg: colors.success, label: t('support.priorityLow') };
    case 'MEDIUM':
      return { fg: colors.info, label: t('support.priorityMedium') };
    case 'HIGH':
      return { fg: colors.warning, label: t('support.priorityHigh') };
    case 'CRITICAL':
      return { fg: colors.danger, label: t('support.priorityCritical') };
    default:
      return { fg: colors.inkMuted, label: priority || '—' };
  }
}

function formatWhen(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return (
    d.toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', hour12: true })
  );
}

// ─── Ticket card ──────────────────────────────────────────────────────────────

function TicketCard({ ticket, onPress }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const s = statusStyle(ticket.status, t);
  const p = priorityStyle(ticket.priority, t, colors);
  const title =
    ticket.subject?.trim() || ticket.ticketNumber?.trim() || t('support.untitledTicket');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="mb-3 rounded-2xl border border-line bg-card p-4">
      {/* Top row: title + status */}
      <View className="flex-row items-start justify-between">
        <Text className="flex-1 pr-3 text-[15px] font-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
        <View className={`rounded-full px-2.5 py-1 ${s.bg}`}>
          <Text className={`text-[11px] font-bold ${s.fg}`}>{s.label}</Text>
        </View>
      </View>

      {/* Ticket number */}
      {ticket.ticketNumber ? (
        <Text className="mt-1 text-xs text-ink-soft">{ticket.ticketNumber}</Text>
      ) : null}

      {/* Meta row: category · priority · date */}
      <View className="mt-3 flex-row items-center">
        {ticket.categoryName ? (
          <View className="flex-row items-center">
            <Ionicons name="pricetag-outline" size={13} color={colors.inkSoft} />
            <Text className="ml-1 text-xs text-ink-muted" numberOfLines={1}>
              {ticket.categoryName}
            </Text>
            <Text className="mx-2 text-xs text-line">|</Text>
          </View>
        ) : null}

        <Ionicons name="flag-outline" size={13} color={p.fg} />
        <Text className="ml-1 text-xs font-semibold" style={{ color: p.fg }}>
          {p.label}
        </Text>
      </View>

      {/* Footer: date + chevron */}
      <View className="mt-2 flex-row items-center justify-between">
        <Text className="text-[11px] text-ink-soft">{formatWhen(ticket.createdAt)}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Support() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['tickets'],
      queryFn: async ({ pageParam = 0 }) => {
        const response = await getTickets({ page: pageParam, size: LIMIT });
        if (!response?.ok) throw new Error(response?.message || 'Failed to load tickets');
        // data.data is the SpringPage; empty result is a valid (non-error) state.
        return response.data?.data ?? { content: [], last: true, number: pageParam };
      },
      initialPageParam: 0,
      getNextPageParam: (lastPage) => (lastPage?.last ? undefined : (lastPage?.number ?? 0) + 1),
      staleTime: 0,
    });

  // Refresh when returning to the tab (e.g. after creating a ticket).
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const tickets = useMemo(() => (data?.pages ?? []).flatMap((p) => p?.content ?? []), [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }) => (
      <TicketCard ticket={item} onPress={() => navigateTo('ticketDetail', { id: item.id })} />
    ),
    []
  );

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('support.title')}
        showLeftIcon={false}
        rightIcon="add-circle"
        showRightIcon
        rightIconColor={colors.primary}
        rightIconSize={28}
        onRightPress={() => navigateTo('createTicket')}
      />

      <View className="flex-1 px-4">
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24, flexGrow: 1 }}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching && !isFetchingNextPage}
              onRefresh={refetch}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            isLoading ? (
              <EmptyState
                title={t('support.loadingTitle')}
                subtitle={t('support.loadingSubtitle')}
                iconName="time-outline"
              />
            ) : (
              <View className="flex-1 items-center justify-center px-6" style={{ paddingTop: 40 }}>
                <EmptyState
                  title={t('support.emptyTitle')}
                  subtitle={t('support.emptySubtitle')}
                  iconName="ticket-outline"
                />
                <TouchableOpacity
                  onPress={() => navigateTo('createTicket')}
                  activeOpacity={0.85}
                  className="mt-4 flex-row items-center rounded-xl bg-primary px-5 py-3">
                  <Ionicons name="add" size={18} color={colors.onPrimary} />
                  <Text className="ml-1 text-sm font-semibold text-on-primary">
                    {t('support.createTicket')}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-4">
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : null
          }
        />
      </View>
    </View>
  );
}
