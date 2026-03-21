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
import * as Sentry from "@sentry/react-native";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useBankStore } from "@/src/stores/useBankStore";
import { useSettingsStore } from "@/src/stores/useSettingsStore";
import { bankApi } from "@/src/services/api/bank";
import { logger, captureError } from "@/src/utils/logger";
import { useNotifications } from "@/src/hooks/useNotifications";

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,
  sendDefaultPii: false,
  enabled: !__DEV__,
});

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const loadPersistedState = useAuthStore((s) => s.loadPersistedState);
  const loadSettings = useSettingsStore((s) => s.loadSettings);
  const token = useAuthStore((s) => s.token);

  // Register push notifications when authenticated
  useNotifications(!!token);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    async function prepare() {
      await Promise.all([
        loadPersistedState(),
        loadSettings(),
        useBankStore.getState().loadPersistedSelectedChild(),
      ]);

      // Initialize RevenueCat SDK (dynamic import to prevent native crash if module fails to load)
      const rcApiKey = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
      let Purchases: typeof import('react-native-purchases').default | null = null;
      if (rcApiKey) {
        try {
          const mod = await import('react-native-purchases');
          Purchases = mod.default;
          if (__DEV__) {
            Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
          }
          Purchases.configure({ apiKey: rcApiKey });
          logger.info('[App] RevenueCat configured');
        } catch (err) {
          logger.warn('[App] RevenueCat init failed', err);
          Purchases = null;
        }
      }

      // If user has a valid token, hydrate children and family from API
      const { token, setOnboardingComplete } = useAuthStore.getState();
      logger.info('[App] API URL:', process.env.EXPO_PUBLIC_API_URL);
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
          useBankStore.getState().setHydrated(true);
          logger.info('[App] Hydration complete', { children: childrenRes.data?.length ?? 0 });

          // RevenueCat: identify user by familyId
          const { familyId } = useAuthStore.getState();
          if (familyId && Purchases) {
            try {
              await Purchases.logIn(familyId);
              logger.info('[App] RevenueCat logIn:', familyId);
            } catch (err) {
              logger.warn('[App] RevenueCat logIn failed', err);
            }
          }

          // Load subscription status
          try {
            const { useSubscriptionStore } = await import('@/src/stores/useSubscriptionStore');
            await Promise.all([
              useSubscriptionStore.getState().loadSubscription(),
              useSubscriptionStore.getState().loadLimits(),
            ]);
          } catch {
            // Subscription info not critical for app startup
          }
        } catch (err) {
          useBankStore.getState().setHydrated(false);
          captureError(err, 'App hydration');
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
