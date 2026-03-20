import React, { useCallback } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { haptics } from '@/src/utils/haptics';

interface SlideToConfirmProps {
  onConfirm: () => void | Promise<void>;
  label: string;
  disabled?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

const THUMB_SIZE = 64;
const TRACK_HEIGHT = 72;
const TRACK_PADDING = 4;

export function SlideToConfirm({
  onConfirm,
  label,
  disabled = false,
  icon = 'cash-minus',
}: SlideToConfirmProps) {
  const { width: screenWidth } = useWindowDimensions();
  const trackWidth = screenWidth - 56; // padding 28 * 2
  const maxSlide = trackWidth - THUMB_SIZE - TRACK_PADDING * 2;

  const translateX = useSharedValue(0);
  const hasTriggered = useSharedValue(false);

  const onSlideComplete = useCallback(() => {
    haptics.success();
    try {
      const result = onConfirm();
      // If onConfirm returns a Promise, catch any rejection to prevent native crash
      if (result && typeof (result as Promise<void>).catch === 'function') {
        (result as Promise<void>).catch((err) => {
          console.error('[SlideToConfirm] onConfirm rejected:', err);
          translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
          hasTriggered.value = false;
        });
      }
    } catch (err) {
      console.error('[SlideToConfirm] onConfirm threw:', err);
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      hasTriggered.value = false;
    }
  }, [onConfirm, translateX, hasTriggered]);

  const triggerMidHaptic = useCallback(() => {
    haptics.light();
  }, []);

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .onUpdate((e) => {
      const clamped = Math.max(0, Math.min(e.translationX, maxSlide));
      translateX.value = clamped;

      // Haptic feedback at halfway point
      const progress = clamped / maxSlide;
      if (progress > 0.5 && !hasTriggered.value) {
        hasTriggered.value = true;
        runOnJS(triggerMidHaptic)();
      }
    })
    .onEnd(() => {
      const progress = translateX.value / maxSlide;
      if (progress > 0.85) {
        translateX.value = withSpring(maxSlide, { damping: 15, stiffness: 200 });
        runOnJS(onSlideComplete)();
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        hasTriggered.value = false;
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const labelOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, maxSlide * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const arrowsOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, maxSlide * 0.3],
      [0.4, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const checkOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [maxSlide * 0.7, maxSlide],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const trackFillStyle = useAnimatedStyle(() => ({
    width: translateX.value + THUMB_SIZE + TRACK_PADDING,
  }));

  return (
    <View
      className="rounded-[36px] overflow-hidden"
      style={{
        height: TRACK_HEIGHT,
        backgroundColor: disabled ? '#e5e5e0' : '#fef2f2',
        borderWidth: 2,
        borderColor: disabled ? '#d1d5db' : '#fca5a5',
      }}
    >
      {/* Fill track */}
      <Animated.View
        className="absolute top-0 left-0 bottom-0 rounded-[36px]"
        style={[
          trackFillStyle,
          { backgroundColor: disabled ? '#d1d5db' : '#fee2e2' },
        ]}
      />

      {/* Label */}
      <Animated.View
        className="absolute inset-0 items-center justify-center flex-row"
        style={labelOpacity}
      >
        <Animated.View style={arrowsOpacity} className="mr-2">
          <MaterialCommunityIcons name="chevron-triple-right" size={20} color="#ef4444" />
        </Animated.View>
        <Text className="text-[16px] font-sans-bold" style={{ color: disabled ? '#9ca3af' : '#ef4444' }}>
          {label}
        </Text>
      </Animated.View>

      {/* Check icon at end */}
      <Animated.View
        className="absolute right-5 top-0 bottom-0 justify-center"
        style={checkOpacity}
      >
        <MaterialCommunityIcons name="check-bold" size={24} color="#22c55e" />
      </Animated.View>

      {/* Thumb */}
      <GestureDetector gesture={pan}>
        <Animated.View
          className="absolute items-center justify-center rounded-full"
          style={[
            thumbStyle,
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              top: TRACK_PADDING,
              left: TRACK_PADDING,
              backgroundColor: disabled ? '#9ca3af' : '#ef4444',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 8,
              elevation: 6,
            },
          ]}
        >
          <MaterialCommunityIcons name={icon} size={28} color="#ffffff" />
        </Animated.View>
      </GestureDetector>
    </View>
  );
}
