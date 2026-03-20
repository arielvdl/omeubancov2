import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { Child, Family } from '@/src/types/bank';
import type { Transaction } from '@/src/types/transaction';
import type { ScheduledDeposit } from '@/src/types/user';

const SELECTED_CHILD_KEY = 'selected_child_id';

export interface OnboardingChild {
  id: string;
  name: string;
  avatarId: string;
  signatureData: string | null;
}

interface BankState {
  family: Family | null;
  children: Child[];
  selectedChildId: string | null;
  transactions: Transaction[];
  isLoading: boolean;
  hydrated: boolean;
  onboardingChildren: OnboardingChild[];
  contractRules: string[];
  childContractRules: Record<string, string[]>;
  schedules: ScheduledDeposit[];

  setFamily: (family: Family) => void;
  setChildren: (children: Child[]) => void;
  loadPersistedSelectedChild: () => Promise<void>;
  setHydrated: (v: boolean) => void;
  setSelectedChild: (childId: string) => void;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateChildBalance: (childId: string, newBalance: number) => void;
  setLoading: (loading: boolean) => void;
  selectedChild: () => Child | undefined;

  addChild: (child: Child) => void;
  updateChild: (id: string, updates: Partial<Child>) => void;
  removeChild: (id: string) => void;

  addOnboardingChild: (child: OnboardingChild) => void;
  updateOnboardingChild: (id: string, updates: Partial<OnboardingChild>) => void;
  removeOnboardingChild: (id: string) => void;
  clearOnboardingChildren: () => void;
  setContractRules: (rules: string[]) => void;
  setChildContractRules: (childId: string, rules: string[]) => void;
  finalizeOnboarding: (familyId: string) => void;

  addSchedule: (schedule: ScheduledDeposit) => void;
  updateSchedule: (id: string, updates: Partial<ScheduledDeposit>) => void;
  removeSchedule: (id: string) => void;
}

export const useBankStore = create<BankState>((set, get) => ({
  family: null,
  children: [],
  selectedChildId: null,
  transactions: [],
  isLoading: false,
  hydrated: false,
  onboardingChildren: [],
  contractRules: [],
  childContractRules: {},
  schedules: [],

  setFamily: (family) => set({ family }),
  setHydrated: (v) => set({ hydrated: v }),

  setChildren: (children) => {
    set({ children });
    const currentId = get().selectedChildId;
    if (children.length > 0) {
      // If no selection or current selection is invalid, fallback to first
      if (!currentId || !children.some((c) => c.id === currentId)) {
        const firstId = children[0].id;
        set({ selectedChildId: firstId });
        SecureStore.setItemAsync(SELECTED_CHILD_KEY, firstId).catch(() => {});
      }
    }
  },

  loadPersistedSelectedChild: async () => {
    const savedId = await SecureStore.getItemAsync(SELECTED_CHILD_KEY).catch(() => null);
    if (savedId) {
      set({ selectedChildId: savedId });
    }
  },

  setSelectedChild: (childId) => {
    set({ selectedChildId: childId });
    SecureStore.setItemAsync(SELECTED_CHILD_KEY, childId).catch(() => {});
  },

  setTransactions: (transactions) => set({ transactions }),

  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),

  updateChildBalance: (childId, newBalance) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === childId ? { ...c, balance: newBalance } : c,
      ),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  selectedChild: () => {
    const state = get();
    return state.children.find((c) => c.id === state.selectedChildId);
  },

  addChild: (child) =>
    set((state) => {
      const newChildren = [...state.children, child];
      const newSelectedId = state.selectedChildId ?? child.id;
      if (!state.selectedChildId) {
        SecureStore.setItemAsync(SELECTED_CHILD_KEY, child.id).catch(() => {});
      }
      return {
        children: newChildren,
        selectedChildId: newSelectedId,
      };
    }),

  updateChild: (id, updates) =>
    set((state) => ({
      children: state.children.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  removeChild: (id) =>
    set((state) => {
      const filtered = state.children.filter((c) => c.id !== id);
      return {
        children: filtered,
        selectedChildId:
          state.selectedChildId === id
            ? filtered[0]?.id ?? null
            : state.selectedChildId,
      };
    }),

  addOnboardingChild: (child) =>
    set((state) => ({
      onboardingChildren: [...state.onboardingChildren, child],
    })),

  updateOnboardingChild: (id, updates) =>
    set((state) => ({
      onboardingChildren: state.onboardingChildren.map((c) =>
        c.id === id ? { ...c, ...updates } : c,
      ),
    })),

  removeOnboardingChild: (id) =>
    set((state) => ({
      onboardingChildren: state.onboardingChildren.filter((c) => c.id !== id),
    })),

  clearOnboardingChildren: () => set({ onboardingChildren: [] }),

  setContractRules: (rules) => set({ contractRules: rules }),

  setChildContractRules: (childId, rules) =>
    set((state) => ({
      childContractRules: { ...state.childContractRules, [childId]: rules },
    })),

  finalizeOnboarding: (familyId) => {
    const { onboardingChildren } = get();
    const now = new Date().toISOString();
    const children: Child[] = onboardingChildren.map((oc) => ({
      id: oc.id,
      familyId,
      name: oc.name,
      avatarUrl: oc.avatarId,
      balance: 0,
      birthDate: null,
      createdAt: now,
    }));
    const firstId = children[0]?.id ?? null;
    set({
      children,
      selectedChildId: firstId,
      onboardingChildren: [],
    });
    if (firstId) {
      SecureStore.setItemAsync(SELECTED_CHILD_KEY, firstId).catch(() => {});
    }
  },

  addSchedule: (schedule) =>
    set((state) => ({ schedules: [...state.schedules, schedule] })),

  updateSchedule: (id, updates) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      ),
    })),

  removeSchedule: (id) =>
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    })),
}));
