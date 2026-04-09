import React from 'react';
import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/src/utils/haptics';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  fullWidth?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'none';
}

const variantStyles: Record<
  ButtonVariant,
  { container: string; text: string; iconColor: string; disabledContainer: string }
> = {
  primary: {
    container: 'bg-primary',
    text: 'text-text font-sans-bold',
    iconColor: '#1a1a0e',
    disabledContainer: 'bg-primary-100',
  },
  secondary: {
    container: 'bg-transparent border-2 border-border',
    text: 'text-text font-sans-semibold',
    iconColor: '#1a1a0e',
    disabledContainer: 'bg-transparent border-2 border-gray-200',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-text-secondary font-sans-medium',
    iconColor: '#6b6b5a',
    disabledContainer: 'bg-transparent',
  },
  danger: {
    container: 'bg-danger',
    text: 'text-white font-sans-bold',
    iconColor: '#ffffff',
    disabledContainer: 'bg-red-200',
  },
  success: {
    container: 'bg-green-500',
    text: 'text-white font-sans-bold',
    iconColor: '#ffffff',
    disabledContainer: 'bg-green-200',
  },
};

const sizeStyles: Record<ButtonSize, { container: string; text: string; icon: number }> = {
  sm: { container: 'py-3 px-6 rounded-2xl', text: 'text-[15px]', icon: 18 },
  md: { container: 'py-4 px-8 rounded-3xl', text: 'text-[17px]', icon: 22 },
  lg: { container: 'py-5 px-9 rounded-3xl', text: 'text-[18px]', icon: 24 },
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  hapticStyle,
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    if (isDisabled) return;
    const feedbackStyle = hapticStyle ?? (variant === 'danger' ? 'heavy' : 'light');
    if (feedbackStyle !== 'none') {
      haptics[feedbackStyle]();
    }
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      className={`
        ${isDisabled ? vStyle.disabledContainer : vStyle.container}
        ${sStyle.container}
        ${fullWidth ? 'w-full' : ''}
        flex-row items-center justify-center
      `}
      style={[
        animatedStyle,
        { opacity: isDisabled ? 0.5 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'danger' || variant === 'success' ? '#ffffff' : '#1a1a0e'}
        />
      ) : (
        <View className="flex-row items-center gap-2.5">
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={sStyle.icon}
              color={isDisabled ? '#9ca3af' : vStyle.iconColor}
            />
          )}
          <Text
            className={`
              ${vStyle.text}
              ${sStyle.text}
              ${isDisabled ? 'opacity-50' : ''}
            `}
          >
            {title}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}
