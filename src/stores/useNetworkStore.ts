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

// Configure NetInfo BEFORE any subscription. Using a 204 endpoint we control
// (or Google's well-known one) avoids the iOS captive-portal probe to
// `captive.apple.com` that returns false positives on cellular DNS-filtered
// networks. Documented quirk: NetInfo on iOS with New Architecture
// (newArchEnabled: true) emits the initial state with `isConnected: false`
// until the first reachability resolves — we treat `null` as "unknown" and
// only flip the banner once we've actually seen a `false`.
NetInfo.configure({
  reachabilityUrl: 'https://clients3.google.com/generate_204',
  reachabilityTest: async (response) => response.status === 204,
  reachabilityLongTimeout: 60_000,
  reachabilityShortTimeout: 5_000,
  reachabilityRequestTimeout: 15_000,
  reachabilityShouldRun: () => true,
  shouldFetchWiFiSSID: false,
  useNativeReachability: true,
});

export const useNetworkStore = create<NetworkState>((set, get) => ({
  // Optimistic default. We only ever flip to false after seeing an actual
  // `isConnected: false` from NetInfo — never on `null` (unknown).
  online: true,
  lastError: null,
  lastCheckedAt: 0,
  setOnline: (online) =>
    set({
      online,
      lastCheckedAt: Date.now(),
    }),
  reportError: (kind) => {
    // Errors only annotate `lastError` for retry UX. `online` is owned by
    // NetInfo so an axios cold-boot flake or a single 5xx never paints the
    // banner.
    set({ lastError: kind, lastCheckedAt: Date.now() });
  },
  reportSuccess: () => {
    if (get().lastError) {
      set({ lastError: null, lastCheckedAt: Date.now() });
    }
  },
}));

function applyNetInfo(state: NetInfoState) {
  // `isConnected` is the link-layer truth (NWPathMonitor). On iOS New Arch we
  // sometimes see the very first emission as `null` while the native module
  // is still resolving — treat that as "unknown" and keep the optimistic
  // `online: true` rather than flashing the offline banner.
  if (state.isConnected === null) return;
  const online = state.isConnected === true;
  const current = useNetworkStore.getState().online;
  if (online !== current) {
    useNetworkStore.getState().setOnline(online);
  }
}

NetInfo.addEventListener(applyNetInfo);

NetInfo.fetch()
  .then(applyNetInfo)
  .catch(() => {
    // NetInfo can reject in degraded environments (e.g. permission denied) —
    // keep the optimistic `online: true` rather than failing closed.
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
