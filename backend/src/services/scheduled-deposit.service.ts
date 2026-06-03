import { scheduledDepositRepo } from '../repositories/scheduled-deposit.repo.js';
import { childRepo } from '../repositories/child.repo.js';
import { transactionRepo } from '../repositories/transaction.repo.js';
import { wishItemRepo } from '../repositories/wish-item.repo.js';
import { notificationService } from './notification.service.js';

function calculateNextRun(frequency: string, currentNextRun: Date): Date {
  const next = new Date(currentNextRun);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly': {
      const cappedDay = Math.min(next.getDate(), 28);
      // Set day to 1 BEFORE changing month so e.g. Jan 31 + 1 month doesn't
      // overflow into March (Feb 31 -> Mar 3) before the cap is applied.
      next.setDate(1);
      next.setMonth(next.getMonth() + 1);
      next.setDate(cappedDay);
      break;
    }
    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}

// Advance past NOW() in one shot so a schedule that fell behind (e.g. backend
// downtime longer than one period) is not stuck advancing a single period per
// cron tick. Missed periods are COLLAPSED into a single payment — we pay once
// and jump to the next FUTURE occurrence, deliberately avoiding a surprise
// lump sum of N back-dated deposits. With the healthy 15-min cron this loop
// runs zero times (next is already in the future).
function computeNextFutureRun(frequency: string, currentNextRun: Date): Date {
  let next = calculateNextRun(frequency, currentNextRun);
  const now = Date.now();
  // Guard caps the loop (>1 year of daily) against a pathological stored date.
  for (let i = 0; next.getTime() <= now && i < 500; i++) {
    next = calculateNextRun(frequency, next);
  }
  return next;
}

export const scheduledDepositService = {
  async processDueDeposits(): Promise<{ processed: number; errors: number }> {
    const dueDeposits = await scheduledDepositRepo.findDue();

    let processed = 0;
    let errors = 0;

    const rawSql = childRepo.getRawSql();

    for (const deposit of dueDeposits) {
      try {
        const nextRunAt = computeNextFutureRun(deposit.frequency, deposit.nextRunAt);
        let claimed = false;

        await rawSql.begin(async (txSql) => {
          // Idempotency gate: atomically claim the row (advance next_run_at only
          // if still active AND still due). Under concurrent/duplicate cron runs
          // only one worker wins; the loser gets 0 rows and must NOT pay again.
          const claim = await scheduledDepositRepo.claimDueInTx(txSql, deposit.id, nextRunAt);
          if (claim.length === 0) {
            return; // already processed by another run — skip without double-paying
          }
          claimed = true;

          const child = await childRepo.findByIdForUpdate(txSql, deposit.childId);
          if (!child) {
            throw new Error(`Child ${deposit.childId} not found`);
          }

          const newBalance = child.balance + deposit.amount;

          await transactionRepo.createInTx(txSql, {
            childId: deposit.childId,
            familyId: deposit.familyId,
            type: 'scheduled',
            category: 'mesada',
            amount: deposit.amount,
            balanceAfter: newBalance,
            description: 'Mesada',
            scheduledDepositId: deposit.id,
            createdBy: 'system',
          });

          await childRepo.updateBalanceInTx(txSql, deposit.childId, newBalance);
          // next_run_at / last_run_at were already advanced by claimDueInTx.
        });

        if (!claimed) {
          continue; // lost the race — no payment, no notification
        }

        processed++;

        const child = await childRepo.findById(deposit.childId);
        const childName = child?.name ?? 'Criança';
        const amountFormatted = (deposit.amount / 100).toFixed(2);

        notificationService
          .sendToFamily(
            deposit.familyId,
            'Mesada depositada',
            `Depósito automático de R$${amountFormatted} para ${childName}`,
            { type: 'scheduled_deposit', childId: deposit.childId }
          )
          .catch((err) => {
            console.error('[Notification] scheduled_deposit failed:', err);
          });

        // Check if balance reached the wishlist goal
        try {
          const currentBalance = child?.balance ?? 0;
          const goal = await wishItemRepo.getGoal(deposit.childId);
          if (goal && goal.priceCents && currentBalance >= goal.priceCents) {
            const goalAmount = (goal.priceCents / 100).toFixed(2);
            notificationService
              .sendToFamily(
                deposit.familyId,
                `${childName} atingiu a meta!`,
                `O saldo alcançou R$${goalAmount} para "${goal.name}"`,
                { type: 'goal_reached', childId: deposit.childId, wishItemId: goal.id }
              )
              .catch((err) => console.error('[Notification] goal_reached failed:', err));
          }
        } catch (err) {
          console.error('[Notification] goal check failed:', err);
        }
      } catch (err) {
        errors++;
        console.error(`Failed to process scheduled deposit ${deposit.id}:`, err);
      }
    }

    return { processed, errors };
  },

  calculateNextRun,
};
