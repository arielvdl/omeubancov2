import { create } from 'zustand';
import { subscriptionApi } from '../services/api/subscription';
import { logger } from '../utils/logger';

type Entitlement = 'free' | 'familia' | 'familia_plus';

interface TierLimits {
  maxChildren: number;
  maxReceipts: number;
  maxWishItems: number;
  allowedFrequencies: string[];
  canInviteGuardians: boolean;
}

interface UsageCheck {
  allowed: boolean;
  current: number;
  limit: number;
}

interface SubscriptionState {
  entitlement: Entitlement;
  isActive: boolean;
  productId: string | null;
  store: string | null;
  expiresAt: string | null;
  limits: TierLimits;
  usage: {
    children: UsageCheck;
    receipts: UsageCheck;
    wishItems?: UsageCheck;
    canInviteGuardians: boolean;
  } | null;
  isLoading: boolean;

  loadSubscription: () => Promise<void>;
  loadLimits: () => Promise<void>;
  canAddChild: () => boolean;
  canUploadReceipt: () => boolean;
  canUseFrequency: (frequency: string) => boolean;
  canInviteGuardian: () => boolean;
  canAddWishItem: () => boolean;
  reset: () => void;
}

const DEFAULT_LIMITS: TierLimits = {
  maxChildren: 1,
  maxReceipts: 3,
  maxWishItems: 10,
  allowedFrequencies: ['monthly'],
  canInviteGuardians: false,
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  entitlement: 'free',
  isActive: false,
  productId: null,
  store: null,
  expiresAt: null,
  limits: DEFAULT_LIMITS,
  usage: null,
  isLoading: false,

  loadSubscription: async () => {
    set({ isLoading: true });
    try {
      const res = await subscriptionApi.getSubscription();
      const data = res.data;
      set({
        entitlement: data.entitlement as Entitlement,
        isActive: data.isActive,
        productId: data.productId,
        store: data.store,
        expiresAt: data.expiresAt,
        limits: data.limits,
        isLoading: false,
      });
    } catch (err) {
      logger.warn('[Subscription] Failed to load subscription', err);
      set({ isLoading: false });
    }
  },

  loadLimits: async () => {
    try {
      const res = await subscriptionApi.getLimits();
      const data = res.data;
      set({
        entitlement: data.entitlement as Entitlement,
        limits: data.limits,
        usage: data.usage,
      });
    } catch (err) {
      logger.warn('[Subscription] Failed to load limits', err);
    }
  },

  canAddChild: () => {
    const { usage } = get();
    if (usage) return usage.children.allowed;
    return true; // optimistic if not loaded yet
  },

  canUploadReceipt: () => {
    const { usage, limits } = get();
    if (usage) return usage.receipts.allowed;
    if (limits.maxReceipts === Infinity) return true;
    return true;
  },

  canUseFrequency: (frequency: string) => {
    const { limits } = get();
    return limits.allowedFrequencies.includes(frequency);
  },

  canInviteGuardian: () => {
    const { limits } = get();
    return limits.canInviteGuardians;
  },

  canAddWishItem: () => {
    const { usage, limits } = get();
    if (limits.maxWishItems === Infinity) return true;
    if (usage?.wishItems) return usage.wishItems.allowed;
    return true; // optimistic if not loaded yet
  },

  reset: () => {
    set({
      entitlement: 'free',
      isActive: false,
      productId: null,
      store: null,
      expiresAt: null,
      limits: DEFAULT_LIMITS,
      usage: null,
      isLoading: false,
    });
  },
}));
