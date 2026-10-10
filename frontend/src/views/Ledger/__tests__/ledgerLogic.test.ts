import { describe, it, expect } from 'vitest';
import { buildCatTypeMap, resolveTxType, sumIncomeExpense } from '../ledgerMath';
import { compareTransactions, paginateTransactions } from '../hooks/useLedgerData';

const tx = (over: Record<string, unknown>) => ({ id: String(Math.random()), date: '2026-09-01', category: '', amount: 0, ...over }) as any;

describe('resolveTxType / sumIncomeExpense', () => {
  const map = buildCatTypeMap([
    { id: 'c1', name: 'เงินเดือน', type: 'income' },
    { id: 'c2', name: 'ค่ากิน', type: 'expense' },
  ]);

  it('matches by category_id first, then by name', () => {
    expect(resolveTxType(tx({ category_id: 'c1', category: 'ค่ากิน' }), map)).toBe('income');
    expect(resolveTxType(tx({ category: 'ค่ากิน' }), map)).toBe('expense');
    expect(resolveTxType(tx({ category: 'ไม่รู้จัก' }), map)).toBeUndefined();
  });

  it('sums income vs everything else, including string amounts', () => {
    const { inc, exp } = sumIncomeExpense([
      tx({ category_id: 'c1', amount: '25000.5' }),
      tx({ category_id: 'c2', amount: 100 }),
      tx({ category: 'ค่ากิน', amount: 50.25 }),
      tx({ category: 'ไม่รู้จัก', amount: 10 }),
      tx({ category_id: 'c2', amount: 'abc' }),
    ], map);
    expect(inc).toBe(25000.5);
    expect(exp).toBe(160.25);
  });

  it('page sums use the same rule as the total (id beats a conflicting name)', () => {
    const rows = [tx({ category_id: 'c1', category: 'ค่ากิน', amount: 30 })];
    expect(sumIncomeExpense(rows, map)).toEqual({ inc: 30, exp: 0, sav: 0 });
  });

  it('keeps savings/investment apart from expense; a sell (negative) reduces net savings', () => {
    const withSav = buildCatTypeMap([
      { id: 'c2', name: 'ค่ากิน', type: 'expense' },
      { id: 'c3', name: 'ลงทุน', type: 'savings' },
    ]);
    expect(sumIncomeExpense([
      tx({ category_id: 'c2', amount: 100 }),
      tx({ category_id: 'c3', amount: 500 }),
      tx({ category_id: 'c3', amount: -480 }),
    ], withSav)).toEqual({ inc: 0, exp: 100, sav: 20 });
  });
});

describe('compareTransactions', () => {
  const sorted = (rows: any[], key: string, direction: 'asc' | 'desc') =>
    [...rows].sort((a, b) => compareTransactions(a, b, { key, direction }, {}, {}, {}));

  it('sorts by date (a row without one goes first)', () => {
    const rows = [tx({ id: 'a', date: '2026-09-09' }), tx({ id: 'b', date: '2026-09-01' }), tx({ id: 'c', date: '2026-09-05' })];
    expect(sorted([...rows, tx({ id: 'z', date: '' })], 'date', 'asc').map(r => r.id)).toEqual(['z', 'b', 'c', 'a']);
    expect(sorted(rows, 'date', 'asc').map(r => r.id)).toEqual(['b', 'c', 'a']);
    expect(sorted(rows, 'date', 'desc').map(r => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by amount numerically (string amounts too)', () => {
    const rows = [tx({ id: 'a', amount: '9' }), tx({ id: 'b', amount: 100 }), tx({ id: 'c', amount: '25.5' })];
    expect(sorted(rows, 'amount', 'desc').map(r => r.id)).toEqual(['b', 'c', 'a']);
    expect(sorted(rows, 'amount', 'asc').map(r => r.id)).toEqual(['a', 'c', 'b']);
  });

  it('breaks date ties by larger amount first when nothing else orders them', () => {
    const rows = [tx({ id: 'small', amount: 10 }), tx({ id: 'big', amount: 90 })];
    expect(sorted(rows, 'date', 'asc').map(r => r.id)).toEqual(['big', 'small']);
  });
});

describe('paginateTransactions', () => {
  const day = (date: string, n: number) => Array.from({ length: n }, (_, i) => tx({ id: `${date}-${i}`, date }));

  it('returns no pages for no rows', () => {
    expect(paginateTransactions([], 'date')).toEqual([]);
  });

  it('never splits one day across pages when sorted by date', () => {
    const rows = [...day('2026-09-01', 30), ...day('2026-09-02', 30), ...day('2026-09-03', 5)];
    const pages = paginateTransactions(rows, 'date');
    expect(pages.map(p => p.length)).toEqual([30, 35]);
    expect(pages.every(p => new Set(p.map(r => r.date)).size <= 2)).toBe(true);
  });

  it('fills a page right up to the page size: two days of 25 are one page of 50, a third day starts the next', () => {
    const rows = [...day('2026-09-01', 25), ...day('2026-09-02', 25), ...day('2026-09-03', 1)];
    expect(paginateTransactions(rows, 'date').map(p => p.length)).toEqual([50, 1]);
  });

  it('lets a single busy day exceed the page size instead of splitting it', () => {
    const pages = paginateTransactions(day('2026-09-01', 60), 'date');
    expect(pages.map(p => p.length)).toEqual([60]);
  });

  it('cuts at exactly the page size for non-date sorts', () => {
    const pages = paginateTransactions(day('2026-09-01', 120), 'amount');
    expect(pages.map(p => p.length)).toEqual([50, 50, 20]);
  });
});
