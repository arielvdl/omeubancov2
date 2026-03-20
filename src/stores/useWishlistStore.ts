import { create } from 'zustand';
import type { WishItem } from '@/src/types/wishlist';

interface WishlistState {
  items: WishItem[];
  isLoading: boolean;
  goal: WishItem | null;

  setItems: (items: WishItem[]) => void;
  addItem: (item: WishItem) => void;
  updateItem: (id: string, data: Partial<WishItem>) => void;
  removeItem: (id: string) => void;
  setGoal: (item: WishItem | null) => void;
  setLoading: (loading: boolean) => void;
  getItemsByChild: (childId: string) => WishItem[];
  getActiveItems: (childId: string) => WishItem[];
  getConqueredItems: (childId: string) => WishItem[];
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  items: [],
  isLoading: false,
  goal: null,

  setItems: (items) => set({ items }),

  addItem: (item) =>
    set((state) => ({
      items: [item, ...state.items],
    })),

  updateItem: (id, data) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, ...data } : item
      ),
      goal: state.goal?.id === id ? { ...state.goal, ...data } : state.goal,
    })),

  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      goal: state.goal?.id === id ? null : state.goal,
    })),

  setGoal: (item) => set({ goal: item }),

  setLoading: (loading) => set({ isLoading: loading }),

  getItemsByChild: (childId) => {
    return get().items.filter((item) => item.childId === childId);
  },

  getActiveItems: (childId) => {
    return get().items.filter(
      (item) => item.childId === childId && item.status === 'active'
    );
  },

  getConqueredItems: (childId) => {
    return get().items.filter(
      (item) => item.childId === childId && item.status === 'conquered'
    );
  },
}));
