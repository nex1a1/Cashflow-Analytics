// src/views/Calendar/utils/calendarPeriodHelpers.ts
import { DayType } from '../../../types';
import { parseDateStrToObj } from '@/utils/dateHelpers';

export { THAI_MONTHS } from '@/utils/formatters';

export const DAY_OF_WEEK_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/**
 * Resolves the default day_type id for a given weekday/weekend slot when no explicit
 * override exists in `dayTypes`. Prefers matching by the stable `name` code ('workday' /
 * 'holiday') so re-ordering day types in Settings can't silently flip the default;
 * falls back to the legacy positional guess for rows seeded before `name` was backfilled.
 */
/** The day type of one date: the user's mark, else the weekday / weekend default — the one rule every view uses. */
export function dayTypeOfDate(dateStr: string, dayTypes: Record<string, string>, dayTypeConfig: DayType[]): string | undefined {
  const dow = parseDateStrToObj(dateStr).getDay();
  return dayTypes[dateStr] || resolveDefaultDayTypeId(dayTypeConfig, dow === 0 || dow === 6);
}

export function resolveDefaultDayTypeId(dayTypeConfig: DayType[], isWeekend: boolean): string | undefined {
  if (isWeekend) {
    return dayTypeConfig.find(dt => dt.name === 'holiday')?.id
      || dayTypeConfig[1]?.id
      || dayTypeConfig[0]?.id;
  }
  return dayTypeConfig.find(dt => dt.name === 'workday')?.id
    || dayTypeConfig[0]?.id;
}
