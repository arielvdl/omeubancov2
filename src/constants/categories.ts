import type { MaterialCommunityIcons } from '@expo/vector-icons';

export type CategoryIconName = keyof typeof MaterialCommunityIcons.glyphMap;

export interface CategoryConfig {
  key: string;
  labelPtBR: string;
  labelEnUS: string;
  icon: CategoryIconName;
  color: string;
}

export const CATEGORIES: CategoryConfig[] = [
  { key: 'mesada', labelPtBR: 'Mesada', labelEnUS: 'Allowance', icon: 'calendar-clock', color: '#FFD600' },
  { key: 'presente', labelPtBR: 'Presente', labelEnUS: 'Gift', icon: 'gift-outline', color: '#22c55e' },
  { key: 'compra', labelPtBR: 'Compra', labelEnUS: 'Purchase', icon: 'shopping-outline', color: '#ef4444' },
  { key: 'tarefa', labelPtBR: 'Tarefa', labelEnUS: 'Task', icon: 'check-circle-outline', color: '#3b82f6' },
  { key: 'bonus', labelPtBR: 'Bonus', labelEnUS: 'Bonus', icon: 'star-outline', color: '#f59e0b' },
  { key: 'outro', labelPtBR: 'Outro', labelEnUS: 'Other', icon: 'dots-horizontal', color: '#6b7280' },
];

export function getCategoryConfig(key: string): CategoryConfig {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}
