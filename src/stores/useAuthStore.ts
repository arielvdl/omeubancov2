import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthStoreState {
  onboardingComplete: boolean;
  token: string | null;
  familyId: string | null;
  role: 'parent' | 'child' | null;
  childId: string | null;
  guardianId: string | null;
  roleLabel: string | null;
  masterPin: string | null;
  bankName: string | null;
  currency: 'BRL' | 'USD' | 'EUR';
  locale: string;
  googleEmail: string | null;
  googleName: string | null;
  googlePhoto: string | null;
  mathChallengeEnabled: boolean;

  setOnboardingComplete: (complete: boolean) => void;
  setAuth: (
    token: string,
    familyId: string,
    role: 'parent' | 'child',
    childId?: string,
    guardianId?: string,
    roleLabel?: string,
  ) => void;
  setMasterPin: (pin: string) => void;
  setBankName: (name: string) => void;
  setCurrency: (currency: 'BRL' | 'USD' | 'EUR') => void;
  setLocale: (locale: string) => void;
  setGoogleUser: (email: string, name: string, photo: string) => void;
  setMathChallengeEnabled: (enabled: boolean) => void;
  logout: () => void;
  loadPersistedState: () => Promise<void>;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  onboardingComplete: false,
  token: null,
  familyId: null,
  role: null,
  childId: null,
  guardianId: null,
  roleLabel: null,
  masterPin: null,
  bankName: null,
  currency: 'BRL',
  locale: 'pt-BR',
  googleEmail: null,
  googleName: null,
  googlePhoto: null,
  mathChallengeEnabled: true,

  setOnboardingComplete: async (complete: boolean) => {
    await SecureStore.setItemAsync('onboarding_complete', String(complete));
    set({ onboardingComplete: complete });
  },

  setAuth: async (
    token: string,
    familyId: string,
    role: 'parent' | 'child',
    childId?: string,
    guardianId?: string,
    roleLabel?: string,
  ) => {
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('family_id', familyId);
    await SecureStore.setItemAsync('auth_role', role);
    if (childId) {
      await SecureStore.setItemAsync('child_id', childId);
    }
    if (guardianId) {
      await SecureStore.setItemAsync('guardian_id', guardianId);
    } else {
      await SecureStore.deleteItemAsync('guardian_id');
    }
    if (roleLabel) {
      await SecureStore.setItemAsync('role_label', roleLabel);
    } else {
      await SecureStore.deleteItemAsync('role_label');
    }
    set({
      token,
      familyId,
      role,
      childId: childId ?? null,
      guardianId: guardianId ?? null,
      roleLabel: roleLabel ?? null,
    });
  },

  setMasterPin: async (pin: string) => {
    await SecureStore.setItemAsync('master_pin', pin);
    set({ masterPin: pin });
  },

  setBankName: async (name: string) => {
    await SecureStore.setItemAsync('bank_name', name);
    set({ bankName: name });
  },

  setCurrency: async (currency: 'BRL' | 'USD' | 'EUR') => {
    await SecureStore.setItemAsync('currency', currency);
    set({ currency });
  },

  setLocale: async (locale: string) => {
    await SecureStore.setItemAsync('locale', locale);
    set({ locale });
  },

  setMathChallengeEnabled: async (enabled: boolean) => {
    await SecureStore.setItemAsync('math_challenge_enabled', String(enabled));
    set({ mathChallengeEnabled: enabled });
  },

  setGoogleUser: async (email: string, name: string, photo: string) => {
    await Promise.all([
      SecureStore.setItemAsync('google_email', email),
      SecureStore.setItemAsync('google_name', name),
      SecureStore.setItemAsync('google_photo', photo),
    ]);
    set({ googleEmail: email, googleName: name, googlePhoto: photo });
  },

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync('auth_token'),
      SecureStore.deleteItemAsync('family_id'),
      SecureStore.deleteItemAsync('auth_role'),
      SecureStore.deleteItemAsync('child_id'),
      SecureStore.deleteItemAsync('guardian_id'),
      SecureStore.deleteItemAsync('role_label'),
      SecureStore.deleteItemAsync('google_email'),
      SecureStore.deleteItemAsync('google_name'),
      SecureStore.deleteItemAsync('google_photo'),
    ]);
    set({
      token: null,
      familyId: null,
      role: null,
      childId: null,
      guardianId: null,
      roleLabel: null,
      googleEmail: null,
      googleName: null,
      googlePhoto: null,
    });
  },

  loadPersistedState: async () => {
    const [
      onboardingComplete, token, familyId, role, childId,
      guardianId, roleLabel,
      masterPin, bankName, currency, locale,
      googleEmail, googleName, googlePhoto,
      mathChallengeEnabled,
    ] = await Promise.all([
      SecureStore.getItemAsync('onboarding_complete'),
      SecureStore.getItemAsync('auth_token'),
      SecureStore.getItemAsync('family_id'),
      SecureStore.getItemAsync('auth_role'),
      SecureStore.getItemAsync('child_id'),
      SecureStore.getItemAsync('guardian_id'),
      SecureStore.getItemAsync('role_label'),
      SecureStore.getItemAsync('master_pin'),
      SecureStore.getItemAsync('bank_name'),
      SecureStore.getItemAsync('currency'),
      SecureStore.getItemAsync('locale'),
      SecureStore.getItemAsync('google_email'),
      SecureStore.getItemAsync('google_name'),
      SecureStore.getItemAsync('google_photo'),
      SecureStore.getItemAsync('math_challenge_enabled'),
    ]);
    set({
      onboardingComplete: onboardingComplete === 'true',
      token,
      familyId,
      role: role as 'parent' | 'child' | null,
      childId,
      guardianId,
      roleLabel,
      masterPin,
      bankName,
      currency: (currency as 'BRL' | 'USD' | 'EUR') ?? 'BRL',
      locale: locale ?? 'pt-BR',
      googleEmail,
      googleName,
      googlePhoto,
      mathChallengeEnabled: mathChallengeEnabled !== 'false',
    });
  },
}));
