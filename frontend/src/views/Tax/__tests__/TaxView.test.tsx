// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import TaxView from '../index';
import { flush, click, key, type, choose, q, byText } from '@/test-utils/dom';
import type { CashflowGroup, Category } from '@/types';

// The real view and its hooks run (useJsonSetting included). Replaced: the three contexts it reads and the API layer,
// where settings are an in-memory store so a saved profile can be read back by the next mount.
const h = vi.hoisted(() => ({
  period: '2026',
  rows: [] as unknown[],
  groups: [] as CashflowGroup[],
  categories: [] as Category[],
  store: {} as Record<string, unknown>,
  listeners: new Set<() => void>(),
  transactions: [] as unknown[],
  setPeriod: vi.fn(),
  showToast: vi.fn(),
  getAll: vi.fn(),
  save: vi.fn(),
}));
vi.mock('@/context/AppDataContext', () => ({ useAppData: () => ({ transactions: h.transactions, categories: h.categories, cashflowGroups: h.groups }) }));
vi.mock('@/context/AppFilterContext', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (l: () => void) => { h.listeners.add(l); return () => { h.listeners.delete(l); }; };
  return { useAppFilter: () => ({ filterPeriod: useSyncExternalStore(subscribe, () => h.period), setFilterPeriod: h.setPeriod }) };
});
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: h.showToast }) }));
vi.mock('@/services/api', () => ({
  transactionService: { getAll: (...a: unknown[]) => h.getAll(...a) },
  settingsService: { getAll: () => Promise.resolve({ ...h.store }), save: (...a: unknown[]) => h.save(...a) },
}));

const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-exp', name: 'รายจ่ายประจำ', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-sav', name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 },
];
const categories: Category[] = [
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', order_index: 1, cashflow_group_id: 'g-inc' },
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', order_index: 2, cashflow_group_id: 'g-exp' },
  { id: 'c-life', name: 'เบี้ยประกันชีวิต', type: 'expense', order_index: 3, cashflow_group_id: 'g-exp' },
  { id: 'c-health', name: 'เบี้ยประกันสุขภาพ', type: 'expense', order_index: 4, cashflow_group_id: 'g-exp' },
  { id: 'c-rmf', name: 'กองทุน RMF', type: 'savings', order_index: 5, cashflow_group_id: 'g-sav' },
];
h.groups = groups; // the hoisted mocks read the fixtures through h
h.categories = categories;

const KEY = 'tax_profile';
const sat = (baht: number) => baht * 100;
const row = (id: string, date: string, category_id: string, amount: number, description = id) => ({ id, date, category_id, description, amount });

let root: Root | null = null;
let container: HTMLElement | null = null;

async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<TaxView />));
  await flush(); await flush();
}
/** Changes the period like the filter context does: subscribed components re-render. */
const changePeriod = async (p: string) => { act(() => { h.period = p; h.listeners.forEach(l => l()); }); await flush(); await flush(); };

const input = (id: string) => q<HTMLInputElement>(`#${id}`)!;
/** Types into a money field and commits it with Enter (the field saves on blur). */
const commit = async (id: string, text: string) => {
  const el = input(id);
  act(() => el.focus());
  type(el, text);
  key(el, 'Enter');
  await flush(); await flush();
};
const saved = () => h.save.mock.calls.at(-1) as [string, { mapping: Record<string, string>; years: Record<string, any> }];
const verdict = () => [...document.querySelectorAll('p')].find(p => /ต้องจ่ายเพิ่มประมาณ|ได้คืนประมาณ|พอดี ไม่ต้องจ่าย/.test(p.textContent ?? ''));
const section = (label: string) => q(`section[aria-label="${label}"]`);
const text = () => document.body.textContent ?? '';

const withProfile = (p: unknown) => { h.store[KEY] = p; };
// the 50 ทวิ of the hand-checked example: salary 420,000, SSO 9,000, withheld 5,000 → net 251,000 → tax 5,050
const SALARY_2026 = { income: sat(420_000), sso: sat(9_000), withheld: sat(5_000) };

beforeEach(() => {
  h.period = '2026';
  h.rows = [];
  h.store = {};
  h.setPeriod.mockClear(); h.showToast.mockClear(); h.getAll.mockClear(); h.save.mockClear();
  h.getAll.mockImplementation(() => Promise.resolve(h.rows));
  h.save.mockImplementation((k: string, v: unknown) => { h.store[k] = v; return Promise.resolve(); });
});

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('TaxView — which periods it opens for', () => {
  it('asks for a whole year when the period is a month, and fetches nothing', async () => {
    h.period = '2026-10';
    await mount();
    expect(text()).toContain('หน้าภาษีดูได้ทีละปี');
    click(byText('button', 'ดูทั้งปี 2026'));
    expect(h.setPeriod).toHaveBeenCalledWith('2026');
    expect(h.getAll).not.toHaveBeenCalled();
  });

  it('offers the cycle year (not the calendar year) when the month is a pay cycle', async () => {
    h.period = 'cycle:2026-10';
    await mount();
    click(byText('button', 'ดูทั้งปี 2026'));
    expect(h.setPeriod).toHaveBeenCalledWith('cycle:2026-01_2026-12');
  });

  it('a calendar year loads 1 Jan – 31 Dec', async () => {
    await mount();
    expect(h.getAll).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
    expect(q('h2')!.textContent).toBe('ภาษี ปี 2026');
  });

  it('a cycle year still loads the calendar tax year, not 25 Jan – 24 Jan', async () => {
    h.period = 'cycle:2026-01_2026-12';
    await mount();
    expect(h.getAll).toHaveBeenCalledWith('2026-01-01', '2026-12-31');
  });

  it('follows the period: another year refetches and shows that year\'s own 50 ทวิ', async () => {
    withProfile({ years: { 2026: { income: sat(420_000) }, 2025: { income: sat(300_000) } } });
    await mount();
    expect(input('tax-income').value).toBe('420,000');
    await changePeriod('2025');
    expect(h.getAll).toHaveBeenLastCalledWith('2025-01-01', '2025-12-31');
    expect(input('tax-income').value).toBe('300,000');
  });

  it('text typed but not saved in one year does not follow the user into another year', async () => {
    await mount();
    await commit('tax-income', 'abc'); // rejected, stays in the field
    expect(input('tax-income').value).toBe('abc');
    await changePeriod('2025');
    expect(input('tax-income').value).toBe('');
  });
});

describe('TaxView — the estimate', () => {
  it('asks for the income before it can estimate anything', async () => {
    await mount();
    expect(text()).toContain('กรอก "เงินได้ทั้งปี"');
    expect(verdict()).toBeUndefined();
  });

  it('salary 420,000 + SSO 9,000: net 251,000, tax 5,050, withheld 5,000 → pay about 50 more (warn, not danger)', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    expect(verdict()!.textContent).toBe('ต้องจ่ายเพิ่มประมาณ ฿50');
    expect(verdict()!.className).toContain('text-warn');
    expect(verdict()!.className).not.toContain('text-danger');
    const est = section('ประมาณภาษี')!.textContent!;
    expect(est).toContain('เงินได้สุทธิ฿251,000');
    expect(est).toContain('ภาษีทั้งปี ฿5,050 − หัก ณ ที่จ่ายแล้ว ฿5,000');
    expect(est).toContain('ขั้นภาษีสูงสุด 5%');
    expect(est).toContain('ลดหย่อนส่วนตัว');
  });

  it('turns into a refund (income colour) once more has been withheld than the tax', async () => {
    withProfile({ years: { 2026: { ...SALARY_2026, withheld: sat(6_000) } } });
    await mount();
    expect(verdict()!.textContent).toBe('ได้คืนประมาณ ฿950');
    expect(verdict()!.className).toContain('text-income');
  });

  it('says "พอดี" when tax equals what was withheld', async () => {
    withProfile({ years: { 2026: { ...SALARY_2026, withheld: sat(5_050) } } });
    await mount();
    expect(verdict()!.textContent).toBe('พอดี ไม่ต้องจ่ายเพิ่ม');
  });

  it('lists the brackets that were hit', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    const est = section('ประมาณภาษี')!.textContent!;
    expect(est).toContain('฿0 – ฿150,000 · 0%');
    expect(est).toContain('฿150,000 – ฿300,000 · 5%');
    expect(est).not.toContain('10%');
  });
});

describe('TaxView — typing the 50 ทวิ', () => {
  it('saves the income in satang for this year and shows the estimate right away', async () => {
    await mount();
    await commit('tax-income', '420,000');
    const [key_, profile] = saved();
    expect(key_).toBe(KEY);
    expect(profile.years['2026']).toEqual({ income: sat(420_000) });
    expect(verdict()!.textContent).toBe('ต้องจ่ายเพิ่มประมาณ ฿5,500'); // net 260,000 → 5% of 110,000
  });

  it('accepts commas, spaces and a baht sign', async () => {
    await mount();
    await commit('tax-withheld', ' ฿ 5,000.50 ');
    expect(saved()[1].years['2026']).toEqual({ withheld: 500_050 });
  });

  it('rejects text and negatives inline, keeps what was typed and saves nothing', async () => {
    await mount();
    await commit('tax-income', 'abc');
    expect(text()).toContain('ใส่เป็นตัวเลข เช่น 420000');
    expect(input('tax-income').getAttribute('aria-invalid')).toBe('true');
    expect(input('tax-income').value).toBe('abc');
    await commit('tax-income', '-5');
    expect(text()).toContain('ใส่เป็นตัวเลข');
    expect(h.save).not.toHaveBeenCalled();
  });

  it('does not save when nothing changed', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    await commit('tax-income', '420000'); // same value, different text
    expect(h.save).not.toHaveBeenCalled();
  });

  it('a blank field deletes the value instead of storing 0', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    await commit('tax-sso', '');
    expect(saved()[1].years['2026']).toEqual({ income: sat(420_000), withheld: sat(5_000) });
  });

  // A real failure takes a network round trip, so React renders the optimistic value first and the rollback after it.
  // act() would batch the two into nothing, so the wait happens with the act environment switched off.
  const failSlowly = () => h.save.mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error('offline')), 15)));
  const settleOutsideAct = async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: false });
    await new Promise(r => setTimeout(r, 40));
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  };

  it('says so inline when the save fails, and the estimate keeps using the stored value', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    failSlowly();
    const el = input('tax-income');
    act(() => el.focus());
    type(el, '500000');
    key(el, 'Enter');
    await settleOutsideAct();
    expect(text()).toContain('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    expect(verdict()!.textContent).toBe('ต้องจ่ายเพิ่มประมาณ ฿50'); // still the 420,000 figures
  });

  // CLAUDE.md rule 32: a failed save keeps what the user typed (so a retry needs no retyping).
  const typeAndFailSave = async (id: string, value: string) => {
    failSlowly();
    const el = input(id);
    act(() => el.focus());
    type(el, value);
    key(el, 'Enter');
    await settleOutsideAct();
  };

  it('keeps what was typed when the save fails', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    await typeAndFailSave('tax-income', '500000');
    expect(input('tax-income').value).toBe('500000');
    expect(text()).toContain('บันทึกไม่สำเร็จ ลองอีกครั้ง');
  });

  it('a retry with the kept text saves it, formats it and clears the error', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    await typeAndFailSave('tax-income', '500000');
    const el = input('tax-income');
    act(() => el.focus());
    key(el, 'Enter'); // no retyping
    await settleOutsideAct();
    expect(saved()[1].years['2026'].income).toBe(sat(500_000));
    expect(input('tax-income').value).toBe('500,000');
    expect(text()).not.toContain('บันทึกไม่สำเร็จ');
  });

  it('typing the stored value back after a failure drops the kept text and the error', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    await typeAndFailSave('tax-income', '500000');
    await commit('tax-income', '420000');
    expect(input('tax-income').value).toBe('420,000');
    expect(text()).not.toContain('บันทึกไม่สำเร็จ');
  });

  it('a failed clear of a money field stays cleared (an empty draft is still a draft)', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    await typeAndFailSave('tax-sso', '');
    expect(text()).toContain('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    expect(input('tax-sso').value).toBe('');
  });

  it('the date of filing behaves the same: error shown, picked date kept', async () => {
    withProfile({ years: { 2026: { income: sat(420_000) } } });
    await mount();
    failSlowly();
    type(input('tax-filed-date'), '2027-02-15');
    await settleOutsideAct();
    expect(text()).toContain('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    expect(input('tax-filed-date').value).toBe('2027-02-15');
  });

  it('a failed clear of the date keeps it cleared instead of snapping back', async () => {
    withProfile({ years: { 2026: { income: sat(420_000), filed: { date: '2027-02-15' } } } });
    await mount();
    expect(input('tax-filed-date').value).toBe('2027-02-15');
    failSlowly();
    type(input('tax-filed-date'), '');
    await settleOutsideAct();
    expect(text()).toContain('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    expect(input('tax-filed-date').value).toBe('');
  });

  it('PVD and other deductions lower the net income', async () => {
    withProfile({ years: { 2026: { income: sat(420_000) } } });
    await mount();
    await commit('tax-pvd', '10000');
    await commit('tax-other', '30000');
    const est = section('ประมาณภาษี')!.textContent!;
    expect(est).toContain('PVD / กบข.');
    expect(est).toContain('ลดหย่อนอื่นที่กรอกเอง');
    expect(est).toContain('เงินได้สุทธิ฿220,000'); // 420,000 − 100,000 − 60,000 − 10,000 − 30,000
  });
});

describe('TaxView — mapping Ledger categories to deductions', () => {
  const rmfRows = [
    row('r1', '2026-01-25', 'c-rmf', 50_000, 'ซื้อ RMF ม.ค.'),
    row('r2', '2026-06-25', 'c-rmf', 100_000, 'ซื้อ RMF มิ.ย.'),
    row('r3', '2026-09-01', 'c-rmf', -10_000, 'ขาย RMF'),
    row('r4', '2025-12-31', 'c-rmf', 999_999, 'ปีที่แล้ว'),
  ];

  it('offers expense and savings categories only (income cannot be deducted) and starts with the editor open', async () => {
    await mount();
    expect(text()).toContain('ยังไม่ได้ผูกหมวด');
    expect(q('select[aria-label="ประเภทลดหย่อนของหมวด ค่ากิน"]')).not.toBeNull();
    expect(q('select[aria-label="ประเภทลดหย่อนของหมวด กองทุน RMF"]')).not.toBeNull();
    expect(q('select[aria-label="ประเภทลดหย่อนของหมวด เงินเดือน"]')).toBeNull();
  });

  it('saves a mapping at once, keeps the editor open, and the Ledger rows feed the estimate (capped at 30% of income)', async () => {
    h.rows = rmfRows;
    withProfile({ years: { 2026: SALARY_2026 } });
    await mount();
    choose(q('select[aria-label="ประเภทลดหย่อนของหมวด กองทุน RMF"]'), 'rmf');
    await flush(); await flush();

    expect(saved()[1].mapping).toEqual({ 'c-rmf': 'rmf' });
    expect(q('select[aria-label="ประเภทลดหย่อนของหมวด กองทุน RMF"]')).not.toBeNull(); // not collapsed under the user's hand

    const ledger = section('ลดหย่อนจาก Ledger ปี 2026')!.textContent!;
    expect(ledger).toContain('ลดหย่อนได้ ฿126,000'); // paid 140,000 (net of the sell, last year ignored), cap 30% × 420,000
    expect(ledger).toContain('เกินเพดาน ฿14,000');
    expect(ledger).toContain('จ่าย ฿140,000 · 3 รายการ');
    // net = 420,000 − 100,000 − 60,000 − 9,000 − 126,000 = 125,000 → under the 150,000 free band → tax 0 → refund of what was withheld
    expect(verdict()!.textContent).toBe('ได้คืนประมาณ ฿5,000');
  });

  it('removes a mapping with "ไม่ลดหย่อน"', async () => {
    withProfile({ mapping: { 'c-rmf': 'rmf' }, years: { 2026: SALARY_2026 } });
    await mount();
    click(byText('button', 'ผูกหมวด'));
    choose(q('select[aria-label="ประเภทลดหย่อนของหมวด กองทุน RMF"]'), '');
    await flush(); await flush();
    expect(saved()[1].mapping).toEqual({});
  });

  it('says so when the mapping cannot be saved', async () => {
    await mount();
    h.save.mockRejectedValueOnce(new Error('offline'));
    choose(q('select[aria-label="ประเภทลดหย่อนของหมวด ค่ากิน"]'), 'donation');
    await flush(); await flush();
    expect(text()).toContain('บันทึกการผูกหมวดไม่สำเร็จ ลองอีกครั้ง');
  });

  it('with a mapping the editor is closed and "ผูกหมวด" toggles it', async () => {
    withProfile({ mapping: { 'c-rmf': 'rmf' } });
    await mount();
    expect(q('select[aria-label^="ประเภทลดหย่อนของหมวด"]')).toBeNull();
    const toggle = byText('button', 'ผูกหมวด')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    click(toggle);
    expect(q('select[aria-label^="ประเภทลดหย่อนของหมวด"]')).not.toBeNull();
    expect(byText('button', 'ปิดการผูกหมวด')!.getAttribute('aria-expanded')).toBe('true');
    click(byText('button', 'ปิดการผูกหมวด'));
    expect(q('select[aria-label^="ประเภทลดหย่อนของหมวด"]')).toBeNull();
  });

  it('shows a mapped type with no rows as 0 and expands to a rows list', async () => {
    h.rows = rmfRows;
    withProfile({ mapping: { 'c-rmf': 'rmf', 'c-life': 'life_ins' }, years: { 2026: SALARY_2026 } });
    await mount();
    const rows = [...document.querySelectorAll<HTMLElement>('section[aria-label^="ลดหย่อนจาก Ledger"] li > button')];
    expect(rows.map(r => r.querySelector('span span:nth-child(2)')?.textContent)).toEqual(['RMF', 'ประกันชีวิต']);

    const life = rows.find(r => r.textContent!.includes('ประกันชีวิต'))!;
    click(life);
    expect(life.getAttribute('aria-expanded')).toBe('true');
    expect(text()).toContain('ยังไม่มีรายการในปีนี้');

    const rmf = rows.find(r => r.textContent!.includes('RMF'))!;
    click(rmf);
    expect(text()).toContain('ซื้อ RMF ม.ค.');
    expect(text()).toContain('฿100,000');
    expect(text()).not.toContain('ปีที่แล้ว'); // 2025 row never listed
  });

  it('reports what a shared cap cut off (life + health share 100,000)', async () => {
    h.rows = [row('l1', '2026-02-01', 'c-life', 90_000), row('h1', '2026-02-01', 'c-health', 30_000)];
    withProfile({ mapping: { 'c-life': 'life_ins', 'c-health': 'health_ins' }, years: { 2026: SALARY_2026 } });
    await mount();
    expect(section('ลดหย่อนจาก Ledger ปี 2026')!.textContent).toContain('เพดานร่วม ประกันชีวิต + สุขภาพ: ตัดออก ฿15,000');
  });
});

describe('TaxView — the filed result and history', () => {
  it('compares a filed result with the estimate: equal net income reads as a match', async () => {
    withProfile({ years: { 2026: { ...SALARY_2026, filed: { date: '2027-02-15', netIncome: sat(251_000), tax: sat(5_050), paid: sat(50) } } } });
    await mount();
    const est = section('ประมาณภาษี')!.textContent!;
    expect(est).toContain('ยื่นจริง');
    expect(est).toContain('เงินได้สุทธิ ฿251,000');
    expect(est).toContain('ภาษี ฿5,050');
    expect(est).toContain('ชำระเพิ่ม ฿50');
    expect(est).toContain('ตรงกับที่ประมาณ');
  });

  it('flags a different net income in the warning colour (something the app does not know about)', async () => {
    withProfile({ years: { 2026: { ...SALARY_2026, filed: { netIncome: sat(250_000), tax: sat(5_000), refund: 0 } } } });
    await mount();
    const flag = [...section('ประมาณภาษี')!.querySelectorAll('span')].find(s => s.textContent?.includes('เงินได้สุทธิต่างจากที่ประมาณ ฿1,000'));
    expect(flag).toBeTruthy();
    expect(flag!.className).toContain('text-warn');
  });

  it('saves the filing date and amounts under filed, and drops `filed` entirely once everything is cleared', async () => {
    withProfile({ years: { 2026: { income: sat(420_000) } } });
    await mount();
    type(input('tax-filed-date'), '2027-02-15');
    await flush(); await flush();
    expect(saved()[1].years['2026'].filed).toEqual({ date: '2027-02-15' });

    await commit('tax-filed-tax', '0'); // zero is a real filed value, not "empty"
    expect(saved()[1].years['2026'].filed).toEqual({ date: '2027-02-15', tax: 0 });

    await commit('tax-filed-tax', '');
    type(input('tax-filed-date'), '');
    await flush(); await flush();
    expect(saved()[1].years['2026']).toEqual({ income: sat(420_000) });
  });

  it('lists every year that has data, newest first, as links to the other years', async () => {
    withProfile({ years: {
      2024: { income: sat(300_000) },
      2025: { income: sat(400_000), withheld: sat(2_000), filed: { date: '2026-02-15', netIncome: sat(150_000), tax: 0, refund: sat(2_000) } },
      2026: { income: sat(420_000) },
      2023: {}, // nothing in it: not listed
    } });
    await mount();
    const history = section('ประวัติภาษี')!;
    const years = [...history.querySelectorAll('tbody th')].map(th => th.textContent);
    expect(years).toEqual(['2026 (2569)', '2025 (2568)', '2024 (2567)']);
    expect(history.querySelectorAll('tbody th button')).toHaveLength(2); // the open year is not a link

    expect(history.textContent).toContain('ได้คืน ฿2,000');
    expect(history.textContent).toContain('ยังไม่ได้บันทึกผลยื่น');

    click(byText('button', '2025 (2568)'));
    expect(h.setPeriod).toHaveBeenCalledWith('2025');
  });

  it('in cycle mode the history links open the cycle year', async () => {
    h.period = 'cycle:2026-01_2026-12';
    withProfile({ years: { 2025: { income: sat(400_000) }, 2026: { income: sat(420_000) } } });
    await mount();
    click(byText('button', '2025 (2568)'));
    expect(h.setPeriod).toHaveBeenCalledWith('cycle:2025-01_2025-12');
  });

  it('has no history block while nothing has been entered', async () => {
    await mount();
    expect(section('ประวัติภาษี')).toBeNull();
  });
});

describe('TaxView — copy summary and failures', () => {
  const clipboard = (impl: () => Promise<void>) => {
    const writeText = vi.fn((_text: string) => impl());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    return writeText;
  };

  it('copies the estimate and the Ledger deductions as text and says so', async () => {
    h.rows = [row('r1', '2026-01-25', 'c-rmf', 20_000)];
    withProfile({ mapping: { 'c-rmf': 'rmf' }, years: { 2026: SALARY_2026 } });
    const writeText = clipboard(() => Promise.resolve());
    await mount();
    click(byText('button', 'คัดลอกสรุป'));
    await flush();

    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain('ภาษี ปี 2026');
    expect(copied).toContain('เงินได้สุทธิ: ฿231,000'); // 251,000 − 20,000 RMF
    expect(copied).toContain('ลดหย่อนจาก Ledger:');
    expect(copied).toContain('RMF: จ่าย ฿20,000 · ลดหย่อนได้ ฿20,000');
    expect(h.showToast).toHaveBeenCalledWith('คัดลอกสรุปภาษีแล้ว', 'success');
  });

  it('tells the user when the browser refuses the clipboard', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    clipboard(() => Promise.reject(new Error('denied')));
    await mount();
    click(byText('button', 'คัดลอกสรุป'));
    await flush();
    expect(h.showToast).toHaveBeenCalledWith(expect.stringContaining('คัดลอกไม่ได้'), 'error');
  });

  it('keeps the copy button disabled until the year\'s rows have loaded', async () => {
    let release!: (rows: unknown[]) => void;
    h.getAll.mockImplementation(() => new Promise(r => { release = r; }));
    await mount();
    expect((byText('button', 'คัดลอกสรุป') as HTMLButtonElement).disabled).toBe(true);
    release([]);
    await flush(); await flush();
    expect((byText('button', 'คัดลอกสรุป') as HTMLButtonElement).disabled).toBe(false);
  });

  it('still estimates from the 50 ทวิ when the rows cannot be loaded', async () => {
    withProfile({ years: { 2026: SALARY_2026 } });
    h.getAll.mockImplementation(() => Promise.reject(new Error('offline')));
    await mount();
    expect(verdict()!.textContent).toBe('ต้องจ่ายเพิ่มประมาณ ฿50');
  });

  it('carries the reminder to check the rules before filing', async () => {
    await mount();
    expect(text()).toContain('ควรตรวจกับกรมสรรพากรก่อนยื่น');
  });
});
