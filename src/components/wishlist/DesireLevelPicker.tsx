import React from 'react';
import { View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { haptics } from '@/src/utils/haptics';

interface DesireLevelPickerProps {
  value: number;
  onChange: (level: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LEVELS = [
  { level: 1, stars: 1, bg: '#FFF9E0', activeBg: '#FFE680', starColor: '#d4a600' },
  { level: 2, stars: 2, bg: '#FFF3B0', activeBg: '#FFD600', starColor: '#b38f00' },
  { level: 3, stars: 3, bg: '#FFE680', activeBg: '#FFB300', starColor: '#8a6d00' },
] as const;

export function DesireLevelPicker({ value, onChange }: DesireLevelPickerProps) {
  return (
    <View className="flex-row" style={{ gap: 10 }}>
      {LEVELS.map((lvl) => (
        <LevelButton
          key={lvl.level}
          stars={lvl.stars}
          isActive={lvl.level === value}
          activeBg={lvl.activeBg}
          inactiveBg={lvl.bg}
          starColor={lvl.starColor}
          onPress={() => {
            haptics.selection();
            onChange(lvl.level);
          }}
        />
      ))}
    </View>
  );
}

function LevelButton({
  stars,
  isActive,
  activeBg,
  inactiveBg,
  starColor,
  onPress,
}: {
  stars: number;
  isActive: boolean;
  activeBg: string;
  inactiveBg: string;
  starColor: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.93, { damping: 15, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      }}
      style={[
        animatedStyle,
        {
          flex: 1,
          backgroundColor: isActive ? activeBg : inactiveBg,
          borderRadius: 16,
          paddingVertical: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          borderWidth: isActive ? 2.5 : 1,
          borderColor: isActive ? activeBg : '#e5e5d8',
        },
      ]}
    >
      {Array.from({ length: stars }).map((_, i) => (
        <MaterialCommunityIcons
          key={i}
          name="heart"
          size={20}
          color={isActive ? starColor : '#c8c0a0'}
        />
      ))}
    </AnimatedPressable>
  );
}
