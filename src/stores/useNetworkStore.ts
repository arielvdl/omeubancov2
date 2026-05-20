import { create } from 'zustand';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

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
  // Optimistic default — the NetInfo subscription below will correct this on
  // the first event. Starting `true` avoids the "Sem conexão" banner flashing
  // during the JS bundle bootstrap before NetInfo emits its initial value.
  online: true,
  lastError: null,
  lastCheckedAt: 0,
  setOnline: (online) =>
    set({
      online,
      lastCheckedAt: Date.now(),
    }),
  reportError: (kind) => {
    // Errors only update lastError so retry UX has context. They never flip
    // `online` — that flag is owned exclusively by NetInfo (the OS-level
    // truth), so axios cold-boot races or single backend hiccups stop being
    // mistaken for "no internet".
    set({ lastError: kind, lastCheckedAt: Date.now() });
  },
  reportSuccess: () => {
    if (get().lastError) {
      set({ lastError: null, lastCheckedAt: Date.now() });
    }
  },
}));

function applyNetInfo(state: NetInfoState) {
  const online =
    state.isConnected === true && state.isInternetReachable !== false;
  const current = useNetworkStore.getState().online;
  if (online !== current) {
    useNetworkStore.getState().setOnline(online);
  }
}

// Subscribe once at module load. NetInfo handles its own lifecycle and is safe
// to listen to for the entire app session.
NetInfo.addEventListener(applyNetInfo);

// Kick off an immediate fetch so the first paint reflects real state instead
// of the optimistic `true` default.
NetInfo.fetch()
  .then(applyNetInfo)
  .catch(() => {
    // NetInfo can reject in degraded environments (e.g. permission denied);
    // keep optimistic `online: true` rather than failing closed.
  });

export function classifyAxiosError(error: unknown): Exclude<NetworkErrorKind, null> {
  const err = error as { code?: string; message?: string; response?: { status?: number } };
  if (err?.response?.status && err.response.status >= 500) return 'server';
  if (err?.code === 'ECONNABORTED' || err?.message?.toLowerCase?.().includes('timeout')) {
    return 'timeout';
  }
  if (!err?.response) return 'network';
  return 'server';
}
