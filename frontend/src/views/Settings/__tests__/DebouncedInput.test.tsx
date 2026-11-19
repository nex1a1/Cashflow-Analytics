// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DebouncedInput, { DebouncedInputProps } from '../components/DebouncedInput';
import { type, key, q } from '@/test-utils/dom';

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: DebouncedInputProps;
const render = () => act(() => root!.render(<DebouncedInput {...props} />));
const mount = (p: Partial<DebouncedInputProps> = {}) => {
  props = { value: 'เดิม', onDebouncedChange: vi.fn(async () => true), ...p };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
const input = () => q<HTMLInputElement>('input')!;
/** Fake clock: advance it and let the promises it releases settle. */
const tick = async (ms = 0) => { await act(async () => { vi.advanceTimersByTime(ms); }); };
const blur = async () => { await act(async () => { input().blur(); }); };
const focus = () => act(() => input().focus());
const errorText = () => container!.querySelector('[id]:not(input)')?.textContent ?? '';

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  vi.useRealTimers();
});

describe('DebouncedInput typing and saving', () => {

  it('saves the latest text 400 ms after the last keystroke - not before', async () => {
    mount();
    type(input(), 'ก');
    await tick(399);
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
    await tick(1);
    expect(props.onDebouncedChange).toHaveBeenCalledTimes(1);
    expect(props.onDebouncedChange).toHaveBeenCalledWith('ก');
  });

  it('every keystroke restarts the wait, so a burst is saved once with the final text', async () => {
    mount();
    type(input(), 'a');
    await tick(300);
    type(input(), 'ab');
    await tick(300);
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
    await tick(100);
    expect(props.onDebouncedChange).toHaveBeenCalledTimes(1);
    expect(props.onDebouncedChange).toHaveBeenCalledWith('ab');
  });

  it('Enter saves at once, leaves the field and does not save a second time when the timer would have fired', async () => {
    mount();
    focus();
    type(input(), 'ใหม่');
    await act(async () => { key(input(), 'Enter'); });
    expect(props.onDebouncedChange).toHaveBeenCalledTimes(1);
    expect(props.onDebouncedChange).toHaveBeenCalledWith('ใหม่');
    expect(document.activeElement).not.toBe(input());
    await tick(1000);
    expect(props.onDebouncedChange).toHaveBeenCalledTimes(1);
  });

  it('leaving the field saves at once and cancels the timer', async () => {
    mount();
    focus();
    type(input(), 'ใหม่');
    await blur();
    expect(props.onDebouncedChange).toHaveBeenCalledWith('ใหม่');
    await tick(1000);
    expect(props.onDebouncedChange).toHaveBeenCalledTimes(1);
  });

  it('typing back to the saved text and leaving saves nothing', async () => {
    mount();
    focus();
    type(input(), 'เดิมx');
    type(input(), 'เดิม');
    await blur();
    await tick(1000);
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
  });

  it('Enter on an untouched field saves nothing', async () => {
    mount();
    focus();
    await act(async () => { key(input(), 'Enter'); });
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
  });

  it('other keys do not save or leave the field', async () => {
    mount();
    focus();
    type(input(), 'x');
    await act(async () => { key(input(), 'a'); key(input(), 'Escape'); });
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input());
  });

  it('a pending edit is dropped when the field goes away (no save after unmount)', async () => {
    mount();
    type(input(), 'x');
    act(() => root!.unmount());
    root = null;
    await tick(1000);
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
  });
});

describe('DebouncedInput caller handlers', () => {
  it('a caller onBlur runs in addition to the save-on-blur, not instead of it', async () => {
    const onBlur = vi.fn();
    mount({ onBlur });
    focus();
    type(input(), 'ใหม่');
    await blur();
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(props.onDebouncedChange).toHaveBeenCalledWith('ใหม่');
  });

  it('a caller onKeyDown runs in addition to Enter-to-save', async () => {
    const onKeyDown = vi.fn();
    mount({ onKeyDown });
    focus();
    type(input(), 'ใหม่');
    await act(async () => { key(input(), 'Enter'); });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(props.onDebouncedChange).toHaveBeenCalledWith('ใหม่');
    expect(document.activeElement).not.toBe(input());
  });

});

describe('DebouncedInput required text', () => {
  it('a blank field shows the message at once and is never saved', async () => {
    mount({ requiredMessage: 'ต้องมีชื่อ' });
    type(input(), '');
    expect(errorText()).toBe('ต้องมีชื่อ');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().className).toContain('tint-danger');
    await tick(1000);
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
  });

  it('leaving a blank field puts the saved text back and clears the message', async () => {
    mount({ requiredMessage: 'ต้องมีชื่อ' });
    focus();
    type(input(), '');
    await blur();
    expect(input().value).toBe('เดิม');
    expect(errorText()).toBe('');
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
  });

  it('Enter on a blank field does not save', async () => {
    mount({ requiredMessage: 'ต้องมีชื่อ' });
    focus();
    type(input(), '');
    await act(async () => { key(input(), 'Enter'); });
    expect(props.onDebouncedChange).not.toHaveBeenCalled();
  });

  it('typing again after a blank hides the message and saves as usual', async () => {
    mount({ requiredMessage: 'ต้องมีชื่อ' });
    type(input(), '');
    type(input(), 'ก');
    expect(errorText()).toBe('');
    await tick(400);
    expect(props.onDebouncedChange).toHaveBeenCalledWith('ก');
  });

  it('without a required message a blank value is a normal value and is saved', async () => {
    mount();
    type(input(), '');
    expect(errorText()).toBe('');
    await tick(400);
    expect(props.onDebouncedChange).toHaveBeenCalledWith('');
  });

});

describe('DebouncedInput failed saves', () => {
  it('a refused save (false) keeps the typed text and says so', async () => {
    mount({ onDebouncedChange: vi.fn(async () => false) });
    type(input(), 'ใหม่');
    await tick(400);
    expect(input().value).toBe('ใหม่');
    expect(errorText()).toBe('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    expect(input().getAttribute('aria-invalid')).toBe('true');
  });

  it('a save that throws is a failed save too', async () => {
    mount({ onDebouncedChange: vi.fn(async () => { throw new Error('boom'); }) });
    type(input(), 'ใหม่');
    await tick(400);
    expect(input().value).toBe('ใหม่');
    expect(errorText()).toBe('บันทึกไม่สำเร็จ ลองอีกครั้ง');
  });

  it('text typed while the save was still running is not thrown away when that save fails', async () => {
    let finish!: (ok: boolean) => void;
    mount({ onDebouncedChange: vi.fn(() => new Promise<boolean>(r => { finish = r; })) });
    type(input(), 'ก');
    await tick(400); // save of "ก" is now in flight
    type(input(), 'กข'); // the user keeps typing
    await act(async () => { finish(false); });
    expect(input().value).toBe('กข');
    expect(errorText()).toBe('บันทึกไม่สำเร็จ ลองอีกครั้ง');
    // and what they typed last is still what gets saved
    await tick(400);
    expect(props.onDebouncedChange).toHaveBeenLastCalledWith('กข');
  });

  it('a refused save is tried again when the field is left with the same text', async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    mount({ onDebouncedChange: save });
    focus();
    type(input(), 'ก');
    await tick(400);
    expect(save).toHaveBeenCalledTimes(1);
    await blur();
    expect(save).toHaveBeenCalledTimes(2);
    expect(errorText()).toBe('');
  });

  it('a later success clears an earlier failure', async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    mount({ onDebouncedChange: save });
    type(input(), 'ก');
    await tick(400);
    expect(errorText()).not.toBe('');
    type(input(), 'กข');
    await tick(400);
    expect(errorText()).toBe('');
    expect(save).toHaveBeenCalledTimes(2);
  });

  // The parent saves optimistically: it shows the new name, then rolls back to the old one when the API refuses.
  // That roll-back must not wipe what the user typed.
  function Harness({ save }: { save: (v: string, setSaved: (s: string) => void) => Promise<unknown> }) {
    const [saved, setSaved] = useState('เดิม');
    return <DebouncedInput value={saved} onDebouncedChange={v => save(v, setSaved)} />;
  }

  it('a roll-back of the parent value does not wipe the typed text', async () => {
    const save = async (v: string, setSaved: (s: string) => void) => { setSaved(v); await Promise.resolve(); setSaved('เดิม'); return false; };
    act(() => root = createRoot(container = document.body.appendChild(document.createElement('div'))));
    act(() => root!.render(<Harness save={save} />));
    type(input(), 'ใหม่');
    await tick(400);
    await tick(0);
    expect(input().value).toBe('ใหม่');
    expect(errorText()).toBe('บันทึกไม่สำเร็จ ลองอีกครั้ง');
  });

});

describe('DebouncedInput following the outside value', () => {

  it('during a save the parent value does not overwrite the text', async () => {
    let finish!: (ok: boolean) => void;
    mount({ onDebouncedChange: vi.fn(() => new Promise<boolean>(r => { finish = r; })) });
    type(input(), 'ใหม่');
    await tick(400); // save started, still pending
    props = { ...props, value: 'ค่าอื่น' };
    render();
    expect(input().value).toBe('ใหม่');
    await act(async () => { finish(true); });
  });

  it('after a failed save the parent value does not overwrite the text either', async () => {
    mount({ onDebouncedChange: vi.fn(async () => false) });
    type(input(), 'ใหม่');
    await tick(400);
    props = { ...props, value: 'ค่าอื่น' };
    render();
    expect(input().value).toBe('ใหม่');
  });

});

