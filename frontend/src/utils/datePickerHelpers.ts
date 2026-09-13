import { THAI_MONTHS_SHORT } from './formatters';

export const DAY_LABELS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'] as const;

export function splitDateValue(v: string): string[] {
  if (!v) return [];
  if (v.includes(',')) return v.split(',').filter(Boolean);
  if (v.includes(':')) return v.split(':').filter(Boolean);
  return [v];
}

export function parseValue(v?: string | null, filterPeriod?: string | null): Date {
  if (v && v !== 'ALL' && v !== 'WEEKDAY' && v !== 'WEEKEND') {
    const targetStr = splitDateValue(v)[0];
    if (targetStr) {
      const [y, m, d] = targetStr.split('-').map(Number);
      if (y && m && d) return new Date(y, m - 1, d);
    }
  }
  if (filterPeriod?.match(/^\d{4}-\d{2}$/)) {
    const [py, pm] = filterPeriod.split('-').map(Number);
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
  if (ranges.length === 1) {
    const r = ranges[0];
    const [y1, m1, d1] = r[0].split('-').map(Number);
    const lastDate = r[r.length - 1];
    const [, , d2] = (lastDate || '').split('-').map(Number);
    if (d1 === d2) return `${d1} ${THAI_MONTHS_SHORT[m1 - 1]} ${y1}`;
    return `${d1} - ${d2} ${THAI_MONTHS_SHORT[m1 - 1]} ${y1}`;
  }

  const summaryParts = ranges.map(r => {
    const [, , d1] = r[0].split('-').map(Number);
    const lastDate = r[r.length - 1];
    const [, , d2] = (lastDate || '').split('-').map(Number);
    return d1 === d2 ? `${d1}` : `${d1}-${d2}`;
  });

  const lastRange = ranges[ranges.length - 1];
  const lastDateStr = lastRange ? lastRange[lastRange.length - 1] : '';
  const [, lm] = (lastDateStr || '').split('-').map(Number);

  return `${summaryParts.join(', ')} ${THAI_MONTHS_SHORT[(lm || 1) - 1]}`;
}

export function getDecadeWindow(year: number, windowSize = 12): { start: number; end: number; years: number[] } {
  const start = Math.floor(year / windowSize) * windowSize;
  const years = Array.from({ length: windowSize }, (_, i) => start + i);
  return {
    start,
    end: start + windowSize - 1,
    years
  };
}

export function stepDate(dateStr: string, stepDays: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const next = new Date(y, m - 1, d + stepDays);
  return toValueStr(next);
}

export function stepMonth(date: Date, stepMonths: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const target = new Date(y, m + stepMonths, 1);
  const maxDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, maxDay));
  return target;
}

export function stepYear(date: Date, stepYears: number): Date {
  const y = date.getFullYear();
  const m = date.getMonth();
  const d = date.getDate();
  const target = new Date(y + stepYears, m, 1);
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
