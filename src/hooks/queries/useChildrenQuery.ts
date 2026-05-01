import { useQuery } from '@tanstack/react-query';
import { bankApi } from '@/src/services/api/bank';
import { useAuthStore } from '@/src/stores/useAuthStore';
import { useBankStore } from '@/src/stores/useBankStore';
import { useEffect } from 'react';

export const childrenQueryKey = ['children'] as const;

export function useChildrenQuery() {
  const token = useAuthStore((s) => s.token);
  const setChildren = useBankStore((s) => s.setChildren);

  const query = useQuery({
    queryKey: childrenQueryKey,
    queryFn: async () => {
      const res = await bankApi.getChildren();
      return res.data ?? [];
    },
    enabled: !!token,
  });

  useEffect(() => {
    if (Array.isArray(query.data) && query.data.length > 0) {
      setChildren(query.data);
    }
  }, [query.data, setChildren]);

  return query;
}
