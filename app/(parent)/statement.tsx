import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import BottomSheet from '@gorhom/bottom-sheet';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { TransactionList } from '@/src/components/transaction/TransactionList';
import { TransactionDetailSheet } from '@/src/components/transaction/TransactionDetailSheet';
import { useBankStore } from '@/src/stores/useBankStore';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import { useCurrency } from '@/src/hooks/useCurrency';
import { haptics } from '@/src/utils/haptics';
import type { Transaction } from '@/src/types/transaction';

const BAR_MAX_HEIGHT = 160;

function ChildBalanceChart({
  children,
  selectedChildId,
  onSelect,
  format,
}: {
  children: { id: string; balance: number; avatarUrl?: string | null }[];
  selectedChildId: string | null;
  onSelect: (id: string) => void;
  format: (cents: number) => string;
}) {
  const maxBalance = Math.max(...children.map((c) => c.balance), 1);

  return (
    <View style={{ height: 220 }} className="px-4 pb-4 pt-2 items-center justify-end">
      <View className="flex-row items-end justify-center gap-6 flex-1 w-full">
        {children.map((child) => {
          const isSelected = child.id === selectedChildId;
          const barHeight = Math.max((child.balance / maxBalance) * BAR_MAX_HEIGHT, 8);

          return (
            <Pressable
              key={child.id}
              onPress={() => onSelect(child.id)}
              className="items-center"
              style={{ opacity: isSelected ? 1 : 0.45 }}
            >
              {/* Balance label */}
              <Text className="text-[11px] font-sans-semibold text-text mb-1">
                {format(child.balance)}
              </Text>
              {/* Bar */}
              <View
                style={{
                  width: 48,
                  height: barHeight,
                  backgroundColor: '#FFD600',
                  borderRadius: 10,
                  borderBottomLeftRadius: 4,
                  borderBottomRightRadius: 4,
                }}
              />
              {/* Avatar at base */}
              <View className="mt-2">
                <Avatar avatarId={child.avatarUrl ?? undefined} size="sm" />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function StatementScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format } = useCurrency();
  const children = useBankStore((s) => s.children);
  const allTransactions = useTransactionStore((s) => s.transactions);

  const [selectedChildId, setSelectedChildId] = useState<string | null>(
    children[0]?.id ?? null,
  );
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const handleTransactionPress = useCallback((tx: Transaction) => {
    haptics.selection();
    setSelectedTx(tx);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

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

      {/* Balance comparison chart */}
      {children.length > 0 && (
        <View className="px-6 mb-5">
          <Card>
            <ChildBalanceChart
              children={children}
              selectedChildId={selectedChildId}
              onSelect={setSelectedChildId}
              format={format}
            />
          </Card>
        </View>
      )}

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
          onItemPress={handleTransactionPress}
        />
      </View>

      {/* Detail Bottom Sheet */}
      <TransactionDetailSheet ref={bottomSheetRef} transaction={selectedTx} />
    </SafeArea>
  );
}
