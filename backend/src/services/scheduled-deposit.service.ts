import { scheduledDepositRepo } from '../repositories/scheduled-deposit.repo.js';
import { childRepo } from '../repositories/child.repo.js';
import { transactionRepo } from '../repositories/transaction.repo.js';
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
      const currentDay = next.getDate();
      next.setMonth(next.getMonth() + 1);
      const cappedDay = Math.min(currentDay, 28);
      next.setDate(cappedDay);
      break;
    }
    default:
      next.setDate(next.getDate() + 1);
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
        await rawSql.begin(async (txSql) => {
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
            description: `Mesada automatica - ${deposit.frequency}`,
            scheduledDepositId: deposit.id,
            createdBy: 'system',
          });

          await childRepo.updateBalanceInTx(txSql, deposit.childId, newBalance);

          const nextRunAt = calculateNextRun(deposit.frequency, deposit.nextRunAt);
          await scheduledDepositRepo.updateNextRunInTx(txSql, deposit.id, nextRunAt, new Date());
        });

        processed++;

        notificationService
          .sendToFamily(
            deposit.familyId,
            'Mesada depositada',
            `Deposito automatico de ${deposit.amount} centavos realizado.`,
            { type: 'scheduled_deposit', childId: deposit.childId }
          )
          .catch((err) => {
            console.error('Push notification failed:', err);
          });
      } catch (err) {
        errors++;
        console.error(`Failed to process scheduled deposit ${deposit.id}:`, err);
      }
    }

    return { processed, errors };
  },

  calculateNextRun,
};
