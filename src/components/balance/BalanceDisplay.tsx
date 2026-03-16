import React from 'react';
import { View, Text } from 'react-native';
import { useCurrency } from '@/src/hooks/useCurrency';

type BalanceSize = 'sm' | 'lg';

interface BalanceDisplayProps {
  balance: number;
  currency?: string;
  locale?: string;
  size?: BalanceSize;
}

const sizeStyles: Record<BalanceSize, string> = {
  sm: 'text-[22px] font-sans-bold text-text',
  lg: 'text-[40px] font-sans-extrabold text-text',
};

export function BalanceDisplay({
  balance,
  size = 'lg',
}: BalanceDisplayProps) {
  const { format } = useCurrency();

  return (
    <View className="items-center">
      <Text className={sizeStyles[size]}>{format(balance)}</Text>
    </View>
  );
}
