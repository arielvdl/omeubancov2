import React, { useCallback } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Avatar } from '@/src/components/ui/Avatar';
import { useBankStore } from '@/src/stores/useBankStore';
import { useCurrency } from '@/src/hooks/useCurrency';
import { haptics } from '@/src/utils/haptics';
import type { Child } from '@/src/types/bank';

export default function FamilyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format } = useCurrency();
  const children = useBankStore((s) => s.children);
  const selectedChildId = useBankStore((s) => s.selectedChildId);
  const setSelectedChild = useBankStore((s) => s.setSelectedChild);

  const handleSelect = useCallback(
    (childId: string) => {
      if (childId === selectedChildId) return;
      haptics.selection();
      setSelectedChild(childId);
      router.replace('/(tabs)');
    },
    [setSelectedChild, selectedChildId, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Child }) => {
      const isSelected = item.id === selectedChildId;
      return (
        <Pressable
          onPress={() => handleSelect(item.id)}
          className={`flex-row items-center p-5 mx-6 my-2 rounded-3xl ${
            isSelected ? 'bg-primary-50' : 'bg-surface'
          }`}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            ...(isSelected
              ? { borderWidth: 2, borderColor: '#FFD600' }
              : {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 16,
                  elevation: 3,
                }),
          })}
        >
          <Avatar avatarId={item.avatarUrl ?? undefined} size="lg" />
          <View className="flex-1 ml-4">
            <Text className="text-[20px] font-sans-bold text-text">{item.name}</Text>
            <Text className="text-[15px] font-sans text-text-secondary mt-1">
              {t('modals.childSwitcher.currentBalance', {
                defaultValue: 'Saldo: {{balance}}',
                balance: format(item.balance),
              })}
            </Text>
          </View>
          {isSelected && (
            <MaterialCommunityIcons name="check-circle" size={28} color="#FFD600" />
          )}
        </Pressable>
      );
    },
    [selectedChildId, handleSelect, format, t],
  );

  const ListHeader = useCallback(() => (
    <View className="px-6 mb-4">
      <Text className="text-[15px] font-sans text-text-secondary text-center">
        {t('family.subtitle', {
          defaultValue: 'Toque em um perfil para trocar a criança ativa.',
        })}
      </Text>
    </View>
  ), [t]);

  const ListFooter = useCallback(() => (
    <View className="px-6 mt-4">
      <Pressable
        onPress={() => {
          haptics.light();
          router.push({
            pathname: '/(parent)/pin-entry',
            params: { returnTo: '/(parent)/parent-settings' },
          });
        }}
        className="flex-row items-center justify-center py-4 px-5 rounded-2xl bg-surface"
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        })}
      >
        <MaterialCommunityIcons name="shield-lock-outline" size={20} color="#6b6b5a" />
        <Text className="text-[15px] font-sans-semibold text-text-secondary ml-2.5">
          {t('family.parentArea', { defaultValue: 'Área dos pais' })}
        </Text>
      </Pressable>
    </View>
  ), [t, router]);

  return (
    <SafeArea>
      <Header title={t('family.title', { defaultValue: 'Família' })} />
      <FlatList
        data={children}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        contentContainerStyle={{ paddingVertical: 10, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeArea>
  );
}
