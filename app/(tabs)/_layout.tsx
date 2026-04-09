import React, { useEffect } from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { haptics } from '@/src/utils/haptics';
import { useSubscriptionStore } from '@/src/stores/useSubscriptionStore';

function WishlistTabIcon({ focused }: { focused: boolean }) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, { damping: 14, stiffness: 160 });
  }, [focused, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
    backgroundColor: interpolateColor(progress.value, [0, 1], ['#FFD600', '#22c55e']),
    shadowColor: interpolateColor(progress.value, [0, 1], ['#FFD600', '#22c55e']),
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: focused ? 0.4 : 0.2,
    shadowRadius: 8,
    elevation: focused ? 8 : 4,
  }));

  const heartStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    opacity: withTiming(focused ? 0 : 1, { duration: 250 }),
    transform: [
      { scale: withSpring(focused ? 0.3 : 1, { damping: 14, stiffness: 160 }) },
      { rotate: `${withTiming(focused ? 90 : 0, { duration: 300 })}deg` },
    ],
  }));

  const cameraStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    opacity: withTiming(focused ? 1 : 0, { duration: 250 }),
    transform: [
      { scale: withSpring(focused ? 1 : 0.3, { damping: 14, stiffness: 160 }) },
      { rotate: `${withTiming(focused ? 0 : -90, { duration: 300 })}deg` },
    ],
  }));

  return (
    <Animated.View style={containerStyle}>
      <Animated.View style={heartStyle}>
        <MaterialCommunityIcons name="heart" size={28} color="#1a1a0e" />
      </Animated.View>
      <Animated.View style={cameraStyle}>
        <MaterialCommunityIcons name="camera" size={28} color="#ffffff" />
      </Animated.View>
    </Animated.View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const canAddWishItem = useSubscriptionStore((s) => s.canAddWishItem);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1a1a0e',
        tabBarInactiveTintColor: '#6b6b5a',
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 20,
          height: 88,
          paddingBottom: 24,
          paddingTop: 12,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        },
      }}
      screenListeners={{
        tabPress: (e) => {
          haptics.selection();
          // If already on wishlist tab and tapping it again, open camera
          if (e.target?.startsWith('wishlist') && pathname === '/wishlist') {
            e.preventDefault();
            if (!canAddWishItem()) {
              router.push({ pathname: '/(modals)/paywall', params: { feature: 'wish_item' } });
            } else {
              router.push('/(modals)/wish-camera');
            }
          }
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? 'home' : 'home-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? 'clock' : 'clock-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          tabBarIcon: ({ focused }) => <WishlistTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? 'account-group' : 'account-group-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <MaterialCommunityIcons
              name={focused ? 'account' : 'account-outline'}
              size={26}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
