export interface AuthState {
  token: string | null;
  familyId: string | null;
  role: 'parent' | 'child';
  childId: string | null;
}

export interface Contract {
  id: string;
  familyId: string;
  childId: string;
  content: string;
  parentSignedAt: string | null;
  childSignedAt: string | null;
  childSignatureData: string | null; // base64
  isActive: boolean;
}

export interface ScheduledDeposit {
  id: string;
  familyId: string;
  childId: string;
  amount: number; // cents
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek: number | null; // 0-6
  dayOfMonth: number | null; // 1-28
  depositTime: string; // HH:mm format, e.g. "00:00"
  timezone: string; // IANA timezone, e.g. "America/Sao_Paulo"
  nextRunAt: string;
  lastRunAt: string | null;
  status: 'active' | 'paused' | 'cancelled';
}

export interface Device {
  id: string;
  familyId: string;
  childId: string | null;
  pushToken: string;
  platform: 'ios' | 'android';
}
