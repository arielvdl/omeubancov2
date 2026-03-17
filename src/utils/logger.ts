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
}

export const logger = {
  info: (message: string, data?: unknown) => addEntry('info', message, data),
  warn: (message: string, data?: unknown) => addEntry('warn', message, data),
  error: (message: string, data?: unknown) => addEntry('error', message, data),
  getBuffer: () => [...buffer],
};
