import { apiClient } from './client';
import type { TransactionFilters } from '@/src/types/transaction';

export interface DepositPayload {
  amount: number;
  category: string;
  description: string;
}

export interface WithdrawPayload {
  amount: number;
  description: string;
}

export const transactionsApi = {
  getByChild: async (childId: string, filters?: TransactionFilters) => {
    const res = await apiClient.get(`/children/${childId}/transactions`, { params: filters });
    // Backend returns { data: [...], pagination: {...} } — unwrap here
    const transactions = res.data?.data ?? res.data;
    return { data: Array.isArray(transactions) ? transactions : [], pagination: res.data?.pagination };
  },

  deposit: (childId: string, data: DepositPayload) =>
    apiClient.post(`/children/${childId}/deposit`, data),

  withdraw: (childId: string, data: WithdrawPayload) =>
    apiClient.post(`/children/${childId}/withdraw`, data),
};
