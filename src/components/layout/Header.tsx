import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { haptics } from '@/src/utils/haptics';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = false, onBack, rightAction }: HeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    haptics.light();
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View className="flex-row items-center justify-between px-6 py-5 bg-background-light">
      <View className="w-11">
        {showBack && (
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <MaterialCommunityIcons name="chevron-left" size={30} color="#1a1a0e" />
          </Pressable>
        )}
      </View>
      <Text className="text-[22px] font-sans-bold text-text flex-1 text-center">
        {title}
      </Text>
      <View className="w-11 items-end">
        {rightAction}
      </View>
    </View>
  );
}
