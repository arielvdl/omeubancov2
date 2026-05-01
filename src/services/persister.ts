import * as FileSystem from 'expo-file-system';
import type { Persister } from '@tanstack/react-query-persist-client';
import { logger } from '@/src/utils/logger';

const FILE_NAME = 'rq-cache.json';
const DIR = (FileSystem as any).cacheDirectory ?? (FileSystem as any).documentDirectory;
const CACHE_PATH = DIR ? `${DIR}${FILE_NAME}` : null;

async function readFile(path: string): Promise<string | null> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    return await FileSystem.readAsStringAsync(path);
  } catch (err) {
    logger.warn('[persister] read failed', err);
    return null;
  }
}

async function writeFile(path: string, content: string): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(path, content);
  } catch (err) {
    logger.warn('[persister] write failed', err);
  }
}

async function deleteFile(path: string): Promise<void> {
  try {
    await FileSystem.deleteAsync(path, { idempotent: true });
  } catch (err) {
    logger.warn('[persister] delete failed', err);
  }
}

export function createFsPersister(): Persister {
  if (!CACHE_PATH) {
    return {
      persistClient: async () => undefined,
      restoreClient: async () => undefined,
      removeClient: async () => undefined,
    };
  }
  return {
    persistClient: async (client) => {
      await writeFile(CACHE_PATH, JSON.stringify(client));
    },
    restoreClient: async () => {
      const raw = await readFile(CACHE_PATH);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw);
      } catch (err) {
        logger.warn('[persister] parse failed', err);
        return undefined;
      }
    },
    removeClient: async () => {
      await deleteFile(CACHE_PATH);
    },
  };
}
