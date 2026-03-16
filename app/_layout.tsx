import "../global.css";
import "@/src/i18n";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useBankStore } from "@/src/stores/useBankStore";
import { useSettingsStore } from "@/src/stores/useSettingsStore";
import { bankApi } from "@/src/services/api/bank";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const loadPersistedState = useAuthStore((s) => s.loadPersistedState);
  const loadSettings = useSettingsStore((s) => s.loadSettings);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    async function prepare() {
      await Promise.all([loadPersistedState(), loadSettings()]);

      // If user has a valid token, hydrate children and family from API
      const { token, setOnboardingComplete } = useAuthStore.getState();
      if (token) {
        try {
          const [childrenRes, familyRes] = await Promise.all([
            bankApi.getChildren(),
            bankApi.getFamily(),
          ]);
          if (familyRes.data) {
            useBankStore.getState().setFamily(familyRes.data);
          }
          if (childrenRes.data?.length > 0) {
            useBankStore.getState().setChildren(childrenRes.data);
          } else {
            // No children in DB — force onboarding regardless of local flag
            await setOnboardingComplete(false);
          }
        } catch {
          // API unavailable -- app will work with cached/empty state
        }
      }

      setAppReady(true);
    }
    prepare();
  }, [loadPersistedState, loadSettings]);

  useEffect(() => {
    if (fontsLoaded && appReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, appReady]);

  if (!fontsLoaded || !appReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="(parent)"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="(modals)"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="(invite)"
          options={{
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}
