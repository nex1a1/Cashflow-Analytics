import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  calculateAdjustedGroupValue, calculateAdjustedGroupsTotal, calculateActiveMonthGroupTotal, findPreviousActiveMonth,
  renderMoMBadge, getSummaryCellBg, resolveTableHighlightOpacity, resolveTableSubHighlightOpacity, getHighlightBgColor, getSubHighlightBgColor,
} from '../helpers';
import type { CashflowGroup, Category } from '@/types';
import type { Analytics, MonthRow } from '../types';

const cats: Category[] = [
  { id: 'c-rent', name: 'ค่าเช่า', cashflow_group_id: 'g-home' },
  { id: 'c-power', name: 'ค่าไฟ', cashflow_group_id: 'g-home' },
  { id: 'c-food', name: 'ข้าว', cashflowGroup: 'g-food' }, // the legacy field name still counts
];
const rows: MonthRow[] = [
  { monthStr: '2026-08', groups: { 'g-inc': 30_000, 'g-home': 8_000, 'g-food': 4_000 } },
  { monthStr: '2026-09', groups: { 'g-inc': 30_000, 'g-home': 9_000, 'g-food': 5_000 } },
  { monthStr: '2026-10', groups: { 'g-inc': 32_000, 'g-home': 8_000, 'g-food': 0 } },
];
const analytics = {
  numMonths: 3, sortedCashflow: rows,
  monthlyCatMap: {
    'c-rent': { '2026-08': 7_000, '2026-09': 7_000, '2026-10': 7_000 },
    'c-power': { '2026-08': 1_000, '2026-09': 2_000, '2026-10': 1_000 },
    'c-food': { '2026-08': 4_000, '2026-09': 5_000, '2026-10': 0 },
  },
} as unknown as Analytics;
const base = { excludedCategories: new Set<string>(), categories: cats, filteredGroupMap: {}, filteredCatMap: {}, analytics };
const group = (over: Partial<CashflowGroup> = {}): CashflowGroup => ({ id: 'g-home', name: 'ที่พัก', type: 'expense', allocation_type: 'need', order_index: 1, ...over });

describe('calculateAdjustedGroupValue — the one place "group total minus excluded categories" is worked out', () => {
  it('is the month\'s group total when nothing is excluded', () => {
    expect(calculateAdjustedGroupValue({ ...base, groupId: 'g-home', row: rows[0] })).toBe(8_000);
  });

  it('takes the excluded categories out of the group (by category id, either group field name)', () => {
    expect(calculateAdjustedGroupValue({ ...base, groupId: 'g-home', row: rows[1], excludedCategories: new Set(['c-power']) })).toBe(7_000);
    expect(calculateAdjustedGroupValue({ ...base, groupId: 'g-food', row: rows[1], excludedCategories: new Set(['c-food']) })).toBe(0);
  });

  it('a category of another group never reduces this one', () => {
    expect(calculateAdjustedGroupValue({ ...base, groupId: 'g-home', row: rows[0], excludedCategories: new Set(['c-food']) })).toBe(8_000);
  });

  it('prefers the allocation-filtered figures over the analytics ones, zero included', () => {
    const filteredGroupMap = { 'g-home': { '2026-08': 0 } };
    expect(calculateAdjustedGroupValue({ ...base, groupId: 'g-home', row: rows[0], filteredGroupMap })).toBe(0);

    const v = calculateAdjustedGroupValue({
      ...base, groupId: 'g-home', row: rows[0],
      filteredGroupMap: { 'g-home': { '2026-08': 3_000 } },
      filteredCatMap: { 'c-power': { '2026-08': 500 } },
      excludedCategories: new Set(['c-power']),
    });
    expect(v).toBe(2_500);
  });

  it('never goes below zero', () => {
    expect(calculateAdjustedGroupValue({ ...base, groupId: 'g-home', row: rows[0], filteredGroupMap: { 'g-home': { '2026-08': 100 } }, excludedCategories: new Set(['c-rent']) })).toBe(0);
  });

  it('a group with no figure for the month is 0', () => {
    expect(calculateAdjustedGroupValue({ ...base, groupId: 'g-unknown', row: rows[0] })).toBe(0);
  });
});

describe('calculateAdjustedGroupsTotal / calculateActiveMonthGroupTotal', () => {
  const groups = [group(), group({ id: 'g-food', name: 'อาหาร' })];
  const args = { ...base, groups, excludedGroups: new Set<string>() };

  it('adds the groups of one month', () => {
    expect(calculateAdjustedGroupsTotal({ ...args, row: rows[0] })).toBe(12_000);
  });

  it('leaves out excluded groups', () => {
    expect(calculateAdjustedGroupsTotal({ ...args, row: rows[0], excludedGroups: new Set(['g-food']) })).toBe(8_000);
  });

  it('applies category exclusions inside the groups too', () => {
    expect(calculateAdjustedGroupsTotal({ ...args, row: rows[0], excludedCategories: new Set(['c-rent']) })).toBe(5_000);
  });

  it('no row (there is no earlier month) is 0', () => {
    expect(calculateAdjustedGroupsTotal({ ...args, row: null })).toBe(0);
  });

  it('a group over the months that are still counted', () => {
    expect(calculateActiveMonthGroupTotal({ ...base, groupId: 'g-home', activeMonths: rows })).toBe(25_000);
    expect(calculateActiveMonthGroupTotal({ ...base, groupId: 'g-home', activeMonths: [rows[0], rows[2]] })).toBe(16_000);
    expect(calculateActiveMonthGroupTotal({ ...base, groupId: 'g-home', activeMonths: [] })).toBe(0);
    expect(calculateActiveMonthGroupTotal({ ...base, groupId: 'g-home', activeMonths: rows, excludedCategories: new Set(['c-power']) })).toBe(21_000);
  });
});

describe('findPreviousActiveMonth', () => {
  const none = new Set<string>();
  it('the month right before, when it is counted', () => {
    expect(findPreviousActiveMonth(rows, '2026-10', none)!.monthStr).toBe('2026-09');
  });
  it('skips months the user excluded', () => {
    expect(findPreviousActiveMonth(rows, '2026-10', new Set(['2026-09']))!.monthStr).toBe('2026-08');
  });
  it('null for the first month, when everything before is excluded, and for an unknown month', () => {
    expect(findPreviousActiveMonth(rows, '2026-08', none)).toBeNull();
    expect(findPreviousActiveMonth(rows, '2026-10', new Set(['2026-08', '2026-09']))).toBeNull();
    expect(findPreviousActiveMonth(rows, '2030-01', none)).toBeNull();
  });
});

describe('renderMoMBadge', () => {
  const html = (a: number, b: number) => { const n = renderMoMBadge(a, b); return n ? renderToStaticMarkup(<>{n}</>) : null; };

  it('nothing to compare with: no badge', () => {
    expect(html(100, 0)).toBeNull();
    expect(html(100, -5)).toBeNull();
  });

  it('spending went up: red arrow and the percentage', () => {
    const m = html(125, 100)!;
    expect(m).toContain('↑ 25.0%');
    expect(m).toContain('text-danger');
  });

  it('spending went down: green arrow', () => {
    const m = html(80, 100)!;
    expect(m).toContain('↓ 20.0%');
    expect(m).toContain('text-emerald-400');
  });

  it('under 0.1% either way is flat and neutral', () => {
    const m = html(100.05, 100)!;
    expect(m).toContain('- 0.0%'); // 0.05% rounds to 0.0 at one decimal; the dash says no change
    expect(m).not.toContain('text-danger');
    expect(m).not.toContain('text-emerald-400');
    expect(m).toContain('text-slate-400');
  });
});

describe('cell styling helpers', () => {
  it('summary cell background: excluded beats column hover beats row hover', () => {
    expect(getSummaryCellBg(true, true, true)).toContain('line-through');
    expect(getSummaryCellBg(false, true, true)).toBe('bg-surface-hover');
    expect(getSummaryCellBg(false, false, true)).toBe('bg-surface-hover/80');
    expect(getSummaryCellBg(false, false, false)).toContain('bg-canvas');
  });

  it('highlight opacity: strongest where the hovered column and row cross, none at rest', () => {
    expect(resolveTableHighlightOpacity(false, false)).toBe(0);
    expect(resolveTableHighlightOpacity(true, false)).toBeLessThan(resolveTableHighlightOpacity(true, true));
    expect(resolveTableHighlightOpacity(false, true)).toBeLessThan(resolveTableHighlightOpacity(true, true));
    expect(resolveTableSubHighlightOpacity(false, false)).toBe(0);
    expect(resolveTableSubHighlightOpacity(true, true)).toBeLessThan(resolveTableHighlightOpacity(true, true));
  });

  it('background colour comes from the group (or a fallback by type) as rgba with that opacity', () => {
    expect(getHighlightBgColor(group({ color: '#FF0000' }), true, true)).toBe('rgba(255, 0, 0, 0.22)');
    expect(getHighlightBgColor(group({ color: '#FF0000' }), false, false)).toBe('rgba(255, 0, 0, 0)');
    expect(getHighlightBgColor(group({ color: null }), true, false)).toMatch(/^rgba\(\d+, \d+, \d+, 0\.14\)$/);
    expect(getSubHighlightBgColor(group({ color: '#FF0000' }), '#0000FF', true, false)).toBe('rgba(0, 0, 255, 0.12)');
    expect(getSubHighlightBgColor(group({ color: '#FF0000' }), null, true, false)).toBe('rgba(255, 0, 0, 0.12)');
  });
});
