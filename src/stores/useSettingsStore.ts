import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface SettingsState {
  locale: string;
  currency: string;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';

  setLocale: (locale: string) => void;
  setCurrency: (currency: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  locale: 'pt-BR',
  currency: 'BRL',
  notificationsEnabled: true,
  theme: 'light',

  setLocale: (locale: string) => {
    SecureStore.setItemAsync('locale', locale);
    set({ locale });
  },

  setCurrency: (currency: string) => {
    SecureStore.setItemAsync('currency', currency);
    set({ currency });
  },

  setNotificationsEnabled: (enabled: boolean) => {
    SecureStore.setItemAsync('notifications_enabled', String(enabled));
    set({ notificationsEnabled: enabled });
  },

  setTheme: (theme: 'light' | 'dark' | 'system') => {
    SecureStore.setItemAsync('theme', theme);
    set({ theme });
  },

  loadSettings: async () => {
    const [locale, currency, notificationsEnabled, theme] = await Promise.all([
      SecureStore.getItemAsync('locale'),
      SecureStore.getItemAsync('currency'),
      SecureStore.getItemAsync('notifications_enabled'),
      SecureStore.getItemAsync('theme'),
    ]);
    set({
      locale: locale ?? 'pt-BR',
      currency: currency ?? 'BRL',
      notificationsEnabled: notificationsEnabled !== 'false',
      theme: (theme as 'light' | 'dark' | 'system') ?? 'light',
    });
  },
}));
