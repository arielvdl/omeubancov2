import React from 'react';
import { View, Text, Switch, Platform } from 'react-native';

interface ToggleProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  description?: string;
}

export function Toggle({ label, value, onValueChange, description }: ToggleProps) {
  return (
    <View className="flex-row items-center justify-between py-4">
      <View className="flex-1 mr-4">
        <Text className="text-[16px] font-sans-medium text-text">{label}</Text>
        {description && (
          <Text className="text-[14px] font-sans text-text-secondary mt-1">
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: Platform.OS === 'ios' ? '#e5e5d8' : '#d1d5db',
          true: '#f5e63d',
        }}
        thumbColor={Platform.OS === 'android' ? (value ? '#e5c60a' : '#f4f3f4') : undefined}
        ios_backgroundColor="#e5e5d8"
      />
    </View>
  );
}
