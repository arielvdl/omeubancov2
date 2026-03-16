import { Redirect } from "expo-router";
import { useAuthStore } from "@/src/stores/useAuthStore";
import { useBankStore } from "@/src/stores/useBankStore";

export default function Index() {
  const onboardingComplete = useAuthStore((s) => s.onboardingComplete);
  const token = useAuthStore((s) => s.token);
  const children = useBankStore((s) => s.children);

  // Fully set up — go to dashboard
  if (onboardingComplete && token && children.length > 0) {
    return <Redirect href="/(tabs)" />;
  }

  // Has token but no children — force onboarding
  if (token && children.length === 0) {
    return <Redirect href="/(onboarding)/bank-setup" />;
  }

  // Not authenticated — login screen
  return <Redirect href="/(onboarding)/welcome" />;
}
