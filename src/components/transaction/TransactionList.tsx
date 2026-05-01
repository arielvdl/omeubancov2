import React, { useCallback } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Transaction } from '@/src/types/transaction';
import { TransactionItem } from '@/src/components/transaction/TransactionItem';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { useNetworkStore } from '@/src/stores/useNetworkStore';

interface TransactionListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onLoadMore?: () => void;
  emptyMessage?: string;
  onItemPress?: (transaction: Transaction) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function TransactionList({
  transactions,
  isLoading = false,
  onLoadMore,
  emptyMessage,
  onItemPress,
  refreshing = false,
  onRefresh,
}: TransactionListProps) {
  const { t } = useTranslation();
  const online = useNetworkStore((s) => s.online);

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

  const renderEmpty = useCallback(() => {
    if (!online) {
      return (
        <View className="py-12 px-4">
          <EmptyState
            variant="offline"
            title={t('network.offline', 'Sem conexão com a internet')}
            hint={t('network.offlineHint', 'Verifique sua conexão e tente novamente.')}
            actionLabel={onRefresh ? t('common.retry', 'Tentar novamente') : undefined}
            onAction={onRefresh}
          />
        </View>
      );
    }
    return (
      <View className="py-12 px-4">
        <EmptyState
          icon="receipt"
          title={emptyMessage ?? t('history.emptyState')}
          hint={t('dashboard.noTransactionsHint')}
        />
      </View>
    );
  }, [emptyMessage, t, online, onRefresh]);

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
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD600"
            colors={['#FFD600']}
          />
        ) : undefined
      }
    />
  );
}
