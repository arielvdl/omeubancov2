import * as FileSystem from 'expo-file-system';
import { logger } from '@/src/utils/logger';
import { useNetworkStore } from '@/src/stores/useNetworkStore';

export type MutationKind = 'deposit' | 'withdraw';

export interface QueuedMutation {
  id: string;
  kind: MutationKind;
  childId: string;
  payload: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const FILE_NAME = 'mutation-queue.json';
const DIR = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
const QUEUE_PATH = DIR ? `${DIR}${FILE_NAME}` : null;

const subscribers = new Set<(items: QueuedMutation[]) => void>();
let memory: QueuedMutation[] | null = null;

async function load(): Promise<QueuedMutation[]> {
  if (memory) return memory;
  if (!QUEUE_PATH) {
    memory = [];
    return memory;
  }
  try {
    const info = await FileSystem.getInfoAsync(QUEUE_PATH);
    if (!info.exists) {
      memory = [];
      return memory;
    }
    const raw = await FileSystem.readAsStringAsync(QUEUE_PATH);
    const parsed = JSON.parse(raw);
    memory = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    logger.warn('[mutationQueue] load failed', err);
    memory = [];
  }
  return memory;
}

async function flush(): Promise<void> {
  if (!QUEUE_PATH || !memory) return;
  try {
    await FileSystem.writeAsStringAsync(QUEUE_PATH, JSON.stringify(memory));
  } catch (err) {
    logger.warn('[mutationQueue] flush failed', err);
  }
  subscribers.forEach((cb) => cb(memory!.slice()));
}

export const mutationQueue = {
  async list(): Promise<QueuedMutation[]> {
    return (await load()).slice();
  },
  async enqueue(item: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'>): Promise<QueuedMutation> {
    const items = await load();
    const queued: QueuedMutation = {
      ...item,
      id: `${item.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      attempts: 0,
    };
    items.push(queued);
    await flush();
    return queued;
  },
  async remove(id: string): Promise<void> {
    const items = await load();
    const idx = items.findIndex((it) => it.id === id);
    if (idx >= 0) {
      items.splice(idx, 1);
      await flush();
    }
  },
  async markAttempt(id: string, error?: string): Promise<void> {
    const items = await load();
    const item = items.find((it) => it.id === id);
    if (item) {
      item.attempts += 1;
      item.lastError = error;
      await flush();
    }
  },
  subscribe(cb: (items: QueuedMutation[]) => void): () => void {
    subscribers.add(cb);
    load().then((items) => cb(items.slice()));
    return () => subscribers.delete(cb);
  },
  async drain(handler: (item: QueuedMutation) => Promise<void>): Promise<{ ok: number; fail: number }> {
    const items = await load();
    let ok = 0;
    let fail = 0;
    const remaining: QueuedMutation[] = [];
    for (const item of items) {
      if (!useNetworkStore.getState().online) {
        remaining.push(item);
        continue;
      }
      try {
        await handler(item);
        ok += 1;
      } catch (err) {
        item.attempts += 1;
        item.lastError = (err as Error)?.message ?? 'unknown';
        remaining.push(item);
        fail += 1;
      }
    }
    memory = remaining;
    await flush();
    return { ok, fail };
  },
  async clear(): Promise<void> {
    memory = [];
    await flush();
  },
};
