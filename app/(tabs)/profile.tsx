import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, Platform, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { BalanceDisplay } from '@/src/components/balance/BalanceDisplay';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { useBankStore } from '@/src/stores/useBankStore';
import { bankApi } from '@/src/services/api/bank';
import { formatDate } from '@/src/i18n/formatters';


export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const selectedChild = useSelectedChild();
  const updateChild = useBankStore((s) => s.updateChild);
  const locale = i18n.language;

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isUpdatingDate, setIsUpdatingDate] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(new Date());

  const openDatePicker = useCallback(() => {
    setTempDate(
      selectedChild?.birthDate ? new Date(selectedChild.birthDate + 'T12:00:00') : new Date(),
    );
    setShowDatePicker(true);
  }, [selectedChild]);

  const saveBirthDate = useCallback(
    async (date: Date) => {
      if (!selectedChild) return;
      const dateStr = date.toISOString().split('T')[0];
      if (dateStr === selectedChild.birthDate) return;
      setIsUpdatingDate(true);
      try {
        await bankApi.updateChild(selectedChild.id, { birthDate: dateStr });
        updateChild(selectedChild.id, { birthDate: dateStr });
      } catch {
        // silently fail — data remains unchanged
      } finally {
        setIsUpdatingDate(false);
      }
    },
    [selectedChild, updateChild],
  );

  const handleDateChange = useCallback(
    (_event: unknown, date?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
        if (date) saveBirthDate(date);
      } else if (date) {
        setTempDate(date);
      }
    },
    [saveBirthDate],
  );

  const confirmDate = useCallback(() => {
    setShowDatePicker(false);
    saveBirthDate(tempDate);
  }, [tempDate, saveBirthDate]);

  if (!selectedChild) {
    return (
      <SafeArea>
        <Header title={t('profile.title')} />
        <View className="flex-1 items-center justify-center">
          <Text className="text-[17px] font-sans text-text-secondary">
            {t('common.noData')}
          </Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea>
      <Header title={t('profile.title')} />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar Section */}
        <View className="items-center mb-10">
          <Pressable
            onPress={() => {
              router.push('/(modals)/avatar-picker');
            }}
          >
            <Avatar
              avatarId={selectedChild.avatarUrl ?? undefined}
              size="xl"
            />
          </Pressable>
          <Text className="text-[30px] font-sans-bold text-text mt-6" style={{ lineHeight: 40 }}>
            {selectedChild.name}
          </Text>
          <View className="mt-2">
            <Button
              title={t('profile.changeAvatar')}
              onPress={() => router.push('/(modals)/avatar-picker')}
              variant="ghost"
              size="sm"
              icon="camera-outline"
            />
          </View>
        </View>

        {/* Balance */}
        <Card className="mb-6">
          <Text className="text-[15px] font-sans-medium text-text-secondary mb-3">
            {t('profile.balanceSummary')}
          </Text>
          <BalanceDisplay balance={selectedChild.balance} size="lg" />
        </Card>

        {/* Info */}
        <Card className="mb-6">
          <Pressable
            onPress={openDatePicker}
            className="flex-row items-center justify-between py-4"
          >
            <Text className="text-[17px] font-sans text-text-secondary">
              {t('profile.birthDate')}
            </Text>
            <View className="flex-row items-center gap-2">
              {isUpdatingDate ? (
                <ActivityIndicator size="small" color="#FFD600" />
              ) : (
                <>
                  <Text className="text-[17px] font-sans-semibold text-text">
                    {selectedChild.birthDate
                      ? formatDate(selectedChild.birthDate, locale)
                      : t('profile.notSet')}
                  </Text>
                  <MaterialCommunityIcons name="pencil-outline" size={16} color="#9ca3af" />
                </>
              )}
            </View>
          </Pressable>

          {/* iOS: Modal com spinner | Android: dialog nativo */}
          {showDatePicker && Platform.OS === 'ios' && (
            <Modal transparent animationType="slide">
              <Pressable
                style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
                onPress={() => setShowDatePicker(false)}
              />
              <View
                style={{
                  backgroundColor: '#faf9f0',
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                  paddingBottom: 34,
                }}
              >
                <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
                  <Pressable onPress={() => setShowDatePicker(false)}>
                    <Text className="text-[16px] font-sans text-text-secondary">
                      {t('common.cancel', { defaultValue: 'Cancelar' })}
                    </Text>
                  </Pressable>
                  <Pressable onPress={confirmDate}>
                    <Text className="text-[16px] font-sans-bold" style={{ color: '#FFD600' }}>
                      {t('common.confirm', { defaultValue: 'Confirmar' })}
                    </Text>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  themeVariant="light"
                />
              </View>
            </Modal>
          )}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
          <View className="h-px bg-border" />
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-[17px] font-sans text-text-secondary">
              {t('profile.memberSince')}
            </Text>
            <Text className="text-[17px] font-sans-semibold text-text">
              {formatDate(selectedChild.createdAt, locale)}
            </Text>
          </View>
        </Card>

        {/* Contract */}
        <Button
          title={t('profile.viewContract')}
          onPress={() => router.push('/(modals)/contract-view')}
          variant="secondary"
          fullWidth
          icon="file-document-outline"
        />

        {/* Settings */}
        <View className="mt-4">
          <Button
            title={t('settings.title')}
            onPress={() => router.push('/(modals)/app-settings')}
            variant="secondary"
            fullWidth
            icon="cog-outline"
          />
        </View>
      </ScrollView>
    </SafeArea>
  );
}
