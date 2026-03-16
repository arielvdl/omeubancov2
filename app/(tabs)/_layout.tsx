import React from 'react';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import { haptics } from '@/src/utils/haptics';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a1a0e',
        tabBarInactiveTintColor: '#6b6b5a',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
          height: 96,
          paddingBottom: 30,
          paddingTop: 12,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: 12,
          marginTop: 4,
        },
      }}
      screenListeners={{
        tabPress: () => {
          haptics.selection();
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused, color }) => (
            <View className="">
              <MaterialCommunityIcons
                name={focused ? 'home' : 'home-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: t('tabs.history'),
          tabBarIcon: ({ focused, color }) => (
            <View className="">
              <MaterialCommunityIcons
                name={focused ? 'clock' : 'clock-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.family', { defaultValue: 'Família' }),
          tabBarIcon: ({ focused, color }) => (
            <View className="">
              <MaterialCommunityIcons
                name={focused ? 'account-group' : 'account-group-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused, color }) => (
            <View className="">
              <MaterialCommunityIcons
                name={focused ? 'account' : 'account-outline'}
                size={26}
                color={color}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
