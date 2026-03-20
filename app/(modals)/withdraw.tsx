import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, ScrollView, Platform, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Input } from '@/src/components/ui/Input';
import { SlideToConfirm } from '@/src/components/ui/SlideToConfirm';
import { BalanceDisplay } from '@/src/components/balance/BalanceDisplay';
import { BalanceMeter } from '@/src/components/balance/BalanceMeter';
import { ConfettiEffect } from '@/src/components/effects/ConfettiEffect';
import { useBankStore } from '@/src/stores/useBankStore';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { currencyToCents, isValidAmount, subtractCents } from '@/src/utils/currency';
import { sanitizeInput } from '@/src/utils/validation';
import { haptics } from '@/src/utils/haptics';
import { transactionsApi } from '@/src/services/api/transactions';
import { uploadApi } from '@/src/services/api/bank';
import { useCurrency } from '@/src/hooks/useCurrency';
import { useSubscriptionStore } from '@/src/stores/useSubscriptionStore';
import { useCoinSound } from '@/src/utils/sounds';
import type { TransactionCategory } from '@/src/types/transaction';

export default function WithdrawScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format, currency } = useCurrency();
  const currencySymbol = currency === 'BRL' ? 'R$' : currency === 'USD' ? '$' : '\u20AC';
  const selectedChild = useSelectedChild();
  const updateChildBalance = useBankStore((s) => s.updateChildBalance);
  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const canUploadReceipt = useSubscriptionStore((s) => s.canUploadReceipt);
  const coinSound = useCoinSound();

  const [amountText, setAmountText] = useState('');
  const [description, setDescription] = useState('');
  const selectedCategory: TransactionCategory = 'compra';
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUpload, setReceiptUpload] = useState<{
    promise: Promise<string | undefined>;
    resolved?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [withdrawnAmount, setWithdrawnAmount] = useState(0);

  const shakeX = useSharedValue(0);

  // Success animations
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);
  const amountSlide = useSharedValue(30);
  const meterOpacity = useSharedValue(0);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

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

  useEffect(() => {
    if (success) {
      successScale.value = withSpring(1, { damping: 12, stiffness: 200 });
      successOpacity.value = withTiming(1, { duration: 400 });
      amountSlide.value = withDelay(200, withSpring(0, { damping: 15, stiffness: 150 }));
      meterOpacity.value = withDelay(500, withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }));
    }
  }, [success, successScale, successOpacity, amountSlide, meterOpacity]);

  const triggerShake = useCallback(() => {
    haptics.heavy();
    shakeX.value = withSequence(
      withTiming(-14, { duration: 50 }),
      withTiming(14, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-6, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const pickReceipt = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setReceiptUri(uri);
      // Start upload immediately in background
      const uploadPromise = uploadApi.uploadReceipt(uri)
        .then((res) => {
          const url = res.data?.url;
          setReceiptUpload((prev) => prev ? { ...prev, resolved: url } : prev);
          return url;
        })
        .catch((err) => {
          console.warn('[Withdraw] Background receipt upload failed:', err);
          return undefined;
        });
      setReceiptUpload({ promise: uploadPromise });
    }
  }, []);

  const handleWithdraw = useCallback(async () => {
    try {
      if (!selectedChild) return;
      setError('');

      const numericValue = parseFloat(amountText.replace(',', '.'));
      if (isNaN(numericValue) || numericValue <= 0) {
        triggerShake();
        setError(t('validation.amountInvalid'));
        return;
      }

      const cents = currencyToCents(numericValue);
      if (!isValidAmount(cents)) return;

      if (cents > selectedChild.balance) {
        triggerShake();
        setError(t('modals.withdraw.insufficientBalance'));
        return;
      }

      setLoading(true);

      // Use already-uploaded receipt or await the in-progress upload
      let receiptUrl: string | undefined;
      if (receiptUpload) {
        receiptUrl = receiptUpload.resolved ?? await receiptUpload.promise;
      }

      try {
        const response = await transactionsApi.withdraw(selectedChild.id, {
          amount: cents,
          category: selectedCategory,
          description: sanitizeInput(description) || t('modals.withdraw.title'),
          receiptUrl,
        });

        const balanceAfter = response.data?.balanceAfter;
        if (typeof balanceAfter === 'number') {
          updateChildBalance(selectedChild.id, balanceAfter);
        } else {
          updateChildBalance(selectedChild.id, subtractCents(selectedChild.balance, cents));
        }

        if (response.data?.transaction) {
          addTransaction(response.data.transaction);
        }
      } catch (apiErr) {
        console.warn('[Withdraw] API failed, creating local tx:', apiErr);
        const newBalance = subtractCents(selectedChild.balance, cents);
        updateChildBalance(selectedChild.id, newBalance);

        const localTx = {
          id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          childId: selectedChild.id,
          familyId: selectedChild.familyId,
          type: 'withdrawal' as const,
          category: selectedCategory,
          amount: cents,
          balanceAfter: newBalance,
          description: sanitizeInput(description) || t('modals.withdraw.title'),
          scheduledDepositId: null,
          createdBy: 'child' as const,
          createdAt: new Date().toISOString(),
          receiptUrl: receiptUrl ?? null,
        };
        addTransaction(localTx);
      }

      setLoading(false);
      setWithdrawnAmount(cents);
      setSuccess(true);
      haptics.success();
      coinSound.play();

      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }, 3200);
    } catch (err) {
      console.error('[Withdraw] Unexpected crash prevented:', err);
      setLoading(false);
      setError(t('common.genericError', { defaultValue: 'Algo deu errado. Tente novamente.' }));
    }
  }, [amountText, description, receiptUpload, selectedChild, updateChildBalance, addTransaction, t, router, triggerShake]);

  if (!selectedChild) return null;

  const parsedAmount = parseFloat(amountText.replace(',', '.'));
  const hasValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;
  const amountInCents = hasValidAmount ? currencyToCents(parsedAmount) : 0;
  const isOverBalance = hasValidAmount && amountInCents > selectedChild.balance;
  const missingCents = isOverBalance ? amountInCents - selectedChild.balance : 0;

  // Success state
  if (success) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          {/* Confetti */}
          <ConfettiEffect />

          {/* Check icon */}
          <Animated.View style={successIconStyle} className="items-center">
            <View
              className="w-32 h-32 rounded-full items-center justify-center mb-8"
              style={{ backgroundColor: 'rgba(34, 197, 94, 0.12)' }}
            >
              <MaterialCommunityIcons name="check-circle" size={72} color="#22c55e" />
            </View>
          </Animated.View>

          {/* Text */}
          <Animated.View style={amountStyle} className="items-center">
            <Text className="text-[32px] font-sans-bold text-text text-center mb-3" style={{ lineHeight: 40 }}>
              {t('modals.withdraw.success')}
            </Text>
            <Text className="text-[28px] font-sans-bold text-danger mb-8">
              -{format(withdrawnAmount)}
            </Text>
            <Text className="text-[15px] font-sans text-text-secondary mb-2">
              {t('modals.withdraw.newBalance')}
            </Text>
            <BalanceDisplay balance={selectedChild.balance} size="lg" />
          </Animated.View>

          {/* Meter */}
          <Animated.View style={meterStyle} className="w-full mt-8 px-4">
            <BalanceMeter balance={selectedChild.balance} size="lg" />
          </Animated.View>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Header title={t('modals.withdraw.title')} showBack onBack={() => router.back()} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          contentContainerStyle={{ padding: 28, flexGrow: 1, justifyContent: 'space-between' }}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            {/* Big Amount Input */}
            <Animated.View style={shakeStyle}>
              <View className="items-center py-8">
                <Text className="text-[16px] font-sans-semibold text-text-secondary mb-4">
                  {t('modals.withdraw.amount')}
                </Text>
                <View className="flex-row items-center justify-center">
                  <Text
                    className={`text-[48px] font-sans-bold mr-1 ${isOverBalance ? 'text-danger' : 'text-text-secondary'}`}
                  >
                    {currencySymbol}
                  </Text>
                  <TextInput
                    value={amountText}
                    onChangeText={(text) => {
                      if (text.length !== amountText.length) haptics.selection();
                      setAmountText(text);
                      setError('');
                    }}
                    placeholder="0,00"
                    placeholderTextColor="#d1d5db"
                    keyboardType="decimal-pad"
                    autoFocus
                    className={`text-[56px] font-sans-bold ${isOverBalance ? 'text-danger' : 'text-text'}`}
                    style={{ minWidth: 120, textAlign: 'center', lineHeight: 68, padding: 0 }}
                  />
                </View>

                {/* Saldo disponível */}
                <View className="mt-3 items-center">
                  <Text className="text-[13px] font-sans text-text-secondary">
                    {t('modals.withdraw.availableBalance', { defaultValue: 'Você tem no cofrinho:' })}
                  </Text>
                  <Text className="text-[17px] font-sans-bold text-text mt-0.5">
                    {format(selectedChild.balance)}
                  </Text>
                </View>

                {/* Feedback de saldo insuficiente */}
                {isOverBalance && (
                  <View className="mt-4 bg-red-50 rounded-2xl px-5 py-3.5 flex-row items-center gap-3">
                    <MaterialCommunityIcons name="piggy-bank-outline" size={28} color="#ef4444" />
                    <View className="flex-1">
                      <Text className="text-[14px] font-sans-semibold text-danger">
                        {t('modals.withdraw.notEnoughMoney', { defaultValue: 'Dinheiro insuficiente!' })}
                      </Text>
                      <Text className="text-[13px] font-sans mt-0.5" style={{ color: '#f87171' }}>
                        {t('modals.withdraw.missingAmount', {
                          defaultValue: 'Faltam {{amount}} no seu cofrinho.',
                          amount: format(missingCents),
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

            {/* Receipt */}
            <View className="mb-4">
              <Text className="text-[15px] font-sans-semibold text-text mb-3">
                {t('modals.withdraw.receipt', { defaultValue: 'Comprovante' })}
              </Text>
              {receiptUri ? (
                <View className="rounded-2xl overflow-hidden">
                  <Image source={{ uri: receiptUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} resizeMode="cover" />
                  <Pressable
                    onPress={() => { setReceiptUri(null); setReceiptUpload(null); }}
                    className="absolute top-2 right-2 bg-black/50 rounded-full p-1"
                  >
                    <MaterialCommunityIcons name="close" size={18} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    if (canUploadReceipt()) {
                      pickReceipt();
                    } else {
                      haptics.light();
                      router.push('/(modals)/paywall');
                    }
                  }}
                  className="flex-row items-center gap-3 px-5 py-4 rounded-2xl bg-surface"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <MaterialCommunityIcons name="camera-outline" size={22} color="#6b7280" />
                  <Text className="text-[14px] font-sans text-text-secondary">
                    {t('modals.withdraw.addReceipt', { defaultValue: 'Tirar foto do comprovante' })}
                  </Text>
                </Pressable>
              )}
            </View>

            {/* Description (motivo) */}
            <Input
              label={t('modals.withdraw.description')}
              value={description}
              onChangeText={setDescription}
              placeholder={t('modals.withdraw.descriptionPlaceholder')}
              icon="text"
              maxLength={100}
            />
          </View>

          {/* Slide to confirm */}
          <View className="mt-8 pb-4">
            <SlideToConfirm
              label={t('modals.withdraw.slideToConfirm')}
              onConfirm={handleWithdraw}
              disabled={!hasValidAmount || loading || isOverBalance}
              icon="cash-minus"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}
