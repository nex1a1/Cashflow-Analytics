// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
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
const TAB_LABELS = ['ภาพรวม', 'ปฏิทิน', 'ฐานข้อมูลบัญชี', 'พอร์ตลงทุน', 'ตั้งค่าระบบ'];
const tab = (label: string) => tabs().find(b => b.textContent!.includes(label))!;
const has = (el: Element, cls: string) => el.classList.contains(cls);
const statusBadge = () => byText('span', props.dbStatus)!.parentElement!;

describe('AppHeader — data actions', () => {
  const group = () => q('[role="group"][aria-label="ข้อมูล"]')!;
  const exportBtn = () => byText('[role="group"] button', 'ส่งออก') as HTMLButtonElement;
  const importBtn = () => [...group().querySelectorAll<HTMLButtonElement>('button')][1];
  const guideBtn = () => q<HTMLButtonElement>('button[aria-label="คู่มือรูปแบบไฟล์นำเข้า"]')!;

  it('export and guide call their handlers', () => {
    render();
    click(exportBtn());
    click(guideBtn());
    expect(props.onClickExport).toHaveBeenCalledTimes(1);
    expect(props.onClickImportGuide).toHaveBeenCalledTimes(1);
    expect(props.onFileUpload).not.toHaveBeenCalled();
  });

});

describe('AppHeader — tabs', () => {

  it('a click activates the tab', () => {
    render({ filterPeriod: '2026' });
    for (const l of TAB_LABELS) click(tab(l));
    expect((props.setActiveTab as AnyMock).mock.calls.map(c => c[0])).toEqual(['insights', 'calendar', 'ledger', 'portfolio', 'settings']);
  });

});

describe('AppHeader — period picker', () => {

  it('gets the period, its setter and the options, and offers the pay-cycle switch', () => {
    render({ filterPeriod: 'cycle:2026-09' });
    expect(h.picker).toMatchObject({ filterPeriod: 'cycle:2026-09', setFilterPeriod: props.setFilterPeriod, groupedOptions, allowCycle: true });
    expect(h.picker!.floating).toBeUndefined();
  });
});

