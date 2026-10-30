// src/utils/moveDate.ts — what the Ledger date editor accepts when moving rows to another day
import { parseLooseDate } from './dateHelpers';

/**
 * - `set`:   one date for every row (YYYY-MM-DD or D/M/YYYY, Buddhist year ok)
 * - `day`:   same month as each row, that day of the month (clamped to month length): "25"
 * - `shift`: each row moves by the same amount: "+3" / "+3d" / "-1d" days, "+1m" / "-2m" months
 */
export type DateMove =
  | { kind: 'set'; date: string }
  | { kind: 'day'; day: number }
  | { kind: 'shift'; days: number; months: number };

export const parseDateMove = (input: string): DateMove | null => {
  const s = (input ?? '').trim().toLowerCase();
  const shift = /^([-+−])\s*(\d{1,4})\s*([dm]|วัน|เดือน)?$/.exec(s);
  if (shift) {
    const n = Number(shift[2]) * (shift[1] === '+' ? 1 : -1);
    if (n === 0) return null;
    const months = shift[3] === 'm' || shift[3] === 'เดือน';
    return { kind: 'shift', days: months ? 0 : n, months: months ? n : 0 };
  }
  if (/^\d{1,2}$/.test(s)) {
    const day = Number(s);
    return day >= 1 && day <= 31 ? { kind: 'day', day } : null;
  }
  const date = parseLooseDate(s);
  return date ? { kind: 'set', date } : null;
};

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m0: number) => new Date(y, m0 + 1, 0).getDate();

/** The date `fromIso` lands on after `move`. Month shifts keep the day, clamped (31 ม.ค. +1m → 28/29 ก.พ.). */
export const applyDateMove = (move: DateMove, fromIso: string): string => {
  if (move.kind === 'set') return move.date;
  const [y, m, d] = fromIso.split('-').map(Number);
  if (move.kind === 'day') return `${y}-${pad(m)}-${pad(Math.min(move.day, daysIn(y, m - 1)))}`;
  if (move.months) {
    const total = y * 12 + (m - 1) + move.months;
    const ny = Math.floor(total / 12);
    const nm = total - ny * 12;
    return `${ny}-${pad(nm + 1)}-${pad(Math.min(d, daysIn(ny, nm)))}`;
  }
  const t = new Date(y, m - 1, d + move.days);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
};
