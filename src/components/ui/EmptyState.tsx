import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type EmptyStateVariant = 'default' | 'offline' | 'error';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  icon?: IconName;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
  testID?: string;
}

const variantIcon: Record<EmptyStateVariant, IconName> = {
  default: 'inbox-outline',
  offline: 'wifi-off',
  error: 'alert-circle-outline',
};

export function EmptyState({
  variant = 'default',
  icon,
  title,
  hint,
  actionLabel,
  onAction,
  testID,
}: EmptyStateProps) {
  const iconName = icon ?? variantIcon[variant];
  return (
    <View testID={testID} className="items-center py-12 px-6">
      <MaterialCommunityIcons name={iconName} size={64} color="#e5e5d8" />
      <Text className="text-[18px] font-sans-semibold text-text-secondary mt-5 text-center">
        {title}
      </Text>
      {hint && (
        <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center">
          {hint}
        </Text>
      )}
      {actionLabel && onAction && (
        <Pressable
          onPress={onAction}
          hitSlop={8}
          className="mt-5 rounded-full px-5 py-3"
          style={({ pressed }) => ({
            backgroundColor: '#1a1a1a',
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Text className="text-white font-sans-semibold text-[14px]">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
