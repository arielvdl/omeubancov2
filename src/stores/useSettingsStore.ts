import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface SettingsState {
  locale: string;
  currency: string;
  notificationsEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  wishlistLayout: 'feed' | 'grid';

  setLocale: (locale: string) => void;
  setCurrency: (currency: string) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setWishlistLayout: (layout: 'feed' | 'grid') => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  locale: 'pt-BR',
  currency: 'BRL',
  notificationsEnabled: true,
  theme: 'light',
  wishlistLayout: 'feed',

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

  setWishlistLayout: (layout: 'feed' | 'grid') => {
    SecureStore.setItemAsync('wishlist_layout', layout);
    set({ wishlistLayout: layout });
  },

  loadSettings: async () => {
    const [locale, currency, notificationsEnabled, theme, wishlistLayout] = await Promise.all([
      SecureStore.getItemAsync('locale'),
      SecureStore.getItemAsync('currency'),
      SecureStore.getItemAsync('notifications_enabled'),
      SecureStore.getItemAsync('theme'),
      SecureStore.getItemAsync('wishlist_layout'),
    ]);
    set({
      locale: locale ?? 'pt-BR',
      currency: currency ?? 'BRL',
      notificationsEnabled: notificationsEnabled !== 'false',
      theme: (theme as 'light' | 'dark' | 'system') ?? 'light',
      wishlistLayout: (wishlistLayout as 'feed' | 'grid') ?? 'feed',
    });
  },
}));
