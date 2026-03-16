import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Avatar } from '@/src/components/ui/Avatar';
import { Button } from '@/src/components/ui/Button';
import { Card } from '@/src/components/ui/Card';
import { BalanceDisplay } from '@/src/components/balance/BalanceDisplay';
import { useSelectedChild } from '@/src/hooks/useSelectedChild';
import { formatDate } from '@/src/i18n/formatters';
import { useCurrency } from '@/src/hooks/useCurrency';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const selectedChild = useSelectedChild();
  const { locale } = useCurrency();

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
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-[17px] font-sans text-text-secondary">
              {t('profile.birthDate')}
            </Text>
            <Text className="text-[17px] font-sans-semibold text-text">
              {selectedChild.birthDate
                ? formatDate(selectedChild.birthDate, locale)
                : t('profile.notSet')}
            </Text>
          </View>
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
