import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { Avatar } from '@/src/components/ui/Avatar';
import { invitationsApi } from '@/src/services/api/invitations';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { useCurrency } from '@/src/hooks/useCurrency';
import { haptics } from '@/src/utils/haptics';
import { bankApi } from '@/src/services/api/bank';
import type { Guardian, FamilyInvitation } from '@/src/types/invitation';

export default function FamilyMembersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format } = useCurrency();
  const isOwner = useAuthStore((s) => s.role === 'parent' && !s.guardianId);
  const family = useBankStore((s) => s.family);
  const children = useBankStore((s) => s.children);
  const selectedChildId = useBankStore((s) => s.selectedChildId);
  const setSelectedChild = useBankStore((s) => s.setSelectedChild);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [guardiansRes, invitationsRes] = await Promise.all([
        invitationsApi.listGuardians(),
        invitationsApi.listInvitations(),
      ]);
      setGuardians(guardiansRes.data.guardians);
      setInvitations(
        invitationsRes.data.invitations.filter(
          (inv: FamilyInvitation) => inv.status === 'pending'
        )
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSelectChild = (childId: string) => {
    haptics.selection();
    setSelectedChild(childId);
  };

  const handleRemoveChild = (child: { id: string; name: string }) => {
    if (!isOwner) return;
    Alert.alert(
      t('parent.removeChild'),
      t('parent.removeChildConfirm', { name: child.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await bankApi.deleteChild(child.id);
              useBankStore.getState().removeChild(child.id);
              haptics.success();
            } catch {
              haptics.error();
              Alert.alert(t('common.error'), t('common.errorGeneric'));
            }
          },
        },
      ],
    );
  };

  const handleRemoveGuardian = (guardian: Guardian) => {
    Alert.alert(
      t('invitation.removeMember'),
      t('invitation.removeMemberConfirm', { name: guardian.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              await invitationsApi.removeGuardian(guardian.id);
              haptics.success();
              setGuardians((prev) => prev.filter((g) => g.id !== guardian.id));
            } catch {
              haptics.error();
              Alert.alert(t('common.error'), t('common.errorGeneric'));
            }
          },
        },
      ],
    );
  };

  const handleRevokeInvite = (invitation: FamilyInvitation) => {
    Alert.alert(
      t('invitation.revokeInvite'),
      t('invitation.revokeConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await invitationsApi.revokeInvitation(invitation.id);
              haptics.success();
              setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
            } catch {
              haptics.error();
              Alert.alert(t('common.error'), t('common.errorGeneric'));
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <SafeArea>
      <Header
        title={t('invitation.familyMembers')}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Children */}
        <Card
          title={t('onboarding.addChildren.title', { defaultValue: 'Crianças' })}
          className="mb-6"
        >
          {children.length === 0 ? (
            <Text className="text-[15px] font-sans text-text-secondary text-center py-4">
              {t('onboarding.addChildren.noChildren')}
            </Text>
          ) : (
            <View className="gap-3">
              {children.map((child) => {
                const isSelected = child.id === selectedChildId;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => handleSelectChild(child.id)}
                    className={`flex-row items-center py-3 px-4 rounded-2xl ${
                      isSelected ? 'bg-primary-50' : 'bg-background-light'
                    }`}
                    style={
                      isSelected
                        ? { borderWidth: 2, borderColor: '#FFD600' }
                        : { borderWidth: 2, borderColor: 'transparent' }
                    }
                  >
                    <Avatar avatarId={child.avatarUrl ?? undefined} size="sm" />
                    <View className="flex-1 ml-3">
                      <Text className="text-[17px] font-sans-semibold text-text">
                        {child.name}
                      </Text>
                      <Text className="text-[13px] font-sans text-text-secondary">
                        {format(child.balance)}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialCommunityIcons name="check-circle" size={22} color="#FFD600" />
                    )}
                    {isOwner && !isSelected && (
                      <Pressable
                        onPress={() => handleRemoveChild(child)}
                        hitSlop={12}
                        style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                      >
                        <MaterialCommunityIcons name="close-circle-outline" size={20} color="#ef4444" />
                      </Pressable>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Add child button */}
          {isOwner && (
            <Pressable
              onPress={() => {
                haptics.light();
                router.push('/(onboarding)/add-children');
              }}
              className="flex-row items-center justify-center py-3.5 mt-4 rounded-2xl bg-background-light"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#22c55e" />
              <Text className="text-[15px] font-sans-semibold text-text ml-2">
                {t('onboarding.addChildren.addChild')}
              </Text>
            </Pressable>
          )}
        </Card>

        {/* Owner */}
        <Card title={t('invitation.owner')} className="mb-6">
          <View className="flex-row items-center py-3 px-4 rounded-2xl bg-background-light">
            <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-3">
              <MaterialCommunityIcons name="crown" size={20} color="#f5a623" />
            </View>
            <View className="flex-1">
              <Text className="text-[17px] font-sans-semibold text-text">
                {family?.name ?? ''}
              </Text>
              <Text className="text-[13px] font-sans text-text-secondary">
                {t('invitation.owner')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Guardians */}
        <Card title={t('invitation.familyMembers')} className="mb-6">
          {guardians.length === 0 ? (
            <Text className="text-[15px] font-sans text-text-secondary text-center py-4">
              {t('invitation.noMembers')}
            </Text>
          ) : (
            <View className="gap-3">
              {guardians.map((guardian) => (
                <View
                  key={guardian.id}
                  className="flex-row items-center py-3 px-4 rounded-2xl bg-background-light"
                >
                  <View className="w-10 h-10 rounded-full bg-background items-center justify-center mr-3">
                    <MaterialCommunityIcons name="account" size={20} color="#6b6b5a" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[17px] font-sans-semibold text-text">
                      {guardian.name}
                    </Text>
                    <Text className="text-[13px] font-sans text-text-secondary">
                      {guardian.roleLabel} · {t('invitation.memberSince', { date: formatDate(guardian.createdAt) })}
                    </Text>
                  </View>
                  {isOwner && (
                    <Pressable
                      onPress={() => handleRemoveGuardian(guardian)}
                      hitSlop={12}
                      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                    >
                      <MaterialCommunityIcons name="close-circle-outline" size={22} color="#ef4444" />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Invite button */}
          {isOwner && (
            <Pressable
              onPress={() => {
                haptics.light();
                router.push('/(parent)/invite-member');
              }}
              className="flex-row items-center justify-center py-3.5 mt-4 rounded-2xl bg-background-light"
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
            >
              <MaterialCommunityIcons name="account-plus" size={20} color="#22c55e" />
              <Text className="text-[15px] font-sans-semibold text-text ml-2">
                {t('invitation.inviteFamily')}
              </Text>
            </Pressable>
          )}
        </Card>

        {/* Pending invites */}
        {isOwner && invitations.length > 0 && (
          <Card title={t('invitation.pendingInvites')} className="mb-6">
            <View className="gap-3">
              {invitations.map((inv) => (
                <View
                  key={inv.id}
                  className="flex-row items-center py-3 px-4 rounded-2xl bg-background-light"
                >
                  <View className="w-10 h-10 rounded-full bg-primary-50 items-center justify-center mr-3">
                    <MaterialCommunityIcons name="email-outline" size={20} color="#f5a623" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[15px] font-sans-semibold text-text tracking-wider">
                      {inv.inviteCode}
                    </Text>
                    <Text className="text-[13px] font-sans text-text-secondary">
                      {t('invitation.pending')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRevokeInvite(inv)}
                    hitSlop={12}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <MaterialCommunityIcons name="close-circle-outline" size={22} color="#ef4444" />
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeArea>
  );
}
