import React, { useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Transaction } from '@/src/types/transaction';
import { TransactionItem } from '@/src/components/transaction/TransactionItem';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  onItemPress?: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  isLoading = false,
  onLoadMore,
  emptyMessage,
  onItemPress,
}: TransactionListProps) {
  const { t } = useTranslation();

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem transaction={item} onPress={onItemPress} />
    ),
    [onItemPress],
  );

  const keyExtractor = useCallback((item: Transaction) => item.id, []);

  const renderSeparator = useCallback(
    () => <View className="h-px bg-border mx-1" />,
    [],
  );

  const renderEmpty = useCallback(
    () => (
      <View className="items-center justify-center py-24 px-8">
        <MaterialCommunityIcons
          name="receipt"
          size={80}
          color="#e5e5d8"
        />
        <Text className="text-[20px] font-sans-semibold text-text-secondary mt-6 text-center" style={{ lineHeight: 28 }}>
          {emptyMessage ?? t('history.emptyState')}
        </Text>
        <Text className="text-[15px] font-sans text-text-secondary mt-2.5 text-center" style={{ lineHeight: 22 }}>
          {t('dashboard.noTransactionsHint')}
        </Text>
      </View>
    ),
    [emptyMessage, t],
  );

  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    return (
      <View className="py-5 items-center">
        <ActivityIndicator size="small" color="#FFD600" />
      </View>
    );
  }, [isLoading]);

  return (
    <FlatList
      data={transactions}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ItemSeparatorComponent={renderSeparator}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 24 }}
    />
  );
}
