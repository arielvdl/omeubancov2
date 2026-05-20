import * as Sentry from '@sentry/react-native';

interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
  timestamp: string;
}

const MAX_BUFFER_SIZE = 200;
const buffer: LogEntry[] = [];

function addEntry(level: LogEntry['level'], message: string, data?: unknown) {
  const entry: LogEntry = {
    level,
    message,
    data,
    timestamp: new Date().toISOString(),
  };

  buffer.push(entry);
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.shift();
  }

  const tag = `[${level.toUpperCase()}]`;
  const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;

  if (data !== undefined) {
    logFn(tag, message, data);
  } else {
    logFn(tag, message);
  }

  // Auto-capture errors to Sentry
  if (level === 'error') {
    if (data instanceof Error) {
      captureError(data, message);
    } else {
      Sentry.captureMessage(message, {
        level: 'error',
        extra: { data },
      });
    }
  }
}

type AxiosLike = {
  isAxiosError?: boolean;
  code?: string;
  message?: string;
  config?: { url?: string; method?: string; baseURL?: string };
  response?: { status?: number; data?: unknown };
};

function inspectAxios(error: unknown): {
  isAxios: boolean;
  isTransient: boolean;
  url?: string;
  method?: string;
  code?: string;
  status?: number;
} {
  const err = error as AxiosLike | null;
  const isAxios =
    !!err && (err.isAxiosError === true || typeof err.config?.url === 'string');
  if (!isAxios) return { isAxios: false, isTransient: false };
  const status = err?.response?.status;
  const code = err?.code;
  const isTimeout =
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    !!err?.message?.toLowerCase?.().includes('timeout');
  const isNetwork = !err?.response && (code === 'ERR_NETWORK' || !status);
  const baseURL = err?.config?.baseURL ?? '';
  const path = err?.config?.url ?? '';
  const url = path.startsWith('http') ? path : `${baseURL}${path}`;
  return {
    isAxios: true,
    isTransient: isTimeout || isNetwork,
    url: url || undefined,
    method: err?.config?.method?.toUpperCase(),
    code,
    status,
  };
}

/**
 * Capture an error to Sentry with context.
 * Use in catch blocks for critical flows.
 * Demotes transient axios errors (timeout/no-network) to `warning` so they
 * don't trigger High Priority alerts when the user simply has bad cellular.
 */
export function captureError(error: unknown, context?: string) {
  const err = error instanceof Error ? error : new Error(String(error));
  const info = inspectAxios(error);
  const tags: Record<string, string> = {};
  const extra: Record<string, unknown> = { context };
  if (info.isAxios) {
    if (info.url) tags['http.url'] = info.url;
    if (info.method) tags['http.method'] = info.method;
    if (info.code) tags['http.code'] = info.code;
    if (typeof info.status === 'number') tags['http.status'] = String(info.status);
    tags['http.transient'] = info.isTransient ? 'true' : 'false';
    extra.http = {
      url: info.url,
      method: info.method,
      code: info.code,
      status: info.status,
    };
  }
  Sentry.captureException(err, {
    level: info.isTransient ? 'warning' : 'error',
    tags,
    extra,
  });
}

export const logger = {
  info: (message: string, data?: unknown) => addEntry('info', message, data),
  warn: (message: string, data?: unknown) => addEntry('warn', message, data),
  error: (message: string, data?: unknown) => addEntry('error', message, data),
  getBuffer: () => [...buffer],
};
