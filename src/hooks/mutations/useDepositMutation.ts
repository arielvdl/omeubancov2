import { useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, type DepositPayload } from '@/src/services/api/transactions';
import { mutationQueue } from '@/src/services/mutationQueue';
import { classifyAxiosError, useNetworkStore } from '@/src/stores/useNetworkStore';
import { transactionsQueryKey } from '@/src/hooks/queries/useTransactionsQuery';
import { childrenQueryKey } from '@/src/hooks/queries/useChildrenQuery';

interface Variables {
  childId: string;
  payload: DepositPayload;
}

export function useDepositMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ childId, payload }: Variables) => {
      const res = await transactionsApi.deposit(childId, payload);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: transactionsQueryKey(vars.childId) });
      qc.invalidateQueries({ queryKey: childrenQueryKey });
    },
    onError: async (error, vars) => {
      const kind = classifyAxiosError(error);
      if (kind === 'network' || kind === 'timeout' || !useNetworkStore.getState().online) {
        await mutationQueue.enqueue({
          kind: 'deposit',
          childId: vars.childId,
          payload: vars.payload as unknown as Record<string, unknown>,
        });
      }
    },
  });
}
