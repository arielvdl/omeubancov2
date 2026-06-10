import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { invitationsApi } from '@/src/services/api/invitations';
import { activateFamilySession } from '@/src/services/family-session';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { haptics } from '@/src/utils/haptics';
import { captureError } from '@/src/utils/logger';

interface Membership {
  familyId: string;
  familyName: string;
  currency: 'BRL' | 'USD' | 'EUR';
  role: 'owner' | 'guardian';
  guardianId?: string;
  accessLevel?: string;
  roleLabel?: string;
}

export default function FamilySwitcherModal() {
  const { t } = useTranslation();
  const router = useRouter();
  const currentFamilyId = useAuthStore((s) => s.familyId);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await invitationsApi.getMemberships();
        setMemberships(res.data?.families ?? []);
      } catch (err) {
        captureError(err, 'Load memberships');
        Alert.alert(t('common.error'), t('common.errorGeneric'));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [t]);

  const handleSwitch = async (membership: Membership) => {
    if (membership.familyId === currentFamilyId || switchingTo) return;
    setSwitchingTo(membership.familyId);
    haptics.medium();
    try {
      const res = await invitationsApi.switchFamily(membership.familyId);
      const data = res.data;
      await activateFamilySession({
        token: data.token,
        family: data.family,
        guardianId: data.guardianId,
        roleLabel: data.roleLabel,
        guardianAccessLevel: data.guardianAccessLevel,
      });
      haptics.success();
      router.dismissAll();
      router.replace('/(tabs)');
    } catch (err: any) {
      haptics.error();
      captureError(err, 'Switch family');
      Alert.alert(t('common.error'), err?.response?.data?.error ?? t('common.errorGeneric'));
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <SafeArea>
      <View className="flex-row items-center justify-between px-7 pt-4 pb-2">
        <Text className="text-[22px] font-sans-bold text-text">
          {t('invitation.myFamilies')}
        </Text>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <MaterialCommunityIcons name="close" size={26} color="#1a1a0e" />
        </Pressable>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 28, paddingTop: 12 }}>
          {memberships.map((m) => {
            const isCurrent = m.familyId === currentFamilyId;
            const isSwitching = switchingTo === m.familyId;
            return (
              <Pressable
                key={m.familyId}
                onPress={() => handleSwitch(m)}
                disabled={isCurrent || !!switchingTo}
                className={`flex-row items-center rounded-2xl p-5 mb-3 ${
                  isCurrent ? 'bg-primary-50' : 'bg-background-light'
                }`}
                style={({ pressed }) => ({
                  opacity: pressed && !isCurrent ? 0.7 : 1,
                  borderWidth: 2,
                  borderColor: isCurrent ? '#FFD600' : 'transparent',
                })}
              >
                <View className="w-11 h-11 rounded-full bg-primary items-center justify-center">
                  <MaterialCommunityIcons
                    name={m.role === 'owner' ? 'crown-outline' : 'account-heart-outline'}
                    size={22}
                    color="#1a1a0e"
                  />
                </View>
                <View className="flex-1 ml-3.5">
                  <Text className="text-[16px] font-sans-bold text-text">{m.familyName}</Text>
                  <Text className="text-[13px] font-sans text-text-secondary">
                    {m.role === 'owner'
                      ? t('invitation.owner')
                      : (m.roleLabel ?? t('invitation.accessMember'))}
                  </Text>
                </View>
                {isSwitching ? (
                  <ActivityIndicator />
                ) : isCurrent ? (
                  <Text className="text-[12px] font-sans-semibold text-text-secondary">
                    {t('invitation.currentFamily')}
                  </Text>
                ) : (
                  <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeArea>
  );
}
