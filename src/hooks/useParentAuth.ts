import { useState, useCallback, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useParentSessionStore } from '@/src/stores/useParentSessionStore';

export function useParentAuth() {
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const masterPin = useAuthStore((s) => s.masterPin);
  const markAuthenticated = useParentSessionStore((s) => s.markAuthenticated);
  const isSessionValid = useParentSessionStore((s) => s.isSessionValid);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);
    })();
  }, []);

  const verifyPin = useCallback(
    async (pin: string): Promise<{ success: boolean; error?: string }> => {
      if (!masterPin) {
        return { success: false, error: 'no_pin_configured' };
      }

      const isValid = pin === masterPin;

      if (isValid) {
        markAuthenticated();
        return { success: true };
      }

      return { success: false, error: 'wrong_pin' };
    },
    [masterPin, markAuthenticated],
  );

  const authenticateWithBiometrics = useCallback(async (): Promise<boolean> => {
    if (!biometricAvailable) return false;

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Acesso à área dos pais',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        markAuthenticated();
        return true;
      }

      if (__DEV__ && result.error) {
        console.warn('[Biometric] Auth failed:', result.error);
      }

      return false;
    } catch (err) {
      if (__DEV__) {
        console.warn('[Biometric] Hardware error:', err);
      }
      return false;
    }
  }, [biometricAvailable, markAuthenticated]);

  return {
    isSessionValid,
    verifyPin,
    biometricAvailable,
    authenticateWithBiometrics,
    hasMasterPin: masterPin !== null,
  };
}
