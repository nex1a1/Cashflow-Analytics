// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import KakeiboView from '../index';
import MonthReflection from '../MonthReflection';
import { flush, q } from '@/test-utils/dom';
import type { CashflowGroup, Category } from '@/types';

// The real view and its hooks run (useBudgets / useJsonSetting included). Replaced: the two contexts it reads,
// the API layer (settings = an in-memory store) and the doughnut canvas.
const h = vi.hoisted(() => ({
  period: 'cycle:2026-09',
  transactions: [] as unknown[],
  groups: [] as CashflowGroup[],
  categories: [] as Category[],
  store: {} as Record<string, unknown>,
  save: vi.fn(),
}));
vi.mock('@/context/AppDataContext', () => ({ useAppData: () => ({ transactions: h.transactions, categories: h.categories, cashflowGroups: h.groups }) }));
vi.mock('@/context/AppFilterContext', () => ({ useAppFilter: () => ({ filterPeriod: h.period, setFilterPeriod: () => {}, getFilterLabel: (p: string) => p }) }));
vi.mock('@/services/api', () => ({
  settingsService: { getAll: () => Promise.resolve({ ...h.store }), save: (...a: unknown[]) => h.save(...a) },
}));
vi.mock('react-chartjs-2', () => ({ Doughnut: () => null }));

h.groups = [
  { id: 'g-inc', name: 'เงินเดือน', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-rent', name: 'ค่าหอ/ที่พัก', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-food', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 3 },
  { id: 'g-misc', name: 'ค่าใช้จ่ายจิปาถะ', type: 'expense', allocation_type: 'want', order_index: 4 },
];
h.categories = [
  { id: 'c-sal', name: 'เงินเดือน', type: 'income', order_index: 1, cashflow_group_id: 'g-inc' },
  { id: 'c-rent', name: 'ค่าหอพัก', type: 'expense', order_index: 2, cashflow_group_id: 'g-rent' },
  { id: 'c-food', name: 'อาหาร', type: 'expense', order_index: 3, cashflow_group_id: 'g-food' },
  { id: 'c-shop', name: 'ช้อปปิ้ง', type: 'expense', order_index: 4, cashflow_group_id: 'g-misc' },
];
const GROUP_TYPE: Record<string, string> = { 'c-sal': 'income', 'c-rent': 'expense', 'c-food': 'expense', 'c-shop': 'expense' };
const row = (date: string, category_id: string, amount: number, allocation_type: string | null = null) =>
  ({ id: `${date}-${category_id}-${amount}`, date, category_id, category: category_id, description: '', amount, group_type: GROUP_TYPE[category_id], allocation_type });

// Cycle 25 Sep – 24 Oct 2026, today = 14 Oct. Rows after today are plan.
h.transactions = [
  row('2026-09-25', 'c-sal', 25_000),
  row('2026-09-30', 'c-rent', 4_500, 'need'), // Fix Cost (rent group)
  row('2026-10-01', 'c-food', 1_000, 'need'),
  row('2026-10-20', 'c-food', 2_500, 'need'), // plan: food 1,000 actual + 2,500 plan > 3,000 budget
  row('2026-10-05', 'c-shop', 1_100, 'want'), // misc 110% of its 1,000 budget → warn, not danger
  row('2026-10-20', 'c-shop', 13_000, 'want'), // plan: drags the cycle below the 20% goal, still positive
];
h.store = { group_budgets: { 'g-food': 300_000, 'g-misc': 100_000 } };

let root: Root | null = null;
let container: HTMLElement | null = null;
async function mount(node: React.ReactNode) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(node));
  await flush(); await flush();
}
const section = (label: string) => q(`section[aria-label="${label}"]`)!;
const hasClass = (el: Element, cls: string) => el.classList.contains(cls) || !!el.querySelector(`.${cls}`);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 14, 12));
  h.save.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null; container = null;
  vi.useRealTimers();
});

describe('KakeiboView', () => {
  it('doughnut splits income into NEED / WANT / เงินเหลือ (investing lives off-app, so no permanent "ลงทุน/ออม 0%")', async () => {
    await mount(<KakeiboView />);
    const panel = section('สรุปการใช้เงิน');
    const items = [...panel.querySelectorAll('li')].map((li) => li.textContent);
    // need 8,000 · want 14,100 · left 2,900 of 25,000 income
    expect(items).toEqual(['NEED32%฿8,000.00', 'WANT56%฿14,100.00', 'เงินเหลือ12%฿2,900.00']);
  });

  it('envelopes colour from actuals only and show the plan apart, like the Dashboard', async () => {
    await mount(<KakeiboView />);
    const rows = [...section('งบซอง').querySelectorAll('li')];
    const food = rows.find((li) => li.textContent?.includes('ค่ากิน'))!;
    expect(food.textContent).toContain('เหลือ ฿2,000.00');
    expect(food.textContent).toContain('แผนอีก ฿2,500.00');
    expect(food.textContent).not.toContain('เกิน');
    const misc = rows.find((li) => li.textContent?.includes('ค่าใช้จ่ายจิปาถะ'))!;
    expect(misc.querySelector('.text-warn')?.textContent).toBe('เกิน ฿100.00 (10%)'); // 110%: amber, not red
    expect(hasClass(misc, 'text-danger')).toBe(false);
  });

  it('header: a planned cycle says "ตามแผน" next to the real-to-date leftover, and under-goal-but-positive is warn, not danger', async () => {
    await mount(<KakeiboView />);
    const header = section('Kakeibo');
    expect(header.textContent).toContain('ตามแผนเหลือ ฿2,900.00 (12%)');
    expect(header.textContent).toContain('ถึงวันนี้ใช้ไป ฿6,600.00');
    expect(header.textContent).not.toContain('เหลือจริง');
    expect(hasClass(header, 'text-danger')).toBe(false);
    expect(hasClass(header, 'text-warn')).toBe(true);
  });

  it('weekly spend is for review: no red verdict and no "เกิน" label, plan drawn apart', async () => {
    await mount(<KakeiboView />);
    const weekly = section('รายจ่ายรายสัปดาห์');
    expect(weekly.textContent).not.toContain('เกิน');
    expect(hasClass(weekly, 'text-danger')).toBe(false);
    // week 18–24 Oct is all plan (15,500) and far above its allowance: the bar shows the allowance tick instead of a colour
    const last = [...weekly.querySelectorAll('li[data-week]')].at(-1)!;
    expect(last.textContent).toContain('฿15,500.00');
    expect(last.querySelector('[data-allowance-tick]')).not.toBeNull();
  });
});

describe('MonthReflection', () => {
  const setText = (el: HTMLTextAreaElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    act(() => { el.focus(); setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
  };
  const blur = async (el: HTMLTextAreaElement) => { act(() => el.blur()); await flush(); await flush(); };

  it('a failed save keeps what the user typed (the error says so)', async () => {
    await mount(<MonthReflection />);
    // a real request fails later: the optimistic value renders first, then the rollback does
    let fail = () => {};
    h.save.mockImplementationOnce(() => new Promise((_, reject) => { fail = () => reject(new Error('offline')); }));
    const box = q<HTMLTextAreaElement>('textarea')!;
    setText(box, 'ค่ากินใช้น้อยดี');
    await blur(box);
    await act(async () => { fail(); });
    await flush();
    expect(q('[role="alert"], #reflection-error')?.textContent).toContain('ข้อความยังอยู่ในช่อง');
    expect(q<HTMLTextAreaElement>('textarea')!.value).toBe('ค่ากินใช้น้อยดี');
  });

  it('a successful save stores the trimmed text under the period and keeps showing it', async () => {
    await mount(<MonthReflection />);
    const box = q<HTMLTextAreaElement>('textarea')!;
    setText(box, '  ค่ากินใช้น้อยดี  ');
    await blur(box);
    expect(h.save).toHaveBeenLastCalledWith('month_reflections', expect.objectContaining({ 'cycle:2026-09': { good: 'ค่ากินใช้น้อยดี' } }));
    expect(q<HTMLTextAreaElement>('textarea')!.value).toBe('ค่ากินใช้น้อยดี');
  });
});
