import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Button } from '@/src/components/ui/Button';
import { useParentAuth } from '@/src/hooks/useParentAuth';
import { haptics } from '@/src/utils/haptics';

const MIN_PIN = 4;
const MAX_PIN = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'delete'];

const DEFAULT_RETURN_TO = '/(parent)/add-balance';

export default function PinEntryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const {
    verifyPin,
    biometricAvailable,
    authenticateWithBiometrics,
    hasMasterPin,
  } = useParentAuth();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const destination = (returnTo as string) || DEFAULT_RETURN_TO;

  const navigateAfterAuth = useCallback(() => {
    router.replace(destination as any);
  }, [router, destination]);

  useEffect(() => {
    if (biometricAvailable) {
      handleBiometric();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [biometricAvailable]);

  const triggerShake = useCallback(() => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 50 }),
      withTiming(-8, { duration: 50 }),
      withTiming(8, { duration: 50 }),
      withTiming(-4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeX]);

  const handleBiometric = useCallback(async () => {
    const success = await authenticateWithBiometrics();
    if (success) {
      haptics.success();
      navigateAfterAuth();
    }
  }, [authenticateWithBiometrics, navigateAfterAuth]);

  const handleKeyPress = useCallback(
    (key: string) => {
      haptics.light();

      if (key === 'delete') {
        setPin((prev) => prev.slice(0, -1));
        setError('');
        return;
      }

      if (pin.length >= MAX_PIN) return;
      setPin((prev) => prev + key);
      setError('');
    },
    [pin],
  );

  const handleConfirm = useCallback(async () => {
    if (pin.length < MIN_PIN) return;

    if (!hasMasterPin) {
      haptics.error();
      triggerShake();
      setError(t('parent.noPinConfigured', { defaultValue: 'PIN não configurado. Reconfigure nas opções.' }));
      setTimeout(() => setPin(''), 400);
      return;
    }

    const result = await verifyPin(pin);
    if (result.success) {
      haptics.success();
      navigateAfterAuth();
    } else {
      haptics.error();
      triggerShake();
      setError(t('parent.wrongPin'));
      setTimeout(() => setPin(''), 400);
    }
  }, [pin, verifyPin, hasMasterPin, navigateAfterAuth, t, triggerShake]);

  return (
    <SafeArea>
      <View className="flex-1 px-6">
        {/* Close button */}
        <View className="flex-row justify-end py-3">
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <MaterialCommunityIcons name="close" size={30} color="#1a1a0e" />
          </Pressable>
        </View>

        <View className="flex-1 justify-center items-center">
          <MaterialCommunityIcons name="shield-lock-outline" size={64} color="#f5e63d" />
          <Text className="text-[30px] font-sans-bold text-text mt-6" style={{ lineHeight: 40 }}>
            {t('parent.title')}
          </Text>
          <Text className="text-[17px] font-sans text-text-secondary mt-2.5" style={{ lineHeight: 26 }}>
            {t('parent.enterPin')}
          </Text>

          {/* PIN Dots */}
          <Animated.View className="flex-row gap-3.5 mt-9 mb-5" style={shakeStyle}>
            {Array.from({ length: MAX_PIN }, (_, i) => (
              <View
                key={i}
                className={`w-4.5 h-4.5 rounded-full ${
                  i < pin.length ? 'bg-primary' : 'bg-gray-200'
                } ${i === MIN_PIN - 1 && i < MAX_PIN - 1 ? 'mr-2' : ''}`}
                style={{ width: 18, height: 18, borderRadius: 9 }}
              />
            ))}
          </Animated.View>

          {/* Error message */}
          {error ? (
            <Text className="text-[15px] font-sans-semibold text-danger text-center">
              {error}
            </Text>
          ) : (
            <View className="h-6" />
          )}

          {/* Confirm Button */}
          <View className="w-full max-w-xs mt-2 mb-4">
            <Button
              title={t('common.confirm')}
              onPress={handleConfirm}
              variant="primary"
              size="lg"
              fullWidth
              disabled={pin.length < MIN_PIN}
              icon="check"
            />
          </View>

          {/* Number Pad */}
          <View className="w-full max-w-xs">
            <View className="flex-row flex-wrap justify-center">
              {KEYS.map((key, index) => {
                if (key === '') {
                  return biometricAvailable ? (
                    <Pressable
                      key={index}
                      onPress={handleBiometric}
                      className="w-20 h-16 m-1.5 items-center justify-center rounded-2xl"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <MaterialCommunityIcons
                        name="face-recognition"
                        size={32}
                        color="#f5e63d"
                      />
                    </Pressable>
                  ) : (
                    <View key={index} className="w-20 h-16 m-1.5" />
                  );
                }

                if (key === 'delete') {
                  return (
                    <Pressable
                      key={index}
                      onPress={() => handleKeyPress('delete')}
                      className="w-20 h-16 m-1.5 items-center justify-center rounded-2xl"
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <MaterialCommunityIcons
                        name="backspace-outline"
                        size={30}
                        color="#1a1a0e"
                      />
                    </Pressable>
                  );
                }

                return (
                  <Pressable
                    key={index}
                    onPress={() => handleKeyPress(key)}
                    className="w-20 h-16 m-1.5 items-center justify-center bg-surface rounded-2xl"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.7 : 1,
                      backgroundColor: pressed ? '#f5f5f0' : '#ffffff',
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.04,
                      shadowRadius: 6,
                      elevation: 1,
                    })}
                  >
                    <Text className="text-[26px] font-sans-semibold text-text">
                      {key}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </SafeArea>
  );
}
