// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ExportModal from '../index';
import type { ExportModalProps } from '../types';
import { flush, click, key, type, q, byText } from '@/test-utils/dom';
import type { CashflowGroup, Category, DayType, TransactionDisplay } from '@/types';

// The real tree is rendered (header, sidebar, preview tables, backup view, footer) and the real CSV / JSON builders run.
// Replaced: the API (what the modal fetches), the period picker (it belongs to the layout), and the browser download itself.
const h = vi.hoisted(() => ({
  all: [] as unknown[],
  getAll: null as null | ((...a: unknown[]) => Promise<unknown>),
  getAllCalls: [] as unknown[][],
  downloads: [] as Array<[string, string, boolean | undefined]>,
  downloadThrows: false,
  picker: null as null | Record<string, unknown>,
}));
vi.mock('@/services/api', () => ({
  transactionService: { getAll: (...a: unknown[]) => { h.getAllCalls.push(a); return h.getAll ? h.getAll(...a) : Promise.resolve(h.all); } },
}));
vi.mock('../../../layout/PeriodPicker', async () => {
  const React = await import('react');
  return {
    default: (p: { filterPeriod: string; setFilterPeriod: (v: string) => void }) => (h.picker = p, React.createElement('div', { 'data-stub': 'PeriodPicker', 'data-period': p.filterPeriod },
      ['2026-09', '2026-10', 'ALL', '2026-09_2026-10', '2026-09,2026-10'].map(v => React.createElement('button', { key: v, type: 'button', 'data-set-period': v, onClick: () => p.setFilterPeriod(v) }, v)))),
  };
});
vi.mock('../exportUtils', async (orig) => ({
  ...(await orig<typeof import('../exportUtils')>()),
  downloadFileBlob: (content: string, filename: string, isJson?: boolean) => {
    if (h.downloadThrows) throw new Error('blocked');
    h.downloads.push([content, filename, isJson]);
  },
}));

const groups: CashflowGroup[] = [
  { id: 'g-inc', name: 'รายรับ', type: 'income', allocation_type: null, order_index: 1 },
  { id: 'g-exp', name: 'รายจ่ายประจำวัน', type: 'expense', allocation_type: 'need', order_index: 2 },
  { id: 'g-sav', name: 'ลงทุน', type: 'savings', allocation_type: 'savings', order_index: 3 },
];
const categories: Category[] = [
  { id: 'c-food', name: 'ค่ากิน', type: 'expense', order_index: 1, cashflow_group_id: 'g-exp', allocation_type: 'need' },
  { id: 'c-fun', name: 'บันเทิง', type: 'expense', order_index: 2, cashflow_group_id: 'g-exp', allocation_type: 'want' },
  { id: 'c-salary', name: 'เงินเดือน', type: 'income', order_index: 3, cashflow_group_id: 'g-inc' },
  { id: 'c-save', name: 'ออมทอง', type: 'savings', order_index: 4, cashflow_group_id: 'g-sav', allocation_type: 'savings' },
];
const dayTypeConfig: DayType[] = [
  { id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#10B981' },
  { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#DA291C' },
];
const tx = (id: string, date: string, category: string, category_id: string, amount: number, description: string, extra: Partial<TransactionDisplay> = {}): TransactionDisplay =>
  ({ id, date, category, category_id, amount, description, ...extra });
const rows = {
  rice: tx('o1', '2026-10-07', 'ค่ากิน', 'c-food', 120, 'ข้าวมันไก่'),
  coffee: tx('o2', '2026-10-07', 'ค่ากิน', 'c-food', 65, 'กาแฟ'),
  movie: tx('o3', '2026-10-08', 'บันเทิง', 'c-fun', 300, 'ดูหนัง'),
  salary: tx('o4', '2026-10-05', 'เงินเดือน', 'c-salary', 30000, 'เงินเดือน ต.ค.'),
  sell: tx('o5', '2026-10-09', 'ออมทอง', 'c-save', -200, 'ขายทอง'),
  sept: tx('s1', '2026-09-30', 'ค่ากิน', 'c-food', 50, 'ข้าวเย็น'),
};
const october = [rows.rice, rows.coffee, rows.movie, rows.salary, rows.sell];

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: ExportModalProps;
const baseProps = (): ExportModalProps => ({
  isOpen: true, onClose: vi.fn(), transactions: [rows.rice], categories, cashflowGroups: groups, dayTypes: { '2026-10-10': 'dt-hol' }, dayTypeConfig,
  getFilterLabel: (p?: string) => `ป้าย:${p}`, initialPeriod: '2026-10',
});
const render = () => act(() => root!.render(<ExportModal {...props} />));
async function mount(p: Partial<ExportModalProps> = {}) {
  props = { ...baseProps(), ...p };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
  await flush();
}
/** Real wait inside act. */
const wait = (ms: number) => act(async () => { await new Promise(r => setTimeout(r, ms)); });
const update = async (p: Partial<ExportModalProps>) => { props = { ...props, ...p }; render(); await flush(); };

const dialog = () => q('[role="dialog"]');
const bodyRows = () => [...document.querySelectorAll('table tbody tr')];
const cellsOf = (tr: Element) => [...tr.querySelectorAll('td')].map(td => td.textContent!.trim());
const descriptions = () => bodyRows().map(tr => tr.querySelector('td[title]')?.textContent);
const headers = () => [...document.querySelectorAll('table thead th')].map(th => th.textContent!.trim());
const period = () => q('[data-stub="PeriodPicker"]')!.getAttribute('data-period');
const setPeriod = async (v: string) => { click(q(`[data-set-period="${v}"]`)); await flush(); };
const formatCard = (title: string) => [...document.querySelectorAll('h5')].find(e => e.textContent === title)!.closest('button')!;
const downloadBtn = () => [...document.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent!.startsWith('ดาวน์โหลด') || b.textContent!.includes('กำลังสร้างไฟล์'))!;
const cancelBtn = () => byText('button', 'ยกเลิก') as HTMLButtonElement;
const closeX = () => q<HTMLButtonElement>('button[title="ปิดหน้าต่าง"]')!;
const search = () => q<HTMLInputElement>('input[placeholder="ค้นหาในตัวอย่าง..."]');
const countLine = () => [...document.querySelectorAll('span')].map(s => s.textContent!).find(t => /^แสดง(ทั้งหมด|ตัวอย่าง)/.test(t));
const sidebarText = () => document.body.textContent!;

/** Presses download and lets the two timers (build the file, then close) run. */
async function exportNow() {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0, 0));
  click(downloadBtn());
  await act(async () => { await vi.advanceTimersByTimeAsync(200); });
}

beforeEach(() => { h.picker = null; h.all = [...october, rows.sept]; h.getAll = null; h.getAllCalls = []; h.downloads = []; h.downloadThrows = false; });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ExportModal — what is in the preview', () => {
  it('lists each row with its Thai date, day type, type, category, description and signed amount', async () => {
    await mount();
    const row = bodyRows().find(tr => cellsOf(tr).includes('ข้าวมันไก่'))!;
    const cells = cellsOf(row);
    expect(cells[0]).toMatch(/07/);              // date
    expect(cells[1]).toBe('วันทำงาน');          // Wednesday: unmarked day falls back to the workday type
    expect(cells[2]).toBe('EXPENSE');
    expect(cells[3]).toBe('ค่ากิน');
    expect(cells[5]).toBe('−120.00');
    expect(cellsOf(bodyRows().find(tr => cellsOf(tr).includes('เงินเดือน ต.ค.'))!)[5]).toBe('+30,000.00');
    expect(cellsOf(bodyRows().find(tr => cellsOf(tr).includes('ขายทอง'))!)[5]).toBe('−200.00'); // one sign, not '±-200.00'
  });

  it('a savings buy keeps the ± mark', async () => {
    h.all = [tx('b1', '2026-10-09', 'ออมทอง', 'c-save', 500, 'ซื้อทอง')];
    await mount();
    expect(cellsOf(bodyRows()[0])[5]).toBe('±500.00');
  });

});

describe('ExportModal — formats', () => {

  it('wide: a category nobody used in the period gets no column; one found only by id still does', async () => {
    h.all = [tx('w1', '2026-10-07', 'ชื่อเก่า', 'c-fun', 80, 'ย้ายชื่อ')];
    await mount({ categories: [...categories, { id: 'c-unused', name: 'ไม่ได้ใช้', type: 'expense', order_index: 9, cashflow_group_id: 'g-exp' } as Category] });
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(headers()).toEqual(['วันที่', 'ประเภทวัน', 'บันเทิง', 'รวมสุทธิ']);
  });

  it('wide: a day\'s savings sell is written in the category cell in the muted-free "value" style', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    const row = bodyRows().find(tr => cellsOf(tr)[0].includes('09'))!;
    const sellCell = row.querySelectorAll('td')[5];
    expect(sellCell.textContent).toBe('−200.00');
    expect(sellCell.className).toContain('text-neutral-200'); // not the grey used for an empty "—" cell
    expect(row.querySelectorAll('td')[2].className).toContain('text-neutral-600');
  });

  it('wide: one row per day, one column per category used, counted in days', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(headers()).toEqual(['วันที่', 'ประเภทวัน', 'ค่ากิน', 'บันเทิง', 'เงินเดือน', 'ออมทอง', 'รวมสุทธิ']);
    expect(bodyRows()).toHaveLength(4); // 5, 7, 8 and 9 Oct — the two rows of the 7th share one line
  });

  it('hands the period picker the period, the options the page has (or an empty set) and the floating style', async () => {
    const groupedOptions = { yearsMap: { 2026: ['2026-10'] }, sortedYears: [2026] } as unknown as ExportModalProps['groupedOptions'];
    await mount({ groupedOptions });
    expect(h.picker).toMatchObject({ filterPeriod: '2026-10', groupedOptions, floating: true });
    act(() => root!.unmount()); container!.remove();
    await mount({ groupedOptions: undefined });
    expect(h.picker).toMatchObject({ groupedOptions: { yearsMap: {}, sortedYears: [] } });
  });

});

describe('ExportModal — the summary and the download button', () => {

  it('the download button states the row count in the unit of the format', async () => {
    await mount();
    expect(downloadBtn().textContent).toContain('ดาวน์โหลด CSV (5 รายการ)');
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(downloadBtn().textContent).toContain('ดาวน์โหลด CSV (4 วัน)');
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(downloadBtn().textContent).toContain('ดาวน์โหลด JSON (6 รายการ)');
    expect(byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent).toContain('Full Backup JSON');
    expect(byText('span', 'รูปแบบ:')!.closest('div.flex-wrap')!.textContent).not.toContain('คั่น');
  });

  it('shows the estimated size (rows × 0.16 KB, wide 0.38, backup 0.45)', async () => {
    h.all = Array.from({ length: 100 }, (_, i) => tx(`m${i}`, `2026-10-${String(1 + (i % 20)).padStart(2, '0')}`, 'ค่ากิน', 'c-food', 1, `r${i}`));
    await mount();
    expect(sidebarText()).toContain('16.0 KB');
    click(formatCard('สเปรดชีตวิเคราะห์'));
    expect(sidebarText()).toContain('7.6 KB'); // 20 days × 0.38
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    expect(sidebarText()).toContain('45.0 KB');
  });
});

describe('ExportModal — downloading', () => {
  it('long ledger: a CSV named after the format, the period and today, with Thai headers and signed amounts', async () => {
    await mount();
    await exportNow();
    expect(h.downloads).toHaveLength(1);
    const [content, filename, isJson] = h.downloads[0];
    expect(filename).toBe('CashflowShark_Ledger_2026-10_2026-10-07.csv');
    expect(isJson).toBeFalsy();
    const lines = content.trim().split('\n');
    expect(lines[0]).toBe('วันที่,ชนิดวัน,ประเภท,หมวดหมู่,รายละเอียด,จำนวนเงิน');
    expect(lines).toHaveLength(6);
    expect(lines).toContain('2026-10-07,วันทำงาน,รายจ่าย,ค่ากิน,ข้าวมันไก่,120.00');
    expect(lines).toContain('2026-10-09,วันทำงาน,เงินออม,ออมทอง,ขายทอง,-200.00');
  });

  it('wide and full detail also follow the delimiter and the header language', async () => {
    await mount();
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    click(formatCard('สเปรดชีตวิเคราะห์'));
    await exportNow();
    expect(h.downloads[0][0].split('\n')[0]).toBe('Date;DayType;ค่ากิน;บันเทิง;เงินเดือน;ออมทอง;Total');

    vi.useRealTimers();
    await update({ isOpen: false });
    await update({ isOpen: true });
    h.downloads = [];
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    click(formatCard('รายงานละเอียด'));
    await exportNow();
    expect(h.downloads[0][0].split('\n')[0]).toBe('TransactionID;Date;DayType;GroupType;GroupName;Category;AllocationType;Description;Amount');
  });

  it('wide matrix', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    await exportNow();
    expect(h.downloads[0][1]).toBe('CashflowShark_WideMatrix_2026-10_2026-10-07.csv');
    const lines = h.downloads[0][0].trim().split('\n');
    expect(lines[0]).toBe('วันที่,ชนิดวัน,ค่ากิน,บันเทิง,เงินเดือน,ออมทอง,รวมสุทธิ');
    expect(lines).toContain('2026-10-07,วันทำงาน,185.00,0.00,0.00,0.00,185.00');
  });

  it('JSON backup: everything in the database (not only the period), with the groups, as JSON', async () => {
    await mount();
    await setPeriod('2026-09');
    click(formatCard('สำรองข้อมูลทั้งระบบ'));
    await exportNow();
    const [content, filename, isJson] = h.downloads[0];
    expect(filename).toBe('CashflowShark_Backup_2026-10-07.json');
    expect(isJson).toBe(true);
    const json = JSON.parse(content);
    expect(json.app).toBe('CashflowShark');
    expect(json.data.transactions).toHaveLength(6);
    expect(json.data.cashflowGroups).toEqual(groups);
    expect(json.data.categories).toHaveLength(4);
    expect(json.data.dayTypes).toEqual({ '2026-10-10': 'dt-hol' });
    expect(json.stats).toMatchObject({ transactionsCount: 6, categoriesCount: 4, cashflowGroupsCount: 3, calendarDaysCount: 1, dayTypeConfigCount: 2 });
  });

  it('a file that cannot be made is reported next to the button and the modal stays open', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.downloadThrows = true;
    await mount();
    await exportNow();
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(props.onClose).not.toHaveBeenCalled();
    expect(sidebarText()).toContain('สร้างไฟล์ไม่สำเร็จ');
    expect(downloadBtn().disabled).toBe(false);
  });
});

describe('ExportModal — a failed export', () => {
  it('the message goes away when the next attempt works (and that attempt then closes the modal)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.downloadThrows = true;
    await mount();
    await exportNow();
    expect(sidebarText()).toContain('สร้างไฟล์ไม่สำเร็จ');
    h.downloadThrows = false;
    click(downloadBtn());
    expect(sidebarText()).not.toContain('สร้างไฟล์ไม่สำเร็จ'); // cleared as soon as it tries again
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(h.downloads).toHaveLength(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('the message does not follow the user into the next time the modal is opened', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.downloadThrows = true;
    await mount();
    await exportNow();
    vi.useRealTimers();
    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(sidebarText()).not.toContain('สร้างไฟล์ไม่สำเร็จ');
  });
});

describe('ExportModal — the wide preview matches the file', () => {
  it('a savings sell shows as a negative amount, not as "—" (the preview shows −200.00, the CSV file keeps the plain -200.00)', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์'));
    const row = bodyRows().find(tr => cellsOf(tr)[0].includes('09'))!;
    const cells = cellsOf(row);
    expect(cells.slice(2)).toEqual(['—', '—', '—', '−200.00', '−200.00']); // the ออมทอง column itself, then the day total
  });
});
