import React, { useEffect, useMemo } from 'react';
import { View, useWindowDimensions, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';

const CONFETTI_COLORS = [
  '#f5e63d', // primary yellow
  '#22c55e', // green
  '#ef4444', // red
  '#3b82f6', // blue
  '#f97316', // orange
  '#a855f7', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
];

const CONFETTI_COUNT = 40;
const DURATION = 2800;

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  color: string;
  rotation: number;
  size: number;
  drift: number;
}

function ConfettiPieceView({ piece, screenHeight }: { piece: ConfettiPiece; screenHeight: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      piece.delay,
      withTiming(1, { duration: DURATION, easing: Easing.out(Easing.quad) }),
    );
  }, [progress, piece.delay]);

  const animStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      progress.value,
      [0, 1],
      [-60, screenHeight + 40],
      Extrapolation.CLAMP,
    );

    const translateX = interpolate(
      progress.value,
      [0, 0.3, 0.6, 1],
      [0, piece.drift * 0.5, piece.drift, piece.drift * 1.2],
      Extrapolation.CLAMP,
    );

    const rotate = interpolate(
      progress.value,
      [0, 1],
      [0, piece.rotation],
      Extrapolation.CLAMP,
    );

    const opacity = interpolate(
      progress.value,
      [0, 0.1, 0.8, 1],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );

    const scale = interpolate(
      progress.value,
      [0, 0.15, 0.5, 1],
      [0, 1.2, 1, 0.6],
      Extrapolation.CLAMP,
    );

    return {
      transform: [
        { translateY },
        { translateX },
        { rotate: `${rotate}deg` },
        { scale },
      ],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        animStyle,
        {
          position: 'absolute',
          left: piece.x,
          top: 0,
          width: piece.size,
          height: piece.size * 0.6,
          borderRadius: piece.size * 0.15,
          backgroundColor: piece.color,
        },
      ]}
    />
  );
}

export function ConfettiEffect() {
  const { width, height } = useWindowDimensions();

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * width,
      delay: Math.random() * 600,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: 360 + Math.random() * 720,
      size: 8 + Math.random() * 10,
      drift: (Math.random() - 0.5) * 120,
    }));
  }, [width]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {pieces.map((piece) => (
        <ConfettiPieceView key={piece.id} piece={piece} screenHeight={height} />
      ))}
    </View>
  );
}
