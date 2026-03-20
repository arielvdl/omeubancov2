import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { KeyboardTypeOptions } from 'react-native';

interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  multiline?: boolean;
  editable?: boolean;
  size?: 'default' | 'lg';
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  icon,
  keyboardType,
  maxLength,
  multiline = false,
  editable = true,
  size = 'default',
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const isLg = size === 'lg';
  const iconSize = isLg ? 28 : 24;
  const heightClass = isLg ? 'h-[72px]' : 'h-[56px]';
  const textClass = isLg ? 'text-[28px]' : 'text-[17px]';

  return (
    <View className="mb-6">
      <Text className="text-[16px] font-sans-semibold text-text mb-2.5">{label}</Text>
      <View
        className={`flex-row ${multiline ? 'items-start' : 'items-center'} bg-background-light rounded-2xl px-5 ${multiline ? 'py-4' : heightClass}`}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={iconSize}
            color={error ? '#ef4444' : isFocused ? '#FFD600' : '#6b6b5a'}
            style={{ marginRight: 10, ...(multiline ? { marginTop: 2 } : {}) }}
          />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          secureTextEntry={isSecure}
          keyboardType={keyboardType}
          maxLength={maxLength}
          multiline={multiline}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`flex-1 ${textClass} font-sans text-text`}
          style={multiline ? { minHeight: 88, textAlignVertical: 'top' } : undefined}
        />
        {secureTextEntry && (
          <Pressable onPress={() => setIsSecure(!isSecure)} hitSlop={12}>
            <MaterialCommunityIcons
              name={isSecure ? 'eye-off-outline' : 'eye-outline'}
              size={iconSize}
              color="#6b6b5a"
            />
          </Pressable>
        )}
      </View>
      {error && (
        <Text className="text-[13px] font-sans text-danger mt-1.5">{error}</Text>
      )}
    </View>
  );
}
