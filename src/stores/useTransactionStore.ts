import { create } from 'zustand';
import type { Transaction, TransactionType } from '@/src/types/transaction';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;

  addTransaction: (transaction: Transaction) => void;
  getTransactionsByChild: (childId: string) => Transaction[];
  getFilteredTransactions: (childId: string, type?: TransactionType) => Transaction[];
  getRecentTransactions: (childId: string, limit?: number) => Transaction[];
  getTotalsByChild: (childId: string) => { totalIn: number; totalOut: number };
  setLoading: (loading: boolean) => void;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,

  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),

  getTransactionsByChild: (childId) => {
    return (get().transactions ?? []).filter((t) => t.childId === childId);
  },

  getFilteredTransactions: (childId, type) => {
    const all = (get().transactions ?? []).filter((t) => t.childId === childId);
    if (!type) return all;
    return all.filter((t) => t.type === type);
  },

  getRecentTransactions: (childId, limit = 5) => {
    return (get().transactions ?? [])
      .filter((t) => t.childId === childId)
      .slice(0, limit);
  },

  getTotalsByChild: (childId) => {
    const childTransactions = (get().transactions ?? []).filter(
      (t) => t.childId === childId,
    );
    const totalIn = childTransactions
      .filter((t) => t.type === 'deposit' || t.type === 'scheduled')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOut = childTransactions
      .filter((t) => t.type === 'withdrawal')
      .reduce((sum, t) => sum + t.amount, 0);
    return { totalIn, totalOut };
  },

  setLoading: (loading) => set({ isLoading: loading }),
}));
