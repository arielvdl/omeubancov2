import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStore } from '@/src/stores/useNetworkStore';
import { mutationQueue } from '@/src/services/mutationQueue';
import { transactionsApi } from '@/src/services/api/transactions';
import { logger } from '@/src/utils/logger';
import { transactionsQueryKey } from '@/src/hooks/queries/useTransactionsQuery';
import { childrenQueryKey } from '@/src/hooks/queries/useChildrenQuery';

export function useMutationQueueDrain() {
  const online = useNetworkStore((s) => s.online);
  const qc = useQueryClient();
  const draining = useRef(false);

  useEffect(() => {
    if (!online) return;
    if (draining.current) return;
    draining.current = true;
    const childIds = new Set<string>();
    mutationQueue
      .drain(async (item) => {
        childIds.add(item.childId);
        if (item.kind === 'deposit') {
          await transactionsApi.deposit(item.childId, item.payload as any);
        } else if (item.kind === 'withdraw') {
          await transactionsApi.withdraw(item.childId, item.payload as any);
        }
      })
      .then((result) => {
        if (result.ok > 0) {
          logger.info('[mutationQueue] drained', result);
          qc.invalidateQueries({ queryKey: childrenQueryKey });
          childIds.forEach((cid) =>
            qc.invalidateQueries({ queryKey: transactionsQueryKey(cid) }),
          );
        }
      })
      .catch((err) => logger.warn('[mutationQueue] drain failed', err))
      .finally(() => {
        draining.current = false;
      });
  }, [online, qc]);
}
