import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { StepIndicator } from '@/src/components/onboarding/StepIndicator';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { isValidBankName, sanitizeInput } from '@/src/utils/validation';
import { apiClient } from '@/src/services/api/client';
import { haptics } from '@/src/utils/haptics';
import type { Currency } from '@/src/types/bank';

const CURRENCIES: { value: Currency; label: string }[] = [
  { value: 'BRL', label: 'R$ BRL' },
  { value: 'USD', label: '$ USD' },
  { value: 'EUR', label: '\u20AC EUR' },
];

export default function BankSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const familyId = useAuthStore((s) => s.familyId);
  const setBankName = useAuthStore((s) => s.setBankName);
  const setCurrency = useAuthStore((s) => s.setCurrency);

  const [bankName, setBankNameLocal] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('BRL');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    const sanitizedName = sanitizeInput(bankName);

    if (!sanitizedName) {
      newErrors.bankName = t('validation.bankNameRequired');
    } else if (!isValidBankName(sanitizedName)) {
      newErrors.bankName = t('validation.bankNameTooShort');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateBank = async () => {
    if (!validate()) {
      haptics.warning();
      return;
    }

    setSaving(true);

    try {
      const sanitizedName = sanitizeInput(bankName);

      if (familyId) {
        await apiClient.put('/families', {
          name: sanitizedName,
          currency: selectedCurrency,
        });
      }

      await setBankName(sanitizedName);
      await setCurrency(selectedCurrency);

      haptics.success();
      router.push('/(onboarding)/master-pin');
    } catch (error) {
      haptics.error();
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeArea>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <StepIndicator currentStep={1} totalSteps={6} />

        <View className="items-center mt-9 mb-11">
          <Text className="text-6xl mb-6">🏗️</Text>
          <Text className="text-[30px] font-sans-bold text-text text-center" style={{ lineHeight: 40 }}>
            {t('onboarding.bankSetup.title')}
          </Text>
        </View>

        <Input
          label={t('onboarding.bankSetup.bankNameLabel')}
          value={bankName}
          onChangeText={setBankNameLocal}
          placeholder={t('onboarding.bankName.placeholder')}
          error={errors.bankName}
          icon="bank-outline"
          maxLength={30}
          size="lg"
        />

        <Text className="text-[15px] font-sans-semibold text-text mb-3.5">
          {t('onboarding.currency.title')}
        </Text>
        <View className="flex-row gap-3.5 mb-11">
          {CURRENCIES.map((c) => (
            <Pressable
              key={c.value}
              onPress={() => {
                haptics.selection();
                setSelectedCurrency(c.value);
              }}
              className={`flex-1 py-4 rounded-2xl items-center ${
                selectedCurrency === c.value
                  ? 'bg-primary-50'
                  : 'bg-surface'
              }`}
              style={selectedCurrency === c.value
                ? { borderWidth: 2, borderColor: '#FFD600' }
                : {
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }
              }
            >
              <Text
                className={`text-[17px] font-sans-semibold ${
                  selectedCurrency === c.value ? 'text-text' : 'text-text-secondary'
                }`}
              >
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Button
          title={t('onboarding.bankSetup.createBank')}
          onPress={handleCreateBank}
          variant="primary"
          size="lg"
          fullWidth
          icon="bank-plus"
          loading={saving}
          disabled={saving}
        />
      </ScrollView>
    </SafeArea>
  );
}
