import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { useSettingsStore } from '@/src/stores/useSettingsStore';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { bankApi } from '@/src/services/api/bank';
import { haptics } from '@/src/utils/haptics';
import type { Currency } from '@/src/types/bank';

const CURRENCIES: { value: Currency; label: string; icon: string }[] = [
  { value: 'BRL', label: 'R$ BRL', icon: 'currency-brl' },
  { value: 'USD', label: '$ USD', icon: 'currency-usd' },
  { value: 'EUR', label: '\u20AC EUR', icon: 'currency-eur' },
];

export default function ParentSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const currency = useSettingsStore((s) => s.currency);
  const setCurrency = useSettingsStore((s) => s.setCurrency);
  const setAuthCurrency = useAuthStore((s) => s.setCurrency);
  const mathChallengeEnabled = useAuthStore((s) => s.mathChallengeEnabled);
  const setMathChallengeEnabled = useAuthStore((s) => s.setMathChallengeEnabled);
  const isOwner = useAuthStore((s) => s.role === 'parent' && !s.guardianId);
  const selectedChild = useSelectedChild();
  const setContractRules = useBankStore((s) => s.setContractRules);
  const [deletingContract, setDeletingContract] = useState(false);

  const handleCurrencyChange = (newCurrency: Currency) => {
    haptics.selection();
    setCurrency(newCurrency);
    setAuthCurrency(newCurrency);
  };

  const handleMathChallengeToggle = (value: boolean) => {
    haptics.selection();
    setMathChallengeEnabled(value);
  };

  const handleDeleteContract = () => {
    if (!selectedChild) return;
    Alert.alert(
      t('profile.deleteContract'),
      t('profile.deleteContractConfirm', { name: selectedChild.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingContract(true);
            try {
              await bankApi.deleteContract(selectedChild.id);
              haptics.success();
              setContractRules([]);
              Alert.alert(t('common.success'), t('profile.contractDeleted'));
            } catch {
              haptics.error();
              Alert.alert(t('common.error'), t('common.errorGeneric'));
            } finally {
              setDeletingContract(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeArea>
      <Header
        title={t('parent.settings', { defaultValue: 'Configurações' })}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Financial Actions */}
        {selectedChild && (
          <Card
            title={t('parent.financialSection', { defaultValue: 'Financeiro' })}
            className="mb-6"
          >
            <Text className="text-[15px] font-sans text-text-secondary mb-4">
              {t('parent.financialHint', {
                defaultValue: 'Gerencie o saldo e agendamentos de {{name}}.',
                name: selectedChild.name,
              })}
            </Text>

            {/* Manage Balance */}
            <Pressable
              onPress={() => {
                haptics.light();
                router.push('/(parent)/add-balance');
              }}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light mb-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="swap-vertical-circle" size={24} color="#22c55e" />
              <View className="flex-1 ml-3.5">
                <Text className="text-[17px] font-sans-semibold text-text">
                  {t('parent.manageBalance', { defaultValue: 'Alterar saldo' })}
                </Text>
                <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                  {t('parent.manageBalanceHint', {
                    defaultValue: 'Depositar ou retirar valor da criança',
                  })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </Pressable>

            {/* Schedule Deposit */}
            <Pressable
              onPress={() => {
                haptics.light();
                router.push('/(parent)/schedule');
              }}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light mb-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#f5a623" />
              <View className="flex-1 ml-3.5">
                <Text className="text-[17px] font-sans-semibold text-text">
                  {t('parent.scheduleDeposit')}
                </Text>
                <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                  {t('parent.scheduleHint', {
                    defaultValue: 'Configurar mesada diária, semanal ou mensal',
                  })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </Pressable>

            {/* Statement */}
            <Pressable
              onPress={() => {
                haptics.light();
                router.push('/(parent)/statement');
              }}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="file-document-outline" size={24} color="#6b6b5a" />
              <View className="flex-1 ml-3.5">
                <Text className="text-[17px] font-sans-semibold text-text">
                  {t('parent.statement')}
                </Text>
                <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                  {t('parent.statementHint', {
                    defaultValue: 'Ver extrato completo de movimentações',
                  })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </Pressable>
          </Card>
        )}

        {/* Security */}
        <Card
          title={t('parent.changePin.securitySection', { defaultValue: 'Segurança' })}
          className="mb-6"
        >
          <Text className="text-[15px] font-sans text-text-secondary mb-4">
            {t('parent.changePin.securityHint', {
              defaultValue: 'Gerencie o PIN de acesso à área dos pais.',
            })}
          </Text>

          {/* Change PIN */}
          <Pressable
            onPress={() => {
              haptics.light();
              router.push('/(parent)/change-pin');
            }}
            className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light mb-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialCommunityIcons name="lock-reset" size={24} color="#1a1a14" />
            <View className="flex-1 ml-3.5">
              <Text className="text-[17px] font-sans-semibold text-text">
                {t('parent.changePin.title', { defaultValue: 'Alterar PIN' })}
              </Text>
              <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                {t('parent.changePin.description', {
                  defaultValue: 'Mude a senha de acesso dos pais',
                })}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </Pressable>

          {/* Math Challenge Toggle */}
          <View className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light">
            <MaterialCommunityIcons name="calculator-variant-outline" size={24} color="#1a1a14" />
            <View className="flex-1 ml-3.5 mr-3">
              <Text className="text-[17px] font-sans-semibold text-text">
                {t('parent.changePin.mathChallengeOption', {
                  defaultValue: 'Desafio matemático',
                })}
              </Text>
              <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                {t('parent.changePin.mathChallengeDescription', {
                  defaultValue: 'Alternativa com cálculo complexo para alterar o PIN',
                })}
              </Text>
            </View>
            <Switch
              value={mathChallengeEnabled}
              onValueChange={handleMathChallengeToggle}
              trackColor={{ false: '#d1d5db', true: '#f5e63d' }}
              thumbColor="#ffffff"
            />
          </View>
        </Card>

        {/* Family */}
        <Card
          title={t('invitation.familySection', { defaultValue: 'Família' })}
          className="mb-6"
        >
          <Text className="text-[15px] font-sans text-text-secondary mb-4">
            {t('invitation.familySectionHint', {
              defaultValue: 'Gerencie quem tem acesso ao banco da família.',
            })}
          </Text>

          {/* Invite member (owner only) */}
          {isOwner && (
            <Pressable
              onPress={() => {
                haptics.light();
                router.push('/(parent)/invite-member');
              }}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light mb-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="account-plus" size={24} color="#22c55e" />
              <View className="flex-1 ml-3.5">
                <Text className="text-[17px] font-sans-semibold text-text">
                  {t('invitation.inviteFamily')}
                </Text>
                <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                  {t('invitation.inviteFamilyHint', {
                    defaultValue: 'Convide mãe, pai, tio, avó para acessar o app',
                  })}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </Pressable>
          )}

          {/* Family members */}
          <Pressable
            onPress={() => {
              haptics.light();
              router.push('/(parent)/family-members');
            }}
            className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialCommunityIcons name="account-group" size={24} color="#6b6b5a" />
            <View className="flex-1 ml-3.5">
              <Text className="text-[17px] font-sans-semibold text-text">
                {t('invitation.familyMembers')}
              </Text>
              <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                {t('invitation.familyMembersHint', {
                  defaultValue: 'Veja quem tem acesso ao banco',
                })}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </Pressable>
        </Card>

        {/* Contract */}
        {selectedChild && (
          <Card
            title={t('onboarding.contract.title')}
            className="mb-6"
          >
            <Text className="text-[15px] font-sans text-text-secondary mb-4">
              {t('parent.contractHint', {
                defaultValue: 'Gerencie o contrato da criança selecionada.',
              })}
            </Text>

            <Pressable
              onPress={handleDeleteContract}
              disabled={deletingContract}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="file-document-remove-outline" size={24} color="#ef4444" />
              <View className="flex-1 ml-3.5">
                <Text className="text-[17px] font-sans-semibold text-red-500">
                  {t('profile.deleteContract')}
                </Text>
                <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                  {t('parent.deleteContractHint', {
                    defaultValue: 'Remove o contrato ativo de {{name}}',
                    name: selectedChild.name,
                  })}
                </Text>
              </View>
              {deletingContract ? (
                <Text className="text-[13px] font-sans text-text-secondary">...</Text>
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              )}
            </Pressable>
          </Card>
        )}

        {/* Currency */}
        <Card
          title={t('settings.currencyDisplay', { defaultValue: 'Moeda de exibição' })}
          className="mb-6"
        >
          <Text className="text-[15px] font-sans text-text-secondary mb-4">
            {t('parent.currencyHint', {
              defaultValue: 'Escolha a moeda para exibir os valores no app.',
            })}
          </Text>
          <View className="gap-3">
            {CURRENCIES.map((c) => {
              const isActive = currency === c.value;
              return (
                <Pressable
                  key={c.value}
                  onPress={() => handleCurrencyChange(c.value)}
                  className={`flex-row items-center py-4 px-5 rounded-2xl ${
                    isActive ? 'bg-primary-50' : 'bg-background-light'
                  }`}
                  style={
                    isActive
                      ? { borderWidth: 2, borderColor: '#f5e63d' }
                      : undefined
                  }
                >
                  <MaterialCommunityIcons
                    name={c.icon as any}
                    size={24}
                    color={isActive ? '#1a1a14' : '#6b6b5a'}
                  />
                  <Text
                    className={`text-[17px] font-sans-semibold ml-3.5 ${
                      isActive ? 'text-text' : 'text-text-secondary'
                    }`}
                  >
                    {c.label}
                  </Text>
                  {isActive && (
                    <View className="ml-auto">
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={24}
                        color="#f5e63d"
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>
      </ScrollView>
    </SafeArea>
  );
}
