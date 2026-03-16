import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Avatar } from '@/src/components/ui/Avatar';
import { BalanceCard } from '@/src/components/balance/BalanceCard';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { TransactionItem } from '@/src/components/transaction/TransactionItem';
import { TransactionDetailSheet } from '@/src/components/transaction/TransactionDetailSheet';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { bankApi } from '@/src/services/api/bank';
import { transactionsApi } from '@/src/services/api/transactions';
import { haptics } from '@/src/utils/haptics';
import type { Transaction } from '@/src/types/transaction';

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bankName = useAuthStore((s) => s.bankName);
  const selectedChild = useSelectedChild();
  const transactions = useTransactionStore((s) => s.transactions);

  const token = useAuthStore((s) => s.token);
  const setChildren = useBankStore((s) => s.setChildren);
  const setSelectedChild = useBankStore((s) => s.setSelectedChild);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const recentTransactions = useMemo(() => {
    if (!selectedChild) return [];
    return transactions
      .filter((t) => t.childId === selectedChild.id)
      .slice(0, 5);
  }, [transactions, selectedChild]);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const childrenRes = await bankApi.getChildren();
      if (childrenRes.data?.length > 0) {
        setChildren(childrenRes.data);
        const currentChildId = useBankStore.getState().selectedChildId;
        const stillExists = childrenRes.data.some((c: any) => c.id === currentChildId);
        if (!currentChildId || !stillExists) {
          setSelectedChild(childrenRes.data[0].id);
        }
        const activeChildId = stillExists && currentChildId
          ? currentChildId
          : childrenRes.data[0].id;
        const txRes = await transactionsApi.getByChild(activeChildId);
        if (Array.isArray(txRes.data)) {
          useTransactionStore.setState({ transactions: txRes.data });
        }
      }
    } catch {
      // Silently handle -- data stays from store cache
    }
  }, [token, setChildren, setSelectedChild]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleTransactionPress = useCallback((tx: Transaction) => {
    haptics.selection();
    setSelectedTx(tx);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  return (
    <SafeArea>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#f5e63d"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Avatar */}
        <View className="flex-row items-center justify-between mb-9">
          <View className="flex-row items-center flex-1">
            {selectedChild && (
              <Pressable
                onPress={() => {
                  haptics.light();
                  router.push('/(modals)/avatar-picker');
                }}
              >
                <Avatar
                  avatarId={selectedChild.avatarUrl ?? undefined}
                  size="lg"
                />
              </Pressable>
            )}
            <View className="ml-4 flex-1">
              <Text className="text-[14px] font-sans-medium text-text-secondary">
                {bankName}
              </Text>
              {selectedChild && (
                <Text className="text-[26px] font-sans-bold text-text mt-0.5" style={{ lineHeight: 34 }}>
                  {t('dashboard.greeting', { name: selectedChild.name })}
                </Text>
              )}
            </View>
          </View>
          <Pressable
            onPress={() => {
              haptics.light();
              router.push('/(modals)/app-settings');
            }}
            className="rounded-full p-2.5"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialCommunityIcons name="dots-horizontal" size={26} color="#6b6b5a" />
          </Pressable>
        </View>

        {/* Balance Card */}
        {selectedChild && (
          <View className="mb-9">
            <BalanceCard child={selectedChild} />
          </View>
        )}

        {/* Quick Actions */}
        <View className="flex-row gap-3.5 mb-10">
          <View className="flex-1">
            <Button
              title={t('dashboard.withdraw')}
              onPress={() => router.push('/(modals)/withdraw')}
              variant="secondary"
              fullWidth
              icon="cash-minus"
            />
          </View>
          <View className="flex-1">
            <Button
              title={t('dashboard.seeAll')}
              onPress={() => router.push('/(tabs)/history')}
              variant="secondary"
              fullWidth
              icon="receipt"
            />
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-[22px] font-sans-bold text-text">
            {t('dashboard.lastTransactions')}
          </Text>
          {recentTransactions.length > 0 && (
            <Pressable
              onPress={() => router.push('/(tabs)/history')}
              hitSlop={8}
            >
              <Text className="text-[15px] font-sans-semibold text-primary-600">
                {t('dashboard.seeAll')}
              </Text>
            </Pressable>
          )}
        </View>

        {recentTransactions.length > 0 ? (
          <Card>
            {recentTransactions.map((tx, index) => (
              <View key={tx.id}>
                <TransactionItem
                  transaction={tx}
                  showIcon={false}
                  onPress={handleTransactionPress}
                />
                {index < recentTransactions.length - 1 && (
                  <View className="h-px bg-border mx-5" />
                )}
              </View>
            ))}
          </Card>
        ) : (
          <Card>
            <View className="items-center py-12">
              <MaterialCommunityIcons name="receipt" size={64} color="#e5e5d8" />
              <Text className="text-[18px] font-sans-semibold text-text-secondary mt-5">
                {t('dashboard.noTransactions')}
              </Text>
              <Text className="text-[15px] font-sans text-text-secondary mt-2">
                {t('dashboard.noTransactionsHint')}
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>

      {/* Detail Bottom Sheet */}
      <TransactionDetailSheet ref={bottomSheetRef} transaction={selectedTx} />
    </SafeArea>
  );
}
