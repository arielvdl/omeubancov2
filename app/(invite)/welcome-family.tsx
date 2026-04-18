import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeArea } from '@/src/components/layout/SafeArea';
import { haptics } from '@/src/utils/haptics';

export default function WelcomeFamilyScreen() {
  const { familyName, roleLabel, accessLevel } = useLocalSearchParams<{
    familyName: string;
    roleLabel: string;
    accessLevel?: 'admin' | 'member';
  }>();
  const { t } = useTranslation();
  const router = useRouter();

  const handleStart = () => {
    haptics.success();
    router.replace('/(tabs)');
  };

  return (
    <SafeArea>
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-24 h-24 rounded-full bg-primary-50 items-center justify-center mb-6">
          <MaterialCommunityIcons name="account-group" size={48} color="#f5a623" />
        </View>

        <Text className="text-[26px] font-sans-bold text-text text-center mb-2">
          {t('invitation.welcomeTitle')}
        </Text>

        {familyName && (
          <Text className="text-[17px] font-sans text-text-secondary text-center mb-1">
            {t('invitation.welcomeSubtitle')}
          </Text>
        )}

        {familyName && (
          <Text className="text-[20px] font-sans-bold text-primary text-center mb-6">
            {familyName}
          </Text>
        )}

        {roleLabel && (
          <View className="bg-primary-50 py-2 px-5 rounded-full mb-2">
            <Text className="text-[15px] font-sans-semibold text-text">
              {roleLabel}
            </Text>
          </View>
        )}

        {accessLevel && (
          <View className="bg-background-light py-2 px-5 rounded-full mb-6">
            <Text className="text-[13px] font-sans-semibold text-text-secondary">
              {t(
                accessLevel === 'admin'
                  ? 'invitation.accessAdmin'
                  : 'invitation.accessMember',
              )}
            </Text>
          </View>
        )}

        <Text className="text-[15px] font-sans text-text-secondary text-center mb-10 leading-6 px-4">
          {t('invitation.welcomeMessage')}
        </Text>

        <Pressable
          onPress={handleStart}
          className="bg-primary py-4 px-10 rounded-2xl w-full items-center"
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <Text className="text-[17px] font-sans-bold text-black">
            {t('invitation.welcomeCta')}
          </Text>
        </Pressable>
      </View>
    </SafeArea>
  );
}
