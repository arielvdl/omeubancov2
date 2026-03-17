import React, { useState, useCallback } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { StepIndicator } from '@/src/components/onboarding/StepIndicator';
import { SignaturePad } from '@/src/components/onboarding/SignaturePad';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { bankApi, uploadApi } from '@/src/services/api/bank';
import { isPhotoUri } from '@/src/utils/avatar';
import { haptics } from '@/src/utils/haptics';
import type { Child } from '@/src/types/bank';

export default function SignatureScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const bankName = useAuthStore((s) => s.bankName);
  const onboardingChildren = useBankStore((s) => s.onboardingChildren);
  const contractRules = useBankStore((s) => s.contractRules);
  const childContractRules = useBankStore((s) => s.childContractRules);
  const updateOnboardingChild = useBankStore((s) => s.updateOnboardingChild);
  const setChildren = useBankStore((s) => s.setChildren);
  const clearOnboardingChildren = useBankStore((s) => s.clearOnboardingChildren);

  const [currentChildIndex, setCurrentChildIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const currentChild = onboardingChildren[currentChildIndex];
  const isLastChild = currentChildIndex === onboardingChildren.length - 1;

  const handleSignatureComplete = useCallback(
    (data: string) => {
      if (!currentChild) return;
      haptics.light();
      updateOnboardingChild(currentChild.id, { signatureData: data });
    },
    [currentChild, updateOnboardingChild],
  );

  const handleClear = useCallback(() => {
    if (!currentChild) return;
    updateOnboardingChild(currentChild.id, { signatureData: null });
  }, [currentChild, updateOnboardingChild]);

  const handleNext = useCallback(async () => {
    if (!currentChild?.signatureData) return;

    if (isLastChild) {
      setIsSaving(true);
      try {
        // Create all children via API and collect the real records
        const createdChildren: Child[] = [];

        for (const oc of onboardingChildren) {
          // Upload photo to cloud if it's a local file URI
          let avatarUrl = oc.avatarId;
          if (isPhotoUri(avatarUrl) && avatarUrl.startsWith('file://')) {
            try {
              const { data: uploadData } = await uploadApi.uploadAvatar(avatarUrl);
              avatarUrl = uploadData.url;
            } catch {
              // Keep emoji avatar if upload fails
              avatarUrl = oc.avatarId;
            }
          }

          const { data } = await bankApi.createChild({
            name: oc.name,
            avatarUrl,
          });
          createdChildren.push({
            id: data.id,
            familyId: data.familyId ?? '',
            name: data.name,
            avatarUrl: data.avatarUrl,
            balance: data.balance ?? 0,
            birthDate: data.birthDate ?? null,
            createdAt: data.createdAt,
          });
        }

        // Create contract for each child if rules exist
        for (let i = 0; i < createdChildren.length; i++) {
          const child = createdChildren[i];
          const oc = onboardingChildren[i];
          const rules = childContractRules[oc.id] ?? contractRules;
          if (rules.length > 0) {
            const contractContent = `${bankName ?? 'O Meu Banco'}\n\n${rules.join('\n')}`;
            try {
              await bankApi.createContract(
                child.id,
                contractContent,
                oc.signatureData ?? undefined,
              );
            } catch {
              // Contract creation is non-blocking; child is already persisted
            }
          }
        }

        // Persist to local store with real API data
        setChildren(createdChildren);
        clearOnboardingChildren();

        haptics.success();
        await setOnboardingComplete(true);
        router.replace('/(tabs)');
      } catch (error) {
        haptics.error();
        Alert.alert(
          t('common.error'),
          t('common.errorGeneric'),
        );
      } finally {
        setIsSaving(false);
      }
    } else {
      haptics.medium();
      setCurrentChildIndex((prev) => prev + 1);
    }
  }, [
    currentChild, isLastChild, onboardingChildren, contractRules, childContractRules,
    bankName, setChildren, clearOnboardingChildren, setOnboardingComplete, router, t,
  ]);

  if (!currentChild) return null;

  return (
    <SafeArea>
      <View className="flex-1 px-7 pt-3">
        <StepIndicator currentStep={6} totalSteps={6} />

        <View className="items-center mt-6 mb-8">
          <Text className="text-[30px] font-sans-bold text-text text-center" style={{ lineHeight: 40 }}>
            {t('onboarding.signature.title')}
          </Text>

          <View
            className="flex-row items-center mt-6 bg-surface rounded-3xl px-6 py-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <Avatar avatarId={currentChild.avatarId} size="md" />
            <View className="ml-4">
              <Text className="text-[22px] font-sans-bold text-text">
                {currentChild.name}
              </Text>
              <Text className="text-[14px] font-sans text-text-secondary">
                {currentChildIndex + 1} / {onboardingChildren.length}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-1">
          <SignaturePad
            onSignatureComplete={handleSignatureComplete}
            onClear={handleClear}
          />
        </View>

        <View className="pb-8 mt-6">
          <Button
            title={
              isLastChild
                ? t('onboarding.complete.goToDashboard')
                : t('common.next')
            }
            onPress={handleNext}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!currentChild.signatureData || isSaving}
            loading={isSaving}
            icon={isLastChild ? 'check-all' : 'arrow-right'}
          />
        </View>
      </View>
    </SafeArea>
  );
}
