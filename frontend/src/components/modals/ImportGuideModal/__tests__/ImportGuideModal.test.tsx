// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ImportGuideModal from '../index';
import type { ImportGuideModalProps } from '../types';
import { generateLongCsvContent, generateWideCsvContent, getLongHeaders, getWideHeaders } from '../guideUtils';
import { flush, click, key, type, q, byText } from '@/test-utils/dom';
import type { Category, DayType } from '@/types';

// The real tree is rendered (header, sidebar, preview tables, footer). Replaced: the two contexts it reads, the browser download
// and the clipboard, so every button can be pressed and what it hands over inspected.
const h = vi.hoisted(() => ({
  showToast: null as unknown as (...a: unknown[]) => void,
  appData: null as null | { categories?: unknown[]; dayTypeConfig?: unknown[] },
  downloads: [] as Array<[string, string]>,
}));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: h.showToast }) }));
vi.mock('@/context/AppDataContext', () => ({ useAppData: () => h.appData }));
vi.mock('../guideUtils', async (orig) => ({
  ...(await orig<typeof import('../guideUtils')>()),
  downloadSampleCsv: (filename: string, content: string) => { h.downloads.push([filename, content]); },
}));

const cat = (id: string, name: string, type: Category['type'] | undefined): Category => ({ id, name, type, order_index: 1 } as Category);
const systemCats: Category[] = [
  cat('1', 'ค่ากิน', 'expense'), cat('2', 'ค่าเดินทาง', 'expense'), cat('3', 'ค่าบ้าน', undefined),
  cat('4', 'เงินเดือน', 'income'), cat('5', 'ออมทอง', 'savings'),
];
const dayTypeConfig: DayType[] = [
  { id: 'dt-work', name: 'workday', label: 'ทำงาน', color: '#10B981' },
  { id: 'dt-hol', name: 'holiday', label: 'วันหยุด', color: '#DA291C' },
];

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: ImportGuideModalProps;
const render = () => act(() => root!.render(<ImportGuideModal {...props} />));
async function mount(p: Partial<ImportGuideModalProps> = {}) {
  props = { isOpen: true, onClose: vi.fn(), ...p };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
  await flush();
}
const update = async (p: Partial<ImportGuideModalProps>) => { props = { ...props, ...p }; render(); await flush(); };

const dialog = () => q('[role="dialog"]');
const bodyRows = () => [...document.querySelectorAll('table tbody tr')];
const headers = () => [...document.querySelectorAll('table thead th')].map(th => th.textContent!.trim());
const cellsOf = (tr: Element) => [...tr.querySelectorAll('td')].map(td => td.textContent!.trim());
const formatCard = (title: string) => [...document.querySelectorAll('h5')].find(e => e.textContent === title)!.closest('button')!;
const countLine = () => [...document.querySelectorAll('span')].map(s => s.textContent!).find(t => t.startsWith('แสดงตัวอย่าง'));
const search = () => q<HTMLInputElement>('input[placeholder="ค้นหาในตัวอย่าง..."]')!;
const footerValue = (label: string) => byText('span', label)!.nextElementSibling!.textContent;
const copyBtn = () => q('button[title="คัดลอกรายชื่อหัวคอลัมน์ลงคลิปบอร์ด"]')!;
const downloadBtn = () => byText('button', 'ดาวน์โหลดเทมเพลต CSV')!;
const specsBtn = () => [...document.querySelectorAll('button')].find(b => /ดูกติกาการอ่านไฟล์|ซ่อนกติกา/.test(b.textContent!))!;
const on = (label: string) => byText('button', label)!.classList.contains('bg-accent');
const written = (): string[] => (navigator.clipboard.writeText as unknown as { mock: { calls: string[][] } }).mock.calls.map(c => c[0]);

beforeEach(() => {
  h.showToast = vi.fn();
  h.appData = { categories: systemCats, dayTypeConfig };
  h.downloads = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
});
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('ImportGuideModal — opening', () => {
  it('renders nothing while closed', async () => {
    await mount({ isOpen: false });
    expect(dialog()).toBeNull();
  });

  it('is a labelled modal dialog', async () => {
    await mount();
    expect(dialog()!.getAttribute('aria-modal')).toBe('true');
    expect(dialog()!.getAttribute('aria-label')).toBe('คู่มือนำเข้าข้อมูล');
  });

  it('starts on the long format, 6 columns, comma, Thai headers', async () => {
    await mount();
    expect(formatCard('รายงานแยกรายการ').className).toContain('border-accent-ink');
    expect(formatCard('สเปรดชีตวิเคราะห์รายวัน').className).not.toContain('border-accent-ink');
    expect(on('6 คอลัมน์')).toBe(true);
    expect(on('Comma ( , )')).toBe(true);
    expect(on('ภาษาไทย')).toBe(true);
    expect(headers()).toEqual(['วันที่', 'ประเภทวัน', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน (฿)']);
  });
});

describe('ImportGuideModal — long format', () => {
  it('shows the sample rows with the type, sign and amount of each', async () => {
    await mount();
    expect(bodyRows()).toHaveLength(11);
    expect(countLine()).toBe('แสดงตัวอย่าง 11 จาก 11 รายการ (6 คอลัมน์)');
    const row = (d: string) => cellsOf(bodyRows().find(tr => cellsOf(tr).includes(d))!);
    expect(row('ข้าวเที่ยง')).toEqual(['01/09/2026', 'ทำงาน', 'EXPENSE', 'อาหาร', 'ข้าวเที่ยง', '−23.00']);
    expect(row('เงินเดือนประจำเดือน')[2]).toBe('INCOME');
    expect(row('เงินเดือนประจำเดือน')[5]).toBe('+35,000.00');
    expect(row('โอนออมหุ้น DCA')[2]).toBe('SAVINGS');
    expect(row('โอนออมหุ้น DCA')[5]).toBe('±5,000.00');
    expect(row('Shopee VIP')[1]).toBe('วันหยุด'); // the 5th is the sample's holiday
  });

  it.each([
    ['5 คอลัมน์', ['วันที่', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน (฿)'], '5 คอลัมน์'],
    ['4 คอลัมน์', ['วันที่', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน (฿)'], '4 คอลัมน์'],
  ])('"%s" drops the columns the layout does not have', async (label, expected, inFooter) => {
    await mount();
    click(byText('button', label));
    expect(headers()).toEqual(expected);
    expect(on(label)).toBe(true);
    expect(on('6 คอลัมน์')).toBe(false);
    expect(countLine()).toContain(`(${expected.length} คอลัมน์)`);
    expect(footerValue('โครงสร้าง:')).toBe(inFooter);
    expect(cellsOf(bodyRows()[0])).toHaveLength(expected.length);
  });

  it('explains each layout under the buttons', async () => {
    await mount();
    expect(document.body.textContent).toContain('แบบเต็ม: มีคอลัมน์ชนิดวัน');
    click(byText('button', '5 คอลัมน์'));
    expect(document.body.textContent).toContain('มาตรฐาน: มีประเภท');
    click(byText('button', '4 คอลัมน์'));
    expect(document.body.textContent).toContain('แบบย่อ: บันทึกเป็นรายจ่ายทั้งหมด');
  });

  it('English headers', async () => {
    await mount();
    click(byText('button', 'English (EN)'));
    expect(headers()).toEqual(['Date', 'DayType', 'Type', 'Category', 'Description', 'Amount (฿)']);
    expect(on('English (EN)')).toBe(true);
    expect(on('ภาษาไทย')).toBe(false);
    expect(footerValue('หัวตาราง:')).toBe('English (EN)');
    click(byText('button', 'ภาษาไทย'));
    expect(footerValue('หัวตาราง:')).toBe('ไทย (TH)');
  });

  it('the footer follows the delimiter', async () => {
    await mount();
    expect(footerValue('คั่น:')).toBe('Comma (,)');
    click(byText('button', 'Semicolon ( ; )'));
    expect(footerValue('คั่น:')).toBe('Semicolon (;)');
    expect(on('Semicolon ( ; )')).toBe(true);
    expect(on('Comma ( , )')).toBe(false);
    click(byText('button', 'Comma ( , )'));
    expect(footerValue('คั่น:')).toBe('Comma (,)');
  });
});

describe('ImportGuideModal — wide format', () => {
  it('uses the user\'s expense categories (and those without a type) as the columns, and says how many', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(formatCard('สเปรดชีตวิเคราะห์รายวัน').className).toContain('border-accent-ink');
    expect(byText('button', 'หมวดหมู่ในระบบ (3)')).not.toBeNull();
    expect(headers()).toEqual(['วันที่ (Date)', 'ประเภทวัน', 'ค่ากิน', 'ค่าเดินทาง', 'ค่าบ้าน', 'รวมสุทธิ (Total)', 'Notes']);
    expect(countLine()).toBe('แสดงตัวอย่าง 5 วัน (3 หมวดหมู่)');
    expect(footerValue('รูปแบบ:')).toBe('Wide Matrix CSV');
    expect(footerValue('โครงสร้าง:')).toBe('ตารางแนวนอน');
  });

  it('shows the amounts in the right cells, a dash for empty ones, the total and the note', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    const first = cellsOf(bodyRows()[0]);
    expect(first).toEqual(['01/09/2026', 'ทำงาน', '43.00', '—', '55.00', '98.00', 'ข้าวเที่ยง + ข้าวเย็น']);
    expect(cellsOf(bodyRows()[4]).slice(0, 2)).toEqual(['05/09/2026', 'วันหยุด']);
  });

  it('the standard categories can be chosen instead, and are used when the system has none', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    click(byText('button', 'หมวดหมู่มาตรฐาน (5)'));
    expect(headers().slice(2, 7)).toEqual(['อาหาร', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซอฟต์แวร์ & AI', 'ของใช้ในบ้าน']);
    expect(on('หมวดหมู่มาตรฐาน (5)')).toBe(true);
    click(byText('button', 'หมวดหมู่ในระบบ (3)'));
    expect(headers().slice(2, 5)).toEqual(['ค่ากิน', 'ค่าเดินทาง', 'ค่าบ้าน']);

    act(() => root!.unmount()); container!.remove();
    h.appData = { categories: [], dayTypeConfig: [] };
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(headers().slice(2, 7)).toEqual(['อาหาร', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซอฟต์แวร์ & AI', 'ของใช้ในบ้าน']);
  });

  it('when the system has only income and savings categories, all of them are offered', async () => {
    h.appData = { categories: [cat('1', 'เงินเดือน', 'income'), cat('2', 'ออมทอง', 'savings')], dayTypeConfig };
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(byText('button', 'หมวดหมู่ในระบบ (2)')).not.toBeNull();
    expect(headers().slice(2, 4)).toEqual(['เงินเดือน', 'ออมทอง']);
  });

  it('English headers, and the options that belong to the long format are gone', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    click(byText('button', 'English (EN)'));
    expect(headers()[0]).toBe('Date');
    expect(headers()[1]).toBe('DayType');
    expect(headers().slice(-2)).toEqual(['Total', 'Notes']);
    expect(byText('button', '5 คอลัมน์')).toBeNull();
    expect(byText('span', 'หมวดหมู่หัวตาราง')).not.toBeNull();
  });

  it('categories passed as props win over the app\'s', async () => {
    await mount({ categories: [cat('9', 'หมวดจาก props', 'expense')] });
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(headers().slice(2, 3)).toEqual(['หมวดจาก props']);
  });

  it('works with no app data at all', async () => {
    h.appData = null;
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(headers().slice(2, 7)).toHaveLength(5);
  });
});

describe('ImportGuideModal — preview search', () => {
  it('filters the long sample by date, category, description or day type, ignoring case', async () => {
    await mount();
    type(search(), '03/09');
    expect(bodyRows()).toHaveLength(2);
    expect(countLine()).toContain('แสดงตัวอย่าง 2 จาก 11 รายการ');
    type(search(), 'gemini');
    expect(bodyRows().map(tr => cellsOf(tr)[4])).toEqual(['Gemini Pro']);
    type(search(), 'ซอฟต์แวร์');
    expect(bodyRows()).toHaveLength(1);
    type(search(), 'วันหยุด');
    expect(bodyRows().map(tr => cellsOf(tr)[4])).toEqual(['Shopee VIP']);
  });

  it('blank search shows everything again, and the ✕ clears it', async () => {
    await mount();
    expect(q('button.absolute')).toBeNull();
    type(search(), 'gemini');
    expect(bodyRows()).toHaveLength(1);
    click(q('button.absolute'));
    expect(search().value).toBe('');
    expect(bodyRows()).toHaveLength(11);
    type(search(), '   ');
    expect(bodyRows()).toHaveLength(11);
  });

  it('filters the wide sample by date or note', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    type(search(), '02/09');
    expect(bodyRows()).toHaveLength(1);
    expect(countLine()).toBe('แสดงตัวอย่าง 1 วัน (3 หมวดหมู่)');
    type(search(), 'shopee');
    expect(bodyRows().map(tr => cellsOf(tr)[0])).toEqual(['05/09/2026']);
  });

  it('keeps the search when the format changes', async () => {
    await mount();
    type(search(), 'ข้าว');
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(search().value).toBe('ข้าว');
  });
});

describe('ImportGuideModal — reading rules', () => {
  it('opens and closes a list of four rules, worded for the format', async () => {
    await mount();
    expect(document.body.textContent).not.toContain('อัปเดตปฏิทินตามชนิดวัน');
    expect(specsBtn().textContent).toContain('ดูกติกาการอ่านไฟล์ (4 ข้อ)');
    click(specsBtn());
    expect(specsBtn().textContent).toContain('ซ่อนกติกา');
    expect(document.body.textContent).toContain('อัปเดตปฏิทินตามชนิดวัน');
    expect(document.body.textContent).toContain('รองรับรายรับ รายจ่าย และเงินออม');
    expect(document.body.textContent).toContain('เก็บยอดเป็นสตางค์');
    expect(document.body.textContent).toContain('สร้างหมวดหมู่ใหม่ให้');

    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(document.body.textContent).toContain('จับคู่หัวคอลัมน์แนวนอนอัตโนมัติ');
    expect(document.body.textContent).toContain('ข้ามคอลัมน์ผลรวม');
    expect(document.body.textContent).toContain('ช่องว่างนับเป็น 0');

    click(specsBtn());
    expect(document.body.textContent).not.toContain('ข้ามคอลัมน์ผลรวม');
  });
});

describe('ImportGuideModal — copying the headers', () => {
  it('copies the long headers joined by the chosen delimiter, confirms with a toast and a label for two seconds', async () => {
    await mount();
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', '5 คอลัมน์'));
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    click(copyBtn());
    await act(async () => { await Promise.resolve(); });
    expect(written()).toEqual([getLongHeaders('standard', 'th').join(';')]);
    expect(h.showToast).toHaveBeenCalledWith('คัดลอกรายชื่อหัวตารางลงคลิปบอร์ดแล้ว', 'success');
    expect(copyBtn().textContent).toContain('คัดลอกแล้ว');
    await act(async () => { vi.advanceTimersByTime(1900); });
    expect(copyBtn().textContent).toContain('คัดลอกแล้ว');
    await act(async () => { vi.advanceTimersByTime(200); });
    expect(copyBtn().textContent).toContain('คัดลอกหัวตาราง');
  });

  it('copies the wide headers with each one quoted', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    click(byText('button', 'English (EN)'));
    click(copyBtn());
    await act(async () => { await Promise.resolve(); });
    expect(written()).toEqual([getWideHeaders(['ค่ากิน', 'ค่าเดินทาง', 'ค่าบ้าน'], 'en').map(x => `"${x}"`).join(',')]);
  });

  it('says so, and does not claim success, when the browser refuses the clipboard', async () => {
    (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('denied'));
    await mount();
    click(copyBtn());
    await flush();
    expect(h.showToast).toHaveBeenCalledWith(expect.stringContaining('คัดลอกไม่สำเร็จ'), 'error');
    expect(h.showToast).not.toHaveBeenCalledWith(expect.anything(), 'success');
    expect(copyBtn().textContent).toContain('คัดลอกหัวตาราง');
  });

  it('does not throw when there is no clipboard at all', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    await mount();
    click(copyBtn());
    await flush();
    expect(h.showToast).toHaveBeenCalledWith(expect.stringContaining('คัดลอกไม่สำเร็จ'), 'error');
  });
});

describe('ImportGuideModal — downloading a template', () => {
  it('long: a file named after the layout and language, holding exactly what the template generator makes', async () => {
    await mount();
    click(byText('button', '4 คอลัมน์'));
    click(byText('button', 'Semicolon ( ; )'));
    click(byText('button', 'English (EN)'));
    click(downloadBtn());
    expect(h.downloads).toEqual([['template_long_minimal_en.csv', generateLongCsvContent('minimal', ';', 'en')]]);
    expect(h.showToast).toHaveBeenCalledWith('ดาวน์โหลดเทมเพลต Long Format (minimal) สำเร็จ', 'success');
  });

  it('long defaults', async () => {
    await mount();
    click(downloadBtn());
    expect(h.downloads[0][0]).toBe('template_long_full_th.csv');
    expect(h.downloads[0][1]).toBe(generateLongCsvContent('full', ',', 'th'));
  });

  it('wide with the user\'s categories', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    click(downloadBtn());
    expect(h.downloads).toEqual([['template_wide_my_categories_th.csv', generateWideCsvContent(['ค่ากิน', 'ค่าเดินทาง', 'ค่าบ้าน'], ',', 'th')]]);
    expect(h.showToast).toHaveBeenCalledWith('ดาวน์โหลดเทมเพลต Wide Format สำเร็จ', 'success');
  });

  it('wide with the standard categories', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    click(byText('button', 'หมวดหมู่มาตรฐาน (5)'));
    click(byText('button', 'English (EN)'));
    click(byText('button', 'Semicolon ( ; )'));
    click(downloadBtn());
    expect(h.downloads[0][0]).toBe('template_wide_standard_en.csv');
    expect(h.downloads[0][1]).toBe(generateWideCsvContent(['อาหาร', 'ช้อปปิ้งออนไลน์', 'การเดินทาง', 'ซอฟต์แวร์ & AI', 'ของใช้ในบ้าน'], ';', 'en'));
  });
});

describe('ImportGuideModal — details that are easy to lose', () => {
  it('marks the recommended format with a badge and no other', async () => {
    await mount();
    const badgeOf = (title: string) => formatCard(title).querySelector('span.uppercase')?.textContent ?? null;
    expect(badgeOf('รายงานแยกรายการ')).toBe('แนะนำ');
    expect(badgeOf('สเปรดชีตวิเคราะห์รายวัน')).toBeNull();
  });

  it('the category-source buttons show which one is on, and explain it', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect([on('หมวดหมู่ในระบบ (3)'), on('หมวดหมู่มาตรฐาน (5)')]).toEqual([true, false]);
    expect(document.body.textContent).toContain('ดึงชื่อหมวดหมู่จริงของคุณในระบบ');
    click(byText('button', 'หมวดหมู่มาตรฐาน (5)'));
    expect([on('หมวดหมู่ในระบบ (3)'), on('หมวดหมู่มาตรฐาน (5)')]).toEqual([false, true]);
    expect(document.body.textContent).toContain('ใช้หมวดหมู่ตัวอย่างทั่วไป');
    expect(document.body.textContent).not.toContain('ดึงชื่อหมวดหมู่จริงของคุณในระบบ');
  });

  it('with no categories in the system the standard five are used and counted', async () => {
    h.appData = { categories: [], dayTypeConfig };
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(byText('button', 'หมวดหมู่ในระบบ (0)')).not.toBeNull();
    expect(countLine()).toBe('แสดงตัวอย่าง 5 วัน (5 หมวดหมู่)');
  });

  it('copies the long headers in English too', async () => {
    await mount();
    click(byText('button', 'English (EN)'));
    click(byText('button', '4 คอลัมน์'));
    click(copyBtn());
    await act(async () => { await Promise.resolve(); });
    expect(written()).toEqual(['Date,Category,Description,Amount']);
  });

  it('copies the wide headers with the chosen delimiter', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    click(byText('button', 'Semicolon ( ; )'));
    click(copyBtn());
    await act(async () => { await Promise.resolve(); });
    expect(written()[0]).toBe('"Date";"ค่ากิน";"ค่าเดินทาง";"ค่าบ้าน";"รวม (Total)";"Notes"');
  });

  it('search ignores case (the sample says "Gemini Pro")', async () => {
    await mount();
    type(search(), 'GEMINI');
    expect(bodyRows().map(tr => cellsOf(tr)[4])).toEqual(['Gemini Pro']);
  });

  it('a search of spaces shows everything in the wide sample too', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    type(search(), '   ');
    expect(bodyRows()).toHaveLength(5);
  });

  it('the day type shown in the wide sample is the one the user named, in the user\'s own words', async () => {
    h.appData = { categories: systemCats, dayTypeConfig: [
      { id: 'h', name: 'holiday', label: 'Holiday', color: '#112233' },
      { id: 'w', name: 'workday', label: 'Workday', color: '#445566' },
    ] as DayType[] };
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(bodyRows().map(tr => cellsOf(tr)[1])).toEqual(['Workday', 'Workday', 'Workday', 'Workday', 'Holiday']);
    act(() => root!.unmount()); container!.remove();
    await mount({ dayTypeConfig: [{ id: 'h', name: 'holiday', label: 'วันหยุด', color: '#abcdef' }, { id: 'w', name: 'workday', label: 'ทำงาน', color: '#fedcba' }] as DayType[] });
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    expect(bodyRows().map(tr => cellsOf(tr)[1])).toEqual(['ทำงาน', 'ทำงาน', 'ทำงาน', 'ทำงาน', 'วันหยุด']);
  });
});

describe('ImportGuideModal — closing', () => {
  it('Esc, the ✕ and cancel close it', async () => {
    await mount();
    key(document.body, 'Escape');
    click(q('button[title="ปิดหน้าต่าง (Esc)"]'));
    click(byText('button', 'ยกเลิก'));
    expect(props.onClose).toHaveBeenCalledTimes(3);
  });

  it('other keys do not, and Esc does nothing once it is closed', async () => {
    await mount();
    key(document.body, 'Enter');
    expect(props.onClose).not.toHaveBeenCalled();
    await update({ isOpen: false });
    key(document.body, 'Escape');
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('the choices are remembered while it is closed and opened again', async () => {
    await mount();
    click(formatCard('สเปรดชีตวิเคราะห์รายวัน'));
    await update({ isOpen: false });
    await update({ isOpen: true });
    expect(formatCard('สเปรดชีตวิเคราะห์รายวัน').className).toContain('border-accent-ink');
  });
});
