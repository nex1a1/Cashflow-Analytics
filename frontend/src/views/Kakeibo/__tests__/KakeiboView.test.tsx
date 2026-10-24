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
  it('the header leads with the verdict (plan-based), then income, goal and spent-to-date', async () => {
    await mount(<KakeiboView />);
    const head = section('Kakeibo');
    const verdict = head.querySelector('[data-goal-result]')!;
    expect(verdict.getAttribute('data-goal-result')).toBe('short');
    expect(verdict.textContent).toContain('ต่ำกว่าเป้า');
    expect(verdict.textContent).toContain('ขาดอีก');
    expect(verdict.textContent).toContain('฿2,100.00');
    expect(head.textContent).toContain('ตามแผนเหลือ ฿2,900.00 (12%) จากเป้า ฿5,000.00');
    // spent to date (14 Oct): rent 4,500 + food 1,000 + shop 1,100; the rest (2,500 + 13,000) is plan
    expect(head.textContent).toContain('ใช้ไปถึงวันนี้฿6,600.00');
    expect(head.textContent).toContain('ที่เหลือเป็นแผนล่วงหน้า ฿15,500.00');
    expect(head.querySelector('h2')).not.toBeNull();
    expect(q('[data-goal-result]')).toBe(verdict); // only one verdict on the page
  });

  it('rows with a future-dated part say how much of the total is plan; footers carry the same note', async () => {
    await mount(<KakeiboView />);
    const need = section('ค่าใช้จ่ายจำเป็น (NEED)');
    expect(need.textContent).toContain('แผน ฿2,500.00'); // food: 1,000 done + 2,500 plan, total 3,500
    expect(need.textContent).toContain('฿3,500.00');
    expect(need.textContent).toContain('ในนี้แผน ฿2,500.00');
    const income = section('รายรับ');
    expect(income.textContent).not.toContain('แผน'); // salary already paid
  });

  it('an in-budget bar wears the group colour; over budget switches to the amber status colour', async () => {
    const groups = h.groups;
    h.groups = groups.map((g) => (g.id === 'g-food' ? { ...g, color: '#F97316' } : g));
    try {
      await mount(<KakeiboView />);
      const li = (name: string) => [...section('งบซอง').querySelectorAll('li')].find((x) => x.textContent?.includes(name))!;
      const fills = (name: string) => [...li(name).querySelectorAll<HTMLElement>('span[aria-hidden="true"][class*="h-2.5"] > span')].map((e) => e.style.backgroundColor).filter(Boolean).join('|');
      expect(fills('ค่ากิน')).toMatch(/249,\s*115,\s*22|f97316/i); // in budget: the group's own orange
      expect(li('ค่าใช้จ่ายจิปาถะ').querySelector('.text-warn')).not.toBeNull(); // 110%: status colour on the text
      // the legend says which colour means what
      const legend = section('งบซอง').textContent!;
      expect(legend).toContain('สีกลุ่ม = ในงบ');
      expect(legend).toContain('เกินงบ');
      expect(legend).toContain('เกิน > 20%');
    } finally {
      h.groups = groups;
    }
  });

  it('an envelope whose plan pushes it over says so in words (colour still follows actuals only)', async () => {
    await mount(<KakeiboView />);
    const misc = [...section('งบซอง').querySelectorAll('li')].find((li) => li.textContent?.includes('ค่าใช้จ่ายจิปาถะ'))!;
    expect(misc.textContent).toContain('หลังแผน เกิน ฿13,100.00'); // budget 1,000 − 1,100 − 13,000
    const food = [...section('งบซอง').querySelectorAll('li')].find((li) => li.textContent?.includes('ค่ากิน'))!;
    expect(food.textContent).toContain('หลังแผน เกิน ฿500.00'); // budget 3,000 − 1,000 − 2,500
  });

  it('the doughnut shares add up to exactly 100%', async () => {
    await mount(<KakeiboView />);
    const pct = [...section('สรุปการใช้เงิน').querySelectorAll('li')].map((li) => Number(li.textContent!.match(/(\d+)%/)![1]));
    expect(pct.reduce((n, v) => n + v, 0)).toBe(100);
  });

  it('tables have no repeated column header rows and the stacks are balanced by role', async () => {
    await mount(<KakeiboView />);
    expect(document.body.textContent).not.toContain('เดือนนี้');
    expect(document.body.textContent).not.toContain('รอบนี้');
    const cols = [...document.querySelectorAll('.tab-stage .grid-cols-3 > div, .grid-cols-3.items-start > div')];
    const titles = cols.map((c) => [...c.querySelectorAll(':scope > section, :scope > div > section')].map((p) => p.getAttribute('aria-label')));
    expect(titles[0]).toEqual(['รายรับ', 'ค่าใช้จ่ายคงที่ (Fix Cost)', 'ค่าใช้จ่ายจำเป็น (NEED)', 'ลงทุน/ออม (ซื้อ − ขาย)']);
    expect(titles[1]).toEqual(['งบซอง', 'ค่าใช้จ่ายตามใจ (WANT)']);
    expect(titles[2]).toEqual(['สรุปการใช้เงิน', 'รายจ่ายรายสัปดาห์', 'ภาพรวมรอบ']);
  });

  it('doughnut splits income into NEED / WANT / เงินเหลือ (investing lives off-app, so no permanent "ลงทุน/ออม 0%")', async () => {
    await mount(<KakeiboView />);
    const panel = section('สรุปการใช้เงิน');
    const items = [...panel.querySelectorAll('li')].map((li) => li.textContent);
    // need 8,000 · want 14,100 · left 2,900 of 25,000 income
    expect(items).toEqual(['NEED32%฿8,000.00', 'WANT56%฿14,100.00', 'เงินเหลือ12%฿2,900.00']);
  });

  it('shows a skeleton while the first load has no transactions, but keeps old numbers on screen during later loads', async () => {
    const rows = h.transactions;
    h.transactions = [];
    await mount(<KakeiboView isLoading />);
    expect(q('[role="status"][aria-busy="true"]')).not.toBeNull();
    expect(q('section[aria-label="Kakeibo"]')).toBeNull();
    act(() => root!.unmount()); container!.remove();
    h.transactions = rows;
    await mount(<KakeiboView isLoading />);
    expect(q('[aria-busy="true"]')).toBeNull();
    expect(section('Kakeibo')).not.toBeNull();
  });

  it('envelopes colour from actuals only and show the plan apart, like the Dashboard', async () => {
    await mount(<KakeiboView />);
    const rows = [...section('งบซอง').querySelectorAll('li')];
    const food = rows.find((li) => li.textContent?.includes('ค่ากิน'))!;
    expect(food.textContent).toContain('เหลือ ฿2,000.00');
    expect(food.textContent).toContain('แผนอีก ฿2,500.00');
    expect(food.textContent).not.toMatch(/(?<!หลังแผน )เกิน/); // actuals are in budget: only the after-plan phrase mentions เกิน
    expect(hasClass(food, 'text-warn') || hasClass(food, 'text-danger')).toBe(false);
    const misc = rows.find((li) => li.textContent?.includes('ค่าใช้จ่ายจิปาถะ'))!;
    expect(misc.querySelector('.text-warn')?.textContent).toBe('เกิน ฿100.00 (10%)'); // 110%: amber, not red
    expect(hasClass(misc, 'text-danger')).toBe(false);
  });

  it('header: a planned cycle says "ตามแผน" next to the real-to-date leftover, and under-goal-but-positive is warn, not danger', async () => {
    await mount(<KakeiboView />);
    const header = section('Kakeibo');
    expect(header.textContent).toContain('ตามแผนเหลือ ฿2,900.00 (12%)');
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

  it('Fix Cost choices with no row in this period stay visible in the picker and can be removed', async () => {
    const store = h.store, cats = h.categories;
    h.categories = [...cats, { id: 'c-net', name: 'ค่าเน็ต', type: 'expense', order_index: 5, cashflow_group_id: 'g-food' } as Category];
    h.store = { ...store, kakeibo_fixed: { categories: ['c-net'], items: ['c-food|ค่าข้าวเดือนก่อน'] } };
    try {
      await mount(<KakeiboView />);
      act(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'เลือกรายการ')!.click());
      const dialog = q('[role="dialog"]')!;
      expect(dialog.textContent).toContain('ค่าเน็ต'); // no rows this period, still listed
      expect(dialog.textContent).toContain('เลือก 1/'); // food: the saved item that is not in this period counts
      act(() => dialog.querySelector<HTMLInputElement>('input[aria-label="ค่าเน็ต ทั้งหมวด"]')!.click());
      await flush();
      expect(h.save).toHaveBeenLastCalledWith('kakeibo_fixed', { categories: [], items: ['c-food|ค่าข้าวเดือนก่อน'] });
    } finally {
      h.store = store; h.categories = cats;
    }
  });

  it('two ticks in a row both land (each builds on the latest value, not the one from render)', async () => {
    await mount(<KakeiboView />);
    act(() => [...document.querySelectorAll('button')].find((b) => b.textContent === 'เลือกรายการ')!.click());
    const box = q('[role="dialog"]')!.querySelector<HTMLInputElement>('input[aria-label="c-food ทั้งหมวด"]')!;
    act(() => { box.click(); box.click(); }); // same render, second click sees the old props
    await flush();
    expect(h.save).toHaveBeenLastCalledWith('kakeibo_fixed', { categories: [], items: [] }); // on, then off — not "on" twice
  });
});

describe('MonthReflection', () => {
  const setText = (el: HTMLTextAreaElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
    act(() => { el.focus(); setter.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
  };
  const blur = async (el: HTMLTextAreaElement) => { act(() => el.blur()); await flush(); await flush(); };

  it('shows the previous period intent above the boxes (the goal verdict lives in the header)', async () => {
    h.store = { ...h.store, month_reflections: { 'cycle:2026-08': { focus: 'ลดค่ากินนอกบ้าน', next: 'จดทุกวัน' } } };
    await mount(<KakeiboView />);
    const box = section('ทบทวนรอบ');
    expect(box.querySelector('[data-goal-result]')).toBeNull();
    const intent = box.querySelector('[data-prev-intent]')!;
    expect(intent.textContent).toContain('โฟกัสลดค่ากินนอกบ้าน');
    expect(intent.textContent).toContain('ปรับจดทุกวัน');
    h.store = { group_budgets: { 'g-food': 300_000, 'g-misc': 100_000 } };
  });

  it('without a previous note the intent block does not render', async () => {
    await mount(<MonthReflection />);
    expect(q('[data-prev-intent]')).toBeNull();
  });

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

  it('a successful save says "บันทึกแล้ว" until the user types again', async () => {
    await mount(<MonthReflection />);
    const box = q<HTMLTextAreaElement>('textarea')!;
    setText(box, 'จดทุกวัน');
    await blur(box);
    expect(document.querySelector('[role="status"]')?.textContent).toBe('บันทึกแล้ว');
    setText(q<HTMLTextAreaElement>('textarea')!, 'จดทุกวันนะ');
    expect(document.querySelector('[role="status"]')).toBeNull();
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
