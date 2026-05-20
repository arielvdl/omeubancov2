import { create } from 'zustand';

export type NetworkErrorKind = 'network' | 'server' | 'timeout' | null;

interface NetworkState {
  online: boolean;
  lastError: NetworkErrorKind;
  lastCheckedAt: number;
  consecutiveFailures: number;
  bootedAt: number;
  setOnline: (online: boolean) => void;
  reportError: (kind: Exclude<NetworkErrorKind, null>) => void;
  reportSuccess: () => void;
}

// Suppress offline banner during the first few seconds after boot — iOS often
// reports the cellular/WiFi adapter as up before it's actually routable, so the
// first request can fail with ERR_NETWORK / timeout despite real connectivity.
const BOOT_GRACE_MS = 5_000;

// Require multiple consecutive transient errors before flipping to offline, so a
// single cold-boot flake or DNS hiccup doesn't paint the user as disconnected.
const FAILURE_THRESHOLD = 2;

export const useNetworkStore = create<NetworkState>((set, get) => ({
  online: true,
  lastError: null,
  lastCheckedAt: 0,
  consecutiveFailures: 0,
  bootedAt: Date.now(),
  setOnline: (online) =>
    set({
      online,
      lastCheckedAt: Date.now(),
      consecutiveFailures: online ? 0 : get().consecutiveFailures,
    }),
  reportError: (kind) => {
    const state = get();
    const now = Date.now();

    if (kind === 'server') {
      // Server returned an error — connectivity itself is fine.
      set({ lastError: kind, lastCheckedAt: now, consecutiveFailures: 0 });
      return;
    }

    // kind === 'network' | 'timeout'
    const consecutive = state.consecutiveFailures + 1;
    const inGracePeriod = now - state.bootedAt < BOOT_GRACE_MS;
    const shouldFlipOffline =
      state.online &&
      !inGracePeriod &&
      consecutive >= FAILURE_THRESHOLD;

    set({
      online: shouldFlipOffline ? false : state.online,
      lastError: kind,
      lastCheckedAt: now,
      consecutiveFailures: consecutive,
    });
  },
  reportSuccess: () => {
    const state = get();
    if (!state.online || state.lastError || state.consecutiveFailures > 0) {
      set({
        online: true,
        lastError: null,
        lastCheckedAt: Date.now(),
        consecutiveFailures: 0,
      });
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
