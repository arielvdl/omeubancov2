import React from 'react';
import { View, Text } from 'react-native';

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';
type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, { container: string; text: string }> = {
  success: {
    container: 'bg-green-100',
    text: 'text-green-700',
  },
  danger: {
    container: 'bg-red-100',
    text: 'text-red-700',
  },
  warning: {
    container: 'bg-yellow-100',
    text: 'text-yellow-700',
  },
  info: {
    container: 'bg-blue-100',
    text: 'text-blue-700',
  },
  neutral: {
    container: 'bg-gray-100',
    text: 'text-gray-600',
  },
};

const sizeStyles: Record<BadgeSize, { container: string; text: string }> = {
  sm: {
    container: 'px-2.5 py-1 rounded-lg',
    text: 'text-xs font-sans',
  },
  md: {
    container: 'px-3.5 py-1.5 rounded-xl',
    text: 'text-sm font-sans-medium',
  },
};

export function Badge({ text, variant = 'neutral', size = 'sm' }: BadgeProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];

  return (
    <View className={`${vStyle.container} ${sStyle.container}`}>
      <Text className={`${vStyle.text} ${sStyle.text}`}>{text}</Text>
    </View>
  );
}
