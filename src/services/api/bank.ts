import { apiClient } from './client';
import type { ScheduledDeposit } from '@/src/types/user';

export interface CreateChildPayload {
  name: string;
  avatarUrl?: string;
  birthDate?: string;
}

export interface UpdateChildPayload {
  name?: string;
  avatarUrl?: string;
}

export interface UpdateFamilyPayload {
  name?: string;
  currency?: string;
}

export interface CreateSchedulePayload {
  amount: number;
  frequency: ScheduledDeposit['frequency'];
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  depositTime?: string;
  timezone?: string;
}

export interface UpdateSchedulePayload {
  amount?: number;
  frequency?: ScheduledDeposit['frequency'];
  dayOfWeek?: number | null;
  dayOfMonth?: number | null;
  depositTime?: string;
  timezone?: string;
}

export const bankApi = {
  // Family
  getFamily: () => apiClient.get('/families'),
  updateFamily: (data: UpdateFamilyPayload) => apiClient.put('/families', data),

  // Children
  getChildren: () => apiClient.get('/children'),
  createChild: (data: CreateChildPayload) => apiClient.post('/children', data),
  updateChild: (childId: string, data: UpdateChildPayload) =>
    apiClient.put(`/children/${childId}`, data),
  deleteChild: (childId: string) => apiClient.delete(`/children/${childId}`),

  // Scheduled deposits
  getSchedules: (childId: string) =>
    apiClient.get(`/children/${childId}/schedules`),
  createSchedule: (childId: string, data: CreateSchedulePayload) =>
    apiClient.post(`/children/${childId}/schedules`, data),
  updateSchedule: (
    childId: string,
    scheduleId: string,
    data: UpdateSchedulePayload,
  ) => apiClient.put(`/children/${childId}/schedules/${scheduleId}`, data),
  pauseSchedule: (childId: string, scheduleId: string) =>
    apiClient.post(`/children/${childId}/schedules/${scheduleId}/pause`),
  resumeSchedule: (childId: string, scheduleId: string) =>
    apiClient.post(`/children/${childId}/schedules/${scheduleId}/resume`),
  deleteSchedule: (childId: string, scheduleId: string) =>
    apiClient.delete(`/children/${childId}/schedules/${scheduleId}`),

  // Contracts
  getContract: (childId: string) =>
    apiClient.get(`/children/${childId}/contract`),
  createContract: (childId: string, content: string, childSignatureData?: string) =>
    apiClient.post(`/children/${childId}/contract`, {
      content,
      childId,
      ...(childSignatureData ? { childSignatureData } : {}),
    }),
  signContract: (childId: string, signatureData: string) =>
    apiClient.post(`/children/${childId}/contract/sign`, { signatureData }),
  deleteContract: (childId: string) =>
    apiClient.delete(`/children/${childId}/contract`),
};
