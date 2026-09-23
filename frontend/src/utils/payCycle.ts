// src/utils/payCycle.ts
// รอบเงินเดือน 25–24: key = เดือนที่เงินเดือนเข้า (YYYY-MM) — "2026-07" = 25 ก.ค. – 24 ส.ค.
import { THAI_MONTHS_SHORT } from './formatters';

export const PAY_DAY = 25;

const shiftMonth = (ym: string, delta: number): string => {
  const total = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1 + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

/** ISO YYYY-MM-DD → cycle key. ใช้แค่ส่วนวันที่ ไม่แตะเวลา/timezone */
export const toCycleKey = (iso: string): string =>
  Number(iso.slice(8, 10)) >= PAY_DAY ? iso.slice(0, 7) : shiftMonth(iso.slice(0, 7), -1);

export const cycleRange = (key: string): { start: string; end: string } => ({
  start: `${key}-${PAY_DAY}`,
  end: `${shiftMonth(key, 1)}-${String(PAY_DAY - 1).padStart(2, '0')}`,
});

const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;

export const cycleLabel = (key: string): string => `รอบ ${THAI_MONTHS_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

export const cycleRangeLabel = (key: string): string => {
  const { start, end } = cycleRange(key);
  return `${shortDate(start)} – ${shortDate(end)}`;
};
