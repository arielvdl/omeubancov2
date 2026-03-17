export type TransactionType = 'deposit' | 'withdrawal' | 'scheduled';
export type TransactionCategory = 'mesada' | 'presente' | 'compra' | 'tarefa' | 'bonus' | 'outro';
export type CreatedBy = 'parent' | 'child' | 'system';

export interface Transaction {
  id: string;
  childId: string;
  familyId: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number; // in cents
  balanceAfter: number; // in cents
  description: string;
  scheduledDepositId: string | null;
  createdBy: CreatedBy;
  createdAt: string;
  receiptUrl?: string | null;
}

export interface TransactionFilters {
  type?: TransactionType;
  category?: TransactionCategory;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}
