export interface Family {
  id: string;
  name: string;
  currency: string;
  locale: string;
  timezone: string;
  createdAt: string;
}

export interface Child {
  id: string;
  familyId: string;
  name: string;
  avatarUrl: string | null;
  mascotId: string | null;
  balance: number; // in cents
  birthDate: string | null;
  createdAt: string;
}

export type Currency = 'BRL' | 'USD' | 'EUR';

export interface BankConfig {
  name: string;
  currency: Currency;
  locale: string;
}
