import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { transactionsApi } from '@/src/services/api/transactions';
import { useTransactionStore } from '@/src/stores/useTransactionStore';
import type { Transaction } from '@/src/types/transaction';

export const transactionsQueryKey = (childId: string | undefined) =>
  ['transactions', childId] as const;

export function useTransactionsQuery(childId: string | undefined) {
  const query = useQuery({
    queryKey: transactionsQueryKey(childId),
    queryFn: async () => {
      if (!childId) return [] as Transaction[];
      const res = await transactionsApi.getByChild(childId);
      return Array.isArray(res.data) ? (res.data as Transaction[]) : [];
    },
    enabled: !!childId,
  });

  useEffect(() => {
    if (Array.isArray(query.data)) {
      useTransactionStore.setState({ transactions: query.data });
    }
  }, [query.data]);

  return query;
}
