import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { invitationsApi } from '@/src/services/api/invitations';
import { bankApi } from '@/src/services/api/bank';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { activateFamilySession } from '@/src/services/family-session';
import { startGoogleSignIn } from '@/src/services/google-auth';
import { startAppleSignIn } from '@/src/services/apple-auth';
import { haptics } from '@/src/utils/haptics';
import { captureError } from '@/src/utils/logger';
import type { InvitationInfo } from '@/src/types/invitation';

const ROLE_OPTIONS = [
  { key: 'rolePai', value: 'Pai' },
  { key: 'roleMae', value: 'Mãe' },
  { key: 'roleTio', value: 'Tio' },
  { key: 'roleTia', value: 'Tia' },
  { key: 'roleAvo', value: 'Avô' },
  { key: 'roleAvoa', value: 'Avó' },
  { key: 'roleOutro', value: '' },
];

export default function AcceptInviteScreen() {
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBankName = useAuthStore((s) => s.setBankName);
  const setCurrency = useAuthStore((s) => s.setCurrency);
  const setOnboardingComplete = useAuthStore((s) => s.setOnboardingComplete);
  const currentToken = useAuthStore((s) => s.token);
  const currentFamilyId = useAuthStore((s) => s.familyId);
  const logout = useAuthStore((s) => s.logout);

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  // Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [customRole, setCustomRole] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchInfo() {
      try {
        const res = await invitationsApi.getInvitationInfo(inviteCode);
        const data = res.data as InvitationInfo;
        if (data.status !== 'pending') {
          const errorKey =
            data.status === 'expired'
              ? 'invitation.inviteExpired'
              : data.status === 'revoked'
                ? 'invitation.inviteRevoked'
                : 'invitation.inviteAccepted';
          setError(t(errorKey));
        } else {
          setInfo(data);
        }
      } catch {
        setError(t('invitation.invalidInvite'));
      } finally {
        setLoading(false);
      }
    }
    fetchInfo();
  }, [inviteCode, t]);

  const roleLabel = selectedRole === '' ? customRole : selectedRole;

  const hydrateJoinedFamily = async (family: {
    id: string;
    name: string;
    currency: 'BRL' | 'USD' | 'EUR';
  }) => {
    await setBankName(family.name);
    await setCurrency(family.currency);
    await setOnboardingComplete(true);

    try {
      const [childrenRes, familyRes] = await Promise.all([
        bankApi.getChildren(),
        bankApi.getFamily(),
      ]);

      if (familyRes.data) {
        useBankStore.getState().setFamily(familyRes.data);
      }
      if (childrenRes.data?.length > 0) {
        useBankStore.getState().setChildren(childrenRes.data);
        useBankStore.getState().setSelectedChild(childrenRes.data[0].id);
      }
      useBankStore.getState().setHydrated(true);

      const { useSubscriptionStore } = await import('@/src/stores/useSubscriptionStore');
      await Promise.all([
        useSubscriptionStore.getState().loadSubscription(),
        useSubscriptionStore.getState().loadLimits(),
      ]);
    } catch (err) {
      useBankStore.getState().setFamily({
        id: family.id,
        name: family.name,
        currency: family.currency,
        locale: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        createdAt: new Date().toISOString(),
      });
      useBankStore.getState().setHydrated(false);
      captureError(err, 'Hydrate invited family');
    }
  };

  // Multi-família: aceita o convite com a conta autenticada atual e ativa
  // a sessão na família do convite.
  const acceptWithCurrentAccount = async () => {
    setAccepting(true);
    try {
      const res = await invitationsApi.acceptInvitation(
        inviteCode,
        roleLabel?.trim() || undefined,
      );
      const data = res.data;

      if (data.token && data.family) {
        await activateFamilySession({
          token: data.token,
          family: data.family,
          guardianId: data.guardianId,
          roleLabel: data.roleLabel,
          guardianAccessLevel: data.guardianAccessLevel,
        });
        haptics.success();
        if (data.joined) {
          router.replace({
            pathname: '/(invite)/welcome-family',
            params: {
              familyName: data.family.name,
              roleLabel: data.roleLabel,
              accessLevel: data.guardianAccessLevel,
            },
          });
        } else {
          router.replace('/(tabs)');
        }
      } else {
        // alreadyMember na família atual
        haptics.success();
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      haptics.error();
      captureError(err, 'Accept invite with account');
      const msg = err?.response?.data?.error ?? t('common.errorGeneric');
      Alert.alert(t('common.error'), msg);
    } finally {
      setAccepting(false);
    }
  };

  // Convidado sem conta local: entra com Google/Apple (cria/recupera a
  // conta) e aceita o convite em seguida.
  const handleOAuthAccept = async (provider: 'google' | 'apple') => {
    setAccepting(true);
    haptics.medium();
    try {
      let result;
      if (provider === 'google') {
        const r = await startGoogleSignIn();
        if (r?.error) throw new Error(r.error);
        result = r;
      } else {
        result = await startAppleSignIn();
      }
      if (!result) {
        // cancelado pelo usuário
        setAccepting(false);
        return;
      }

      await setAuth(
        result.token,
        result.familyId,
        'parent',
        undefined,
        result.guardianId,
        result.roleLabel,
        result.guardianAccessLevel,
      );
      await acceptWithCurrentAccount();
    } catch (err: any) {
      haptics.error();
      captureError(err, `Invite OAuth ${provider}`);
      Alert.alert(t('common.error'), t('common.errorGeneric'));
    } finally {
      setAccepting(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !roleLabel?.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert(t('common.error'), t('invitation.invalidEmail'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('invitation.passwordTooShort'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await invitationsApi.guardianRegister({
        inviteCode,
        email: email.trim(),
        password,
        name: name.trim(),
        roleLabel: roleLabel.trim(),
      });

      const { token, family, guardianId, roleLabel: rl, guardianAccessLevel } = res.data;
      await setAuth(
        token,
        family.id,
        'parent',
        undefined,
        guardianId,
        rl,
        guardianAccessLevel,
      );
      await hydrateJoinedFamily(family);
      haptics.success();
      router.replace({
        pathname: '/(invite)/welcome-family',
        params: {
          familyName: family.name,
          roleLabel: rl,
          accessLevel: guardianAccessLevel,
        },
      });
    } catch (err: any) {
      haptics.error();
      captureError(err, 'Guardian registration');
      const code = err?.response?.data?.code;
      const msg =
        code === 'email_in_use'
          ? t('invitation.emailInUseLogin')
          : (err?.response?.data?.error ?? t('common.errorGeneric'));
      Alert.alert(t('common.error'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center">
          <Text className="text-[15px] font-sans text-text-secondary">
            {t('common.loading')}
          </Text>
        </View>
      </SafeArea>
    );
  }

  if (error) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text className="text-[20px] font-sans-bold text-text mt-4 text-center">
            {t('invitation.invalidInvite')}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center">
            {error}
          </Text>
        </View>
      </SafeArea>
    );
  }

  // Already a member of the family this invite belongs to
  if (
    currentToken &&
    info?.status === 'pending' &&
    currentFamilyId &&
    info.familyId === currentFamilyId
  ) {
    return (
      <SafeArea>
        <View className="flex-1 items-center justify-center px-8">
          <MaterialCommunityIcons name="check-circle-outline" size={64} color="#22c55e" />
          <Text className="text-[20px] font-sans-bold text-text mt-4 text-center">
            {t('invitation.alreadyMemberTitle')}
          </Text>
          <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center mb-8">
            {t('invitation.alreadyMemberMessage')}
          </Text>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            className="bg-primary py-4 px-8 rounded-2xl w-full items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <Text className="text-[16px] font-sans-bold text-black">
              {t('invitation.openApp')}
            </Text>
          </Pressable>
        </View>
      </SafeArea>
    );
  }

  // Logado em outra família: multi-família — aceitar com a conta atual
  if (currentToken && info?.status === 'pending' && currentFamilyId) {
    const handleUseAnotherAccount = async () => {
      setSwitching(true);
      await logout();
      // After logout, stays on this screen — the auth-gated views will rerender
      // and the form will appear.
      setSwitching(false);
    };
    return (
      <SafeArea>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 28, flexGrow: 1, justifyContent: 'center' }}
        >
          <View className="items-center">
            <MaterialCommunityIcons name="account-group" size={64} color="#f5a623" />
            <Text className="text-[20px] font-sans-bold text-text mt-4 text-center">
              {t('invitation.acceptInviteTitle')}
            </Text>
            {info?.familyName && (
              <Text className="text-[17px] font-sans-semibold text-primary mt-1">
                {info.familyName}
              </Text>
            )}
            <Text className="text-[15px] font-sans text-text-secondary mt-2 text-center mb-6">
              {t('invitation.acceptWithAccountMessage')}
            </Text>
          </View>

          {/* Parentesco */}
          <Text className="text-[15px] font-sans-semibold text-text mb-3">
            {t('invitation.yourRole')}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {ROLE_OPTIONS.map((role) => {
              const isSelected = selectedRole === role.value;
              const isCustom = role.key === 'roleOutro';
              return (
                <Pressable
                  key={role.key}
                  onPress={() => {
                    haptics.selection();
                    setSelectedRole(role.value);
                  }}
                  className={`py-2.5 px-4 rounded-full ${
                    isSelected ? 'bg-primary-50' : 'bg-background-light'
                  }`}
                  style={
                    isSelected
                      ? { borderWidth: 2, borderColor: '#FFD600' }
                      : { borderWidth: 2, borderColor: 'transparent' }
                  }
                >
                  <Text
                    className={`text-[15px] font-sans-semibold ${
                      isSelected ? 'text-text' : 'text-text-secondary'
                    }`}
                  >
                    {isCustom ? t('invitation.roleOutro') : t(`invitation.${role.key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {selectedRole === '' && (
            <TextInput
              className="bg-background-light text-text text-[16px] font-sans py-4 px-5 rounded-2xl mb-2"
              placeholder={t('invitation.customRole')}
              placeholderTextColor="#9ca3af"
              value={customRole}
              onChangeText={setCustomRole}
              maxLength={50}
            />
          )}

          <Pressable
            onPress={acceptWithCurrentAccount}
            disabled={accepting || switching}
            className="bg-primary py-4 px-8 rounded-2xl w-full items-center mb-3 mt-4"
            style={({ pressed }) => ({ opacity: pressed || accepting ? 0.7 : 1 })}
          >
            <Text className="text-[16px] font-sans-bold text-black">
              {accepting ? t('common.loading') : t('invitation.acceptWithAccount')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            disabled={accepting}
            className="py-3 w-full items-center"
          >
            <Text className="text-[14px] font-sans text-text-secondary">
              {t('invitation.keepCurrentFamily')}
            </Text>
          </Pressable>
          <Pressable
            onPress={handleUseAnotherAccount}
            disabled={switching || accepting}
            className="py-3 w-full items-center"
          >
            <Text className="text-[14px] font-sans text-text-secondary underline">
              {switching ? t('common.loading') : t('invitation.useAnotherAccount')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="items-center mb-8">
            <MaterialCommunityIcons name="account-group" size={56} color="#f5a623" />
            <Text className="text-[22px] font-sans-bold text-text mt-3 text-center">
              {t('invitation.joinFamily')}
            </Text>
            {info?.familyName && (
              <Text className="text-[17px] font-sans-semibold text-primary mt-1">
                {info.familyName}
              </Text>
            )}
            {info?.accessLevel && (
              <View className="bg-background-light py-2 px-4 rounded-full mt-3">
                <Text className="text-[13px] font-sans-semibold text-text-secondary">
                  {t(
                    info.accessLevel === 'admin'
                      ? 'invitation.accessAdmin'
                      : 'invitation.accessMember',
                  )}
                </Text>
              </View>
            )}
          </View>

          {/* Role selection */}
          <Text className="text-[15px] font-sans-semibold text-text mb-3">
            {t('invitation.yourRole')}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {ROLE_OPTIONS.map((role) => {
              const isSelected = selectedRole === role.value;
              const isCustom = role.key === 'roleOutro';
              return (
                <Pressable
                  key={role.key}
                  onPress={() => {
                    haptics.selection();
                    setSelectedRole(role.value);
                  }}
                  className={`py-2.5 px-4 rounded-full ${
                    isSelected ? 'bg-primary-50' : 'bg-background-light'
                  }`}
                  style={
                    isSelected
                      ? { borderWidth: 2, borderColor: '#FFD600' }
                      : { borderWidth: 2, borderColor: 'transparent' }
                  }
                >
                  <Text
                    className={`text-[15px] font-sans-semibold ${
                      isSelected ? 'text-text' : 'text-text-secondary'
                    }`}
                  >
                    {isCustom ? t('invitation.roleOutro') : t(`invitation.${role.key}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {selectedRole === '' && (
            <TextInput
              className="bg-background-light text-text text-[16px] font-sans py-4 px-5 rounded-2xl mb-4"
              placeholder={t('invitation.customRole')}
              placeholderTextColor="#9ca3af"
              value={customRole}
              onChangeText={setCustomRole}
              maxLength={50}
            />
          )}

          {/* Name */}
          <Text className="text-[15px] font-sans-semibold text-text mb-2">
            {t('invitation.yourName')}
          </Text>
          <TextInput
            className="bg-background-light text-text text-[16px] font-sans py-4 px-5 rounded-2xl mb-4"
            placeholder={t('invitation.yourName')}
            placeholderTextColor="#9ca3af"
            value={name}
            onChangeText={setName}
            maxLength={100}
            autoCapitalize="words"
          />

          {/* Email */}
          <Text className="text-[15px] font-sans-semibold text-text mb-2">
            {t('invitation.yourEmail')}
          </Text>
          <TextInput
            className="bg-background-light text-text text-[16px] font-sans py-4 px-5 rounded-2xl mb-4"
            placeholder={t('auth.emailPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            maxLength={255}
          />

          {/* Password */}
          <Text className="text-[15px] font-sans-semibold text-text mb-2">
            {t('invitation.yourPassword')}
          </Text>
          <TextInput
            className="bg-background-light text-text text-[16px] font-sans py-4 px-5 rounded-2xl mb-6"
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            maxLength={128}
          />

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting || accepting}
            className="bg-primary py-4 rounded-2xl items-center mb-4"
            style={({ pressed }) => ({ opacity: pressed || submitting ? 0.7 : 1 })}
          >
            <Text className="text-[17px] font-sans-bold text-black">
              {submitting ? t('common.loading') : t('invitation.createAccount')}
            </Text>
          </Pressable>

          {/* OAuth: entrar com Google/Apple e aceitar o convite */}
          <View className="flex-row items-center my-2">
            <View className="flex-1 h-px bg-background-light" />
            <Text className="text-[13px] font-sans text-text-secondary mx-3">
              {t('invitation.orContinueWith')}
            </Text>
            <View className="flex-1 h-px bg-background-light" />
          </View>
          <Pressable
            onPress={() => handleOAuthAccept('google')}
            disabled={accepting || submitting}
            className="flex-row items-center justify-center bg-background-light py-4 rounded-2xl mb-3"
            style={({ pressed }) => ({ opacity: pressed || accepting ? 0.7 : 1 })}
          >
            <MaterialCommunityIcons name="google" size={20} color="#1a1a0e" />
            <Text className="text-[16px] font-sans-semibold text-text ml-2">
              {accepting ? t('common.loading') : t('invitation.continueWithGoogle')}
            </Text>
          </Pressable>
          {appleAvailable && (
            <Pressable
              onPress={() => handleOAuthAccept('apple')}
              disabled={accepting || submitting}
              className="flex-row items-center justify-center bg-background-light py-4 rounded-2xl mb-3"
              style={({ pressed }) => ({ opacity: pressed || accepting ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="apple" size={20} color="#1a1a0e" />
              <Text className="text-[16px] font-sans-semibold text-text ml-2">
                {accepting ? t('common.loading') : t('invitation.continueWithApple')}
              </Text>
            </Pressable>
          )}

          {/* Login link */}
          <Pressable
            onPress={() =>
              // Direto para welcome — passar por '/' (index) descarta os params
              // e o inviteCode se perderia no login.
              router.replace({
                pathname: '/(onboarding)/welcome',
                params: { inviteCode },
              })
            }
            className="items-center py-2"
          >
            <Text className="text-[14px] font-sans text-text-secondary underline">
              {t('invitation.alreadyHaveAccount')}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeArea>
  );
}
