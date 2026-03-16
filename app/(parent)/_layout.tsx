import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useParentSessionStore } from '@/src/stores/useParentSessionStore';

export default function ParentLayout() {
  const router = useRouter();
  const segments = useSegments();
  const isSessionValid = useParentSessionStore((s) => s.isSessionValid);

  useEffect(() => {
    // The current segment within (parent) -- e.g. "pin-entry", "add-balance", etc.
    const currentSegment = segments[segments.length - 1];

    // Allow pin-entry without auth (it IS the auth screen)
    if (currentSegment === 'pin-entry') return;

    // For all other parent screens, verify session is still valid
    if (!isSessionValid()) {
      // Redirect to pin-entry with returnTo so user comes back here after auth
      const intendedRoute = `/(parent)/${currentSegment}`;
      router.replace({
        pathname: '/(parent)/pin-entry',
        params: { returnTo: intendedRoute },
      });
    }
  }, [segments, isSessionValid, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    />
  );
}
