import React, { useCallback } from 'react';
import { View, Text, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Avatar } from '@/src/components/ui/Avatar';
import { useBankStore } from '@/src/stores/useBankStore';
import { useCurrency } from '@/src/hooks/useCurrency';
import { haptics } from '@/src/utils/haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Child } from '@/src/types/bank';

export default function ChildSwitcherScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { format } = useCurrency();
  const children = useBankStore((s) => s.children);
  const selectedChildId = useBankStore((s) => s.selectedChildId);
  const setSelectedChild = useBankStore((s) => s.setSelectedChild);

  const handleSelect = useCallback(
    (childId: string) => {
      haptics.selection();
      setSelectedChild(childId);
      router.back();
    },
    [setSelectedChild, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: Child }) => {
      const isSelected = item.id === selectedChildId;
      return (
        <Pressable
          onPress={() => handleSelect(item.id)}
          className={`flex-row items-center p-6 mx-6 my-2.5 rounded-3xl ${
            isSelected ? 'bg-primary-50' : 'bg-surface'
          }`}
          style={({ pressed }) => ({
            opacity: pressed ? 0.7 : 1,
            ...(isSelected
              ? { borderWidth: 2, borderColor: '#f5e63d' }
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
          <View className="flex-1 ml-5">
            <Text className="text-[22px] font-sans-bold text-text">{item.name}</Text>
            <Text className="text-[15px] font-sans text-text-secondary mt-1">
              {t('modals.childSwitcher.currentBalance', {
                balance: format(item.balance),
              })}
            </Text>
          </View>
          {isSelected && (
            <MaterialCommunityIcons name="check-circle" size={28} color="#f5e63d" />
          )}
        </Pressable>
      );
    },
    [selectedChildId, handleSelect, format, t],
  );

  return (
    <SafeArea>
      <Header
        title={t('modals.childSwitcher.title', { defaultValue: t('dashboard.switchChild') })}
        showBack
        onBack={() => router.back()}
      />
      <FlatList
        data={children}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeArea>
  );
}
