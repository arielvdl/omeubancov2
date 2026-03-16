import { useBankStore } from '@/src/stores/useBankStore';

export function useSelectedChild() {
  const children = useBankStore((s) => s.children);
  const selectedChildId = useBankStore((s) => s.selectedChildId);
  return children.find((c) => c.id === selectedChildId);
}
