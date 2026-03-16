import React, { useState, useEffect } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { ContractText } from '@/src/components/onboarding/ContractText';
import { Toggle } from '@/src/components/ui/Toggle';
import { Button } from '@/src/components/ui/Button';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { bankApi } from '@/src/services/api/bank';
import { haptics } from '@/src/utils/haptics';

interface ContractRule {
  id: string;
  text: string;
}

export default function ContractEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode: 'create' | 'edit' }>();
  const bankName = useAuthStore((s) => s.bankName) ?? '';
  const contractRules = useBankStore((s) => s.contractRules);
  const setContractRules = useBankStore((s) => s.setContractRules);
  const selectedChild = useSelectedChild();

  const [rules, setRules] = useState<ContractRule[]>([]);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [parentAgreed, setParentAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pre-fill rules when editing
  useEffect(() => {
    if (mode === 'edit' && contractRules.length > 0) {
      setRules(
        contractRules.map((text, i) => ({
          id: `existing-${i}`,
          text,
        })),
      );
    }
  }, [mode, contractRules]);

  const canSave = rules.length >= 1 && privacyAgreed && parentAgreed;

  const handleSave = async () => {
    if (!selectedChild) return;

    if (rules.length === 0) {
      haptics.warning();
      Alert.alert('', t('onboarding.contract.noRules'));
      return;
    }
    if (!canSave) {
      haptics.warning();
      Alert.alert('', t('onboarding.contract.agree'));
      return;
    }

    setSaving(true);
    try {
      const ruleTexts = rules.map((r) => r.text);
      const content = `${bankName}\n\n${ruleTexts.join('\n')}`;

      await bankApi.createContract(selectedChild.id, content);
      setContractRules(ruleTexts);

      haptics.success();
      Alert.alert(t('common.success'), t('profile.contractSaved'), [
        {
          text: t('common.ok'),
          onPress: () => router.back(),
        },
      ]);
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    } finally {
      setSaving(false);
    }
  };

  const isEditing = mode === 'edit';

  return (
    <SafeArea>
      <Header
        title={
          isEditing
            ? t('profile.editContract')
            : t('profile.createContract')
        }
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 28, paddingBottom: 40 }}
      >
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
            label={t('settings.privacyPolicy')}
            value={privacyAgreed}
            onValueChange={setPrivacyAgreed}
          />
          <View className="h-px bg-border" />
          <Toggle
            label={t('onboarding.contract.agree')}
            value={parentAgreed}
            onValueChange={setParentAgreed}
          />
        </View>

        <View className="pb-8">
          <Button
            title={saving ? t('profile.savingContract') : t('common.save')}
            onPress={handleSave}
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canSave || saving}
            loading={saving}
            icon="check"
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}
