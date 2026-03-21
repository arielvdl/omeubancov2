import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { useSubscriptionStore } from '@/src/stores/useSubscriptionStore';
import { haptics } from '@/src/utils/haptics';
import { logger, captureError } from '@/src/utils/logger';

// Maps tier+period to RevenueCat package identifier
const PACKAGE_MAP: Record<string, string> = {
  'familia_monthly': 'familia_monthly',
  'familia_yearly': 'familia_yearly',
  'familia_plus_monthly': 'familia_plus_monthly',
  'familia_plus_yearly': 'familia_plus_yearly',
};

const TIERS = [
  {
    id: 'familia',
    name: 'Família',
    entitlement: 'familia',
    features: [
      { key: 'children', value: 'Até 3 crianças' },
      { key: 'receipts', value: 'Fotos ilimitadas' },
      { key: 'wishlist', value: 'Desejos ilimitados' },
      { key: 'schedule', value: 'Agendamento diário e semanal' },
      { key: 'guardians', value: 'Adicionar pessoas da família' },
      { key: 'no_ads', value: 'Sem publicidade' },
    ],
  },
  {
    id: 'familia_plus',
    name: 'Família+',
    entitlement: 'familia_plus',
    features: [
      { key: 'children', value: 'Até 5 crianças' },
      { key: 'receipts', value: 'Fotos ilimitadas' },
      { key: 'wishlist', value: 'Desejos ilimitados' },
      { key: 'schedule', value: 'Agendamento diário e semanal' },
      { key: 'guardians', value: 'Adicionar pessoas da família' },
      { key: 'no_ads', value: 'Sem publicidade' },
    ],
  },
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ feature?: string }>();
  const [isYearly, setIsYearly] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const loadSubscription = useSubscriptionStore((s) => s.loadSubscription);
  const loadLimits = useSubscriptionStore((s) => s.loadLimits);

  // Fetch offerings from RevenueCat on mount
  useEffect(() => {
    (async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current?.availablePackages.length) {
          setPackages(offerings.current.availablePackages);
        }
        logger.info('[Paywall] Offerings loaded', offerings.current?.availablePackages.length ?? 0);
      } catch (err) {
        logger.warn('[Paywall] Failed to load offerings', err);
      } finally {
        setLoadingOfferings(false);
      }
    })();
  }, []);

  // Helper: find the RevenueCat package for a given tier + period
  const findPackage = useCallback((tierId: string) => {
    const period = isYearly ? 'yearly' : 'monthly';
    const packageId = PACKAGE_MAP[`${tierId}_${period}`];
    return packages.find((p) => p.identifier === packageId || p.product.identifier === packageId);
  }, [packages, isYearly]);

  // Helper: get the price string from a package
  const getPrice = useCallback((tierId: string): string | null => {
    const pkg = findPackage(tierId);
    return pkg?.product.priceString ?? null;
  }, [findPackage]);

  const handlePurchase = useCallback(async (tierId: string) => {
    const pkg = findPackage(tierId);
    if (!pkg) {
      Alert.alert(
        t('subscription.error', { defaultValue: 'Erro' }),
        t('subscription.packageNotFound', { defaultValue: 'Pacote não disponível. Tente novamente mais tarde.' }),
      );
      return;
    }

    haptics.medium();
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Check if either entitlement is now active
      if (
        customerInfo.entitlements.active['familia'] ||
        customerInfo.entitlements.active['familia_plus']
      ) {
        haptics.success();
        // Reload subscription state from backend
        await Promise.all([loadSubscription(), loadLimits()]);
        Alert.alert(
          t('subscription.successTitle', { defaultValue: 'Assinatura ativada!' }),
          t('subscription.successMessage', { defaultValue: 'Aproveite todos os recursos do seu plano.' }),
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } catch (err: any) {
      if (err.userCancelled) {
        logger.info('[Paywall] User cancelled purchase');
      } else if (err.code === Purchases.PURCHASES_ERROR_CODE.PRODUCT_ALREADY_PURCHASED_ERROR) {
        await handleRestore();
      } else {
        haptics.error();
        captureError(err, 'Paywall purchase');
        Alert.alert(
          t('subscription.error', { defaultValue: 'Erro' }),
          err.message || t('subscription.purchaseError', { defaultValue: 'Erro ao processar compra. Tente novamente.' }),
        );
      }
    } finally {
      setPurchasing(false);
    }
  }, [findPackage, loadSubscription, loadLimits, router, t]);

  const handleRestore = useCallback(async () => {
    haptics.light();
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();

      if (
        customerInfo.entitlements.active['familia'] ||
        customerInfo.entitlements.active['familia_plus']
      ) {
        haptics.success();
        await Promise.all([loadSubscription(), loadLimits()]);
        Alert.alert(
          t('subscription.restoredTitle', { defaultValue: 'Compras restauradas!' }),
          t('subscription.restoredMessage', { defaultValue: 'Sua assinatura foi restaurada.' }),
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert(
          t('subscription.noSubscription', { defaultValue: 'Nenhuma assinatura encontrada' }),
          t('subscription.noSubscriptionMessage', { defaultValue: 'Não encontramos uma assinatura ativa para restaurar.' }),
        );
      }
    } catch (err: any) {
      captureError(err, 'Paywall restore');
      Alert.alert(
        t('subscription.error', { defaultValue: 'Erro' }),
        err.message || t('subscription.restoreError', { defaultValue: 'Erro ao restaurar compras.' }),
      );
    } finally {
      setRestoring(false);
    }
  }, [loadSubscription, loadLimits, router, t]);

  return (
    <SafeArea>
      <Header
        title={t('subscription.title', { defaultValue: 'Assinar' })}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View className="items-center mb-8">
          <View className="w-20 h-20 rounded-full bg-primary items-center justify-center mb-4">
            <MaterialCommunityIcons name="star" size={40} color="#1a1a0e" />
          </View>
          <Text className="text-[24px] font-sans-bold text-text text-center">
            {t('subscription.heroTitle', { defaultValue: 'Desbloqueie tudo' })}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary text-center mt-2 px-4">
            {t('subscription.heroSubtitle', { defaultValue: 'Acesse todas as funcionalidades para sua família' })}
          </Text>
        </View>

        {/* Toggle mensal/anual */}
        <View className="flex-row bg-surface rounded-2xl p-1.5 mb-8">
          <Pressable
            onPress={() => { setIsYearly(false); haptics.selection(); }}
            className={`flex-1 py-3 rounded-xl items-center ${!isYearly ? 'bg-primary' : ''}`}
          >
            <Text className={`text-[15px] font-sans-semibold ${!isYearly ? 'text-text' : 'text-text-secondary'}`}>
              {t('subscription.monthly', { defaultValue: 'Mensal' })}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setIsYearly(true); haptics.selection(); }}
            className={`flex-1 py-3 rounded-xl items-center ${isYearly ? 'bg-primary' : ''}`}
          >
            <Text className={`text-[15px] font-sans-semibold ${isYearly ? 'text-text' : 'text-text-secondary'}`}>
              {t('subscription.yearly', { defaultValue: 'Anual' })}
            </Text>
          </Pressable>
        </View>

        {/* Tier cards */}
        {loadingOfferings ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#FFD600" />
          </View>
        ) : TIERS.map((tier) => {
          const isCurrentTier = entitlement === tier.id;
          const isHighlighted = tier.id === 'familia';
          const price = getPrice(tier.id);
          // Fallback prices if offerings not loaded
          const fallbackPrices: Record<string, Record<string, string>> = {
            familia: { monthly: 'R$ 9,90', yearly: 'R$ 89,90' },
            familia_plus: { monthly: 'R$ 14,90', yearly: 'R$ 139,90' },
          };
          const displayPrice = price ?? fallbackPrices[tier.id]?.[isYearly ? 'yearly' : 'monthly'] ?? '';

          return (
            <View
              key={tier.id}
              className={`rounded-3xl mb-5 p-6 ${isHighlighted ? 'bg-primary-50' : 'bg-surface'}`}
              style={isHighlighted ? { borderWidth: 2, borderColor: '#FFD600' } : {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {isHighlighted && (
                <View className="bg-primary self-start px-3 py-1 rounded-full mb-3">
                  <Text className="text-[12px] font-sans-bold text-text">
                    {t('subscription.popular', { defaultValue: 'Mais popular' })}
                  </Text>
                </View>
              )}
              <Text className="text-[20px] font-sans-bold text-text">{tier.name}</Text>
              <View className="flex-row items-baseline mt-1 mb-4">
                <Text className="text-[28px] font-sans-bold text-text">
                  {displayPrice}
                </Text>
                <Text className="text-[14px] font-sans text-text-secondary ml-1">
                  /{isYearly ? t('subscription.year', { defaultValue: 'ano' }) : t('subscription.month', { defaultValue: 'mês' })}
                </Text>
                {isYearly && (
                  <View className="bg-green-100 px-2 py-0.5 rounded-full ml-2">
                    <Text className="text-[12px] font-sans-semibold text-green-700">
                      {tier.id === 'familia' ? '-24%' : '-22%'}
                    </Text>
                  </View>
                )}
              </View>

              {tier.features.map((feat) => {
                const isFeatureHighlighted = params.feature && (
                  (params.feature === 'add_child' && feat.key === 'children') ||
                  (params.feature === 'receipt' && feat.key === 'receipts') ||
                  (params.feature === 'wish_item' && feat.key === 'wishlist') ||
                  (params.feature === 'schedule_frequency' && feat.key === 'schedule') ||
                  (params.feature === 'invite_guardian' && feat.key === 'guardians')
                );
                return (
                  <View
                    key={feat.key}
                    className={`flex-row items-center gap-3 py-2 ${isFeatureHighlighted ? 'bg-primary/10 -mx-2 px-2 rounded-lg' : ''}`}
                  >
                    <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
                    <Text className={`text-[14px] font-sans ${isFeatureHighlighted ? 'font-sans-bold text-text' : 'text-text-secondary'}`}>
                      {feat.value}
                    </Text>
                  </View>
                );
              })}

              <Pressable
                onPress={() => handlePurchase(tier.id)}
                disabled={purchasing || isCurrentTier}
                className={`mt-4 py-3.5 rounded-2xl items-center ${isCurrentTier ? 'bg-green-100' : 'bg-primary'}`}
                style={({ pressed }) => ({ opacity: pressed || purchasing ? 0.7 : 1 })}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color="#1a1a0e" />
                ) : (
                  <Text className="text-[16px] font-sans-bold text-text">
                    {isCurrentTier
                      ? t('subscription.currentPlan', { defaultValue: 'Plano atual' })
                      : t('subscription.subscribe', { defaultValue: 'Assinar' })}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}

        {/* Restore purchases */}
        <Pressable
          onPress={handleRestore}
          disabled={restoring}
          className="items-center py-4"
          style={({ pressed }) => ({ opacity: pressed || restoring ? 0.6 : 1 })}
        >
          {restoring ? (
            <ActivityIndicator size="small" color="#999" />
          ) : (
            <Text className="text-[14px] font-sans text-text-secondary underline">
              {t('subscription.restore', { defaultValue: 'Restaurar compras' })}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeArea>
  );
}
