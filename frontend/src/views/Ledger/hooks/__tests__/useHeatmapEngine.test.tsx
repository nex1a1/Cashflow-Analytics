// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook } from '@/test-utils/renderHook';
import { useHeatmapEngine, EXCLUDED_HEATMAP_CATEGORIES, HeatmapEngineOptions } from '../useHeatmapEngine';
import { THAI_DAY_CONFIG, THAI_MONTHS_SHORT } from '@/utils/formatters';
import type { Category, TransactionDisplay } from '@/types';

const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', allocation_type: 'want' },
  { id: 'c-misc', name: 'จิปาถะ', type: 'expense' }, // no allocation → WANT
  { id: 'c-rent', name: 'ค่าเช่า/ค่าหอพัก', type: 'expense', allocation_type: 'need' },
  { id: 'c-power', name: 'ค่าไฟ', type: 'expense', allocation_type: 'need' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income' },
  { id: 'c-gold', name: 'ออมทอง', type: 'savings' },
  { id: 'c-unused', name: 'ไม่ได้ใช้', type: 'expense' },
];
// 2026-01-03 Sat, 04 Sun, 05 Mon, 06 Tue
const tx = (id: string, category_id: string, amount: number, date: string, extra: Partial<TransactionDisplay> = {}): TransactionDisplay => {
  const cat = categories.find(c => c.id === category_id)!;
  return { id, date, category: cat.name, category_id, description: id, amount, group_type: cat.type, ...extra } as TransactionDisplay;
};
const rows = [
  tx('a', 'c-food', 100, '2026-01-05'),
  tx('b', 'c-food', 50, '2026-01-05'),
  tx('c', 'c-fun', 300, '2026-01-04'),
  tx('d', 'c-misc', 70, '2026-01-06'),
  tx('e', 'c-rent', 9000, '2026-01-05'),
  tx('f', 'c-power', 800, '2026-01-06'),
  tx('g', 'c-salary', 30000, '2026-01-05'),
  tx('h', 'c-gold', 2000, '2026-01-05'),
];

const engine = (opts: HeatmapEngineOptions = {}, data = rows, dates: string[] = []) => {
  const { result, unmount } = renderHook(() => useHeatmapEngine(data, categories, dates, opts));
  unmount();
  return result.current;
};
const ids = (e: ReturnType<typeof engine>) => e.expenseTransactions.map(t => t.id);

describe('useHeatmapEngine — which rows', () => {
  it('only expenses: no income, no savings; the fixed bills are left out by default', () => {
    expect(ids(engine())).toEqual(['a', 'b', 'c', 'd']);
  });

  it('"include fixed costs" brings the bills back', () => {
    expect(ids(engine({ includeFixedCosts: true }))).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('the fixed list is rent, electricity, internet and water', () => {
    expect(EXCLUDED_HEATMAP_CATEGORIES).toEqual(['ค่าเช่า/ค่าหอพัก', 'ค่าไฟ', 'ค่าเน็ต', 'ค่าน้ำ']);
  });

  it('a fixed cost that is picked by name is shown even with "include fixed costs" off', () => {
    expect(ids(engine({ selectedCategories: ['ค่าไฟ'] }))).toEqual(['f']);
  });

  it('an unknown category falls back to the row\'s own group type', () => {
    const odd = [{ id: 'z', date: '2026-01-05', category: 'ลบไปแล้ว', category_id: 'gone', description: '', amount: 40, group_type: 'expense' } as TransactionDisplay];
    expect(ids(engine({}, odd))).toEqual(['z']);
    expect(ids(engine({}, [{ ...odd[0], group_type: 'income' } as TransactionDisplay]))).toEqual([]);
  });

  it('a row is found by name when it has no category id', () => {
    const byName = [{ id: 'n', date: '2026-01-05', category: 'ค่ากิน', description: '', amount: 10 } as TransactionDisplay];
    expect(ids(engine({}, byName))).toEqual(['n']);
  });
});

describe('useHeatmapEngine — category selection', () => {
  it('a list shows just those categories', () => {
    expect(ids(engine({ selectedCategories: ['ค่ากิน', 'จิปาถะ'] }))).toEqual(['a', 'b', 'd']);
  });

  it('a single name works as well', () => {
    expect(ids(engine({ selectedCategories: 'บันเทิง' as unknown as string[] }))).toEqual(['c']); // the type says list | "ALL"; the engine tolerates a name
  });

  it('"ALL" is no restriction', () => {
    expect(ids(engine({ selectedCategories: 'ALL' }))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('an EMPTY selection shows nothing (it must not quietly mean "everything")', () => {
    const e = engine({ selectedCategories: [] });
    expect(e.expenseTransactions).toEqual([]);
    expect(e.activeCategories).toEqual([]);
    expect(e.grandTotal).toBe(0);
  });
});

describe('useHeatmapEngine — allocation and weekday filters', () => {
  it('NEED / WANT use the row\'s own allocation first, then the category\'s, then WANT', () => {
    expect(ids(engine({ allocationFilter: 'need' }))).toEqual(['a', 'b']);
    expect(ids(engine({ allocationFilter: 'want' }))).toEqual(['c', 'd']); // a category with no allocation is WANT
    const overridden = [tx('x', 'c-food', 10, '2026-01-05', { allocation_type: 'want' })];
    expect(ids(engine({ allocationFilter: 'need' }, overridden))).toEqual([]);
    expect(ids(engine({ allocationFilter: 'want' }, overridden))).toEqual(['x']);
  });

  it('weekend / weekday keep the rows of those days', () => {
    expect(ids(engine({ dayTypeFilter: 'WEEKEND' }))).toEqual(['c']); // Sunday the 4th
    expect(ids(engine({ dayTypeFilter: 'WEEKDAY' }))).toEqual(['a', 'b', 'd']);
  });

  it('a Monday is not a weekend and a Saturday is', () => {
    expect(ids(engine({ dayTypeFilter: 'WEEKEND' }, [tx('mon', 'c-food', 1, '2026-01-05')]))).toEqual([]);
    expect(ids(engine({ dayTypeFilter: 'WEEKEND' }, [tx('sat', 'c-food', 1, '2026-01-03')]))).toEqual(['sat']);
  });
});

describe('useHeatmapEngine — columns', () => {
  it('only categories that have rows after filtering, in the category list order', () => {
    expect(engine().activeCategories.map(c => c.name)).toEqual(['ค่ากิน', 'บันเทิง', 'จิปาถะ']);
  });

  it('fixed costs get a column only when included or picked', () => {
    expect(engine({ includeFixedCosts: true }).activeCategories.map(c => c.name)).toContain('ค่าไฟ');
    expect(engine({ selectedCategories: ['ค่าไฟ'] }).activeCategories.map(c => c.name)).toEqual(['ค่าไฟ']);
    expect(engine().activeCategories.map(c => c.name)).not.toContain('ค่าไฟ');
  });

  it('a category with no rows has no column', () => {
    expect(engine().activeCategories.map(c => c.name)).not.toContain('ไม่ได้ใช้');
  });
});

describe('useHeatmapEngine — rows (dates)', () => {
  it('with no date list, the days that have spending, oldest first', () => {
    expect(engine().sortedDates).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
  });

  it('with a date list, every day of it — including days with no spending', () => {
    const dates = ['2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07'];
    expect(engine({}, rows, dates).sortedDates).toEqual(dates);
  });

  it('keeps the given list unsorted-safe: always oldest first', () => {
    expect(engine({}, rows, ['2026-01-06', '2026-01-04', '2026-01-05']).sortedDates).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
  });

  it('hides days with no spending when asked', () => {
    const dates = ['2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07'];
    expect(engine({ hideZeroDays: true }, rows, dates).sortedDates).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
  });

  it('a weekend / weekday filter also removes the other days from the list', () => {
    const dates = ['2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06'];
    expect(engine({ dayTypeFilter: 'WEEKEND' }, rows, dates).sortedDates).toEqual(['2026-01-03', '2026-01-04']);
    expect(engine({ dayTypeFilter: 'WEEKDAY' }, rows, dates).sortedDates).toEqual(['2026-01-05', '2026-01-06']);
  });

  it('hiding zero days follows the other filters (the day only had a row that is filtered out)', () => {
    const dates = ['2026-01-04', '2026-01-05', '2026-01-06'];
    expect(engine({ hideZeroDays: true, selectedCategories: ['ค่ากิน'] }, rows, dates).sortedDates).toEqual(['2026-01-05']);
  });
});

describe('useHeatmapEngine — numbers', () => {
  it('groups rows by day, then by category name', () => {
    const e = engine();
    expect(Object.keys(e.cellMap).sort()).toEqual(['2026-01-04', '2026-01-05', '2026-01-06']);
    expect(e.cellMap['2026-01-05']['ค่ากิน'].map(t => t.id)).toEqual(['a', 'b']);
    expect(e.cellMap['2026-01-04']['บันเทิง'].map(t => t.id)).toEqual(['c']);
  });

  it('daily totals, with 0 for a day with no spending', () => {
    const e = engine({}, rows, ['2026-01-03', '2026-01-04', '2026-01-05']);
    expect(e.dailyTotal).toEqual({ '2026-01-03': 0, '2026-01-04': 300, '2026-01-05': 150 });
  });

  it('category totals and the grand total', () => {
    const e = engine();
    expect(e.categoryTotal).toEqual({ 'ค่ากิน': 150, 'บันเทิง': 300, 'จิปาถะ': 70 });
    expect(e.grandTotal).toBe(520);
  });

  it('amounts that arrive as strings (or junk) are summed as numbers', () => {
    const odd = [tx('s1', 'c-food', '12.50' as unknown as number, '2026-01-05'), tx('s2', 'c-food', 'abc' as unknown as number, '2026-01-05')];
    const e = engine({}, odd);
    expect(e.grandTotal).toBe(12.5);
    expect(e.categoryTotal['ค่ากิน']).toBe(12.5);
  });

  it('the busiest day and the biggest cell set the colour scales', () => {
    const e = engine();
    expect(e.maxDailyTotal).toBe(300); // Sun 4th
    expect(e.maxCellValue).toBe(300);
    const split = [tx('m1', 'c-food', 100, '2026-01-05'), tx('m2', 'c-food', 250, '2026-01-05'), tx('m3', 'c-fun', 100, '2026-01-05')];
    expect(engine({}, split).maxCellValue).toBe(350); // two rows in one cell are one cell
    expect(engine({}, split).maxDailyTotal).toBe(450);
  });

  it('the scales are 1 (never 0) when there is no spending', () => {
    const e = engine({}, []);
    expect([e.maxDailyTotal, e.maxCellValue, e.grandTotal]).toEqual([1, 1, 0]);
  });
});

describe('useHeatmapEngine — formatDate', () => {
  const fmt = (d: string) => engine().formatDate(d);

  it('reads ISO dates: day number, Thai month, Thai weekday, weekend flag', () => {
    expect(fmt('2026-01-04')).toEqual({ day: 4, month: THAI_MONTHS_SHORT[0], dayName: THAI_DAY_CONFIG[0].label, isWeekend: true });
    expect(fmt('2026-01-05')).toEqual({ day: 5, month: THAI_MONTHS_SHORT[0], dayName: THAI_DAY_CONFIG[1].label, isWeekend: false });
    expect(fmt('2026-01-03').isWeekend).toBe(true); // Saturday
  });

  it('gives back something printable for a malformed date', () => {
    expect(fmt('2026-01')).toEqual({ day: '2026-01', month: '', dayName: '', isWeekend: false });
    expect(fmt('1/2')).toEqual({ day: '1/2', month: '', dayName: '', isWeekend: false });
  });
});
