import React from 'react';
import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getCategoryConfig } from '@/src/constants/categories';
import type { TransactionCategory, TransactionType } from '@/src/types/transaction';

interface TransactionIconProps {
  category: TransactionCategory;
  type: TransactionType;
  size?: number;
}

export function TransactionIcon({ category, type, size = 40 }: TransactionIconProps) {
  const config = getCategoryConfig(category);
  const bgOpacity = type === 'withdrawal' ? 'bg-red-50' : 'bg-green-50';
  const iconColor = type === 'withdrawal' ? '#ef4444' : config.color;
  const containerSize = size + 14;

  return (
    <View
      className={`rounded-full items-center justify-center ${bgOpacity}`}
      style={{ width: containerSize, height: containerSize }}
    >
      <MaterialCommunityIcons
        name={config.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={size * 0.55}
        color={iconColor}
      />
    </View>
  );
}
