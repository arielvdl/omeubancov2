import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { StepIndicator } from '@/src/components/onboarding/StepIndicator';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { haptics } from '@/src/utils/haptics';

export default function MasterPinScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setMasterPin = useAuthStore((s) => s.setMasterPin);

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!pin) {
      newErrors.pin = t('validation.pinRequired');
    } else if (!/^\d{4,6}$/.test(pin)) {
      newErrors.pin = t('validation.pinInvalid');
    }

    if (pin && confirmPin && pin !== confirmPin) {
      newErrors.confirmPin = t('onboarding.masterPin.mismatch');
    } else if (!confirmPin) {
      newErrors.confirmPin = t('validation.pinRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validate()) {
      haptics.warning();
      return;
    }

    setSaving(true);
    try {
      await setMasterPin(pin);
      haptics.success();
      router.push('/(onboarding)/add-children');
    } catch {
      haptics.error();
    } finally {
      setSaving(false);
    }
  };

  const handlePinChange = (text: string) => {
    const numeric = text.replace(/\D/g, '').slice(0, 6);
    setPin(numeric);
  };

  const handleConfirmPinChange = (text: string) => {
    const numeric = text.replace(/\D/g, '').slice(0, 6);
    setConfirmPin(numeric);
  };

  return (
    <SafeArea>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={2} totalSteps={6} />

        <View className="items-center mt-9 mb-11">
          <MaterialCommunityIcons
            name="lock-outline"
            size={56}
            color="#f5e63d"
            style={{ marginBottom: 24 }}
          />
          <Text
            className="text-[30px] font-sans-bold text-text text-center"
            style={{ lineHeight: 40 }}
          >
            {t('onboarding.masterPin.title')}
          </Text>
          <Text
            className="text-[17px] font-sans text-text-secondary text-center mt-3.5"
            style={{ lineHeight: 26 }}
          >
            {t('onboarding.masterPin.subtitle')}
          </Text>
        </View>

        <Input
          label="PIN"
          value={pin}
          onChangeText={handlePinChange}
          placeholder={t('onboarding.masterPin.placeholder')}
          error={errors.pin}
          icon="lock-outline"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />

        <Input
          label={t('onboarding.masterPin.confirm')}
          value={confirmPin}
          onChangeText={handleConfirmPinChange}
          placeholder={t('onboarding.masterPin.confirm')}
          error={errors.confirmPin}
          icon="lock-check-outline"
          keyboardType="number-pad"
          secureTextEntry
          maxLength={6}
        />

        <Text className="text-[13px] font-sans text-text-secondary text-center mb-8">
          {t('onboarding.masterPin.hint')}
        </Text>

        <Button
          title={t('common.next')}
          onPress={handleNext}
          variant="primary"
          size="lg"
          fullWidth
          icon="arrow-right"
          loading={saving}
          disabled={saving || !pin || !confirmPin}
        />
      </ScrollView>
    </SafeArea>
  );
}
