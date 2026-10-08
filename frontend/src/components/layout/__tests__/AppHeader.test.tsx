// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, createRef } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AppHeader, { AppHeaderProps } from '../AppHeader';
import { click, q, byText } from '@/test-utils/dom';

// The picker has its own tests; here it is a stub that records the props the header hands it.
const h = vi.hoisted(() => ({ picker: null as null | Record<string, unknown> }));
vi.mock('../PeriodPicker', async () => {
  const React = await import('react');
  return { default: (p: Record<string, unknown>) => { h.picker = p; return React.createElement('div', { 'data-stub': 'PeriodPicker' }); } };
});

const groupedOptions = { yearsMap: {}, sortedYears: [] };
let root: Root;
let host: HTMLDivElement;
let props: AppHeaderProps;
let fileInput: HTMLInputElement | null;

const render = (over: Partial<AppHeaderProps> = {}) => {
  props = { ...props, ...over };
  act(() => root.render(<AppHeader {...props} />));
  fileInput = q<HTMLInputElement>('input[type="file"]');
};

beforeEach(() => {
  h.picker = null;
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  props = {
    dbStatus: 'Online (SQLite3)', transactionCount: 1234, activeTab: 'insights', setActiveTab: vi.fn(),
    filterPeriod: '2026-10', setFilterPeriod: vi.fn(), groupedOptions, isProcessing: false,
    onClickAddQuick: vi.fn(), onClickExport: vi.fn(), onFileUpload: vi.fn(), onClickImportGuide: vi.fn(),
    fileInputRef: createRef<HTMLInputElement>(),
  };
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
  vi.unstubAllEnvs();
});

const tabs = () => [...document.querySelectorAll<HTMLButtonElement>('button')].filter(b => TAB_LABELS.some(l => b.textContent!.includes(l)));
const TAB_LABELS = ['ภาพรวม', 'ปฏิทิน', 'ฐานข้อมูลบัญชี', 'พอร์ตลงทุน', 'ภาษี', 'ตั้งค่าระบบ'];
const tab = (label: string) => tabs().find(b => b.textContent!.includes(label))!;
const has = (el: Element, cls: string) => el.classList.contains(cls);
const statusBadge = () => byText('span', props.dbStatus)!.parentElement!;

describe('AppHeader — brand and readouts', () => {
  it('shows the app name and the logo', () => {
    render();
    expect(q('h1')!.textContent!.trim()).toBe('Cashflow Shark');
    expect(q('img')!.getAttribute('alt')).toBe('Shark Logo');
  });

  it('shows the record count as a grouped whole number', () => {
    render({ transactionCount: 12345 });
    expect(host.textContent).toContain('ทั้งหมด12,345รายการ');
  });

  it('a zero count reads 0, not blank', () => {
    render({ transactionCount: 0 });
    expect(host.textContent).toContain('ทั้งหมด0รายการ');
  });

  it('shows the database status text, green when online (any letter case)', () => {
    for (const s of ['Online (SQLite3)', 'ONLINE', 'online']) {
      render({ dbStatus: s });
      expect(statusBadge().textContent).toBe(s);
      expect(has(statusBadge(), 'text-emerald-400')).toBe(true);
      expect(has(statusBadge(), 'text-amber-400')).toBe(false);
    }
  });

  it.each(['Offline (Database Error)', 'กำลังตรวจสอบ...', 'กำลังโหลด...'])('"%s" is not online: amber', (s) => {
    render({ dbStatus: s });
    expect(has(statusBadge(), 'text-amber-400')).toBe(true);
    expect(has(statusBadge(), 'text-emerald-400')).toBe(false);
    // the dot beside it follows
    const dot = statusBadge().firstElementChild!;
    expect(has(dot, 'bg-amber-500')).toBe(true);
    expect(has(dot, 'bg-emerald-400')).toBe(false);
  });

  it('the status dot is green when online', () => {
    render();
    const dot = statusBadge().firstElementChild!;
    expect(has(dot, 'bg-emerald-400')).toBe(true);
    expect(has(dot, 'bg-amber-500')).toBe(false);
  });

  it('shows the DEMO MODE badge only in a demo build', () => {
    render();
    expect(host.textContent).not.toContain('DEMO MODE');
    vi.stubEnv('VITE_DEMO_MODE', 'false');
    render();
    expect(host.textContent).not.toContain('DEMO MODE');
    vi.stubEnv('VITE_DEMO_MODE', 'true');
    render();
    expect(host.textContent).toContain('DEMO MODE');
  });
});

describe('AppHeader — data actions', () => {
  const group = () => q('[role="group"][aria-label="ข้อมูล"]')!;
  const exportBtn = () => byText('[role="group"] button', 'ส่งออก') as HTMLButtonElement;
  const importBtn = () => [...group().querySelectorAll<HTMLButtonElement>('button')][1];
  const guideBtn = () => q<HTMLButtonElement>('button[aria-label="คู่มือรูปแบบไฟล์นำเข้า"]')!;

  it('has export, import and guide in one group, in that order', () => {
    render();
    expect([...group().querySelectorAll('button')].map(b => b.textContent!.trim() || b.getAttribute('aria-label'))).toEqual(['ส่งออก', 'นำเข้า', 'คู่มือรูปแบบไฟล์นำเข้า']);
  });

  it('export and guide call their handlers', () => {
    render();
    click(exportBtn());
    click(guideBtn());
    expect(props.onClickExport).toHaveBeenCalledTimes(1);
    expect(props.onClickImportGuide).toHaveBeenCalledTimes(1);
    expect(props.onFileUpload).not.toHaveBeenCalled();
  });

  it('import opens the hidden file picker through the shared ref', () => {
    render();
    expect(props.fileInputRef.current).toBe(fileInput);
    const spy = vi.spyOn(fileInput!, 'click');
    click(importBtn());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('the file input takes CSV only, is hidden, and reports the chosen file', () => {
    render();
    expect(fileInput!.accept).toBe('.csv');
    expect(has(fileInput!, 'hidden')).toBe(true);
    act(() => { fileInput!.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(props.onFileUpload).toHaveBeenCalledTimes(1);
  });

  it('while importing: the import button reads กำลังนำเข้า... and is disabled, together with the file input', () => {
    render({ isProcessing: true });
    expect(importBtn().textContent).toBe('กำลังนำเข้า...');
    expect(importBtn().disabled).toBe(true);
    expect(fileInput!.disabled).toBe(true);
    // export and the guide stay usable
    expect(exportBtn().disabled).toBe(false);
    expect(guideBtn().disabled).toBe(false);
  });

  it('the import icon turns into a lightning bolt while importing', () => {
    render();
    expect(importBtn().querySelector('svg.lucide-file-spreadsheet')).not.toBeNull();
    expect(importBtn().querySelector('svg.lucide-zap')).toBeNull();
    render({ isProcessing: true });
    expect(importBtn().querySelector('svg.lucide-zap')).not.toBeNull();
    expect(importBtn().querySelector('svg.lucide-file-spreadsheet')).toBeNull();
  });

  it('when idle: นำเข้า, enabled', () => {
    render();
    expect(importBtn().textContent).toBe('นำเข้า');
    expect(importBtn().disabled).toBe(false);
    expect(fileInput!.disabled).toBe(false);
  });

  it('the buttons explain themselves with tooltips', () => {
    render();
    expect(exportBtn().title).toBe('ส่งออก CSV / สำรองข้อมูล');
    expect(importBtn().title).toBe('นำเข้าจากไฟล์ CSV');
    expect(guideBtn().title).toBe('คู่มือรูปแบบไฟล์นำเข้า');
  });

  it('quick add calls its handler', () => {
    render();
    click(byText('button', 'เพิ่มข้อมูลด่วน'));
    expect(props.onClickAddQuick).toHaveBeenCalledTimes(1);
  });

  it('nothing fires on render', () => {
    render();
    for (const f of [props.onClickAddQuick, props.onClickExport, props.onFileUpload, props.onClickImportGuide, props.setActiveTab]) expect(f).not.toHaveBeenCalled();
  });
});

describe('AppHeader — tabs', () => {
  it('lists the six tabs in order', () => {
    render({ filterPeriod: '2026' });
    expect(tabs().map(b => b.textContent!.trim())).toEqual(TAB_LABELS);
  });

  it('a click activates the tab', () => {
    render({ filterPeriod: '2026' });
    for (const l of TAB_LABELS) click(tab(l));
    expect((props.setActiveTab as ReturnType<typeof vi.fn>).mock.calls.map(c => c[0])).toEqual(['insights', 'calendar', 'ledger', 'portfolio', 'tax', 'settings']);
  });

  it('only the active tab carries the active look (underline bar, white text)', () => {
    render({ activeTab: 'ledger' });
    for (const l of TAB_LABELS) {
      const on = l === 'ฐานข้อมูลบัญชี';
      expect(has(tab(l), 'text-white')).toBe(on);
      expect(!!tab(l).querySelector('.h-\\[2\\.5px\\]')).toBe(on);
    }
  });

  describe('tax tab (year view only)', () => {
    const taxTab = () => tab('ภาษี');

    it.each(['2026-10', '2026-03_2026-07', '2026-03,2026-07', 'ALL', '2026-Q1', 'cycle:2026-09', 'cycle:ALL', 'cycle:2026-01_2026-06'])('is locked while the period is "%s"', (p) => {
      render({ filterPeriod: p, activeTab: 'insights' });
      expect(taxTab().getAttribute('aria-disabled')).toBe('true');
      expect(taxTab().title).toBe('เลือกดูทั้งปีจากตัวเลือกช่วงเวลาก่อน (ปีภาษี 1 ม.ค. – 31 ธ.ค.)');
      expect(taxTab().textContent).toContain('(ดูทั้งปี)');
      expect(taxTab().querySelector('svg.lucide-lock')).not.toBeNull();
      click(taxTab());
      expect(props.setActiveTab).not.toHaveBeenCalled();
    });

    it.each(['2026', 'cycle:2026-01_2026-12'])('opens when the period is the whole year "%s"', (p) => {
      render({ filterPeriod: p, activeTab: 'insights' });
      expect(taxTab().hasAttribute('aria-disabled')).toBe(false);
      expect(taxTab().title).toBe('');
      expect(taxTab().textContent).not.toContain('(ดูทั้งปี)');
      expect(taxTab().querySelector('svg.lucide-lock')).toBeNull();
      click(taxTab());
      expect(props.setActiveTab).toHaveBeenCalledWith('tax');
    });

    it('a locked look: dimmed and not-allowed', () => {
      render({ filterPeriod: '2026-10' });
      expect(has(taxTab(), 'cursor-not-allowed')).toBe(true);
      expect(has(taxTab(), 'opacity-50')).toBe(true);
    });

    it('the tax tab you are already on is never shown locked (the view itself asks for a year)', () => {
      render({ filterPeriod: '2026-10', activeTab: 'tax' });
      expect(taxTab().hasAttribute('aria-disabled')).toBe(false);
      expect(taxTab().textContent).not.toContain('(ดูทั้งปี)');
      expect(taxTab().querySelector('svg.lucide-lock')).toBeNull();
      expect(has(taxTab(), 'text-white')).toBe(true);
    });

    it('the other tabs are never locked', () => {
      render({ filterPeriod: '2026-10' });
      for (const l of TAB_LABELS.filter(x => x !== 'ภาษี')) expect(tab(l).hasAttribute('aria-disabled')).toBe(false);
    });
  });
});

describe('AppHeader — period picker', () => {
  it.each(['insights', 'calendar', 'ledger', 'tax'])('is shown on %s', (t) => {
    render({ activeTab: t });
    expect(q('[data-stub="PeriodPicker"]')).not.toBeNull();
  });

  it.each(['portfolio', 'settings'])('is hidden on %s', (t) => {
    render({ activeTab: t });
    expect(q('[data-stub="PeriodPicker"]')).toBeNull();
  });

  it('gets the period, its setter and the options, and offers the pay-cycle switch', () => {
    render({ filterPeriod: 'cycle:2026-09' });
    expect(h.picker).toMatchObject({ filterPeriod: 'cycle:2026-09', setFilterPeriod: props.setFilterPeriod, groupedOptions, allowCycle: true });
    expect(h.picker!.floating).toBeUndefined();
  });
});

describe('AppHeader — tabs that can be switched off in Settings', () => {
  const labels = () => tabs().map(b => b.textContent!.trim().replace(/\(ดูทั้งปี\)/, '').trim());

  it('both extra tabs are shown unless told otherwise', () => {
    render();
    expect(tab('พอร์ตลงทุน')).toBeDefined();
    expect(tab('ภาษี')).toBeDefined();
    expect(tabs()).toHaveLength(6);
  });

  it('the tax tab disappears when tax mode is off - the others stay in the same order', () => {
    render({ taxEnabled: false });
    expect(tabs()).toHaveLength(5);
    expect(tabs().some(b => b.textContent!.includes('ภาษี'))).toBe(false);
    expect(labels().map(l => TAB_LABELS.find(x => l.includes(x)))).toEqual(['ภาพรวม', 'ปฏิทิน', 'ฐานข้อมูลบัญชี', 'พอร์ตลงทุน', 'ตั้งค่าระบบ']);
  });

  it('the portfolio tab disappears when the portfolio is off', () => {
    render({ portfolioEnabled: false });
    expect(tabs()).toHaveLength(5);
    expect(tabs().some(b => b.textContent!.includes('พอร์ตลงทุน'))).toBe(false);
    expect(tab('ภาษี')).toBeDefined();
  });

  it('both can be off at once, leaving the four everyday tabs', () => {
    render({ taxEnabled: false, portfolioEnabled: false });
    expect(labels().map(l => TAB_LABELS.find(x => l.includes(x)))).toEqual(['ภาพรวม', 'ปฏิทิน', 'ฐานข้อมูลบัญชี', 'ตั้งค่าระบบ']);
  });

  it('turning one back on brings its tab back', () => {
    render({ taxEnabled: false });
    render({ taxEnabled: true });
    expect(tabs()).toHaveLength(6);
  });
});
