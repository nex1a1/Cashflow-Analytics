// src/views/Calendar/utils/calendarPeriodHelpers.ts
import { DayType } from '../../../types';

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const DAY_OF_WEEK_LABELS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

/**
 * Resolves the default day_type id for a given weekday/weekend slot when no explicit
 * override exists in `dayTypes`. Prefers matching by the stable `name` code ('workday' /
 * 'holiday') so re-ordering day types in Settings can't silently flip the default;
 * falls back to the legacy positional guess for rows seeded before `name` was backfilled.
 */
export function resolveDefaultDayTypeId(dayTypeConfig: DayType[], isWeekend: boolean): string | undefined {
  if (isWeekend) {
    return dayTypeConfig.find(dt => dt.name === 'holiday')?.id
      || dayTypeConfig[1]?.id
      || dayTypeConfig[0]?.id;
  }
  return dayTypeConfig.find(dt => dt.name === 'workday')?.id
    || dayTypeConfig[0]?.id;
}
