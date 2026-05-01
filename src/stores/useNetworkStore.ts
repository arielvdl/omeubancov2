import { create } from 'zustand';

export type NetworkErrorKind = 'network' | 'server' | 'timeout' | null;

interface NetworkState {
  online: boolean;
  lastError: NetworkErrorKind;
  lastCheckedAt: number;
  setOnline: (online: boolean) => void;
  reportError: (kind: Exclude<NetworkErrorKind, null>) => void;
  reportSuccess: () => void;
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  online: true,
  lastError: null,
  lastCheckedAt: 0,
  setOnline: (online) => set({ online, lastCheckedAt: Date.now() }),
  reportError: (kind) => {
    if (kind === 'network' || kind === 'timeout') {
      if (get().online) {
        set({ online: false, lastError: kind, lastCheckedAt: Date.now() });
      } else {
        set({ lastError: kind, lastCheckedAt: Date.now() });
      }
      return;
    }
    set({ lastError: kind, lastCheckedAt: Date.now() });
  },
  reportSuccess: () => {
    if (!get().online || get().lastError) {
      set({ online: true, lastError: null, lastCheckedAt: Date.now() });
    }
  },
}));

export function classifyAxiosError(error: unknown): Exclude<NetworkErrorKind, null> {
  const err = error as { code?: string; message?: string; response?: { status?: number } };
  if (err?.response?.status && err.response.status >= 500) return 'server';
  if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase?.().includes('timeout')) {
    return 'timeout';
  }
  if (!err?.response) return 'network';
  return 'server';
}
