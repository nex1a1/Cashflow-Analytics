import { describe, it, expect } from 'vitest';
import { CALENDAR_HEAT_STEPS, CALENDAR_HEAT_COLORS, CALENDAR_HEAT_TINT, getCalendarHeatLevel } from '../calendarHeat';
import { tc, contrast } from '@/constants/theme';

const rgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
/** สีพื้นจริงของ cell = canvas ผสมสีย้อม (alpha) — เอาไปวัดคอนทราสต์กับข้อความใน cell */
const tintedCell = (token: 'warn' | 'expense', alpha: number) => {
  const c = rgb(tc('canvas')), t = rgb(tc(token));
  return '#' + c.map((v, i) => Math.round(v * (1 - alpha) + t[i] * alpha).toString(16).padStart(2, '0')).join('');
};

describe('Calendar heat tint stays readable', () => {
  // regression: expense-red amounts on a 0.22–0.40 red wash measured ~4.1 and ~3.0 (< 4.5)
  it.each([2, 3, 4] as const)('level %i keeps text >= 4.5:1 on the tinted cell', level => {
    const { token, alpha } = CALENDAR_HEAT_TINT[level];
    const bg = tintedCell(token, alpha);
    for (const text of ['expense', 'income', 'ink-body'] as const) {
      expect(contrast(tc(text), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('Calendar heat steps (fixed ฿ thresholds)', () => {
  it('returns level 0 for zero, negative or missing spend', () => {
    expect(getCalendarHeatLevel(0)).toBe(0);
    expect(getCalendarHeatLevel(-100)).toBe(0);
  });

  it('returns level 1 below the first step', () => {
    expect(getCalendarHeatLevel(39)).toBe(1);
    expect(getCalendarHeatLevel(299)).toBe(1);
  });

  it('steps up exactly at 300 / 1,000 / 3,000', () => {
    expect(CALENDAR_HEAT_STEPS).toEqual([300, 1000, 3000]);
    expect(getCalendarHeatLevel(300)).toBe(2);
    expect(getCalendarHeatLevel(999)).toBe(2);
    expect(getCalendarHeatLevel(1000)).toBe(3);
    expect(getCalendarHeatLevel(2999)).toBe(3);
    expect(getCalendarHeatLevel(3000)).toBe(4);
  });

  it('does not depend on the busiest day of the month', () => {
    // regression: a future-dated ฿6,950 rent day used to flatten every other day
    expect(getCalendarHeatLevel(1290)).toBe(3);
    expect(getCalendarHeatLevel(3760.89)).toBe(4);
  });

  it('tints only levels 2-4', () => {
    expect(CALENDAR_HEAT_COLORS[0]).toBe('transparent');
    expect(CALENDAR_HEAT_COLORS[1]).toBe('transparent');
    expect(CALENDAR_HEAT_COLORS[2]).not.toBe('transparent');
    expect(CALENDAR_HEAT_COLORS[3]).not.toBe('transparent');
    expect(CALENDAR_HEAT_COLORS[4]).not.toBe('transparent');
  });
});
