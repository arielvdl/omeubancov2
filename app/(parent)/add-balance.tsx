import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { Card } from '@/src/components/ui/Card';
import { BalanceDisplay } from '@/src/components/balance/BalanceDisplay';
import { BalanceMeter } from '@/src/components/balance/BalanceMeter';
import { ConfettiEffect } from '@/src/components/effects/ConfettiEffect';
import { useBankStore } from '@/src/stores/useBankStore';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import { useSettingsStore } from '@/src/stores/useSettingsStore';
import { useCurrency } from '@/src/hooks/useCurrency';
import { CATEGORIES } from '@/src/constants/categories';
import { currencyToCents, isValidAmount, subtractCents, addCents } from '@/src/utils/currency';
import { sanitizeInput } from '@/src/utils/validation';
import { haptics } from '@/src/utils/haptics';
import { transactionsApi } from '@/src/services/api/transactions';
import type { TransactionCategory } from '@/src/types/transaction';

type OperationType = 'deposit' | 'withdrawal';

export default function AddBalanceScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format } = useCurrency();
  const children = useBankStore((s) => s.children);
  const updateChildBalance = useBankStore((s) => s.updateChildBalance);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const currency = useSettingsStore((s) => s.currency);
  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '\u20AC';

  const [operation, setOperation] = useState<OperationType>('deposit');
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id ?? '');
  const [amountText, setAmountText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TransactionCategory>('mesada');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [processedAmount, setProcessedAmount] = useState(0);

  const amountInputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const selectedChild = children.find((c) => c.id === selectedChildId);

  const parsedAmount = parseFloat(amountText.replace(',', '.'));
  const hasValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const amountInCents = hasValidAmount ? currencyToCents(parsedAmount) : 0;
  const isOverBalance = operation === 'withdrawal' && hasValidAmount && selectedChild
    ? amountInCents > selectedChild.balance
    : false;

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  // Success animations
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);
  const amountSlide = useSharedValue(30);
  const meterOpacity = useSharedValue(0);

  const successIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));
  const amountStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: amountSlide.value }],
    opacity: successOpacity.value,
  }));
  const meterStyle = useAnimatedStyle(() => ({
    opacity: meterOpacity.value,
  }));

  const triggerShake = useCallback(() => {
    haptics.heavy();
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const handleSubmit = useCallback(async () => {
    if (!hasValidAmount) {
      triggerShake();
      setError(t('validation.amountInvalid', { defaultValue: 'Digite um valor válido.' }));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      amountInputRef.current?.focus();
      return;
    }

    if (isOverBalance) {
      triggerShake();
      setError(t('modals.withdraw.insufficientBalance', { defaultValue: 'Saldo insuficiente.' }));
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      amountInputRef.current?.focus();
      return;
    }

    if (!selectedChild) return;

    setLoading(true);
    setError('');

    const cents = currencyToCents(parsedAmount);

    try {
      if (operation === 'deposit') {
        const response = await transactionsApi.deposit(selectedChild.id, {
          amount: cents,
          category: selectedCategory,
          description: sanitizeInput(description) || t(`categories.${selectedCategory}`),
        });
        const { balanceAfter } = response.data;
        updateChildBalance(selectedChild.id, balanceAfter);
        if (response.data.transaction) {
          addTransaction(response.data.transaction);
        }
      } else {
        const response = await transactionsApi.withdraw(selectedChild.id, {
          amount: cents,
          description: sanitizeInput(description) || t('modals.withdraw.title'),
        });
        const { balanceAfter } = response.data;
        updateChildBalance(selectedChild.id, balanceAfter);
        if (response.data.transaction) {
          addTransaction(response.data.transaction);
        }
      }
    } catch {
      // Fallback local
      const newBalance = operation === 'deposit'
        ? addCents(selectedChild.balance, cents)
        : subtractCents(selectedChild.balance, cents);
      updateChildBalance(selectedChild.id, newBalance);

      const localTx = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        childId: selectedChild.id,
        familyId: selectedChild.familyId,
        type: operation as 'deposit' | 'withdrawal',
        category: (operation === 'deposit' ? selectedCategory : 'compra') as TransactionCategory,
        amount: cents,
        balanceAfter: newBalance,
        description: sanitizeInput(description) || (operation === 'deposit'
          ? t(`categories.${selectedCategory}`)
          : t('modals.withdraw.title')),
        scheduledDepositId: null,
        createdBy: 'parent' as const,
        createdAt: new Date().toISOString(),
      };
      addTransaction(localTx);
    }

    setLoading(false);
    setProcessedAmount(cents);
    setSuccess(true);
    haptics.success();

    // Trigger success animations
    successScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    successOpacity.value = withTiming(1, { duration: 400 });
    amountSlide.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 150 }));
    meterOpacity.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));

    setTimeout(() => router.back(), 3200);
  }, [
    hasValidAmount, isOverBalance, selectedChild, parsedAmount, operation,
    selectedCategory, description, updateChildBalance, addTransaction,
    t, router, triggerShake, successScale, successOpacity, amountSlide, meterOpacity,
  ]);

  if (!selectedChild) return null;

  // Success state
  if (success) {
    const isDeposit = operation === 'deposit';
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          <ConfettiEffect />
          <Animated.View style={successIconStyle} className="items-center">
            <View
              className="w-32 h-32 rounded-full items-center justify-center mb-8"
              style={{ backgroundColor: isDeposit ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)' }}
            >
              <MaterialCommunityIcons
                name="check-circle"
                size={72}
                color={isDeposit ? '#22c55e' : '#ef4444'}
              />
            </View>
          </Animated.View>
          <Animated.View style={amountStyle} className="items-center">
            <Text className="text-[28px] font-sans-bold text-text text-center mb-3" style={{ lineHeight: 36 }}>
              {isDeposit
                ? t('parent.depositSuccess', { defaultValue: 'Depósito realizado!' })
                : t('parent.withdrawSuccess', { defaultValue: 'Retirada realizada!' })}
            </Text>
            <Text className={`text-[28px] font-sans-bold mb-8 ${isDeposit ? 'text-success' : 'text-danger'}`}>
              {isDeposit ? '+' : '-'}{format(processedAmount)}
            </Text>
            <Text className="text-[15px] font-sans text-text-secondary mb-2">
              {t('modals.withdraw.newBalance', { defaultValue: 'Novo saldo' })}
            </Text>
            <BalanceDisplay balance={selectedChild.balance} size="lg" />
          </Animated.View>
          <Animated.View style={meterStyle} className="w-full mt-8 px-4">
            <BalanceMeter balance={selectedChild.balance} size="lg" />
          </Animated.View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Header
        title={t('parent.manageBalance', { defaultValue: 'Alterar saldo' })}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Child Selector */}
        {children.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            <View className="flex-row gap-3">
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => {
                      haptics.selection();
                      setSelectedChildId(child.id);
                    }}
                    className={`items-center p-4 rounded-2xl ${
                      isSelected ? 'bg-primary-50' : 'bg-surface'
                    }`}
                    style={isSelected
                      ? { borderWidth: 2, borderColor: '#FFD600' }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 8,
                          elevation: 2,
                        }
                    }
                  >
                    <Avatar avatarId={child.avatarUrl ?? undefined} size="md" />
                    <Text className="text-[15px] font-sans-semibold text-text mt-1.5">
                      {child.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Selected child with balance */}
        {selectedChild && children.length === 1 && (
          <Card className="mb-6">
            <View className="flex-row items-center">
              <Avatar avatarId={selectedChild.avatarUrl ?? undefined} size="md" />
              <View className="ml-3.5">
                <Text className="text-[20px] font-sans-bold text-text">
                  {selectedChild.name}
                </Text>
                <Text className="text-[14px] font-sans text-text-secondary mt-0.5">
                  {t('dashboard.currentBalance', { defaultValue: 'Saldo atual' })}: {format(selectedChild.balance)}
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* Operation Toggle */}
        <View className="flex-row gap-3 mb-6">
          <Pressable
            onPress={() => {
              haptics.selection();
              setOperation('deposit');
              setError('');
            }}
            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl gap-2 ${
              operation === 'deposit' ? 'bg-green-50' : 'bg-surface'
            }`}
            style={operation === 'deposit'
              ? { borderWidth: 2, borderColor: '#22c55e' }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }
            }
          >
            <MaterialCommunityIcons
              name="arrow-up-circle"
              size={22}
              color={operation === 'deposit' ? '#22c55e' : '#6b6b5a'}
            />
            <Text
              className={`text-[16px] font-sans-bold ${
                operation === 'deposit' ? 'text-success' : 'text-text-secondary'
              }`}
            >
              {t('parent.depositAction', { defaultValue: 'Depositar' })}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              haptics.selection();
              setOperation('withdrawal');
              setError('');
            }}
            className={`flex-1 flex-row items-center justify-center py-4 rounded-2xl gap-2 ${
              operation === 'withdrawal' ? 'bg-red-50' : 'bg-surface'
            }`}
            style={operation === 'withdrawal'
              ? { borderWidth: 2, borderColor: '#ef4444' }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                }
            }
          >
            <MaterialCommunityIcons
              name="arrow-down-circle"
              size={22}
              color={operation === 'withdrawal' ? '#ef4444' : '#6b6b5a'}
            />
            <Text
              className={`text-[16px] font-sans-bold ${
                operation === 'withdrawal' ? 'text-danger' : 'text-text-secondary'
              }`}
            >
              {t('parent.withdrawAction', { defaultValue: 'Retirar' })}
            </Text>
          </Pressable>
        </View>

        {/* Big Amount Input */}
        <Animated.View style={shakeStyle}>
          <View className="items-center py-6 mb-2">
            <Text className="text-[15px] font-sans-semibold text-text-secondary mb-4">
              {t('parent.amount', { defaultValue: 'Valor' })}
            </Text>
            <View className="flex-row items-center justify-center">
              <Text
                className={`text-[40px] font-sans-bold mr-1 ${
                  isOverBalance ? 'text-danger' : 'text-text-secondary'
                }`}
              >
                {currencySymbol}
              </Text>
              <TextInput
                ref={amountInputRef}
                value={amountText}
                onChangeText={(text) => {
                  setAmountText(text);
                  setError('');
                }}
                placeholder="0,00"
                placeholderTextColor="#d1d5db"
                keyboardType="decimal-pad"
                autoFocus
                className={`text-[48px] font-sans-bold ${
                  isOverBalance ? 'text-danger' : 'text-text'
                }`}
                style={{ minWidth: 120, textAlign: 'center', lineHeight: 58, padding: 0 }}
              />
            </View>

            {/* Current balance info */}
            {selectedChild && (
              <View className="mt-3 items-center">
                <Text className="text-[13px] font-sans text-text-secondary">
                  {t('modals.withdraw.availableBalance', { defaultValue: 'Saldo disponível:' })}
                </Text>
                <Text className="text-[17px] font-sans-bold text-text mt-0.5">
                  {format(selectedChild.balance)}
                </Text>
              </View>
            )}

            {/* Insufficient balance warning */}
            {isOverBalance && (
              <View className="mt-4 bg-red-50 rounded-2xl px-5 py-3.5 flex-row items-center gap-3 w-full">
                <MaterialCommunityIcons name="piggy-bank-outline" size={28} color="#ef4444" />
                <View className="flex-1">
                  <Text className="text-[14px] font-sans-semibold text-danger">
                    {t('modals.withdraw.notEnoughMoney', { defaultValue: 'Dinheiro insuficiente!' })}
                  </Text>
                  <Text className="text-[13px] font-sans mt-0.5" style={{ color: '#f87171' }}>
                    {t('modals.withdraw.missingAmount', {
                      defaultValue: 'Faltam {{amount}} no cofrinho.',
                      amount: format(amountInCents - selectedChild.balance),
                    })}
                  </Text>
                </View>
              </View>
            )}

            {error && !isOverBalance ? (
              <Text className="text-[14px] font-sans text-danger mt-3">{error}</Text>
            ) : null}
          </View>
        </Animated.View>

        {/* Category (only for deposit) */}
        {operation === 'deposit' && (
          <View className="mb-6">
            <Text className="text-[15px] font-sans-semibold text-text mb-3.5">
              {t('parent.category')}
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {CATEGORIES.filter((c) => c.key !== 'compra').map((cat) => {
                const isSelected = selectedCategory === cat.key;
                return (
                  <Pressable
                    key={cat.key}
                    onPress={() => {
                      haptics.selection();
                      setSelectedCategory(cat.key as TransactionCategory);
                    }}
                    className={`px-6 py-3 rounded-full ${
                      isSelected ? 'bg-primary-50' : 'bg-surface'
                    }`}
                    style={isSelected
                      ? { borderWidth: 2, borderColor: '#FFD600' }
                      : {
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.05,
                          shadowRadius: 8,
                          elevation: 2,
                        }
                    }
                  >
                    <Text
                      className={`text-[15px] font-sans-semibold ${
                        isSelected ? 'text-text' : 'text-text-secondary'
                      }`}
                    >
                      {t(`categories.${cat.key}`)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* Description */}
        <Input
          label={t('parent.description')}
          value={description}
          onChangeText={setDescription}
          placeholder={t('parent.descriptionPlaceholder')}
          icon="text"
          maxLength={100}
        />

        {/* Submit button */}
        <View className="mt-4">
          <Button
            title={operation === 'deposit'
              ? t('parent.depositAction', { defaultValue: 'Depositar' })
              : t('parent.withdrawAction', { defaultValue: 'Retirar' })
            }
            onPress={handleSubmit}
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            disabled={isOverBalance}
            icon={operation === 'deposit' ? 'cash-plus' : 'cash-minus'}
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}
