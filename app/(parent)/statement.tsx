import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { TransactionList } from '@/src/components/transaction/TransactionList';
import { useBankStore } from '@/src/stores/useBankStore';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import { useCurrency } from '@/src/hooks/useCurrency';

export default function StatementScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format } = useCurrency();
  const children = useBankStore((s) => s.children);
  const allTransactions = useTransactionStore((s) => s.transactions);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children[0]?.id ?? null,
  );

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const transactions = useMemo(() => {
    if (!selectedChildId) return [];
    return allTransactions.filter((tx) => tx.childId === selectedChildId);
  }, [selectedChildId, allTransactions]);

  const totals = useMemo(() => {
    if (!selectedChildId) return { totalIn: 0, totalOut: 0 };
    const childTx = allTransactions.filter((tx) => tx.childId === selectedChildId);
    const totalIn = childTx
      .filter((tx) => tx.type === 'deposit' || tx.type === 'scheduled')
      .reduce((sum, tx) => sum + tx.amount, 0);
    const totalOut = childTx
      .filter((tx) => tx.type === 'withdrawal')
      .reduce((sum, tx) => sum + tx.amount, 0);
    return { totalIn, totalOut };
  }, [selectedChildId, allTransactions]);

  return (
    <SafeArea>
      <Header title={t('parent.statement')} showBack onBack={() => router.back()} />

      {/* Child Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-6 mb-5">
        <View className="flex-row gap-3">
          {children.map((child) => {
            const isSelected = child.id === selectedChildId;
            return (
              <Pressable
                key={child.id}
                onPress={() => setSelectedChildId(child.id)}
                className={`flex-row items-center px-5 py-2.5 rounded-full ${
                  isSelected ? 'bg-primary' : 'bg-surface'
                }`}
                style={!isSelected ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                } : undefined}
              >
                <Avatar avatarId={child.avatarUrl ?? undefined} size="sm" />
                <Text
                  className={`text-sm font-sans-medium ml-2 ${
                    isSelected ? 'text-text' : 'text-text-secondary'
                  }`}
                >
                  {child.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Summary */}
      {selectedChild && (
        <View className="px-6 mb-5">
          <Card>
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
              <View className="w-px bg-border" />
              <View className="flex-1 items-center">
                <Text className="text-xs font-sans text-text-secondary">
                  {t('dashboard.balance')}
                </Text>
                <Text className="text-base font-sans-bold text-text">
                  {format(selectedChild.balance)}
                </Text>
              </View>
            </View>
          </Card>
        </View>
      )}

      {/* Transaction List */}
      <View className="flex-1">
        <TransactionList
          transactions={transactions}
          emptyMessage={t('history.emptyState')}
        />
      </View>
    </SafeArea>
  );
}
