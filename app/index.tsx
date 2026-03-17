import { Redirect } from "expo-router";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useBankStore } from "@/src/stores/useBankStore";

export default function Index() {
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const token = useAuthStore((s) => s.token);
  const children = useBankStore((s) => s.children);
  const hydrated = useBankStore((s) => s.hydrated);

  // Fully set up — go to dashboard
  if (onboardingComplete && token && children.length > 0) {
    return <Redirect href="/(tabs)" />;
  }

  // API confirmed: no children — force onboarding
  if (token && hydrated && children.length === 0) {
    return <Redirect href="/(onboarding)/bank-setup" />;
  }

  // API failed but onboarding was completed before — show dashboard with empty/cached state
  if (token && !hydrated && onboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  // Not authenticated — login screen
  return <Redirect href="/(onboarding)/welcome" />;
}
