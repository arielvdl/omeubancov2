import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolateColor,
} from 'react-native-reanimated';

type MeterSize = 'md' | 'lg';

interface BalanceMeterProps {
  balance: number;
  size?: MeterSize;
}

function getLevel(balance: number): { percent: number; max: number } {
  if (balance <= 0) return { percent: 0, max: 100 };

  const thresholds = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 500000, 1000000];
  const max = thresholds.find((t) => balance <= t) ?? balance * 1.5;
  const percent = Math.min((balance / max) * 100, 100);
  return { percent, max };
}

function getMood(percent: number): { emoji: string; label: string; color: string } {
  if (percent <= 5) return { emoji: '😢', label: 'Vazio', color: '#ef4444' };
  if (percent <= 20) return { emoji: '😟', label: 'Pouco', color: '#f97316' };
  if (percent <= 40) return { emoji: '🙂', label: 'Crescendo', color: '#eab308' };
  if (percent <= 60) return { emoji: '😊', label: 'Legal', color: '#84cc16' };
  if (percent <= 80) return { emoji: '😄', label: 'Muito bom', color: '#22c55e' };
  return { emoji: '🤩', label: 'Incrível', color: '#10b981' };
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const SCALE_MARKERS: { at: number; icon: IconName }[] = [
  { at: 0, icon: 'circle-outline' },
  { at: 25, icon: 'circle-slice-2' },
  { at: 50, icon: 'circle-slice-4' },
  { at: 75, icon: 'circle-slice-6' },
  { at: 100, icon: 'circle-slice-8' },
];

const sizeConfig: Record<MeterSize, { barHeight: number; emoji: number; label: number; marker: number; gap: number }> = {
  md: { barHeight: 20, emoji: 24, label: 14, marker: 14, gap: 10 },
  lg: { barHeight: 28, emoji: 32, label: 17, marker: 18, gap: 14 },
};

export function BalanceMeter({ balance, size = 'md' }: BalanceMeterProps) {
  const { percent } = getLevel(balance);
  const mood = getMood(percent);
  const prevPercent = useRef(percent);
  const animatedWidth = useSharedValue(percent);
  const cfg = sizeConfig[size];

  useEffect(() => {
    if (prevPercent.current !== percent) {
      animatedWidth.value = withSpring(percent, {
        damping: 18,
        stiffness: 80,
        mass: 1,
      });
      prevPercent.current = percent;
    }
  }, [percent, animatedWidth]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(animatedWidth.value, 0)}%`,
    backgroundColor: interpolateColor(
      animatedWidth.value,
      [0, 20, 40, 60, 80, 100],
      ['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#10b981'],
    ),
  }));

  return (
    <View className="mt-5">
      {/* Mood indicator */}
      <View className="flex-row items-center justify-between" style={{ marginBottom: cfg.gap }}>
        <View className="flex-row items-center">
          <Text style={{ fontSize: cfg.emoji, marginRight: 8 }}>{mood.emoji}</Text>
          <Text
            className="font-sans-semibold"
            style={{ color: mood.color, fontSize: cfg.label }}
          >
            {mood.label}
          </Text>
        </View>
      </View>

      {/* Bar background */}
      <View
        className="rounded-full overflow-hidden"
        style={{ height: cfg.barHeight, backgroundColor: '#f0f0ea' }}
      >
        <Animated.View
          className="rounded-full"
          style={[barStyle, { height: cfg.barHeight }]}
        />
      </View>

      {/* Scale markers with icons */}
      <View className="flex-row justify-between mt-2 px-0.5">
        {SCALE_MARKERS.map((marker) => (
          <View key={marker.at} className="items-center">
            <MaterialCommunityIcons
              name={marker.icon}
              size={cfg.marker}
              color={percent >= marker.at ? mood.color : '#d1d5db'}
            />
          </View>
        ))}
      </View>
    </View>
  );
}
