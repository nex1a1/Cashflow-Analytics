// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AmountEditableInput from '../AmountEditableInput';
import { click, flush, key, q, type } from '@/test-utils/dom';
import { tc } from '@/constants/theme';

let root: Root | null = null;
let container: HTMLElement | null = null;
type Props = React.ComponentProps<typeof AmountEditableInput>;
let props: Props;
const render = () => act(() => root!.render(<AmountEditableInput {...props} />));
const mount = (p: Partial<Props> = {}) => {
  props = { initialValue: 250, onSave: vi.fn(), ...p };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
const input = () => q<HTMLInputElement>('input')!;
const box = () => container!.querySelector<HTMLElement>('.amount-editable-box')!;
const shown = () => container!.textContent!;
const open = async () => { click(box()); await flush(); };
/** Types a value and leaves the field the way a user does. */
const enter = async (value: string) => { await open(); type(input(), value); act(() => input().blur()); await flush(); };
const alert = () => container!.querySelector('[role="alert"], [id]')?.textContent ?? '';

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('AmountEditableInput — what it shows', () => {
  it('an expense: −฿ and the formatted amount', () => {
    mount({ initialValue: 1234.5 });
    expect(shown()).toBe('-฿1,234.50');
  });

  it('an income: +฿', () => {
    mount({ initialValue: 30000, isInc: true });
    expect(shown()).toBe('+฿30,000.00');
  });

  it('a savings row (tone) has no sign — buy / sell is shown by its badge', () => {
    mount({ initialValue: 500, tone: 'savings' });
    expect(shown()).toBe('฿500.00');
    act(() => root!.unmount()); container!.remove();
    mount({ initialValue: 500, tone: 'info' });
    expect(shown()).toBe('฿500.00');
  });

  it('colours: expense, income, and the two savings tones', () => {
    const colour = () => box().style.color;
    const norm = (c: string) => { const d = document.createElement('div'); d.style.color = c; return d.style.color; };
    mount({ initialValue: 1 });
    expect(colour()).toBe(norm(tc('expense')));
    act(() => root!.unmount()); container!.remove();
    mount({ initialValue: 1, isInc: true });
    expect(colour()).toBe(norm(tc('income')));
    act(() => root!.unmount()); container!.remove();
    mount({ initialValue: 1, tone: 'info' });
    expect(colour()).toBe(norm(tc('info')));
    act(() => root!.unmount()); container!.remove();
    mount({ initialValue: 1, tone: 'savings' });
    expect(colour()).toBe(norm(tc('savings')));
  });

  it('an empty / zero amount shows the placeholder', () => {
    for (const initialValue of ['', 0, '0']) {
      mount({ initialValue });
      expect(shown()).toBe('-฿0.00');
      act(() => root!.unmount()); container!.remove();
    }
    mount({ initialValue: '', placeholder: 'ใส่จำนวน' });
    expect(shown()).toBe('-฿ใส่จำนวน');
  });

  it('follows the value it is given while it is not being edited', () => {
    mount({ initialValue: 100 });
    props = { ...props, initialValue: 999 };
    render();
    expect(shown()).toBe('-฿999.00');
  });

  it('but never overwrites what is being typed', async () => {
    mount({ initialValue: 100 });
    await open();
    type(input(), '55');
    props = { ...props, initialValue: 999 };
    render();
    expect(input().value).toBe('55');
  });
});

describe('AmountEditableInput — editing', () => {
  it('clicking the cell opens a labelled, focused input with the current value', async () => {
    mount({ initialValue: 250 });
    await open();
    expect(input().getAttribute('aria-label')).toBe('จำนวนเงิน');
    expect(input().value).toBe('250');
    expect(document.activeElement).toBe(input());
  });

  it('leaving the field saves the new number', async () => {
    mount();
    await enter('300.5');
    expect(props.onSave).toHaveBeenCalledWith(300.5);
    expect(q('input')).toBeNull(); // back to the read-only view
  });

  it('Enter saves too', async () => {
    mount();
    await open();
    type(input(), '400');
    key(input(), 'Enter');
    await flush();
    expect(props.onSave).toHaveBeenCalledWith(400);
  });

  it('accepts commas, a ฿ sign and a leading + or −, and saves the size (the sign is not the direction here)', async () => {
    for (const [typed, saved] of [['1,234.50', 1234.5], ['฿1,200', 1200], ['+500', 500], ['-300', 300], ['  75 ', 75]] as const) {
      mount();
      await enter(typed);
      expect(props.onSave, typed).toHaveBeenCalledWith(saved);
      act(() => root!.unmount()); container!.remove();
    }
  });

  it('does not save when the number did not change (and closes)', async () => {
    mount({ initialValue: 250 });
    await enter('250');
    expect(props.onSave).not.toHaveBeenCalled();
    expect(q('input')).toBeNull();
    expect(shown()).toBe('-฿250.00');
  });

  it('250 typed as 250.00 is also "unchanged"', async () => {
    mount({ initialValue: 250 });
    await enter('250.00');
    expect(props.onSave).not.toHaveBeenCalled();
  });
});

describe('AmountEditableInput — a typo never becomes ฿0', () => {
  it.each([['empty', ''], ['letters', 'abc'], ['zero', '0'], ['a sign only', '-'], ['two dots', '1.2.3']])('%s: stays open with a message, nothing saved', async (_n, typed) => {
    mount();
    await enter(typed);
    expect(props.onSave).not.toHaveBeenCalled();
    expect(q('input')).not.toBeNull();
    expect(container!.textContent).toContain('ใส่จำนวนเงินเป็นตัวเลขมากกว่า 0');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBeTruthy();
  });

  it('the message goes away as soon as the user types again', async () => {
    mount();
    await enter('abc');
    type(input(), '12');
    expect(container!.textContent).not.toContain('ใส่จำนวนเงิน');
    expect(input().getAttribute('aria-invalid')).toBe('false');
  });

  it('a fixed value then saves', async () => {
    mount();
    await enter('abc');
    act(() => input().focus()); // the field lost focus when the message appeared; the user clicks back in
    type(input(), '12');
    act(() => input().blur());
    await flush();
    expect(props.onSave).toHaveBeenCalledWith(12);
  });

  it('Esc gives up: back to the old amount, no message, nothing saved', async () => {
    mount({ initialValue: 250 });
    await enter('abc');
    key(input(), 'Escape');
    expect(q('input')).toBeNull();
    expect(shown()).toBe('-฿250.00');
    expect(container!.textContent).not.toContain('ใส่จำนวนเงิน');
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('Esc while editing a good value also discards it', async () => {
    mount({ initialValue: 250 });
    await open();
    type(input(), '999');
    key(input(), 'Escape');
    expect(shown()).toBe('-฿250.00');
    expect(props.onSave).not.toHaveBeenCalled();
  });
});

describe('AmountEditableInput — a failed save', () => {
  it('says so, and shows the old amount again', async () => {
    mount({ initialValue: 250, onSave: vi.fn().mockResolvedValue(false) });
    await enter('400');
    expect(props.onSave).toHaveBeenCalledWith(400);
    expect(container!.textContent).toContain('บันทึกไม่สำเร็จ');
    expect(shown()).toContain('฿250.00');
  });

  it('a save that returns nothing or true is a success: no message', async () => {
    for (const result of [undefined, true]) {
      mount({ initialValue: 250, onSave: vi.fn().mockResolvedValue(result) });
      await enter('400');
      expect(container!.textContent).not.toContain('บันทึกไม่สำเร็จ');
      act(() => root!.unmount()); container!.remove();
    }
  });

  it('waits for a slow save before judging it', async () => {
    let finish!: (ok: boolean) => void;
    mount({ initialValue: 250, onSave: vi.fn(() => new Promise<boolean>(r => { finish = r; })) });
    await enter('400');
    expect(container!.textContent).not.toContain('บันทึกไม่สำเร็จ');
    await act(async () => { finish(false); await Promise.resolve(); });
    expect(container!.textContent).toContain('บันทึกไม่สำเร็จ');
  });
});
