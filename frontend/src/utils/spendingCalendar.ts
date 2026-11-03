// Inputs of the Kakeibo SpendingCalendar (ปฏิทินการใช้จ่าย), computed straight from the loaded rows.
import type { DayType } from '@/types';
import { generateDatesForPeriod, parseDateStrToObj } from './dateHelpers';
import { dayTypeOfDate } from '@/views/Calendar/utils/calendarPeriodHelpers';

export interface TimelineRow { date: string; amount: number | string; group_type?: string; category_id?: string; category?: string }

/** one category's spend on a day (the hover card lists them) */
export interface DayItem { categoryId: string; name: string; amount: number; count: number }

export interface TimelineInputs {
  datesInPeriod: string[];
  /** Baht spent per day inside the period (expense groups only: investing is not spending) */
  dailyExpenses: Record<string, number>;
  /** the same spend split by category, largest first */
  dailyItems: Record<string, DayItem[]>;
  /** day type id of every date in the period; unmarked days use the workday / weekend default */
  dayTypeOf: Record<string, string | undefined>;
  /** days per day type in the period */
  dayTypeCounts: Record<string, number>;
}

export function timelineInputs(rows: TimelineRow[], period: string, dayTypes: Record<string, string>, dayTypeConfig: DayType[]): TimelineInputs {
  const datesInPeriod = generateDatesForPeriod(period, rows);
  const inPeriod = new Set(datesInPeriod);
  const dailyExpenses: Record<string, number> = {};
  const dailyItems: Record<string, DayItem[]> = {};
  for (const r of rows) {
    if (r.group_type !== 'expense' || !inPeriod.has(r.date)) continue;
    const amt = Number(r.amount) || 0;
    dailyExpenses[r.date] = (dailyExpenses[r.date] || 0) + amt;
    const id = r.category_id ?? r.category ?? '';
    const items = (dailyItems[r.date] ??= []);
    const item = items.find((x) => x.categoryId === id);
    if (item) { item.amount += amt; item.count += 1; } else items.push({ categoryId: id, name: r.category ?? '', amount: amt, count: 1 });
  }
  for (const items of Object.values(dailyItems)) items.sort((a, b) => b.amount - a.amount);

  const dayTypeOf: Record<string, string | undefined> = {};
  const dayTypeCounts: Record<string, number> = {};
  for (const d of datesInPeriod) {
    const type = dayTypeOfDate(d, dayTypes, dayTypeConfig);
    dayTypeOf[d] = type;
    if (type) dayTypeCounts[type] = (dayTypeCounts[type] || 0) + 1;
  }

  return { datesInPeriod, dailyExpenses, dailyItems, dayTypeOf, dayTypeCounts };
}

const DAY_MS = 86_400_000;

/** Sun–Sat weeks covering the (sorted) dates; days outside the list are null. A gap in the list (e.g. "Jan, Mar")
 *  starts a new week even mid-week, so two months never share a column. */
export function weeksOf(dates: string[]): (string | null)[][] {
  const weeks: (string | null)[][] = [];
  let prev: Date | null = null;
  for (const d of dates) {
    const obj = parseDateStrToObj(d);
    const dow = obj.getDay();
    const gap = prev ? Math.round((obj.getTime() - prev.getTime()) / DAY_MS) : 0;
    if (!prev || dow <= prev.getDay() || gap > 6) weeks.push(Array(7).fill(null));
    weeks[weeks.length - 1][dow] = d;
    prev = obj;
  }
  return weeks;
}
