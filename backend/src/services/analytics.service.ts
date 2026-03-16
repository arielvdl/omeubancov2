import { transactionRepo } from '../repositories/transaction.repo.js';

export const analyticsService = {
  async getChildSummary(childId: string, period: 'week' | 'month' | 'year') {
    return transactionRepo.getSummary(childId, period);
  },

  async getCategoryBreakdown(childId: string, period: 'week' | 'month' | 'year') {
    return transactionRepo.getCategoryBreakdown(childId, period);
  },
};
