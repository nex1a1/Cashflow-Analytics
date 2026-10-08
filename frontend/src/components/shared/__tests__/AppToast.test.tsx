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
  it('renders nothing while hidden', () => {
    render({ visible: false });
    expect(host.innerHTML).toBe('');
  });

  it('shows the message', () => {
    render({ message: 'ลบรายการแล้ว' });
    expect(box().textContent).toContain('ลบรายการแล้ว');
  });

  it('success: a polite status in the income colour', () => {
    render({ type: 'success' });
    expect(box().getAttribute('role')).toBe('status');
    expect(box().classList.contains('bg-income')).toBe(true);
    expect(box().classList.contains('bg-danger-active')).toBe(false);
  });

  it('error: an assertive alert in the danger colour', () => {
    render({ type: 'error' });
    expect(box().getAttribute('role')).toBe('alert');
    expect(box().classList.contains('bg-danger-active')).toBe(true);
    expect(box().classList.contains('bg-income')).toBe(false);
  });

  it('info: a polite status in the neutral colour, with a muted icon', () => {
    render({ type: 'info' });
    expect(box().getAttribute('role')).toBe('status');
    expect(box().classList.contains('bg-surface-elevated')).toBe(true);
    expect(box().classList.contains('bg-income')).toBe(false);
    expect(icon()).toContain('text-ink-muted');
  });

  it('success and error icons are not muted', () => {
    render({ type: 'success' });
    expect(icon()).toContain('opacity-90');
    expect(icon()).not.toContain('text-ink-muted');
    render({ type: 'error' });
    expect(icon()).toContain('opacity-90');
  });

  it('each type has its own icon', () => {
    const seen = new Set<string>();
    for (const type of ['success', 'error', 'info']) {
      render({ type });
      seen.add(icon().split(' ').find(c => c.startsWith('lucide-') && c !== 'lucide')!);
    }
    expect(seen.size).toBe(3);
  });

  it('an unknown type falls back to the success look', () => {
    render({ type: 'whatever' });
    expect(box().getAttribute('role')).toBe('status');
    expect(box().classList.contains('bg-income')).toBe(true);
  });

  it('the ✕ dismisses it', () => {
    render();
    click(closeBtn());
    expect(h.hideToast).toHaveBeenCalledTimes(1);
    expect(closeBtn().title).toBe('ปิดการแจ้งเตือน');
  });

  it('has no action button unless the toast carries an action', () => {
    render();
    expect(box().querySelectorAll('button')).toHaveLength(1);
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
