/**
 * One log format for the whole backend, so `docker logs -f` reads as a single column:
 *
 *   2026-10-29 18:03:25  INFO   db      บันทึก 2026-10-29 · ค่ากิน · "ข้าวเที่ยง" · ฿25.00 · NEED
 *   2026-10-29 18:03:25  INFO   api     POST /api/transactions → 200 · 43ms · บันทึกธุรกรรม 1 รายการ
 *   2026-10-29 18:03:40  WARN   api     POST /api/settings → 400 · 2ms · ข้อมูลไม่ถูกต้อง (key: Required)
 *
 * Time is local and taken when the line is written, so lines are always in order.
 * Colour only on a real terminal (`npm run dev`); Docker without a TTY gets plain text.
 */

type Level = 'INFO' | 'WARN' | 'ERROR';
export type LogScope = 'app' | 'db' | 'api' | 'schema' | 'backup' | 'price';

const color = process.stdout.isTTY === true && !process.env.NO_COLOR;
const paint = (code: string, s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const LEVEL_COLOR: Record<Level, string> = { INFO: '32', WARN: '33', ERROR: '31' };

const pad = (n: number, z = 2) => String(n).padStart(z, '0');

export function localTimestamp(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

const text = (parts: unknown[]) => parts
  .map(p => (p instanceof Error ? p.message : typeof p === 'string' ? p : JSON.stringify(p)))
  .join(' ');

function write(level: Level, scope: LogScope, parts: unknown[]): void {
  const line = `${paint('2', localTimestamp())}  ${paint(LEVEL_COLOR[level], level.padEnd(5))}  ${paint('36', scope.padEnd(6))}  ${text(parts)}`;
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
}

export const log = {
  info: (scope: LogScope, ...parts: unknown[]) => write('INFO', scope, parts),
  warn: (scope: LogScope, ...parts: unknown[]) => write('WARN', scope, parts),
  error: (scope: LogScope, ...parts: unknown[]) => write('ERROR', scope, parts),
};

/** ฿1,234.50 / −฿500.00 from satang (same look as the frontend's formatBaht). */
export function bahtFromSatang(satang: number): string {
  const s = (Math.abs(satang) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${satang < 0 ? '−' : ''}฿${s}`;
}

/** Long values (settings JSON, notes) cut to one readable line. */
export function clip(value: unknown, max = 80): string {
  const s = (typeof value === 'string' ? value : JSON.stringify(value) ?? '').replace(/\s+/g, ' ');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}
