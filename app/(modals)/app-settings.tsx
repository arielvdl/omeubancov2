import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { Header } from '@/src/components/layout/Header';
import { Card } from '@/src/components/ui/Card';
import { Toggle } from '@/src/components/ui/Toggle';
import { Button } from '@/src/components/ui/Button';
import { useSettingsStore } from '@/src/stores/useSettingsStore';
import { haptics } from '@/src/utils/haptics';
import Constants from 'expo-constants';

export default function AppSettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = useSettingsStore((s) => s.locale);
  const setLocale = useSettingsStore((s) => s.setLocale);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleLanguageToggle = () => {
    haptics.selection();
    const newLocale = locale === 'pt-BR' ? 'en-US' : 'pt-BR';
    setLocale(newLocale);
    i18n.changeLanguage(newLocale);
  };

  return (
    <SafeArea>
      <Header
        title={t('settings.title')}
        showBack
        onBack={() => router.back()}
      />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 28, paddingBottom: 56 }}
        showsVerticalScrollIndicator={false}
      >
        {/* General */}
        <Card title={t('settings.general', { defaultValue: 'Geral' })} className="mb-6">
          <Pressable
            onPress={handleLanguageToggle}
            className="flex-row items-center justify-between py-4"
          >
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="translate" size={22} color="#6b6b5a" />
              <Text className="text-[17px] font-sans-semibold text-text ml-3.5">
                {t('settings.language')}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-[15px] font-sans text-text-secondary mr-2">
                {locale === 'pt-BR' ? 'Português' : 'English'}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#6b6b5a" />
            </View>
          </Pressable>
        </Card>

        {/* Notifications */}
        <Card title={t('settings.notifications')} className="mb-6">
          <Toggle
            label={t('settings.pushNotifications', { defaultValue: 'Notificações push' })}
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            description={t('settings.notificationsDescription')}
          />
        </Card>

        {/* Appearance */}
        <Card title={t('settings.appearance', { defaultValue: 'Aparência' })} className="mb-6">
          <Text className="text-[15px] font-sans-semibold text-text mb-3">
            {t('settings.theme')}
          </Text>
          <View className="flex-row gap-3">
            {(['light', 'dark', 'system'] as const).map((themeOption) => {
              const isActive = theme === themeOption;
              const labelKey = `settings.theme${themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}` as const;
              return (
                <Pressable
                  key={themeOption}
                  onPress={() => {
                    haptics.selection();
                    setTheme(themeOption);
                  }}
                  className={`flex-1 py-3.5 rounded-2xl items-center ${
                    isActive ? 'bg-primary-50' : 'bg-background-light'
                  }`}
                  style={isActive ? {
                    borderWidth: 2,
                    borderColor: '#f5e63d',
                  } : undefined}
                >
                  <Text
                    className={`text-[15px] font-sans-semibold ${
                      isActive ? 'text-text' : 'text-text-secondary'
                    }`}
                  >
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* Parent Area */}
        <Card title={t('settings.parentArea', { defaultValue: 'Área dos pais' })} className="mb-6">
          <Button
            title={t('settings.parentAccess', { defaultValue: 'Acessar área dos pais' })}
            onPress={() =>
              router.push({
                pathname: '/(parent)/pin-entry',
                params: { returnTo: '/(parent)/parent-settings' },
              })
            }
            variant="secondary"
            fullWidth
            icon="shield-lock-outline"
          />
        </Card>

        {/* About */}
        <Card title={t('settings.aboutSection', { defaultValue: 'Sobre' })} className="mb-6">
          <View className="flex-row items-center justify-between py-4">
            <Text className="text-[17px] font-sans text-text">
              {t('settings.appVersion', { defaultValue: 'Versão do app' })}
            </Text>
            <Text className="text-[15px] font-sans text-text-secondary">
              {appVersion}
            </Text>
          </View>
          <View className="h-px bg-border" />
          <View className="py-4">
            <Text className="text-[17px] font-sans text-text">
              {t('settings.credits', { defaultValue: 'Créditos' })}
            </Text>
            <Text className="text-[15px] font-sans text-text-secondary mt-2">
              {t('settings.creditsText', {
                defaultValue: 'Feito com amor para educação financeira infantil',
              })}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeArea>
  );
}
