import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import type { Child } from '@/src/types/bank';
import type { Transaction } from '@/src/types/transaction';
import { BalanceDisplay } from '@/src/components/balance/BalanceDisplay';
import { BalanceMeter } from '@/src/components/balance/BalanceMeter';
import { getMascotById } from '@/src/constants/mascots';
import { MascotVideo } from '@/src/components/mascot/MascotVideo';

interface BalanceCardProps {
  child: Child;
  transactions?: Transaction[];
  onMeterPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function BalanceCard({ child, transactions, onMeterPress }: BalanceCardProps) {
  const { t } = useTranslation();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      className="bg-surface rounded-3xl p-6"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
      }}
    >
      {/* Mascot — only if child has one selected */}
      {child.mascotId && (
        <View className="items-center mb-2">
          <MascotVideo mascot={getMascotById(child.mascotId)} size={180} />
        </View>
      )}

      {/* Balance area */}
      <View className="bg-gray-100 rounded-2xl px-6 py-5 items-center">
        <Text className="text-[14px] font-sans-medium text-text-secondary mb-1">
          {t('dashboard.currentBalance')}
        </Text>
        <BalanceDisplay balance={child.balance} size="lg" />
      </View>

      {/* Game-like meter — tappable */}
      {onMeterPress ? (
        <AnimatedPressable
          onPress={onMeterPress}
          onPressIn={() => {
            scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 15, stiffness: 400 });
          }}
          style={animatedStyle}
        >
          <BalanceMeter balance={child.balance} transactions={transactions} />
        </AnimatedPressable>
      ) : (
        <BalanceMeter balance={child.balance} transactions={transactions} />
      )}
    </View>
  );
}
