import { describe, expect, it } from 'vitest';
import { summarizeKakeibo, unitRange } from '../kakeibo';

describe('kakeibo', () => {
  it('October 2026 starts on a Thursday: Thu–Sat, then full weeks, ending Sat 31', () => {
    const w = summarizeKakeibo([], '2026-10')!.weeks;
    expect(w.map((x) => `${x.start}..${x.end}`)).toEqual([
      '2026-10-01..2026-10-03', '2026-10-04..2026-10-10', '2026-10-11..2026-10-17', '2026-10-18..2026-10-24', '2026-10-25..2026-10-31',
    ]);
  });

  it('week items: expense per category, largest first', () => {
    const w = summarizeKakeibo([
      { date: '2026-10-01', amount: 50, group_type: 'expense', category_id: 'a', category: 'อาหาร' },
      { date: '2026-10-02', amount: 70, group_type: 'expense', allocation_type: 'need', category_id: 'a', category: 'อาหาร' },
      { date: '2026-10-03', amount: 200, group_type: 'expense', category_id: 'b', category: 'เกม' },
      { date: '2026-10-03', amount: 999, group_type: 'savings', category_id: 'c', category: 'ทอง' },
    ], '2026-10')!.weeks;
    expect(w[0].items).toEqual([{ categoryId: 'b', name: 'เกม', spent: 20_000 }, { categoryId: 'a', name: 'อาหาร', spent: 12_000 }]);
    expect(w[1].items).toEqual([]);
  });

  it('fixed costs count in the month totals but stay out of the weekly spend', () => {
    const s = summarizeKakeibo([
      { date: '2026-10-01', amount: 4500, group_type: 'expense', allocation_type: 'need', category_id: 'rent', category: 'ค่าหอ' },
      { date: '2026-10-02', amount: 100, group_type: 'expense', category_id: 'food', category: 'อาหาร' },
    ], '2026-10', { categoryIds: new Set(['rent']), itemKeys: new Set() })!;
    expect(s).toMatchObject({ fixed: 450_000, need: 450_000, expense: 460_000 });
    expect(s.weeks[0]).toMatchObject({ spent: 10_000, items: [{ categoryId: 'food', name: 'อาหาร', spent: 10_000 }] });
  });

  it('unitRange: calendar month, pay cycle, and nothing for ranges', () => {
    expect(unitRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(unitRange('cycle:2026-10')).toEqual({ start: '2026-10-25', end: '2026-11-24' });
    expect(unitRange('2026')).toBeNull();
  });

  it('sums the month, keeps investing out of expense, splits Sunday–Saturday weeks like the calendar', () => {
    const s = summarizeKakeibo([
      { date: '2026-09-01', amount: 30000, group_type: 'income' },
      { date: '2026-09-02', amount: 5000, group_type: 'expense', allocation_type: 'need' },
      { date: '2026-09-08', amount: 1000, group_type: 'expense', allocation_type: 'want' },
      { date: '2026-09-30', amount: 500, group_type: 'expense' }, // no allocation → WANT
      { date: '2026-09-10', amount: 3000, group_type: 'savings' },
      { date: '2026-09-11', amount: -1000, group_type: 'savings' }, // sell
      { date: '2026-10-01', amount: 999, group_type: 'expense' }, // outside
    ], '2026-09')!;
    expect(s).toMatchObject({ income: 3_000_000, goal: 600_000, need: 500_000, want: 150_000, invested: 200_000, expense: 650_000, left: 2_350_000, spendable: 1_750_000 });
    // 1 Sep 2026 is a Tuesday → first week is Tue–Sat
    expect(s.weeks.map((w) => [w.start, w.end, w.spent])).toEqual([
      ['2026-09-01', '2026-09-05', 500_000], ['2026-09-06', '2026-09-12', 100_000], ['2026-09-13', '2026-09-19', 0],
      ['2026-09-20', '2026-09-26', 0], ['2026-09-27', '2026-09-30', 50_000],
    ]);
  });
});

import { planLines } from '../kakeibo';

describe('planLines', () => {
  it('groups this period by section + category (row allocation decides NEED/WANT), largest first', () => {
    const p = planLines([
      { date: '2026-09-03', amount: 100, group_type: 'expense', allocation_type: 'need', category_id: 'food', category: 'อาหาร' },
      { date: '2026-09-04', amount: 20, group_type: 'expense', allocation_type: 'want', category_id: 'food', category: 'อาหาร' },
      { date: '2026-09-05', amount: 50, group_type: 'expense', category_id: 'fun', category: 'เที่ยว' },
      { date: '2026-09-01', amount: 30000, group_type: 'income', category_id: 'sal', category: 'เงินเดือน' },
      { date: '2026-08-03', amount: 999, group_type: 'expense', allocation_type: 'need', category_id: 'food', category: 'อาหาร' }, // last month
    ], '2026-09')!;
    expect(p.need).toEqual([{ key: 'need:food', name: 'อาหาร', actual: 10_000 }]);
    expect(p.want.map((l) => [l.key, l.actual])).toEqual([['want:fun', 5_000], ['want:food', 2_000]]);
    expect(p.income[0].actual).toBe(3_000_000);
    expect(p.fixed).toEqual([]);
  });

  it('a single item (category + description) can be Fix Cost while the rest of its category stays', () => {
    const rows = [
      { date: '2026-10-18', amount: 1000, group_type: 'expense', allocation_type: 'need', category_id: 'fam', category: 'ครอบครัว', description: ' ค่าไฟบ้านที่แพร่ ' },
      { date: '2026-10-18', amount: 5000, group_type: 'expense', allocation_type: 'need', category_id: 'fam', category: 'ครอบครัว', description: 'ค่าหินกรวด' },
    ];
    const rule = { categoryIds: new Set<string>(), itemKeys: new Set(['fam|ค่าไฟบ้านที่แพร่']) };
    const p = planLines(rows, '2026-10', rule)!;
    expect(p.fixed).toEqual([{ key: 'fixed:fam|ค่าไฟบ้านที่แพร่', name: 'ครอบครัว', detail: 'ค่าไฟบ้านที่แพร่', actual: 100_000 }]);
    expect(p.need).toEqual([{ key: 'need:fam', name: 'ครอบครัว', actual: 500_000 }]);
    expect(summarizeKakeibo(rows, '2026-10', rule)).toMatchObject({ fixed: 100_000, need: 600_000 });
  });

  it('fixed-cost categories get their own section and leave NEED', () => {
    const p = planLines([
      { date: '2026-09-01', amount: 4500, group_type: 'expense', allocation_type: 'need', category_id: 'rent', category: 'ค่าเช่า' },
      { date: '2026-09-02', amount: 100, group_type: 'expense', allocation_type: 'need', category_id: 'food', category: 'อาหาร' },
    ], '2026-09', { categoryIds: new Set(['rent']), itemKeys: new Set() })!;
    expect(p.fixed.map((l) => l.key)).toEqual(['fixed:rent']);
    expect(p.need.map((l) => l.key)).toEqual(['need:food']);
  });

  it('only NEED rows can be Fix Cost: a WANT row in a fixed category stays WANT', () => {
    const p = planLines([
      { date: '2026-09-01', amount: 750, group_type: 'expense', allocation_type: 'need', category_id: 'ai', category: 'AI' },
      { date: '2026-09-05', amount: 300, group_type: 'expense', allocation_type: 'want', category_id: 'ai', category: 'AI' },
    ], '2026-09', { categoryIds: new Set(['ai']), itemKeys: new Set() })!;
    expect(p.fixed.map((l) => [l.key, l.actual])).toEqual([['fixed:ai', 75_000]]);
    expect(p.want.map((l) => [l.key, l.actual])).toEqual([['want:ai', 30_000]]);
  });
});
