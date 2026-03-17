import React, { useMemo } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { BalanceDisplay } from '@/src/components/balance/BalanceDisplay';
import { BalanceLineChart } from '@/src/components/stats/BalanceLineChart';
import { FlowComparison } from '@/src/components/stats/FlowComparison';
import { CategoryBreakdown } from '@/src/components/stats/CategoryBreakdown';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import type { Transaction } from '@/src/types/transaction';

function buildBalanceHistory(transactions: Transaction[]): { date: string; balance: number }[] {
  if (transactions.length === 0) return [];

  // Transactions are newest first — reverse for chronological order
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return sorted.map((tx) => ({
    date: tx.createdAt,
    balance: tx.balanceAfter,
  }));
}

function getCategoryTotals(transactions: Transaction[], type: 'withdrawal' | 'deposit') {
  const map = new Map<string, number>();
  for (const tx of transactions) {
    const txType = tx.type === 'scheduled' ? 'deposit' : tx.type;
    if (txType !== type) continue;
    const prev = map.get(tx.category) ?? 0;
    map.set(tx.category, prev + tx.amount);
  }
  return Array.from(map, ([category, total]) => ({ category, total }));
}

export default function BalanceStatsScreen() {
  const { t } = useTranslation();
  const { width: screenWidth } = useWindowDimensions();
  const selectedChild = useSelectedChild();
  const allTransactions = useTransactionStore((s) => s.transactions);

  const childTransactions = useMemo(() => {
    if (!selectedChild) return [];
    return allTransactions.filter((tx) => tx.childId === selectedChild.id);
  }, [allTransactions, selectedChild]);

  const balanceHistory = useMemo(
    () => buildBalanceHistory(childTransactions),
    [childTransactions],
  );

  const { totalIn, totalOut } = useMemo(() => {
    let inn = 0;
    let out = 0;
    for (const tx of childTransactions) {
      if (tx.type === 'withdrawal') out += tx.amount;
      else inn += tx.amount;
    }
    return { totalIn: inn, totalOut: out };
  }, [childTransactions]);

  const withdrawalCategories = useMemo(
    () => getCategoryTotals(childTransactions, 'withdrawal'),
    [childTransactions],
  );

  const depositCategories = useMemo(
    () => getCategoryTotals(childTransactions, 'deposit'),
    [childTransactions],
  );

  const peakBalance = useMemo(() => {
    if (balanceHistory.length === 0) return 0;
    return Math.max(...balanceHistory.map((p) => p.balance));
  }, [balanceHistory]);

  const chartWidth = screenWidth - 104;

  if (!selectedChild) return null;

  return (
    <SafeArea>
      <Header title={t('stats.title')} showBack />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Current balance summary */}
        <Card>
          <View className="items-center py-2">
            <Text className="text-[13px] font-sans-medium text-text-secondary mb-1">
              {t('stats.currentBalance')}
            </Text>
            <BalanceDisplay balance={selectedChild.balance} size="lg" />
            {peakBalance > 0 && (
              <View className="flex-row items-center mt-2">
                <MaterialCommunityIcons
                  name="trophy-outline"
                  size={16}
                  color="#f59e0b"
                />
                <Text className="text-[12px] font-sans text-text-secondary ml-1">
                  {t('stats.peakBalance')}: {formatSimple(peakBalance)}
                </Text>
              </View>
            )}
          </View>
        </Card>

        {/* Balance evolution */}
        <Text className="text-[18px] font-sans-bold text-text mt-8 mb-4">
          {t('stats.evolution')}
        </Text>
        <Card>
          {balanceHistory.length >= 2 ? (
            <BalanceLineChart
              data={balanceHistory}
              width={chartWidth}
              height={240}
            />
          ) : (
            <View className="items-center py-10">
              <MaterialCommunityIcons name="chart-line" size={48} color="#e5e5d8" />
              <Text className="text-[14px] font-sans text-text-secondary mt-3">
                {t('stats.needMoreData')}
              </Text>
            </View>
          )}
        </Card>

        {/* Flow comparison */}
        <Text className="text-[18px] font-sans-bold text-text mt-8 mb-4">
          {t('stats.moneyFlow')}
        </Text>
        <Card>
          <FlowComparison
            totalIn={totalIn}
            totalOut={totalOut}
            width={chartWidth}
          />
        </Card>

        {/* Withdrawal categories */}
        {withdrawalCategories.length > 0 && (
          <>
            <Text className="text-[18px] font-sans-bold text-text mt-8 mb-4">
              {t('stats.spentOn')}
            </Text>
            <Card>
              <CategoryBreakdown data={withdrawalCategories} size={180} />
            </Card>
          </>
        )}

        {/* Deposit categories */}
        {depositCategories.length > 0 && (
          <>
            <Text className="text-[18px] font-sans-bold text-text mt-8 mb-4">
              {t('stats.receivedFrom')}
            </Text>
            <Card>
              <CategoryBreakdown data={depositCategories} size={180} />
            </Card>
          </>
        )}
      </ScrollView>
    </SafeArea>
  );
}

function formatSimple(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
