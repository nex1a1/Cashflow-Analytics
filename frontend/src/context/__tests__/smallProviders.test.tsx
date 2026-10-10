// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderHook } from '@/test-utils/renderHook';
import { AppUIProvider, useAppUI } from '../AppUIContext';
import { ToastProvider, useToast } from '../ToastContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { STORAGE_KEYS } from '../../constants';

const ui = ({ children }: { children: React.ReactNode }) => <AppUIProvider>{children}</AppUIProvider>;
const toastWrap = ({ children }: { children: React.ReactNode }) => <ToastProvider>{children}</ToastProvider>;

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('AppUIContext', () => {
  beforeEach(() => localStorage.clear());

  it('outside the provider throws', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppUI())).toThrow('useAppUI must be used within an AppUIProvider');
    err.mockRestore();
  });

  it.each([
    [null, null, 'insights'],
    ['dashboard', null, 'insights'],
    ['items', null, 'insights'],
    ['insights', 'calendar', 'calendar'],
    ['insights', 'insights', 'insights'],
    ['ledger', 'calendar', 'ledger'],
    ['portfolio', null, 'portfolio'],
  ])('stored tab %s (legacy mode %s) opens %s, and the legacy key is removed', (stored, mode, expected) => {
    if (stored) localStorage.setItem(STORAGE_KEYS.ACTIVE_TAB, stored);
    if (mode) localStorage.setItem(STORAGE_KEYS.INSIGHTS_MODE, mode);
    const { result } = renderHook(() => useAppUI(), ui);
    expect(result.current.activeTab).toBe(expected);
    expect(localStorage.getItem(STORAGE_KEYS.INSIGHTS_MODE)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB)).toBe(expected);
  });

  it('changing tab is remembered', () => {
    const { result } = renderHook(() => useAppUI(), ui);
    act(() => result.current.setActiveTab('ledger'));
    expect(localStorage.getItem(STORAGE_KEYS.ACTIVE_TAB)).toBe('ledger');
  });

  it('opening the add modal resets the form for a date and type, keeping other fields', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 9, 12));
    const { result } = renderHook(() => useAppUI(), ui);
    act(() => result.current.setAddForm({ ...result.current.addForm, description: 'ค้าง', amount: '99', assetId: 'a1', side: 'sell', extra: 'x' } as never));
    act(() => result.current.handleOpenAddModal('2026-10-01', 'income'));
    expect(result.current.showAddModal).toBe(true);
    expect(result.current.addForm).toMatchObject({ date: '2026-10-01', type: 'income', category: '', description: '', amount: '', assetId: undefined, side: undefined, extra: 'x' });
    act(() => result.current.handleOpenAddModal());
    expect(result.current.addForm).toMatchObject({ date: '2026-10-09', type: 'expense' });
  });

  it('opening a trade fills asset and side on a fresh savings form', () => {
    const { result } = renderHook(() => useAppUI(), ui);
    act(() => result.current.handleOpenTradeModal('gold', 'sell'));
    expect(result.current.showAddModal).toBe(true);
    expect(result.current.addForm).toMatchObject({ type: 'savings', assetId: 'gold', side: 'sell', amount: '' });
  });

  it('view preferences start neutral', () => {
    const { result } = renderHook(() => useAppUI(), ui);
    expect(result.current).toMatchObject({
      hideFixedExpenses: false, hideWantExpenses: false, dashboardCategory: ['ALL'],
      chartGroupBy: 'monthly', topXLimit: 7, showExportModal: false, showImportGuide: false,
    });
  });
});

describe('ToastContext', () => {
  it('outside the provider throws', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useToast())).toThrow('useToast must be used within a ToastProvider');
    err.mockRestore();
  });

  it('a toast hides after 3s; one with an action stays 8s', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result } = renderHook(() => useToast(), toastWrap);
    act(() => result.current.showToast('บันทึกแล้ว'));
    expect(result.current.toast).toMatchObject({ visible: true, message: 'บันทึกแล้ว', type: 'success' });
    act(() => { vi.advanceTimersByTime(2999); });
    expect(result.current.toast.visible).toBe(true);
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.toast.visible).toBe(false);

    const action = { label: 'เลิกทำ', onClick: vi.fn() };
    act(() => result.current.showToast('ลบแล้ว', 'info', action));
    act(() => { vi.advanceTimersByTime(7999); });
    expect(result.current.toast).toMatchObject({ visible: true, action });
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current.toast.visible).toBe(false);
    expect(result.current.toast.action).toBeUndefined();
  });

  it('a new toast restarts the timer (the old one must not hide it early)', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result } = renderHook(() => useToast(), toastWrap);
    act(() => result.current.showToast('หนึ่ง'));
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => result.current.showToast('สอง', 'error'));
    act(() => { vi.advanceTimersByTime(2000); });
    expect(result.current.toast).toMatchObject({ visible: true, message: 'สอง', type: 'error' });
  });

  it('hideToast closes now and cancels the timer', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const { result } = renderHook(() => useToast(), toastWrap);
    act(() => result.current.showToast('x', 'info', { label: 'y', onClick: () => {} }));
    act(() => result.current.hideToast());
    expect(result.current.toast).toMatchObject({ visible: false, action: undefined, message: 'x' });
    act(() => result.current.showToast('z'));
    act(() => { vi.advanceTimersByTime(8000); });
    expect(result.current.toast.message).toBe('z');
  });

  it('hideToast with nothing showing is harmless', () => {
    const { result } = renderHook(() => useToast(), toastWrap);
    act(() => result.current.hideToast());
    expect(result.current.toast.visible).toBe(false);
  });
});

describe('useFocusTrap', () => {
  // jsdom has no layout: offsetParent is null everywhere, so make visible elements report a parent
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (this: HTMLElement) {
      return this.hidden ? null : document.body;
    });
  });
  const roots: Array<ReturnType<typeof createRoot>> = [];
  afterEach(() => {
    roots.splice(0).forEach(r => { try { act(() => r.unmount()); } catch { /* already unmounted */ } });
    vi.restoreAllMocks();
  });

  function Panel({ buttons = 3, hidden = false, auto = false }: { buttons?: number; hidden?: boolean; auto?: boolean }) {
    const ref = useFocusTrap<HTMLDivElement>();
    return (
      <div ref={ref} tabIndex={-1} data-testid="panel">
        {Array.from({ length: buttons }, (_, i) => <button key={i} hidden={hidden && i === buttons - 1} autoFocus={auto && i === 1}>b{i}</button>)}
      </div>
    );
  }
  const mount = (el: React.ReactElement) => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    roots.push(root);
    act(() => root.render(el));
    return { opener, root, btn: (i: number) => container.querySelectorAll('button')[i] as HTMLElement, panel: container.querySelector('[data-testid="panel"]') as HTMLElement };
  };
  const tab = (shift = false) => {
    const e = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(e); });
    return e;
  };

  it('moves focus to the first control on open and back to the opener on close', () => {
    const { opener, root, btn } = mount(<Panel />);
    expect(document.activeElement).toBe(btn(0));
    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);
  });

  it('an empty panel takes focus itself; Tab stays put', () => {
    const { panel } = mount(<Panel buttons={0} />);
    expect(document.activeElement).toBe(panel);
    expect(tab().defaultPrevented).toBe(true);
  });

  it('Tab on the last wraps to the first; Shift+Tab on the first wraps to the last (hidden controls skipped)', () => {
    const { btn } = mount(<Panel buttons={4} hidden />);
    btn(2).focus();
    expect(tab().defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btn(0));
    expect(tab(true).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btn(2));
  });

  it('Tab in the middle is left to the browser; other keys are ignored', () => {
    const { btn } = mount(<Panel />);
    btn(1).focus();
    expect(tab().defaultPrevented).toBe(false);
    expect(tab(true).defaultPrevented).toBe(false);
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(e); });
    expect(e.defaultPrevented).toBe(false);
  });

  it('Shift+Tab on the last control and Enter on the last are left to the browser', () => {
    const { btn } = mount(<Panel />);
    btn(2).focus();
    expect(tab(true).defaultPrevented).toBe(false);
    const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(e); });
    expect(e.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(btn(2));
  });

  it('Shift+Tab with the panel itself focused goes to the last control', () => {
    const { btn, panel } = mount(<Panel />);
    panel.focus();
    tab(true);
    expect(document.activeElement).toBe(btn(2));
  });

  it('a child that autofocused keeps the focus', () => {
    const { btn } = mount(<Panel auto />);
    expect(document.activeElement).toBe(btn(1));
  });

  it('an opener removed meanwhile is not focused; the key listener is gone after close', () => {
    const { opener, root, btn } = mount(<Panel />);
    opener.remove();
    act(() => root.unmount());
    expect(document.activeElement).not.toBe(opener);
    btn(0); // detached
    expect(tab().defaultPrevented).toBe(false);
  });
});
