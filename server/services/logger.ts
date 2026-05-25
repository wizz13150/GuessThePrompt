import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type LogLevel = 'DEBUG' | 'INFO' | 'OK' | 'WARN' | 'ERROR';

const logsDir = resolve(process.cwd(), 'logs');
const serverLogPath = join(logsDir, 'server.log');

function ensureLogsDir() {
  if (!existsSync(logsDir)) mkdirSync(logsDir, { recursive: true });
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, (_key, v) => {
      if (typeof v === 'string' && v.length > 220) return `${v.slice(0, 220)}...`;
      return v;
    });
  } catch {
    return String(value);
  }
}

export function log(level: LogLevel, scope: string, message: string, details?: unknown) {
  ensureLogsDir();
  const timestamp = new Date().toISOString();
  const suffix = details === undefined ? '' : ` | ${safeJson(details)}`;
  const line = `[${timestamp}] [${level}] [${scope}] ${message}${suffix}`;
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
  appendFileSync(serverLogPath, `${line}\n`, 'utf8');
}

export function logError(scope: string, message: string, error: unknown, details?: unknown) {
  const errorDetails = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack?.split('\n').slice(0, 8).join('\n'), details }
    : { error: String(error), details };
  log('ERROR', scope, message, errorDetails);
}

export function readRecentLogs(limit = 160) {
  ensureLogsDir();
  if (!existsSync(serverLogPath)) return [];
  const lines = readFileSync(serverLogPath, 'utf8').split(/\r?\n/).filter(Boolean);
  return lines.slice(Math.max(0, lines.length - limit));
}
