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
import { SafeArea } from '@/src/components/layout/SafeArea';
import { invitationsApi } from '@/src/services/api/invitations';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { haptics } from '@/src/utils/haptics';
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

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !roleLabel?.trim()) {
      Alert.alert(t('common.error'), t('auth.fillAllFields'));
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

      const { token, family, guardianId, roleLabel: rl } = res.data;
      await setAuth(token, family.id, 'parent', undefined, guardianId, rl);
      haptics.success();
      router.replace('/(tabs)');
    } catch (err: any) {
      haptics.error();
      const msg = err?.response?.data?.error ?? t('common.errorGeneric');
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
                      ? { borderWidth: 2, borderColor: '#f5e63d' }
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
            disabled={submitting}
            className="bg-primary py-4 rounded-2xl items-center mb-4"
            style={({ pressed }) => ({ opacity: pressed || submitting ? 0.7 : 1 })}
          >
            <Text className="text-[17px] font-sans-bold text-black">
              {submitting ? t('common.loading') : t('invitation.createAccount')}
            </Text>
          </Pressable>

          {/* Login link */}
          <Pressable
            onPress={() => router.replace('/')}
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
