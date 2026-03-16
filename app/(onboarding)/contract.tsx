import React, { useState } from 'react';
import { View, Text, Alert, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { StepIndicator } from '@/src/components/onboarding/StepIndicator';
import { ContractText } from '@/src/components/onboarding/ContractText';
import { Toggle } from '@/src/components/ui/Toggle';
import { Button } from '@/src/components/ui/Button';
import { Avatar } from '@/src/components/ui/Avatar';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { haptics } from '@/src/utils/haptics';

interface ContractRule {
  id: string;
  text: string;
}

export default function ContractScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const bankName = useAuthStore((s) => s.bankName) ?? '';
  const onboardingChildren = useBankStore((s) => s.onboardingChildren);
  const setContractRules = useBankStore((s) => s.setContractRules);
  const setChildContractRules = useBankStore((s) => s.setChildContractRules);
  const childContractRules = useBankStore((s) => s.childContractRules);

  const [currentChildIndex, setCurrentChildIndex] = useState(0);
  const [rules, setRules] = useState<ContractRule[]>([]);
  const [parentAgreed, setParentAgreed] = useState(false);
  const [inheritChoice, setInheritChoice] = useState<'inherit' | 'new' | null>(null);

  const currentChild = onboardingChildren[currentChildIndex];
  const isFirstChild = currentChildIndex === 0;
  const isLastChild = currentChildIndex === onboardingChildren.length - 1;
  const hasMultipleChildren = onboardingChildren.length > 1;
  const previousChild = currentChildIndex > 0 ? onboardingChildren[currentChildIndex - 1] : null;

  const canProceed = rules.length >= 1 && parentAgreed;

  const needsInheritChoice = !isFirstChild && inheritChoice === null && hasMultipleChildren;

  const handleInherit = () => {
    if (!previousChild) return;
    const prevRules = childContractRules[previousChild.id] ?? [];
    setRules(prevRules.map((text, i) => ({ id: `inherited_${i}`, text })));
    setInheritChoice('inherit');
    setParentAgreed(false);
    haptics.light();
  };

  const handleNewContract = () => {
    setRules([]);
    setInheritChoice('new');
    setParentAgreed(false);
    haptics.light();
  };

  const handleNext = () => {
    if (rules.length === 0) {
      haptics.warning();
      Alert.alert('', t('onboarding.contract.noRules'));
      return;
    }
    if (!canProceed) {
      haptics.warning();
      Alert.alert('', t('onboarding.contract.agree'));
      return;
    }

    haptics.success();
    const ruleTexts = rules.map((r) => r.text);

    setChildContractRules(currentChild.id, ruleTexts);

    if (isFirstChild) {
      setContractRules(ruleTexts);
    }

    if (isLastChild) {
      router.push('/(onboarding)/signature');
    } else {
      setCurrentChildIndex((prev) => prev + 1);
      setRules([]);
      setParentAgreed(false);
      setInheritChoice(null);
    }
  };

  if (!currentChild) return null;

  return (
    <SafeArea>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 28, paddingBottom: 40 }}
      >
        <StepIndicator currentStep={5} totalSteps={6} />

        <View className="items-center mt-5 mb-5">
          <Text className="text-[30px] font-sans-bold text-text text-center" style={{ lineHeight: 40 }}>
            {t('onboarding.contract.title')}
          </Text>
        </View>

        {hasMultipleChildren && (
          <View
            className="flex-row items-center mb-5 bg-surface rounded-3xl px-6 py-5"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 16,
              elevation: 3,
            }}
          >
            <Avatar avatarId={currentChild.avatarId} size="md" />
            <View className="ml-4 flex-1">
              <Text className="text-[20px] font-sans-bold text-text">
                {t('onboarding.contract.childContract', { childName: currentChild.name })}
              </Text>
              <Text className="text-[14px] font-sans text-text-secondary">
                {currentChildIndex + 1} / {onboardingChildren.length}
              </Text>
            </View>
          </View>
        )}

        {needsInheritChoice ? (
          <View className="mb-5">
            <Text className="text-base font-sans text-text-secondary mb-4">
              {t('onboarding.contract.inheritDescription')}
            </Text>

            <Pressable
              onPress={handleInherit}
              className="flex-row items-center bg-surface rounded-2xl border border-border p-5 mb-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="content-copy" size={24} color="#f5e63d" />
              <Text className="text-base font-sans-semibold text-text ml-3 flex-1">
                {t('onboarding.contract.inheritContract', { childName: previousChild?.name })}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#6b6b5a" />
            </Pressable>

            <Pressable
              onPress={handleNewContract}
              className="flex-row items-center bg-surface rounded-2xl border border-border p-5"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="file-plus-outline" size={24} color="#f5e63d" />
              <Text className="text-base font-sans-semibold text-text ml-3 flex-1">
                {t('onboarding.contract.newContract')}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#6b6b5a" />
            </Pressable>
          </View>
        ) : (
          <>
            <View className="mb-3">
              <ContractText
                bankName={bankName}
                rules={rules}
                onRulesChange={setRules}
              />
            </View>

            <View
              className="bg-surface rounded-3xl p-6 mb-5"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 16,
                elevation: 3,
              }}
            >
              <Toggle
                label={t('onboarding.contract.agree')}
                value={parentAgreed}
                onValueChange={setParentAgreed}
              />
            </View>

            <View className="pb-8">
              <Button
                title={t('common.next')}
                onPress={handleNext}
                variant="primary"
                size="lg"
                fullWidth
                disabled={!canProceed}
                icon="arrow-right"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeArea>
  );
}
