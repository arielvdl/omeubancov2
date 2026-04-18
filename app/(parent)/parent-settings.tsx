import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { useSettingsStore } from '@/src/stores/useSettingsStore';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { useParentSessionStore } from '@/src/stores/useParentSessionStore';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { bankApi } from '@/src/services/api/bank';
import { registerPasskey, isPasskeySupported } from '@/src/services/passkey';
import { haptics } from '@/src/utils/haptics';
import { useSubscriptionStore } from '@/src/stores/useSubscriptionStore';
import { MASCOTS, getMascotById } from '@/src/constants/mascots';
import { MascotPickerItem } from '@/src/components/mascot/MascotPickerItem';
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
  const canManageFamily = useAuthStore(
    (s) => s.role === 'parent' && (!s.guardianId || s.guardianAccessLevel === 'admin'),
  );
  const bankName = useAuthStore((s) => s.bankName);
  const familyId = useAuthStore((s) => s.familyId);
  const logout = useAuthStore((s) => s.logout);
  const clearSession = useParentSessionStore((s) => s.clearSession);
  const selectedChild = useSelectedChild();
  const setContractRules = useBankStore((s) => s.setContractRules);
  const passkeyEnabled = useAuthStore((s) => s.passkeyEnabled);
  const setPasskeyEnabled = useAuthStore((s) => s.setPasskeyEnabled);
  const [deletingContract, setDeletingContract] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const subscriptionEntitlement = useSubscriptionStore((s) => s.entitlement);
  const wishlistLayout = useSettingsStore((s) => s.wishlistLayout);
  const setWishlistLayout = useSettingsStore((s) => s.setWishlistLayout);

  useEffect(() => {
    isPasskeySupported().then(setPasskeySupported);
  }, []);

  const handleCurrencyChange = (newCurrency: Currency) => {
    haptics.selection();
    setCurrency(newCurrency);
    setAuthCurrency(newCurrency);
  };

  const handleMathChallengeToggle = (value: boolean) => {
    haptics.selection();
    setMathChallengeEnabled(value);
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logout'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            clearSession();
            await logout();
            router.replace('/(onboarding)/welcome');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountStep1'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => setDeleteConfirmVisible(true),
        },
      ],
    );
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText.trim().toLowerCase() !== (bankName ?? '').trim().toLowerCase()) {
      haptics.error();
      Alert.alert(t('common.error'), t('settings.deleteAccountNameMismatch'));
      return;
    }
    setDeleting(true);
    try {
      await bankApi.deleteFamily();
      haptics.success();
      clearSession();
      await logout();
      router.replace('/(onboarding)/welcome');
    } catch {
      haptics.error();
      Alert.alert(t('common.error'), t('settings.deleteAccountError'));
    } finally {
      setDeleting(false);
      setDeleteConfirmVisible(false);
      setDeleteConfirmText('');
    }
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

            {canManageFamily && (
              <>
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
              </>
            )}

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

        {/* Mascot Picker — per child */}
        {selectedChild && canManageFamily && (
          <Card
            title={t('parent.mascotSection', { defaultValue: 'Mascote de {{name}}' }).replace('{{name}}', selectedChild.name)}
            className="mb-6"
          >
            <Text className="text-[15px] font-sans text-text-secondary mb-4">
              {t('parent.mascotHint', {
                defaultValue: 'Escolha o mascote animado que aparece na tela de {{name}}.',
                name: selectedChild.name,
              })}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingRight: 4 }}
            >
              {/* None option */}
              <Pressable
                onPress={async () => {
                  haptics.selection();
                  const prev = selectedChild.mascotId;
                  useBankStore.getState().updateChild(selectedChild.id, { mascotId: 'none' });
                  try {
                    await bankApi.updateChild(selectedChild.id, { mascotId: 'none' });
                  } catch {
                    useBankStore.getState().updateChild(selectedChild.id, { mascotId: prev });
                  }
                }}
                style={{
                  width: 100,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingTop: 8,
                  paddingBottom: 10,
                  borderRadius: 20,
                  backgroundColor: selectedChild.mascotId === 'none' ? '#FEF9C3' : '#f5f5f0',
                  borderWidth: selectedChild.mascotId === 'none' ? 2.5 : 0,
                  borderColor: '#FFD600',
                }}
              >
                <View style={{ width: 80, height: 80, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e8e8e0' }}>
                  <MaterialCommunityIcons name="eye-off-outline" size={32} color="#9ca3af" />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '600', marginTop: 6, color: selectedChild.mascotId === 'none' ? '#1a1a14' : '#6b6b5a' }}>
                  Nenhum
                </Text>
                {selectedChild.mascotId === 'none' && (
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={20}
                    color="#FFD600"
                    style={{ position: 'absolute', top: 4, right: 4 }}
                  />
                )}
              </Pressable>

              {/* Animated mascots */}
              {MASCOTS.map((m) => {
                const isActive = selectedChild.mascotId === m.id || (!selectedChild.mascotId && m.id === 'dino');
                return (
                  <MascotPickerItem
                    key={m.id}
                    mascot={m}
                    isActive={isActive}
                    onSelect={async () => {
                      haptics.selection();
                      const prev = selectedChild.mascotId;
                      useBankStore.getState().updateChild(selectedChild.id, { mascotId: m.id });
                      try {
                        await bankApi.updateChild(selectedChild.id, { mascotId: m.id });
                      } catch {
                        useBankStore.getState().updateChild(selectedChild.id, { mascotId: prev });
                      }
                    }}
                  />
                );
              })}
            </ScrollView>
          </Card>
        )}

        {/* Wishlist Layout */}
        <Card
          title={t('parent.wishlistLayoutSection')}
          className="mb-6"
        >
          <Text className="text-[15px] font-sans text-text-secondary mb-4">
            {t('parent.wishlistLayoutHint')}
          </Text>
          <View className="flex-row" style={{ gap: 12 }}>
            <Pressable
              onPress={() => {
                haptics.selection();
                setWishlistLayout('feed');
              }}
              className={`flex-1 items-center py-4 rounded-2xl ${
                wishlistLayout === 'feed' ? 'bg-primary-50' : 'bg-background-light'
              }`}
              style={
                wishlistLayout === 'feed'
                  ? { borderWidth: 2, borderColor: '#FFD600' }
                  : undefined
              }
            >
              <MaterialCommunityIcons
                name="view-agenda-outline"
                size={24}
                color={wishlistLayout === 'feed' ? '#1a1a14' : '#6b6b5a'}
              />
              <Text
                className={`text-[15px] font-sans-semibold mt-2 ${
                  wishlistLayout === 'feed' ? 'text-text' : 'text-text-secondary'
                }`}
              >
                {t('parent.wishlistLayoutFeed')}
              </Text>
              {wishlistLayout === 'feed' && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#FFD600"
                  style={{ position: 'absolute', top: 4, right: 4 }}
                />
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                haptics.selection();
                setWishlistLayout('grid');
              }}
              className={`flex-1 items-center py-4 rounded-2xl ${
                wishlistLayout === 'grid' ? 'bg-primary-50' : 'bg-background-light'
              }`}
              style={
                wishlistLayout === 'grid'
                  ? { borderWidth: 2, borderColor: '#FFD600' }
                  : undefined
              }
            >
              <MaterialCommunityIcons
                name="view-grid-outline"
                size={24}
                color={wishlistLayout === 'grid' ? '#1a1a14' : '#6b6b5a'}
              />
              <Text
                className={`text-[15px] font-sans-semibold mt-2 ${
                  wishlistLayout === 'grid' ? 'text-text' : 'text-text-secondary'
                }`}
              >
                {t('parent.wishlistLayoutGrid')}
              </Text>
              {wishlistLayout === 'grid' && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#FFD600"
                  style={{ position: 'absolute', top: 4, right: 4 }}
                />
              )}
            </Pressable>
          </View>
        </Card>

        {/* Subscription */}
        <Card
          title={t('subscription.myPlan', { defaultValue: 'Meu Plano' })}
          className="mb-6"
        >
          <Text className="text-[15px] font-sans text-text-secondary mb-4">
            {t('subscription.myPlanHint', { defaultValue: 'Gerencie sua assinatura e veja seu plano atual.' })}
          </Text>
          <Pressable
            onPress={() => {
              haptics.light();
              router.push('/(modals)/paywall');
            }}
            className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialCommunityIcons name="star-circle" size={24} color="#FFD600" />
            <View className="flex-1 ml-3.5">
              <Text className="text-[17px] font-sans-semibold text-text">
                {subscriptionEntitlement === 'free'
                  ? t('subscription.freePlan', { defaultValue: 'Plano Gratuito' })
                  : subscriptionEntitlement === 'familia'
                  ? t('subscription.familiaPlan', { defaultValue: 'Plano Família' })
                  : t('subscription.familiaPlusPlan', { defaultValue: 'Plano Família+' })}
              </Text>
              <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                {subscriptionEntitlement === 'free'
                  ? t('subscription.upgradeNow', { defaultValue: 'Faça upgrade para mais recursos' })
                  : t('subscription.managePlan', { defaultValue: 'Gerenciar assinatura' })}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </Pressable>
        </Card>

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
              trackColor={{ false: '#d1d5db', true: '#FFD600' }}
              thumbColor="#ffffff"
            />
          </View>
        </Card>

        {/* Passkey */}
        {passkeySupported && (
          <Card
            title={t('auth.passkeySection')}
            className="mb-6"
          >
            <Text className="text-[15px] font-sans text-text-secondary mb-4">
              {t('auth.passkeySectionHint')}
            </Text>

            <Pressable
              onPress={async () => {
                if (passkeyEnabled) {
                  return;
                }
                setPasskeyLoading(true);
                haptics.medium();
                try {
                  const success = await registerPasskey();
                  if (success) {
                    await setPasskeyEnabled(true);
                    haptics.success();
                    Alert.alert(t('common.success'), t('auth.passkeySuccess'));
                  }
                } catch {
                  haptics.error();
                  Alert.alert(t('common.error'), t('auth.passkeyError'));
                } finally {
                  setPasskeyLoading(false);
                }
              }}
              disabled={passkeyLoading}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons
                name="shield-key-outline"
                size={24}
                color={passkeyEnabled ? '#22c55e' : '#1a1a14'}
              />
              <View className="flex-1 ml-3.5">
                <Text className="text-[17px] font-sans-semibold text-text">
                  {passkeyEnabled ? t('auth.managePasskey') : t('auth.registerPasskey')}
                </Text>
                <Text className="text-[13px] font-sans text-text-secondary mt-0.5">
                  {passkeyEnabled ? t('auth.passkeyRegistered') : t('auth.passkeyNotRegistered')}
                </Text>
              </View>
              {passkeyLoading ? (
                <Text className="text-[13px] font-sans text-text-secondary">...</Text>
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
              )}
            </Pressable>
          </Card>
        )}

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

          {/* Invite member (family admin only) */}
          {canManageFamily && (
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
        {selectedChild && canManageFamily && (
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
                      ? { borderWidth: 2, borderColor: '#FFD600' }
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
                        color="#FFD600"
                      />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Account */}
        <Card
          title={t('settings.accountSection', { defaultValue: 'Conta' })}
          className="mb-6"
        >
          <Text className="text-[15px] font-sans text-text-secondary mb-4">
            {t('settings.accountSectionHint', {
              defaultValue: 'Gerencie sua sessão e conta.',
            })}
          </Text>

          {/* Family ID (for support) */}
          {familyId && (
            <Pressable
              onPress={() => {
                Clipboard.setStringAsync(familyId);
                haptics.light();
                Alert.alert(
                  t('common.copied', { defaultValue: 'Copiado!' }),
                  t('settings.familyIdCopied', { defaultValue: 'ID da família copiado para a área de transferência.' }),
                );
              }}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light mb-3"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="identifier" size={24} color="#6b7280" />
              <View className="flex-1 ml-3.5">
                <Text className="text-[13px] font-sans text-text-secondary">
                  {t('settings.familyId', { defaultValue: 'ID da Família' })}
                </Text>
                <Text className="text-[12px] font-sans text-text-secondary mt-0.5" numberOfLines={1}>
                  {familyId}
                </Text>
              </View>
              <MaterialCommunityIcons name="content-copy" size={18} color="#9ca3af" />
            </Pressable>
          )}

          {/* Logout */}
          <Pressable
            onPress={() => {
              haptics.medium();
              handleLogout();
            }}
            className="flex-row items-center py-4 px-5 rounded-2xl bg-background-light mb-3"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <MaterialCommunityIcons name="logout" size={24} color="#ef4444" />
            <View className="flex-1 ml-3.5">
              <Text className="text-[17px] font-sans-semibold text-red-500">
                {t('settings.logout')}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
          </Pressable>

          {/* Delete Account (owner only) */}
          {isOwner && !deleteConfirmVisible && (
            <Pressable
              onPress={() => {
                haptics.heavy();
                handleDeleteAccount();
              }}
              className="flex-row items-center py-4 px-5 rounded-2xl bg-red-50"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="delete-forever-outline" size={24} color="#ef4444" />
              <View className="flex-1 ml-3.5">
                <Text className="text-[17px] font-sans-semibold text-red-500">
                  {t('settings.deleteAccount')}
                </Text>
                <Text className="text-[13px] font-sans text-red-400 mt-0.5">
                  {t('settings.deleteAccountConfirm')}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Delete confirmation inline */}
          {isOwner && deleteConfirmVisible && (
            <View className="rounded-2xl bg-red-50 p-5">
              <Text className="text-[15px] font-sans-semibold text-red-500 mb-3">
                {t('settings.deleteAccountTypeName', {
                  defaultValue: 'Digite o nome do banco para confirmar',
                })}
              </Text>
              <TextInput
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder={bankName ?? ''}
                placeholderTextColor="#d1d5db"
                className="bg-white rounded-xl px-4 py-3 text-[16px] font-sans text-text border border-red-200 mb-3"
                autoFocus
                editable={!deleting}
              />
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => {
                    setDeleteConfirmVisible(false);
                    setDeleteConfirmText('');
                  }}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-white items-center border border-border"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text className="text-[15px] font-sans-semibold text-text">
                    {t('common.cancel')}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleConfirmDelete}
                  disabled={deleting}
                  className="flex-1 py-3 rounded-xl bg-red-500 items-center"
                  style={({ pressed }) => ({ opacity: pressed || deleting ? 0.5 : 1 })}
                >
                  <Text className="text-[15px] font-sans-semibold text-white">
                    {deleting ? t('common.loading') : t('common.confirm')}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeArea>
  );
}
