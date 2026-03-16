import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { apiClient } from './api/client';

const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace('/api/v1', '') ?? '';

export interface GoogleAuthResult {
  token: string;
  familyId: string;
  familyName: string;
  currency: string;
  isNewUser: boolean;
  error?: string;
}

export async function startGoogleSignIn(): Promise<GoogleAuthResult | null> {
  // The return URL uses Expo's linking scheme so the browser redirects back to the app
  const returnUrl = Linking.createURL('auth/callback');

  // Ask backend for the Google auth URL
  const { data } = await apiClient.get('/auth/google/start', {
    params: { returnUrl },
    baseURL: API_BASE,
  });

  const authUrl = data.authUrl as string;
  if (!authUrl) throw new Error('No auth URL returned');

  // Open browser - it will redirect back to the app when done
  const result = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl);

  if (result.type !== 'success' || !result.url) {
    return null; // User cancelled
  }

  // Parse the result URL
  const parsed = Linking.parse(result.url);
  const params = parsed.queryParams ?? {};

  if (params.error) {
    throw new Error(String(params.error));
  }

  return {
    token: String(params.token ?? ''),
    familyId: String(params.familyId ?? ''),
    familyName: String(params.familyName ?? ''),
    currency: String(params.currency ?? 'BRL'),
    isNewUser: params.isNewUser === 'true',
  };
}
