// src/utils/payCycle.ts
// รอบเงินเดือน 25–24: key = เดือนที่เงินเดือนเข้า (YYYY-MM) — "2026-07" = 25 ก.ค. – 24 ส.ค.
// period โหมดรอบขึ้นต้นด้วย "cycle:" — "cycle:2026-07", "cycle:2026-03_2026-07", "cycle:ALL"
import { THAI_MONTHS_SHORT } from './formatters';

export const PAY_DAY = 25;
export const CYCLE_PREFIX = 'cycle:';

export const isCyclePeriod = (period?: string | null): boolean => !!period?.startsWith(CYCLE_PREFIX);
export const stripCycle = (period: string): string => (isCyclePeriod(period) ? period.slice(CYCLE_PREFIX.length) : period);

/** single calendar month ("YYYY-MM") or single pay cycle ("cycle:YYYY-MM") */
export const isSingleUnitPeriod = (period?: string | null): boolean => /^\d{4}-\d{2}$/.test(stripCycle(period || ''));

export const shiftMonth = (ym: string, delta: number): string => {
  const total = Number(ym.slice(0, 4)) * 12 + Number(ym.slice(5, 7)) - 1 + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
};

/** Every YYYY-MM from a to b inclusive (order-insensitive). */
export const monthsBetween = (a: string, b: string): string[] => {
  const [s, e] = a <= b ? [a, b] : [b, a];
  const out: string[] = [];
  for (let m = s; m <= e; m = shiftMonth(m, 1)) out.push(m);
  return out;
};

/** A picked set of months → period string: one month, a contiguous A_B range, or an A,B,C list. */
export const monthsToPeriod = (months: string[]): string => {
  const sorted = [...new Set(months)].sort();
  if (sorted.length <= 1) return sorted[0] ?? '';
  const contiguous = sorted.every((m, i) => i === 0 || shiftMonth(sorted[i - 1], 1) === m);
  return contiguous ? `${sorted[0]}_${sorted[sorted.length - 1]}` : sorted.join(',');
};

/** ISO YYYY-MM-DD → cycle key. ใช้แค่ส่วนวันที่ ไม่แตะเวลา/timezone */
export const toCycleKey = (iso: string): string =>
  Number(iso.slice(8, 10)) >= PAY_DAY ? iso.slice(0, 7) : shiftMonth(iso.slice(0, 7), -1);

/** row/bucket key of an ISO date under a period: cycle key in cycle mode, calendar YYYY-MM otherwise */
export const monthKeyOf = (iso: string, period: string): string =>
  isCyclePeriod(period) ? toCycleKey(iso) : iso.slice(0, 7);

export const cycleRange = (key: string): { start: string; end: string } => ({
  start: `${key}-${PAY_DAY}`,
  end: `${shiftMonth(key, 1)}-${String(PAY_DAY - 1).padStart(2, '0')}`,
});

export const localTodayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${THAI_MONTHS_SHORT[Number(iso.slice(5, 7)) - 1]}`;

export const cycleLabel = (key: string): string => `รอบ ${THAI_MONTHS_SHORT[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

export const cycleRangeLabel = (key: string): string => {
  const { start, end } = cycleRange(key);
  return `${shortDate(start)} – ${shortDate(end)}`;
};

/** วันจริงที่รอบ from..to ครอบคลุม: "25 มี.ค. 26 – 24 ส.ค. 26 · 153 วัน" */
export const cycleSpanLabel = (fromKey: string, toKey: string = fromKey): string => {
  const s = cycleRange(fromKey).start;
  const e = cycleRange(toKey).end;
  const days = (Date.UTC(+e.slice(0, 4), +e.slice(5, 7) - 1, +e.slice(8, 10)) - Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))) / 86400000 + 1;
  return `${shortDate(s)} ${s.slice(2, 4)} – ${shortDate(e)} ${e.slice(2, 4)} · ${days} วัน`;
};

/** ปี/ครึ่งปี/ไตรมาสในโหมดรอบ = ช่วงรอบตามเดือนที่เงินเดือนเข้า (ปี 2026 = รอบ ม.ค.–ธ.ค. 2026)
 *  เก็บเป็น range ธรรมดา "cycle:2026-01_2026-03" → ทุก consumer ใช้ได้โดยไม่ต้องรู้จัก */
export const CYCLE_PRESETS = [
  { id: 'Y', from: 1, to: 12 }, { id: 'H1', from: 1, to: 6 }, { id: 'H2', from: 7, to: 12 },
  { id: 'Q1', from: 1, to: 3 }, { id: 'Q2', from: 4, to: 6 }, { id: 'Q3', from: 7, to: 9 }, { id: 'Q4', from: 10, to: 12 },
] as const;

export const cyclePresetRange = (year: string, from: number, to: number): string =>
  `${year}-${String(from).padStart(2, '0')}_${year}-${String(to).padStart(2, '0')}`;

/** "2026-01_2026-03" → { year: '2026', id: 'Q1' } */
export const matchCyclePreset = (range: string): { year: string; id: string } | null => {
  const m = /^(\d{4})-(\d{2})_(\d{4})-(\d{2})$/.exec(range);
  if (!m || m[1] !== m[3]) return null;
  const p = CYCLE_PRESETS.find((x) => x.from === Number(m[2]) && x.to === Number(m[4]));
  return p ? { year: m[1], id: p.id } : null;
};

/** สลับ period ระหว่างโหมดปฏิทิน ↔ รอบ โดยจับคู่ช่วงที่ทับกันมากที่สุด: เดือน M (1–24 อยู่ในรอบ M−1) ↔ รอบ M−1.
 *  ช่วง/หลายเดือน เลื่อนทีละตัว; ปี/Q/H แบบปฏิทิน → รอบปัจจุบัน */
export const convertPeriodMode = (period: string, toCycle: boolean): string => {
  const base = stripCycle(period);
  if (toCycle === isCyclePeriod(period)) return period;
  if (base === 'ALL') return toCycle ? CYCLE_PREFIX + base : base;
  if (!/^\d{4}-\d{2}([_,]\d{4}-\d{2})*$/.test(base)) return CYCLE_PREFIX + toCycleKey(localTodayIso());
  const shifted = base.replace(/\d{4}-\d{2}/g, (m) => shiftMonth(m, toCycle ? -1 : 1));
  return toCycle ? CYCLE_PREFIX + shifted : shifted;
};
