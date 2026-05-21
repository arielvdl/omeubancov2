import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, Platform, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNetworkStore } from '@/src/stores/useNetworkStore';

interface NetworkBannerProps {
  onRetry?: () => void;
}

const FADE_DURATION = 220;

export function NetworkBanner({ onRetry }: NetworkBannerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const online = useNetworkStore((s) => s.online);
  const lastError = useNetworkStore((s) => s.lastError);
  const visible = !online;
  const opacity = useRef(new Animated.Value(0)).current;
  // Defer unmount until the fade-out animation finishes so the banner can't
  // linger as a partially-visible strip when translateY-only animation left
  // residual pixels on devices with large safe-area insets.
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: FADE_DURATION,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, opacity]);

  if (!mounted) return null;

  const message =
    lastError === 'timeout'
      ? t('network.timeout', 'Conexão lenta — tentando novamente')
      : t('network.offline', 'Sem conexão com a internet');

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 8,
          opacity,
        },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View style={styles.bar}>
        <MaterialCommunityIcons name="wifi-off" size={18} color="#1a1a1a" />
        <Text style={styles.text} numberOfLines={1}>
          {message}
        </Text>
        {onRetry && (
          <Pressable
            onPress={onRetry}
            hitSlop={8}
            style={({ pressed }) => [
              styles.retry,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Text style={styles.retryText}>
              {t('common.retry', 'Tentar novamente')}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD600',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
    }),
  },
  text: {
    flex: 1,
    marginLeft: 8,
    color: '#1a1a1a',
    fontSize: 14,
    fontWeight: '600',
  },
  retry: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  retryText: {
    color: '#1a1a1a',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
