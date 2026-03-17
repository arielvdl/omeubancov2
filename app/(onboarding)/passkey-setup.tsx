import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { StepIndicator } from '@/src/components/onboarding/StepIndicator';
import { Button } from '@/src/components/ui/Button';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { registerPasskey, isPasskeySupported, getPasskeyErrorType } from '@/src/services/passkey';
import { logger } from '@/src/utils/logger';
import { haptics } from '@/src/utils/haptics';

export default function PasskeySetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setPasskeyEnabled = useAuthStore((s) => s.setPasskeyEnabled);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    isPasskeySupported().then((result) => {
      setSupported(result);
      if (!result) {
        router.replace('/(onboarding)/add-children');
      }
    });
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    haptics.medium();
    try {
      const success = await registerPasskey();
      if (success) {
        await setPasskeyEnabled(true);
        haptics.success();
        Alert.alert(t('common.success'), t('auth.passkeySuccess'));
        router.push('/(onboarding)/add-children');
      }
    } catch (error: any) {
      haptics.error();
      const errorType = getPasskeyErrorType(error);
      logger.error('[PasskeySetup] Registration failed', {
        errorType,
        error: error?.error,
        message: error?.message,
        serverMessage: error?.response?.data?.message,
      });

      switch (errorType) {
        case 'cancelled':
          // User cancelled, no alert needed
          break;
        case 'not_supported':
          Alert.alert(t('common.error'), t('auth.passkeyNotSupported'));
          break;
        case 'server':
          Alert.alert(t('common.error'), t('auth.passkeyServerError'));
          break;
        default:
          Alert.alert(
            t('common.error'),
            __DEV__
              ? `${t('auth.passkeyError')}\n\n${error?.response?.data?.message || error?.message || 'Unknown error'}`
              : t('auth.passkeyError'),
          );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    haptics.light();
    router.push('/(onboarding)/add-children');
  };

  if (!supported) return null;

  return (
    <SafeArea>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={3} totalSteps={6} />

        <View className="items-center mt-9 mb-11">
          <MaterialCommunityIcons
            name="shield-key-outline"
            size={56}
            color="#FFD600"
            style={{ marginBottom: 24 }}
          />
          <Text
            className="text-[30px] font-sans-bold text-text text-center"
            style={{ lineHeight: 40 }}
          >
            {t('auth.passkeySetupTitle')}
          </Text>
          <Text
            className="text-[17px] font-sans text-text-secondary text-center mt-3.5"
            style={{ lineHeight: 26 }}
          >
            {t('auth.passkeySetupSubtitle')}
          </Text>
        </View>

        <View className="items-center mb-8 px-4">
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
            <Text className="text-[15px] font-sans text-text ml-2.5">
              Login rapido com biometria
            </Text>
          </View>
          <View className="flex-row items-center mb-4">
            <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
            <Text className="text-[15px] font-sans text-text ml-2.5">
              Sincroniza entre dispositivos
            </Text>
          </View>
          <View className="flex-row items-center">
            <MaterialCommunityIcons name="check-circle" size={20} color="#22c55e" />
            <Text className="text-[15px] font-sans text-text ml-2.5">
              Mais seguro que senhas
            </Text>
          </View>
        </View>

        <Text className="text-[13px] font-sans text-text-secondary text-center mb-8">
          {t('auth.passkeySetupHint')}
        </Text>

        <Button
          title={t('auth.enablePasskey')}
          onPress={handleEnable}
          variant="primary"
          size="lg"
          fullWidth
          icon="shield-key-outline"
          loading={loading}
          disabled={loading}
        />

        <Pressable onPress={handleSkip} disabled={loading} className="mt-5">
          <Text className="text-[14px] font-sans text-primary text-center">
            {t('auth.skipPasskey')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeArea>
  );
}
