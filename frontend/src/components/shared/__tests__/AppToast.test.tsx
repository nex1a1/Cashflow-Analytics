// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AppToast from '../AppToast';
import type { ToastInfo } from '@/context/ToastContext';
import { click, q } from '@/test-utils/dom';

const h = vi.hoisted(() => ({ hideToast: undefined as unknown as () => void }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ hideToast: h.hideToast }) }));

let root: Root;
let host: HTMLDivElement;
let calls: string[];

const render = (over: Partial<ToastInfo> = {}) =>
  act(() => root.render(<AppToast toast={{ visible: true, message: 'บันทึกแล้ว', type: 'success', ...over }} />));

beforeEach(() => {
  calls = [];
  h.hideToast = vi.fn(() => { calls.push('hide'); });
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

const box = () => q('[role="alert"], [role="status"]')!;
const icon = () => box().querySelector('svg')!.getAttribute('class')!;
const closeBtn = () => q<HTMLButtonElement>('button[aria-label="ปิดการแจ้งเตือน"]')!;

describe('AppToast', () => {

  it('success: a polite status in the income colour', () => {
    render({ type: 'success' });
    expect(box().getAttribute('role')).toBe('status');
    expect(box().classList.contains('bg-income')).toBe(true);
    expect(box().classList.contains('bg-danger-active')).toBe(false);
  });

  it('an action button (เลิกทำ) runs the action first, then dismisses', () => {
    const onClick = vi.fn(() => { calls.push('undo'); });
    render({ action: { label: 'เลิกทำ', onClick } });
    const buttons = [...box().querySelectorAll('button')];
    expect(buttons).toHaveLength(2);
    const action = buttons.find(b => b.textContent === 'เลิกทำ')!;
    click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(calls).toEqual(['undo', 'hide']);
  });

  it('the ✕ does not run the action', () => {
    const onClick = vi.fn();
    render({ action: { label: 'เลิกทำ', onClick } });
    click(closeBtn());
    expect(onClick).not.toHaveBeenCalled();
    expect(h.hideToast).toHaveBeenCalledTimes(1);
  });

  it('both buttons are plain buttons (they must not submit a surrounding form)', () => {
    render({ action: { label: 'เลิกทำ', onClick: () => {} } });
    for (const b of box().querySelectorAll('button')) expect((b as HTMLButtonElement).type).toBe('button');
  });
});
