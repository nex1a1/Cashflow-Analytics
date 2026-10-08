// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { renderHook } from '@/test-utils/renderHook';
import { click, q } from '@/test-utils/dom';
import { useLedgerStats } from '../useLedgerStats';
import { formatMoney } from '@/utils/formatters';
import type { Category, CashflowGroup, TransactionDisplay } from '@/types';

const groups: CashflowGroup[] = [
  { id: 'g-salary', name: 'เงินเดือน', type: 'income', order_index: 1, color: '#10B981' },
  { id: 'g-rent', name: 'ที่พัก', type: 'expense', order_index: 1, color: '#3B82F6' },
  { id: 'g-food', name: 'ค่ากิน', type: 'expense', order_index: 2, color: '#F97316' },
  { id: 'g-save', name: 'ลงทุน/ออม', type: 'savings', order_index: 3 },
  { id: 'g-empty', name: 'ไม่มีรายการ', type: 'expense', order_index: 4 },
] as CashflowGroup[];
const cats: Category[] = [
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', cashflow_group_id: 'g-salary', color: '#10B981' },
  { id: 'c-rent', name: 'ค่าเช่า', type: 'expense', cashflow_group_id: 'g-rent', color: '#3B82F6' },
  { id: 'c-lunch', name: 'มื้อกลางวัน', type: 'expense', cashflow_group_id: 'g-food', color: '#F97316', icon: 'wallet' },
  { id: 'c-coffee', name: 'กาแฟ', type: 'expense', cashflow_group_id: 'g-food', color: '#A855F7' },
  { id: 'c-gold', name: 'ออมทอง', type: 'savings', cashflow_group_id: 'g-save', color: '#EAB308' },
  { id: 'c-loose', name: 'ไม่มีกลุ่ม', type: 'expense' },
] as Category[];
const tx = (id: string, category_id: string, amount: number, date = '2026-01-10', extra: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, category_id, category: cats.find(c => c.id === category_id)?.name ?? '', amount, date, description: id, ...extra }) as TransactionDisplay;

const base = [
  tx('pay', 'c-salary', 30000),
  tx('rent', 'c-rent', 9000),
  tx('l1', 'c-lunch', 300),
  tx('l2', 'c-lunch', 100),
  tx('cf', 'c-coffee', 600),
  tx('buy', 'c-gold', 2000),
  tx('sell', 'c-gold', -500),
];

type Props = Partial<Parameters<typeof useLedgerStats>[0]>;
const stats = (over: Props = {}) => {
  const { result, unmount } = renderHook(() => useLedgerStats({
    displayTransactions: base, categories: cats, cashflowGroups: groups, formatMoney,
    allDatesInPeriod: Array.from({ length: 30 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`), filterPeriod: '2026-01',
    ...over,
  }));
  unmount();
  return result.current;
};

let root: Root | null = null;
let container: HTMLElement | null = null;
const show = (nodes: React.ReactNode[]) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<>{nodes}</>));
  return container;
};
const cardNames = (nodes: React.ReactNode[]) => {
  show(nodes);
  const names = [...container!.querySelectorAll('button span[title]')].map(s => s.getAttribute('title')).filter(t => !t!.includes('฿'));
  act(() => root!.unmount()); container!.remove(); root = null; container = null;
  return names;
};
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('useLedgerStats — totals', () => {
  it('splits income, expense and net savings; a sell reduces savings', () => {
    const s = stats();
    expect(s.sumInc).toBe(30000);
    expect(s.sumExp).toBe(10000);
    expect(s.sumSav).toBe(1500);
  });

  it('net is income − expense (investing stays inside it) and the rate is of income', () => {
    const s = stats();
    expect(s.net).toBe(20000);
    expect(s.savingsRate).toBe(67); // 20,000 / 30,000
  });

  it('rate is 0 without income, and negative in a deficit', () => {
    expect(stats({ displayTransactions: [tx('r', 'c-rent', 100)] }).savingsRate).toBe(0);
    expect(stats({ displayTransactions: [tx('p', 'c-salary', 100), tx('r', 'c-rent', 150)] }).savingsRate).toBe(-50);
  });

  it('nothing at all is zero, not NaN', () => {
    const s = stats({ displayTransactions: [] });
    expect([s.sumInc, s.sumExp, s.sumSav, s.net, s.savingsRate]).toEqual([0, 0, 0, 0, 0]);
    expect([s.activeIncomeCards, s.activeSavingsCards, s.activeExpenseCards].map(a => a.length)).toEqual([0, 0, 0]);
  });

  it('exposes the id/name → type map', () => {
    expect(stats().catTypeMap['c-gold']).toBe('savings');
    expect(stats().catTypeMap['เงินเดือน']).toBe('income');
  });
});

describe('useLedgerStats — which group cards exist', () => {
  it('one list per kind, only groups that have money in them, ordered by order_index', () => {
    const s = stats();
    expect(cardNames(s.activeIncomeCards)).toEqual(['เงินเดือน']);
    expect(cardNames(s.activeExpenseCards)).toEqual(['ที่พัก', 'ค่ากิน']);
    expect(cardNames(s.activeSavingsCards)).toEqual(['ลงทุน/ออม']);
  });

  it('a group with no rows has no card', () => {
    expect(cardNames(stats().activeExpenseCards)).not.toContain('ไม่มีรายการ');
  });

  it('a group whose rows net to zero (a buy and a full sell) has no card', () => {
    const s = stats({ displayTransactions: [tx('b', 'c-gold', 1000), tx('s', 'c-gold', -1000)] });
    expect(s.activeSavingsCards).toHaveLength(0);
  });

  it('rows whose category has no group appear in the totals but in no card', () => {
    const s = stats({ displayTransactions: [tx('x', 'c-loose', 400)] });
    expect(s.sumExp).toBe(400);
    expect(s.activeExpenseCards).toHaveLength(0);
  });

  it('a row is matched to its category by id, and by name when it has no id', () => {
    const s = stats({ displayTransactions: [{ id: 'n', category: 'ค่าเช่า', amount: 700, date: '2026-01-02', description: '' } as TransactionDisplay] });
    expect(cardNames(s.activeExpenseCards)).toEqual(['ที่พัก']);
  });

  it('an expense group whose NAME mentions investing is still an expense card (the type decides, not the name)', () => {
    const biz = [...groups, { id: 'g-biz', name: 'ค่าลงทุนธุรกิจ', type: 'expense', order_index: 6 } as CashflowGroup];
    const bizCat = [...cats, { id: 'c-biz', name: 'อุปกรณ์', type: 'expense', cashflow_group_id: 'g-biz' } as Category];
    const s = stats({ cashflowGroups: biz, categories: bizCat, displayTransactions: [...base, tx('e', 'c-biz', 900)] });
    expect(cardNames(s.activeExpenseCards)).toContain('ค่าลงทุนธุรกิจ');
    expect(cardNames(s.activeSavingsCards)).toEqual(['ลงทุน/ออม']);
  });

  it('a savings-TYPE group is a savings card; an income group is never one, whatever it is called', () => {
    const withInvestmentIncome = [...groups, { id: 'g-div', name: 'รายได้จากการลงทุน', type: 'income', order_index: 5 } as CashflowGroup];
    const withDividend = [...cats, { id: 'c-div', name: 'ปันผล', type: 'income', cashflow_group_id: 'g-div' } as Category];
    const s = stats({ cashflowGroups: withInvestmentIncome, categories: withDividend, displayTransactions: [...base, tx('d', 'c-div', 800)] });
    expect(cardNames(s.activeIncomeCards)).toEqual(['เงินเดือน', 'รายได้จากการลงทุน']);
    expect(cardNames(s.activeSavingsCards)).toEqual(['ลงทุน/ออม']); // not listed a second time as savings
  });
});

describe('useLedgerStats — a group card', () => {
  const card = (nodes: React.ReactNode[], name: string) => {
    show(nodes);
    return [...container!.querySelectorAll<HTMLElement>('button')].find(b => b.querySelector(`span[title="${name}"]`))!;
  };

  /** The big share figure on the card (the % next to the amount), not any other number on it. */
  const share = (c: HTMLElement) => c.querySelector('.text-\\[11\\.5px\\]')!.textContent;

  it('income: name, +amount, share of income, count, badge', () => {
    const s = stats();
    const c = card(s.activeIncomeCards, 'เงินเดือน');
    expect(c.textContent).toContain('+฿30,000.00');
    expect(share(c)).toBe('100.0%');
    expect(c.textContent).toContain('1 รายการ');
    expect(c.textContent).toContain('IN');
  });

  it('expense: −amount and share of EXPENSE (not of income)', () => {
    const c = card(stats().activeExpenseCards, 'ค่ากิน');
    expect(c.textContent).toContain('−฿1,000.00');
    expect(share(c)).toBe('10.0%'); // 1,000 / 10,000 (of income it would be 3.3%)
    expect(c.textContent).toContain('3 รายการ');
    expect(c.textContent).toContain('OUT');
  });

  it('savings: ±net amount and share of INCOME, with the buy / sell netted', () => {
    const c = card(stats().activeSavingsCards, 'ลงทุน/ออม');
    expect(c.textContent).toContain('±฿1,500.00');
    expect(share(c)).toBe('5.0%'); // 1,500 / 30,000 (of expense it would be 15.0%)
    expect(c.textContent).toContain('2 รายการ');
    expect(c.textContent).toContain('SAVE');
  });

  it('shares are 0.0% when there is nothing to compare with', () => {
    const only = [tx('g', 'c-gold', 100)];
    const c = card(stats({ displayTransactions: only }).activeSavingsCards, 'ลงทุน/ออม');
    expect(share(c)).toBe('0.0%');
    act(() => root!.unmount()); container!.remove();
    const c2 = card(stats({ displayTransactions: [tx('r', 'c-salary', 100)] }).activeIncomeCards, 'เงินเดือน');
    expect(share(c2)).toBe('100.0%');
  });

  it('lists categories biggest first with their share of the group', () => {
    const c = card(stats().activeExpenseCards, 'ค่ากิน');
    const rows = [...c.querySelectorAll('.border-dashed .truncate.uppercase')].map(e => e.textContent);
    expect(rows).toEqual(['กาแฟ', 'มื้อกลางวัน']);
    expect(c.textContent).toContain('60%'); // coffee 600 / 1,000
    expect(c.textContent).toContain('40%');
  });

  it('a category whose rows net to nothing is not listed inside a group that still has money', () => {
    const two = [...cats, { id: 'c-fund', name: 'กองทุน', type: 'savings', cashflow_group_id: 'g-save' } as Category];
    const s = stats({
      categories: two,
      displayTransactions: [tx('b', 'c-gold', 1000), tx('s', 'c-gold', -1000), { ...tx('f', 'c-fund', 800), category: 'กองทุน' } as TransactionDisplay],
    });
    const c = card(s.activeSavingsCards, 'ลงทุน/ออม');
    expect([...c.querySelectorAll('.border-dashed .truncate.uppercase')].map(e => e.textContent)).toEqual(['กองทุน']);
  });

  it('a category linked to its group through the camel-case field is counted in that group', () => {
    const aliased = [...cats, { id: 'c-alias', name: 'ผ่านชื่อกลุ่ม', type: 'expense', cashflowGroup: 'g-rent' } as Category];
    const s = stats({ categories: aliased, displayTransactions: [{ ...tx('a', 'c-alias', 250), category: 'ผ่านชื่อกลุ่ม' } as TransactionDisplay] });
    expect(cardNames(s.activeExpenseCards)).toEqual(['ที่พัก']);
  });

  it('savings cards are ordered by order_index too', () => {
    const second = [...groups, { id: 'g-save2', name: 'กองทุนรวม', type: 'savings', order_index: 0 } as CashflowGroup];
    const withCat = [...cats, { id: 'c-fund', name: 'กองทุน', type: 'savings', cashflow_group_id: 'g-save2' } as Category];
    const s = stats({ cashflowGroups: second, categories: withCat, displayTransactions: [...base, { ...tx('f', 'c-fund', 800), category: 'กองทุน' } as TransactionDisplay] });
    expect(cardNames(s.activeSavingsCards)).toEqual(['กองทุนรวม', 'ลงทุน/ออม']); // 0 before 3
  });

  it('no per-month figure for a single month; one appears once the rows span months', () => {
    expect(card(stats().activeExpenseCards, 'ค่ากิน').textContent).not.toContain('/ด.');
    act(() => root!.unmount()); container!.remove();
    const spread = [tx('a', 'c-lunch', 400, '2026-01-10'), tx('b', 'c-lunch', 200, '2026-02-10')];
    const c = card(stats({ displayTransactions: spread, filterPeriod: '2026' }).activeExpenseCards, 'ค่ากิน');
    expect(c.textContent).toContain('฿300.00/ด.'); // 600 / 2 months
  });

  it('is highlighted when it is the active group, and clicking toggles the group filter', () => {
    const setGroup = vi.fn();
    let s = stats({ advancedFilterGroup: 'ALL', setAdvancedFilterGroup: setGroup });
    click(card(s.activeExpenseCards, 'ค่ากิน'));
    expect(setGroup).toHaveBeenLastCalledWith('g-food');
    act(() => root!.unmount()); container!.remove();

    s = stats({ advancedFilterGroup: 'g-food', setAdvancedFilterGroup: setGroup });
    const active = card(s.activeExpenseCards, 'ค่ากิน');
    expect(active.className).toContain('border-expense');
    click(active);
    expect(setGroup).toHaveBeenLastCalledWith('ALL');
    expect(card(s.activeExpenseCards, 'ที่พัก').className).not.toContain('border-expense');
  });

  it('clicking is harmless without a handler', () => {
    const c = card(stats({ setAdvancedFilterGroup: undefined }).activeExpenseCards, 'ค่ากิน');
    expect(() => click(c)).not.toThrow();
  });

  it('a card is a real button', () => {
    const c = card(stats().activeIncomeCards, 'เงินเดือน');
    expect(c.getAttribute('type')).toBe('button');
    expect(q('button')).toBe(c);
  });
});

describe('useLedgerStats — the average line under each total', () => {
  it('per day over the period when everything is in one month', () => {
    expect(stats().getSubValue(3000)).toBe('เฉลี่ย ฿100.00 / วัน'); // 30 days
  });

  it('per month when the rows cover several months', () => {
    const rows = [tx('a', 'c-rent', 4000, '2026-01-05'), tx('b', 'c-rent', 2000, '2026-02-05'), tx('c', 'c-rent', 3000, '2026-03-05')];
    expect(stats({ displayTransactions: rows, filterPeriod: '2026' }).getSubValue(9000)).toBe('เฉลี่ย ฿3,000.00 / เดือน');
  });

  it('a pay cycle counts as one "month": rows on both sides of the 25th are one cycle', () => {
    const rows = [tx('a', 'c-rent', 100, '2026-01-26'), tx('b', 'c-rent', 100, '2026-02-10')];
    expect(stats({ displayTransactions: rows, filterPeriod: 'cycle:2026-01' }).getSubValue(600)).toBe('เฉลี่ย ฿20.00 / วัน'); // one cycle → per day (600 / 30)
    expect(stats({ displayTransactions: rows, filterPeriod: '2026' }).getSubValue(600)).toBe('เฉลี่ย ฿300.00 / เดือน'); // two calendar months
  });

  it('falls back to one day when the period has no dates', () => {
    expect(stats({ allDatesInPeriod: [] }).getSubValue(500)).toBe('เฉลี่ย ฿500.00 / วัน');
  });
});
