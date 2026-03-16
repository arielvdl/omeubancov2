import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
  onPress?: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ children, title, className = '', onPress }: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <View
      className={`bg-surface rounded-3xl p-6 ${className}`}
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 3,
      }}
    >
      {title && (
        <Text className="text-[18px] font-sans-bold text-text mb-4">
          {title}
        </Text>
      )}
      {children}
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        style={animatedStyle}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}
