import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = '100%', height = 16, radius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as any, height, borderRadius: radius, opacity },
        style,
      ]}
    />
  );
}

export function SkeletonCircle({ size = 48, style }: { size?: number; style?: ViewStyle }) {
  return <Skeleton width={size} height={size} radius={size / 2} style={style} />;
}

export function HomeSkeleton() {
  return (
    <View style={{ padding: 28 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 36 }}>
        <SkeletonCircle size={56} />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Skeleton width="40%" height={12} style={{ marginBottom: 8 }} />
          <Skeleton width="70%" height={22} />
        </View>
      </View>
      <Skeleton height={140} radius={20} style={{ marginBottom: 36 }} />
      <Skeleton height={56} radius={16} style={{ marginBottom: 40 }} />
      <Skeleton width="50%" height={20} style={{ marginBottom: 20 }} />
      <Skeleton height={72} radius={16} style={{ marginBottom: 12 }} />
      <Skeleton height={72} radius={16} style={{ marginBottom: 12 }} />
      <Skeleton height={72} radius={16} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: '#e5e5d8',
  },
});
