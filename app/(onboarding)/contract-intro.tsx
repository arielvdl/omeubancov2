import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { StepIndicator } from '@/src/components/onboarding/StepIndicator';
import { Button } from '@/src/components/ui/Button';
import { haptics } from '@/src/utils/haptics';

export default function ContractIntroScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleContinue = () => {
    haptics.success();
    router.push('/(onboarding)/contract');
  };

  return (
    <SafeArea>
      <View className="flex-1 px-7 pt-3">
        <StepIndicator currentStep={4} totalSteps={6} />

        <View className="flex-1 justify-center">
          <Text
            className="text-[28px] font-sans-bold text-text"
            style={{ lineHeight: 38 }}
          >
            {t('onboarding.contractIntro.title')}
          </Text>
          <Text
            className="text-[17px] font-sans text-text-secondary mt-5"
            style={{ lineHeight: 26 }}
          >
            {t('onboarding.contractIntro.description')}
          </Text>
        </View>

        <View className="pb-8">
          <Button
            title={t('common.next')}
            onPress={handleContinue}
            variant="primary"
            size="lg"
            fullWidth
            icon="arrow-right"
          />
        </View>
      </View>
    </SafeArea>
  );
}
