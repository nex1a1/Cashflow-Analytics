// src/utils/dateHelpers.ts
import { isCyclePeriod, stripCycle, toCycleKey, cycleRange, shiftMonth, CYCLE_PRESETS } from './payCycle';

/**
 * แปลง YYYY-MM-DD เป็น DD/MM/YYYY
 */
export const fromISODate = (isoStr: string): string => {
  if (!isoStr || typeof isoStr !== 'string' || !isoStr.includes('-')) return isoStr;
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
};

/** D/M/YYYY or YYYY-MM-DD, Gregorian or Buddhist year → "YYYY-MM-DD"; null when it is not a real date (CSV import). */
export const parseLooseDate = (input: string): string | null => {
  const s = (input ?? '').trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const iso = dmy ? null : /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!dmy && !iso) return null;
  const [d, m] = dmy ? [Number(dmy[1]), Number(dmy[2])] : [Number(iso![3]), Number(iso![2])];
  let y = Number(dmy ? dmy[3] : iso![1]);
  if (y > 2400) y -= 543; // พ.ศ. → ค.ศ.
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (y < 1900 || y > 2400 || probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

/** YYYY-MM-DD → local Date (new Date('YYYY-MM-DD') would be UTC midnight). Every stored date is ISO: the API normalizes them (CLAUDE.md 41(c)). */
export const parseDateStrToObj = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const toStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "2026-H1" / "2026-Q3" (calendar mode) → year + month span, else null */
const yearPart = (period: string) => {
  const hit = /^(\d{4})-([HQ]\d)$/.exec(period);
  const span = hit && CYCLE_PRESETS.find(p => p.id === hit[2]);
  return span ? { year: Number(hit[1]), from: span.from, to: span.to } : null;
};

/** first day of month `from` → last day of month `to` (to may be in a later year via the month overflow) */
const monthSpan = (year: number, from: number, to: number, toYear = year) =>
  ({ start: new Date(year, from - 1, 1), end: new Date(toYear, to, 0) });

export const isDateInFilter = (dateStr: string, period: string): boolean => {
  const cycle = isCyclePeriod(period);
  const filter = stripCycle(period);
  if (filter === 'ALL') return true;
  const [y, mm, dd] = (dateStr || '').split('-');
  if (!dd) return false; // no date, or not a full one
  const m = Number(mm);
  // โหมดรอบ: "เดือน" ของวันที่ = รอบเงินเดือนที่วันนั้นอยู่ แล้วใช้ตรรกะเดิมทั้งหมด (เดี่ยว / ช่วง / หลายเดือน)
  const currentDate = cycle ? toCycleKey(dateStr) : `${y}-${mm}`;

  // Support Multi-select: YYYY-MM,YYYY-MM,...
  if (filter.includes(',')) {
    return filter.split(',').includes(currentDate);
  }

  // Support Custom Range: YYYY-MM_YYYY-MM
  if (filter.includes('_')) {
    const [start, end] = filter.split('_');
    return currentDate >= start && currentDate <= end;
  }

  if (/^\d{4}-\d{2}$/.test(filter)) return filter === currentDate;
  if (filter === y) return true;
  const part = yearPart(filter);
  return !!part && part.year === Number(y) && m >= part.from && m <= part.to;
};

export const buildDateSequence = (start: Date, end: Date, maxDays = 3650): string[] => {
  const dateArray: string[] = [];
  let curr = new Date(start);
  let sanityCheck = 0;
  while (curr <= end && sanityCheck < maxDays) {
    dateArray.push(toStr(curr));
    const nextDate = new Date(curr);
    nextDate.setDate(nextDate.getDate() + 1);
    curr = nextDate;
    sanityCheck++;
  }
  return dateArray;
};

/** ISO dates of one calendar month (`YYYY-MM`) or one pay cycle (same key, 25 → 24) */
export const periodUnitDates = (key: string, cycle: boolean): string[] => {
  if (cycle) {
    const { start, end } = cycleRange(key);
    return buildDateSequence(parseDateStrToObj(start), parseDateStrToObj(end));
  }
  const m = Number(key.slice(5, 7));
  const { start, end } = monthSpan(Number(key.slice(0, 4)), m, m);
  return buildDateSequence(start, end);
};

export const resolvePeriodDateBounds = (period: string): { start: Date; end: Date } | null => {
  if (isCyclePeriod(period)) {
    const base = stripCycle(period);
    if (!/^\d{4}-\d{2}(_\d{4}-\d{2})?$/.test(base)) return null;
    const [first, last = first] = base.split('_');
    return { start: parseDateStrToObj(cycleRange(first).start), end: parseDateStrToObj(cycleRange(last).end) };
  }
  if (/^\d{4}$/.test(period)) return monthSpan(Number(period), 1, 12);
  const part = yearPart(period);
  if (part) return monthSpan(part.year, part.from, part.to);
  const range = /^(\d{4})-(\d{2})(?:_(\d{4})-(\d{2}))?$/.exec(period); // YYYY-MM or YYYY-MM_YYYY-MM
  if (!range) return null;
  const [, sy, sm, ey = sy, em = sm] = range;
  return monthSpan(Number(sy), Number(sm), Number(em), Number(ey));
};

/** first day of the calendar month / pay cycle containing `d` */
const periodUnitStart = (d: Date, period: string): Date => {
  if (!isCyclePeriod(period)) return new Date(d.getFullYear(), d.getMonth(), 1);
  return parseDateStrToObj(cycleRange(toCycleKey(toStr(d))).start);
};

/** earliest and latest row inside the period, or null when it has none */
const txSpan = (rows: any[], period: string): { min: Date; max: Date } | null => {
  const times = rows.filter(t => isDateInFilter(t.date, period)).map(t => parseDateStrToObj(t.date).getTime());
  return times.length ? { min: new Date(Math.min(...times)), max: new Date(Math.max(...times)) } : null;
};

export const generateDatesForPeriod = (period: string, allTransactions: any[]): string[] => {
  const cycle = isCyclePeriod(period);
  if (period.includes(',')) {
    const keys = stripCycle(period).split(',').sort((x, y) => x.localeCompare(y));
    return keys.flatMap(k => periodUnitDates(k, cycle));
  }
  const span = txSpan(allTransactions, period);
  if (stripCycle(period) === 'ALL') {
    // everything: from the start of the earliest month / cycle to the latest row
    return span ? buildDateSequence(periodUnitStart(span.min, period), span.max) : [];
  }
  const bounds = resolvePeriodDateBounds(period);
  if (!bounds) return [];
  // a single month or cycle always shows every day; longer periods are trimmed to the months that have rows
  if (span && !/^\d{4}-\d{2}$/.test(stripCycle(period))) {
    const unitStart = periodUnitStart(span.min, period);
    if (bounds.start < unitStart) bounds.start = unitStart;
    if (bounds.end > span.max) bounds.end = span.max;
  }
  return buildDateSequence(bounds.start, bounds.end);
};

export interface PeriodDateRange {
  startDate: string | null;
  endDate: string | null;
  fetchStartDate: string | null;
}

/**
 * Returns { startDate, endDate, fetchStartDate } in YYYY-MM-DD format for a given period string.
 * fetchStartDate covers the previous comparison period (e.g. prior month/quarter/year)
 * so that Period-over-Period comparisons can calculate historical deltas accurately.
 */
export const getPeriodDateRange = (period: string): PeriodDateRange => {
  if (stripCycle(period) === 'ALL') return { startDate: null, endDate: null, fetchStartDate: null };
  const bounds = resolvePeriodDateBounds(period);
  if (!bounds) return { startDate: null, endDate: null, fetchStartDate: null };

  const startDate = toStr(bounds.start);
  const endDate = toStr(bounds.end);
  let fetchStartDate = startDate;

  if (isCyclePeriod(period) && /^\d{4}-\d{2}$/.test(stripCycle(period))) {
    // Single Cycle -> 3 cycles back (Ghost Pacer benchmark)
    fetchStartDate = cycleRange(shiftMonth(stripCycle(period), -3)).start;
  } else if (/^\d{4}-\d{2}$/.test(period)) {
    // Single Month: YYYY-MM -> previous 3 months start (to support Ghost Pacer & benchmark)
    const [yStr, mStr] = period.split('-');
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    const prevDate = new Date(y, m - 4, 1);
    fetchStartDate = toStr(prevDate);
  } else if (yearPart(period)) {
    // Half-year / quarter -> the previous one (its length back; Jan overflows into last year)
    const { year, from, to } = yearPart(period)!;
    fetchStartDate = toStr(new Date(year, from - 1 - (to - from + 1), 1));
  } else if (/^\d{4}$/.test(period)) {
    // Full Year: YYYY -> previous year start
    fetchStartDate = `${Number(period) - 1}-01-01`;
  } else {
    // Custom range: shift back by duration
    const durationMs = bounds.end.getTime() - bounds.start.getTime() + 86400000;
    const prevStart = new Date(bounds.start.getTime() - durationMs);
    fetchStartDate = toStr(prevStart);
  }

  return { startDate, endDate, fetchStartDate };
};
