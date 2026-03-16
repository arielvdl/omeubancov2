import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { BalanceDisplay } from '@/src/components/balance/BalanceDisplay';
import { TransactionList } from '@/src/components/transaction/TransactionList';
import { TransactionDetailSheet } from '@/src/components/transaction/TransactionDetailSheet';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { transactionsApi } from '@/src/services/api/transactions';
import { useCurrency } from '@/src/hooks/useCurrency';
import { haptics } from '@/src/utils/haptics';
import { CATEGORIES } from '@/src/constants/categories';
import type { Transaction, TransactionType, TransactionCategory } from '@/src/types/transaction';

type FilterType = 'all' | 'deposit' | 'withdrawal';

interface FilterChip {
  key: FilterType;
  labelKey: string;
}

const TYPE_FILTERS: FilterChip[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'deposit', labelKey: 'history.deposit' },
  { key: 'withdrawal', labelKey: 'history.withdrawal' },
];

export default function HistoryScreen() {
  const { t } = useTranslation();
  const selectedChild = useSelectedChild();
  const allTransactions = useTransactionStore((s) => s.transactions);
  const isLoading = useTransactionStore((s) => s.isLoading);
  const setLoading = useTransactionStore((s) => s.setLoading);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    if (!selectedChild) return;
    let cancelled = false;

    async function fetchTransactions() {
      setLoading(true);
      try {
        const res = await transactionsApi.getByChild(selectedChild!.id);
        if (!cancelled && Array.isArray(res.data)) {
          useTransactionStore.setState({ transactions: res.data });
        }
      } catch {
        // Keep existing store data on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTransactions();
    return () => { cancelled = true; };
  }, [selectedChild?.id, setLoading]);

  const transactions = useMemo(() => {
    if (!selectedChild) return [];
    let filtered = allTransactions.filter((tx) => tx.childId === selectedChild.id);

    if (activeFilter !== 'all') {
      filtered = filtered.filter((tx) => tx.type === activeFilter);
    }

    if (activeCategory !== 'all') {
      filtered = filtered.filter((tx) => tx.category === activeCategory);
    }

    if (searchText.trim()) {
      const query = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (tx) =>
          (tx.description && tx.description.toLowerCase().includes(query)) ||
          t(`categories.${tx.category}`).toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [allTransactions, selectedChild, activeFilter, activeCategory, searchText, t]);

  const { format } = useCurrency();

  const totals = useMemo(() => {
    if (!selectedChild) return { totalIn: 0, totalOut: 0 };
    const childTx = allTransactions.filter((tx) => tx.childId === selectedChild.id);
    const totalIn = childTx
      .filter((tx) => tx.type === 'deposit' || tx.type === 'scheduled')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalOut = childTx
      .filter((tx) => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { totalIn, totalOut };
  }, [allTransactions, selectedChild]);

  const handleFilterPress = useCallback((filter: FilterType) => {
    haptics.selection();
    setActiveFilter(filter);
  }, []);

  const handleCategoryPress = useCallback((category: string) => {
    haptics.selection();
    setActiveCategory(category);
  }, []);

  const handleTransactionPress = useCallback((tx: Transaction) => {
    haptics.selection();
    setSelectedTx(tx);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const hasActiveFilters = activeFilter !== 'all' || activeCategory !== 'all' || searchText.trim().length > 0;

  return (
    <SafeArea>
      <Header title={t('history.title')} />

      {/* Balance Summary */}
      {selectedChild && (
        <View className="px-6 mb-5">
          <Card>
            <View className="items-center mb-4">
              <Text className="text-[14px] font-sans-medium text-text-secondary mb-1">
                {t('dashboard.currentBalance', { defaultValue: 'Saldo atual' })}
              </Text>
              <BalanceDisplay balance={selectedChild.balance} size="lg" />
            </View>
            <View className="flex-row justify-between">
              <View className="flex-1 items-center">
                <Text className="text-xs font-sans text-text-secondary">
                  {t('history.deposit')}
                </Text>
                <Text className="text-base font-sans-bold text-success">
                  +{format(totals.totalIn)}
                </Text>
              </View>
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-xs font-sans text-text-secondary">
                  {t('history.withdrawal')}
                </Text>
                <Text className="text-base font-sans-bold text-danger">
                  -{format(totals.totalOut)}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Search */}
      <View className="px-6 mb-4">
        <View className="flex-row items-center bg-surface rounded-2xl px-4 py-3"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <MaterialCommunityIcons name="magnify" size={20} color="#9ca3af" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={t('history.search')}
            placeholderTextColor="#9ca3af"
            className="flex-1 ml-3 text-[15px] font-sans text-text"
            style={{ padding: 0 }}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText('')} hitSlop={8}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Type Filters */}
      <View className="flex-row gap-3 px-6 mb-3">
        {TYPE_FILTERS.map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <Pressable
              key={filter.key}
              onPress={() => handleFilterPress(filter.key)}
              className={`px-5 py-2.5 rounded-full ${
                isActive ? 'bg-primary' : 'bg-surface'
              }`}
              style={!isActive ? {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 8,
                elevation: 2,
              } : undefined}
            >
              <Text
                className={`text-[14px] font-sans-semibold ${
                  isActive ? 'text-text' : 'text-text-secondary'
                }`}
              >
                {t(filter.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Category Filters */}
      <View className="mb-4">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24, gap: 8 }}
        >
          <Pressable
            onPress={() => handleCategoryPress('all')}
            className={`px-4 py-2 rounded-full ${
              activeCategory === 'all' ? 'bg-text' : 'bg-surface'
            }`}
            style={activeCategory !== 'all' ? {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.04,
              shadowRadius: 6,
              elevation: 1,
            } : undefined}
          >
            <Text
              className={`text-[13px] font-sans-semibold ${
                activeCategory === 'all' ? 'text-white' : 'text-text-secondary'
              }`}
            >
              {t('history.allCategories')}
            </Text>
          </Pressable>
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => handleCategoryPress(cat.key)}
                className={`flex-row items-center gap-1.5 px-4 py-2 rounded-full ${
                  isActive ? 'bg-text' : 'bg-surface'
                }`}
                style={!isActive ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.04,
                  shadowRadius: 6,
                  elevation: 1,
                } : undefined}
              >
                <MaterialCommunityIcons
                  name={cat.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={14}
                  color={isActive ? '#ffffff' : cat.color}
                />
                <Text
                  className={`text-[13px] font-sans-semibold ${
                    isActive ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {t(`categories.${cat.key}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Pressable
          onPress={() => {
            setActiveFilter('all');
            setActiveCategory('all');
            setSearchText('');
            haptics.selection();
          }}
          className="flex-row items-center justify-center gap-1.5 mb-3"
        >
          <MaterialCommunityIcons name="filter-remove-outline" size={16} color="#9ca3af" />
          <Text className="text-[13px] font-sans-medium text-text-secondary">
            {t('history.clearFilters')}
          </Text>
        </Pressable>
      )}

      {/* Transaction List */}
      <View className="flex-1">
        <TransactionList
          transactions={transactions}
          isLoading={isLoading}
          emptyMessage={
            hasActiveFilters
              ? t('history.emptyStateFiltered')
              : t('history.emptyState')
          }
          onItemPress={handleTransactionPress}
        />
      </View>

      {/* Detail Bottom Sheet */}
      <TransactionDetailSheet ref={bottomSheetRef} transaction={selectedTx} />
    </SafeArea>
  );
}
