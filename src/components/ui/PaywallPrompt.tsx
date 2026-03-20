import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/src/utils/haptics';

interface PaywallPromptProps {
  feature: string;
  requiredTier?: 'familia' | 'familia_plus';
  compact?: boolean;
}

const FEATURE_ICONS: Record<string, string> = {
  add_child: 'account-plus',
  receipt: 'camera-outline',
  schedule_frequency: 'calendar-clock',
  invite_guardian: 'account-group',
  wish_item: 'heart-outline',
};

export function PaywallPrompt({ feature, requiredTier = 'familia', compact = false }: PaywallPromptProps) {
  const { t } = useTranslation();
  const router = useRouter();

  const iconName = FEATURE_ICONS[feature] ?? 'star-outline';

  const handleUpgrade = () => {
    haptics.light();
    router.push({ pathname: '/(modals)/paywall', params: { feature } });
  };

  if (compact) {
    return (
      <Pressable
        onPress={handleUpgrade}
        className="flex-row items-center gap-2 px-3 py-2 rounded-xl bg-primary-50"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <MaterialCommunityIcons name="lock" size={14} color="#1a1a0e" />
        <Text className="text-[12px] font-sans-semibold text-text">
          {t('subscription.upgrade', { defaultValue: 'Assinar' })}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="rounded-2xl bg-primary-50 p-5 mt-4">
      <View className="flex-row items-center gap-3 mb-3">
        <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
          <MaterialCommunityIcons name={iconName as any} size={22} color="#1a1a0e" />
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-sans-bold text-text">
            {t(`subscription.features.${feature}.title`, { defaultValue: t('subscription.premiumFeature', { defaultValue: 'Recurso premium' }) })}
          </Text>
          <Text className="text-[13px] font-sans text-text-secondary">
            {t(`subscription.features.${feature}.description`, { defaultValue: t('subscription.upgradeHint', { defaultValue: 'Disponível nos planos pagos' }) })}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={handleUpgrade}
        className="items-center py-3 rounded-xl bg-primary"
        style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
      >
        <Text className="text-[15px] font-sans-bold text-text">
          {t('subscription.seePlans', { defaultValue: 'Ver planos' })}
        </Text>
      </Pressable>
    </View>
  );
}
