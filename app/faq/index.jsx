// screens/FAQ.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { navigateBack } from 'app/navigate';
import Header from 'components/header';
import EmptyState from 'components/EmptyState';
import Dropdown from 'components/dropDown';
import { useTheme } from 'config/ThemeContext';
import { LIMIT } from 'config/backendConfig';
import { getFaqs, getFaqCategories } from 'api/support';

// ─── Debounce hook (same approach as the Saving Transactions search) ──────────

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Toolbar (search toggle + category filter) — mirrors the savings toolbar ──

function Toolbar({ filterLabel, onOpenFilter, searchValue, onSearchChange }) {
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
      <View className="mb-4 flex-row items-center gap-2 rounded-xl border border-primary bg-card px-3 py-2">
        <Ionicons name="search-outline" size={16} color={colors.inkSoft} />
        <TextInput
          ref={inputRef}
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={t('faq.searchPlaceholder')}
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
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="text-[17px] font-bold text-ink">{t('faq.browseTopics')}</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TouchableOpacity
          onPress={openSearch}
          className="h-9 w-9 items-center justify-center rounded-full border border-line bg-card">
          <Ionicons name="search-outline" size={20} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onOpenFilter}
          className="flex-row items-center gap-1 rounded-full bg-primary-light px-3 py-1.5"
          style={{ maxWidth: 180 }}>
          <Ionicons name="filter-outline" size={14} color={colors.primary} />
          <Text
            numberOfLines={1}
            className="text-xs font-semibold text-primary-dark"
            style={{ flexShrink: 1 }}>
            {filterLabel}
          </Text>
          <Text className="text-xs text-primary-dark">▾</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── FAQ accordion item ───────────────────────────────────────────────────────

function FaqItem({ item, expanded, onToggle }) {
  const { colors } = useTheme();
  return (
    <View className="mb-3">
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row items-center justify-between rounded-2xl border border-line bg-card px-4 py-3.5"
        activeOpacity={0.7}>
        <View className="flex-1 pr-3">
          {item.categoryName ? (
            <Text className="mb-1 text-[11px] font-semibold text-primary">{item.categoryName}</Text>
          ) : null}
          <Text className="text-[15px] font-semibold text-ink">{item.question}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.inkSoft}
        />
      </TouchableOpacity>

      {expanded && (
        <View className="mt-2 rounded-2xl border border-line bg-card-muted px-4 py-4">
          <Text className="text-sm leading-5 text-ink-muted">{item.answer}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FAQ() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All'); // 'All' | categoryId
  const [searchInput, setSearchInput] = useState('');

  const debouncedSearch = useDebounce(searchInput, 400);

  // ── Categories (plain array, feeds the filter dropdown) ─────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['faqCategories'],
    queryFn: async () => {
      const res = await getFaqCategories();
      if (res?.ok && Array.isArray(res.data?.data)) return res.data.data;
      return [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const categoryOptions = useMemo(
    () => [
      { label: t('faq.allCategories'), value: 'All' },
      ...categories.map((c) => ({ label: c.name, value: c.id })),
    ],
    [categories, t]
  );

  const selectedFilterLabel =
    categoryOptions.find((o) => o.value === selectedCategory)?.label ?? t('faq.allCategories');

  // ── FAQs (infinite scroll over the SpringPage) ──────────────────────────────
  const { data, isLoading, isRefetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['faqs', debouncedSearch, selectedCategory],
      queryFn: async ({ pageParam = 0 }) => {
        // LIMIT drives page size; the page number walks up from 0 as we scroll.
        const params = { page: pageParam, size: LIMIT };
        if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
        if (selectedCategory !== 'All') params.categoryId = selectedCategory;

        const response = await getFaqs(params);
        if (!response?.ok) throw new Error(response?.message || 'Failed to load FAQs');
        // data.data is the SpringPage; empty result is a valid (non-error) state.
        return response.data?.data ?? { content: [], last: true, number: pageParam };
      },
      initialPageParam: 0,
      // last === true means there is no further page. number is the 0-indexed
      // current page, so the next one is number + 1.
      getNextPageParam: (lastPage) => (lastPage?.last ? undefined : (lastPage?.number ?? 0) + 1),
      staleTime: 0,
    });

  const faqs = useMemo(() => (data?.pages ?? []).flatMap((p) => p?.content ?? []), [data]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleToggleItem = useCallback(
    (id) => setExpandedId((prev) => (prev === id ? null : id)),
    []
  );

  const renderItem = useCallback(
    ({ item }) => (
      <FaqItem
        item={item}
        expanded={expandedId === item.id}
        onToggle={() => handleToggleItem(item.id)}
      />
    ),
    [expandedId, handleToggleItem]
  );

  return (
    <View className="flex-1 bg-background">
      <Header
        title={t('faq.title')}
        onLeftPress={navigateBack}
        showLeftIcon={true}
        color={colors.textPrimary}
        leftIconColor={colors.textPrimary}
      />

      <View className="flex-1 px-4 pt-2">
        {/* Hidden dropdown — opened by the Toolbar filter button */}
        <Dropdown
          label={t('faq.filterLabel')}
          placeholder={t('faq.allCategories')}
          value={selectedCategory}
          options={categoryOptions}
          onSelect={(val) => setSelectedCategory(val)}
          isOpen={filterOpen}
          onToggle={() => setFilterOpen((prev) => !prev)}
          search={false}
          hideTrigger
        />

        <Toolbar
          filterLabel={selectedFilterLabel}
          onOpenFilter={() => setFilterOpen(true)}
          searchValue={searchInput}
          onSearchChange={setSearchInput}
        />

        <FlatList
          data={faqs}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24, flexGrow: 1 }}
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
                title={t('faq.loadingTitle')}
                subtitle={t('faq.loadingSubtitle')}
                iconName="time-outline"
              />
            ) : (
              <EmptyState
                title={t('faq.emptyTitle')}
                subtitle={
                  debouncedSearch.trim()
                    ? t('faq.noResults', { query: debouncedSearch.trim() })
                    : selectedCategory !== 'All'
                      ? t('faq.noInCategory', { category: selectedFilterLabel })
                      : t('faq.emptyDefault')
                }
                iconName="help-circle-outline"
              />
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
