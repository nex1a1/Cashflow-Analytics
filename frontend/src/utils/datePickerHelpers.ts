import { THAI_MONTHS_SHORT } from './formatters';
import { isSingleUnitPeriod, stripCycle } from './payCycle';

export const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

export const splitDateValue = (v: string): string[] => (v ? v.split(',') : []);

export function parseValue(v?: string | null, filterPeriod?: string | null): Date {
  // ALL / WEEKDAY / WEEKEND are not dates (NaN), so they fall through to the period
  const [y, m, d] = splitDateValue(v ?? '')[0]?.split('-').map(Number) ?? [];
  if (y && m && d) return new Date(y, m - 1, d);
  if (filterPeriod && isSingleUnitPeriod(filterPeriod)) {
    const [py, pm] = stripCycle(filterPeriod).split('-').map(Number); // a pay cycle opens on its salary month
    return new Date(py, pm - 1, 1);
  }
  return new Date();
}

export function toValueStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDatesInRange(startStr: string, endStr: string): string[] {
  let s = startStr;
  let e = endStr;
  if (s > e) [s, e] = [e, s];

  const dates: string[] = [];
  const [sy, sm, sd] = s.split('-').map(Number);
  const [ey, em, ed] = e.split('-').map(Number);

  let cur = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);

  while (cur <= endDate) {
    dates.push(toValueStr(cur));
    const nextDate = new Date(cur);
    nextDate.setDate(nextDate.getDate() + 1);
    cur = nextDate;
  }
  return dates;
}

// Group sorted YYYY-MM-DD date strings into contiguous ranges
export function groupContiguousDates(dateStrArray: string[]): string[][] {
  if (!dateStrArray || dateStrArray.length === 0) return [];
  const sorted = [...dateStrArray].sort((a, b) => a.localeCompare(b));

  const ranges: string[][] = [];
  let currentRange: string[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevStr = sorted[i - 1];
    const curStr = sorted[i];

    const [py, pm, pd] = prevStr.split('-').map(Number);
    const [cy, cm, cd] = curStr.split('-').map(Number);

    const prevDate = new Date(py, pm - 1, pd);
    const curDate = new Date(cy, cm - 1, cd);

    const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRange.push(curStr);
    } else {
      ranges.push(currentRange);
      currentRange = [curStr];
    }
  }
  if (currentRange.length > 0) {
    ranges.push(currentRange);
  }
  return ranges;
}

export function formatDisplay(v?: string | null, placeholder = 'เลือกวันที่'): string {
  if (!v || v === 'ALL') return placeholder;
  if (v === 'WEEKDAY') return 'วันทำงาน (จ.-ศ.)';
  if (v === 'WEEKEND') return 'วันหยุด (ส.-อา.)';

  const rawDates = splitDateValue(v);
  if (rawDates.length === 1) {
    const parts = rawDates[0].split('-').map(Number);
    if (parts.length < 3 || Number.isNaN(parts[0])) return placeholder;
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);
    const dayLabel = DAY_LABELS[dateObj.getDay()] || '';
    return `${dayLabel}. ${d} ${THAI_MONTHS_SHORT[m - 1]} ${y}`;
  }

  const ranges = groupContiguousDates(rawDates);
  const first = ranges[0][0];
  const lastRange = ranges[ranges.length - 1];
  const last = lastRange[lastRange.length - 1];
  if (ranges.length === 1) {
    const [y1, y2] = [first.slice(0, 4), last.slice(0, 4)];
    return y1 === y2 ? `${formatRangeLabel(ranges[0])} ${y1}` : `${dayMonth(first)} ${y1} - ${dayMonth(last)} ${y2}`;
  }
  // All in one month: name it once ("1, 3-5 ก.ย."); otherwise every range carries its own month
  if (first.slice(0, 7) === last.slice(0, 7)) {
    const days = ranges.map(r => r.length === 1 ? `${dayOf(r[0])}` : `${dayOf(r[0])}-${dayOf(r[r.length - 1])}`);
    return `${days.join(', ')} ${THAI_MONTHS_SHORT[Number(last.slice(5, 7)) - 1]}`;
  }
  return ranges.map(r => formatRangeLabel(r, '-')).join(', ');
}

const dayOf = (s: string) => Number(s.slice(8, 10));
const dayMonth = (s: string) => `${dayOf(s)} ${THAI_MONTHS_SHORT[Number(s.slice(5, 7)) - 1]}`;

/** One contiguous run of YYYY-MM-DD: "13 ก.ย." · "13 - 15 ก.ย." · "31 ม.ค. - 1 ก.พ." */
export function formatRangeLabel(range: string[], sep = ' - '): string {
  const first = range[0];
  const last = range[range.length - 1];
  if (range.length === 1) return dayMonth(first);
  if (first.slice(0, 7) === last.slice(0, 7)) return `${dayOf(first)}${sep}${dayMonth(last)}`;
  return `${dayMonth(first)}${sep}${dayMonth(last)}`;
}

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2050;

export function getDecadeWindow(year: number, windowSize = 12): { start: number; end: number; years: number[] } {
  const clampedYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, year));
  const start = Math.max(MIN_YEAR, Math.floor(clampedYear / windowSize) * windowSize);
  const years = Array.from({ length: windowSize }, (_, i) => start + i).filter(
    (y) => y >= MIN_YEAR && y <= MAX_YEAR
  );
  return {
    start,
    end: years[years.length - 1] || start,
    years,
  };
}

export function stepDate(dateStr: string, stepDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const next = new Date(y, m - 1, d + stepDays);
  return toValueStr(next);
}

export function stepMonth(date: Date, stepMonths: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + stepMonths, 1);
  const clampedYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, target.getFullYear()));
  if (clampedYear !== target.getFullYear()) {
    return date;
  }
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), maxDay));
  return target;
}

export function stepYear(date: Date, stepYears: number): Date {
  const y = date.getFullYear();
  const nextYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, y + stepYears));
  const m = date.getMonth();
  const d = date.getDate();
  const target = new Date(nextYear, m, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, maxDay));
  return target;
}

export function getPresetDates(baseDate = new Date()): {
  today: string;
  yesterday: string;
  startOfMonth: string;
  endOfMonth: string;
} {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  const d = baseDate.getDate();

  const todayStr = toValueStr(baseDate);
  const yesterdayStr = toValueStr(new Date(y, m, d - 1));
  const startOfMonthStr = toValueStr(new Date(y, m, 1));
  const endOfMonthStr = toValueStr(new Date(y, m + 1, 0));

  return {
    today: todayStr,
    yesterday: yesterdayStr,
    startOfMonth: startOfMonthStr,
    endOfMonth: endOfMonthStr
  };
}
