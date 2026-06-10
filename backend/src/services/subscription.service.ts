import { eq, and, inArray, isNotNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import { scheduledDeposits } from '../db/schema/scheduled-deposits.js';
import { transactions } from '../db/schema/transactions.js';
import { subscriptionRepo } from '../repositories/subscription.repo.js';
import { childRepo } from '../repositories/child.repo.js';
import { auditLogRepo } from '../repositories/audit-log.repo.js';

type Entitlement = 'free' | 'familia' | 'familia_plus';

interface TierLimits {
  maxChildren: number;
  maxReceipts: number;
  maxWishItems: number;
  allowedFrequencies: string[];
  canInviteGuardians: boolean;
}

const TIER_LIMITS: Record<Entitlement, TierLimits> = {
  free: {
    maxChildren: 1,
    maxReceipts: 3,
    maxWishItems: 10,
    allowedFrequencies: ['monthly'],
    canInviteGuardians: false,
  },
  familia: {
    maxChildren: 3,
    maxReceipts: Infinity,
    maxWishItems: Infinity,
    allowedFrequencies: ['daily', 'weekly', 'monthly'],
    canInviteGuardians: true,
  },
  familia_plus: {
    maxChildren: 5,
    maxReceipts: Infinity,
    maxWishItems: Infinity,
    allowedFrequencies: ['daily', 'weekly', 'monthly'],
    canInviteGuardians: true,
  },
};

// Margem além de expiresAt antes de rebaixar para free sem webhook de
// EXPIRATION — cobre retry de cobrança e webhooks perdidos. Renovações
// normais atualizam expiresAt via webhook RENEWAL antes disso.
const EXPIRY_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

function isSubscriptionLive(sub: { isActive: boolean; expiresAt: Date | null } | undefined): boolean {
  if (!sub || !sub.isActive) return false;
  if (sub.expiresAt && sub.expiresAt.getTime() + EXPIRY_GRACE_MS < Date.now()) {
    return false;
  }
  return true;
}

export const subscriptionService = {
  getTierLimits(entitlement: string): TierLimits {
    return TIER_LIMITS[entitlement as Entitlement] ?? TIER_LIMITS.free;
  },

  async getEntitlementForFamily(familyId: string): Promise<string> {
    const sub = await subscriptionRepo.findByFamilyId(familyId);
    if (!isSubscriptionLive(sub)) return 'free';
    return sub!.entitlement;
  },

  async getSubscription(familyId: string) {
    const sub = await subscriptionRepo.findByFamilyId(familyId);
    const entitlement = isSubscriptionLive(sub) ? sub!.entitlement : 'free';
    const limits = this.getTierLimits(entitlement);
    return { subscription: sub ?? null, entitlement, limits };
  },

  async checkChildLimit(familyId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const entitlement = await this.getEntitlementForFamily(familyId);
    const limits = this.getTierLimits(entitlement);
    const children = await childRepo.findByFamilyId(familyId);
    return {
      allowed: children.length < limits.maxChildren,
      current: children.length,
      limit: limits.maxChildren,
    };
  },

  async checkReceiptLimit(familyId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const entitlement = await this.getEntitlementForFamily(familyId);
    const limits = this.getTierLimits(entitlement);
    if (limits.maxReceipts === Infinity) {
      return { allowed: true, current: 0, limit: Infinity };
    }
    const result = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.familyId, familyId),
          isNotNull(transactions.receiptUrl),
        )
      );
    return {
      allowed: result.length < limits.maxReceipts,
      current: result.length,
      limit: limits.maxReceipts,
    };
  },

  async checkWishItemLimit(familyId: string, childId: string): Promise<{ allowed: boolean; current: number; limit: number }> {
    const entitlement = await this.getEntitlementForFamily(familyId);
    const limits = this.getTierLimits(entitlement);
    if (limits.maxWishItems === Infinity) {
      return { allowed: true, current: 0, limit: Infinity };
    }
    const { wishItemRepo } = await import('../repositories/wish-item.repo.js');
    const items = await wishItemRepo.findByChildId(childId);
    const activeItems = items.filter((i: any) => i.status === 'active');
    return {
      allowed: activeItems.length < limits.maxWishItems,
      current: activeItems.length,
      limit: limits.maxWishItems,
    };
  },

  async checkFrequencyAllowed(familyId: string, frequency: string): Promise<boolean> {
    const entitlement = await this.getEntitlementForFamily(familyId);
    const limits = this.getTierLimits(entitlement);
    return limits.allowedFrequencies.includes(frequency);
  },

  async checkGuardianInviteAllowed(familyId: string): Promise<boolean> {
    const entitlement = await this.getEntitlementForFamily(familyId);
    const limits = this.getTierLimits(entitlement);
    return limits.canInviteGuardians;
  },

  async onSubscriptionCancelled(familyId: string): Promise<void> {
    // Pause daily and weekly active schedules (monthly is allowed on free tier)
    await db
      .update(scheduledDeposits)
      .set({ status: 'paused', updatedAt: new Date() })
      .where(
        and(
          eq(scheduledDeposits.familyId, familyId),
          eq(scheduledDeposits.status, 'active'),
          inArray(scheduledDeposits.frequency, ['daily', 'weekly']),
        )
      );

    await auditLogRepo.create({
      familyId,
      action: 'subscription.cancelled',
      actor: 'system',
      details: { pausedFrequencies: ['daily', 'weekly'] },
    });
  },
};
