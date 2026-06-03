import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
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
import { GoalStack } from '@/src/components/wishlist/GoalProgressCard';
import { useWishlistStore } from '@/src/stores/useWishlistStore';
import { wishlistApi } from '@/src/services/api/wishlist';
import { useNetworkStore } from '@/src/stores/useNetworkStore';
import { EmptyState } from '@/src/components/ui/EmptyState';
import { withRetry } from '@/src/utils/withRetry';
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

  const wishItems = useWishlistStore((s) => s.items);
  const setWishItems = useWishlistStore((s) => s.setItems);

  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const online = useNetworkStore((s) => s.online);
  const prevOnline = useRef(online);


  const recentTransactions = useMemo(() => {
    if (!selectedChild) return [];
    return transactions
      .filter((t) => t.childId === selectedChild.id)
      .slice(0, 5);
  }, [transactions, selectedChild]);

  const fetchChildren = useCallback(async () => {
    if (!token) return;
    try {
      // withRetry survives the iOS cold-boot network race (adapter reported up
      // before it's routable) instead of failing the single mount fetch and
      // leaving the dashboard half-rendered with no child selected.
      const childrenRes = await withRetry(() => bankApi.getChildren());
      if (childrenRes.data?.length > 0) {
        setChildren(childrenRes.data);
        const currentChildId = useBankStore.getState().selectedChildId;
        const stillExists = childrenRes.data.some((c: any) => c.id === currentChildId);
        if (!currentChildId || !stillExists) {
          setSelectedChild(childrenRes.data[0].id);
        }
      }
      setLoadError(false);
    } catch {
      // Surface a retry affordance instead of a silently broken screen. Any
      // existing store cache stays put.
      setLoadError(true);
    }
  }, [token, setChildren, setSelectedChild]);

  // Re-fetch on every focus (cold boot, tab switch) so a failed first hydration
  // self-heals without a force-quit — mirrors history.tsx.
  useFocusEffect(
    useCallback(() => {
      fetchChildren();
    }, [fetchChildren])
  );

  // When connectivity resolves after a cold-boot race, re-fetch if we still
  // have no child. NetInfo flips `online` once the link is actually routable.
  useEffect(() => {
    const cameOnline = online && !prevOnline.current;
    prevOnline.current = online;
    if (cameOnline && !selectedChild) {
      fetchChildren();
    }
  }, [online, selectedChild, fetchChildren]);

  // Fetch transactions whenever the selected child changes
  useEffect(() => {
    if (!selectedChild) return;
    let cancelled = false;

    async function fetchData() {
      try {
        const [txRes, wishRes] = await Promise.all([
          transactionsApi.getByChild(selectedChild!.id),
          wishlistApi.getByChild(selectedChild!.id),
        ]);
        if (!cancelled) {
          if (Array.isArray(txRes.data)) {
            useTransactionStore.setState({ transactions: txRes.data });
          }
          if (Array.isArray(wishRes.data?.data)) {
            setWishItems(wishRes.data.data);
          }
        }
      } catch {
        // Keep existing store data on failure
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [selectedChild?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChildren();
    if (selectedChild) {
      try {
        const [txRes, wishRes] = await Promise.all([
          transactionsApi.getByChild(selectedChild.id),
          wishlistApi.getByChild(selectedChild.id),
        ]);
        if (Array.isArray(txRes.data)) {
          useTransactionStore.setState({ transactions: txRes.data });
        }
        if (Array.isArray(wishRes.data?.data)) {
          setWishItems(wishRes.data.data);
        }
      } catch {
        // Keep existing data
      }
    }
    setRefreshing(false);
  }, [fetchChildren, selectedChild, setWishItems]);

  const handleTransactionPress = useCallback((tx: Transaction) => {
    haptics.selection();
    setSelectedTx(tx);
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  // Cold-boot guard: token present but no child resolved yet (hydration still
  // pending or a network race failed the fetch). Show an explicit loading /
  // retry state instead of the half-empty dashboard that looked "broken".
  if (token && !selectedChild) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          {loadError ? (
            <EmptyState
              variant={online ? 'error' : 'offline'}
              title={t('dashboard.loadErrorTitle', 'Não foi possível carregar sua conta')}
              hint={t('dashboard.loadErrorHint', 'Verifique sua conexão e toque para tentar de novo.')}
              actionLabel={t('common.retry', 'Tentar novamente')}
              onAction={fetchChildren}
            />
          ) : (
            <ActivityIndicator size="large" color="#FFD600" />
          )}
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFD600"
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
            <BalanceCard
              child={selectedChild}
              transactions={recentTransactions.length > 0 ? transactions.filter((t) => t.childId === selectedChild.id) : undefined}
              onMeterPress={() => {
                haptics.light();
                router.push('/(modals)/balance-stats');
              }}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View className="mb-10">
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              haptics.light();
              router.push('/(modals)/withdraw');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 18,
              borderRadius: 16,
              backgroundColor: '#16a34a',
              borderBottomWidth: 6,
              borderBottomColor: '#0f6b2f',
              shadowColor: 'transparent',
              shadowOpacity: 0,
              elevation: 0,
            }}
          >
            <MaterialCommunityIcons name="cash-minus" size={22} color="#ffffff" />
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#ffffff', marginLeft: 10 }}>
              {t('dashboard.withdraw')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Goal Wallet Stack — Apple Wallet style */}
        {selectedChild && wishItems.filter((i) => i.childId === selectedChild.id && i.status === 'active' && i.priceCents != null && i.priceCents > 0).length > 0 && (
          <View className="mb-8">
            <GoalStack
              items={wishItems.filter((i) => i.childId === selectedChild.id)}
              balance={selectedChild.balance}
              childId={selectedChild.id}
              onItemPress={(item) => {
                haptics.light();
                router.push({ pathname: '/(modals)/wish-detail', params: { id: item.id } });
              }}
            />
          </View>
        )}

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
        ) : !online ? (
          <Card>
            <EmptyState
              variant="offline"
              title={t('network.offline', 'Sem conexão com a internet')}
              hint={t('network.offlineHint', 'Verifique sua conexão e tente novamente.')}
              actionLabel={t('common.retry', 'Tentar novamente')}
              onAction={onRefresh}
            />
          </Card>
        ) : (
          <Card>
            <EmptyState
              icon="receipt"
              title={t('dashboard.noTransactions')}
              hint={t('dashboard.noTransactionsHint')}
            />
          </Card>
        )}
      </ScrollView>

      {/* Detail Bottom Sheet */}
      <TransactionDetailSheet ref={bottomSheetRef} transaction={selectedTx} />
    </SafeArea>
  );
}
