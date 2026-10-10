// @vitest-environment jsdom
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { click, flush, key, q } from '@/test-utils/dom';
import DayNoteField from '../DayNoteField';
import type { DayNote } from '@/types';

// The real IconPicker is a popover; here one button stands for "pick the cake icon" (it sits inside the field like the real one)
vi.mock('@/components/shared/IconPicker', async () => {
  const React = await import('react');
  return {
    default: ({ icon, onChange }: { icon: string; onChange: (k: string) => void }) =>
      React.createElement('button', { type: 'button', 'data-testid': 'picker', 'data-icon': icon, onClick: () => onChange('cake') }, 'icon'),
  };
});

let root: Root | null = null;
let host: HTMLDivElement | null = null;
let onSave = vi.fn(async () => true);

const render = (note: DayNote, withSave = true) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<DayNoteField dateStr="2026-10-09" note={note} onSave={withSave ? onSave : undefined} />));
};
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; onSave = vi.fn(async () => true); });

const input = () => q<HTMLInputElement>('input[aria-label="โน้ตประจำวัน"]')!;
const picker = () => q<HTMLButtonElement>('[data-testid="picker"]')!;
const done = () => q<HTMLButtonElement>('button[aria-label="เสร็จ บันทึกโน้ตและหุบช่องแก้ไข"]')!;
const chip = () => q<HTMLButtonElement>('button[aria-label^="แก้ไขโน้ต"]');
const ghost = () => [...document.querySelectorAll('button')].find(b => b.textContent === '+ โน้ต') ?? null;
const setText = (v: string) => { input().value = v; };
const blurTo = async (to: Element | null) => {
  act(() => { input().dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: to })); });
  await flush();
};

describe('DayNoteField', () => {
  it('view-only: the note as text, or nothing', () => {
    render({ text: 'วันเกิด', icon: 'cake' }, false);
    expect(host!.textContent).toBe('วันเกิด');
    expect(host!.querySelector('button')).toBeNull();
    act(() => root!.unmount()); host!.remove();
    render({ text: '', icon: '' }, false);
    expect(host!.innerHTML).toBe('');
  });

  it('no note: a ghost button opens the editor, focused', () => {
    render({ text: '', icon: '' });
    click(ghost());
    expect(document.activeElement).toBe(input());
    expect(picker().dataset.icon).toBe('sticky-note');
  });

  it('a note: its chip opens the editor with the text, cursor at the end', () => {
    render({ text: 'วันแรกทำงาน', icon: 'briefcase' });
    expect(chip()!.textContent).toBe('วันแรกทำงาน');
    click(chip());
    expect(input().value).toBe('วันแรกทำงาน');
    expect(input().selectionStart).toBe('วันแรกทำงาน'.length);
    expect(picker().dataset.icon).toBe('briefcase');
  });

  it('an icon picked before any text is held, and saved with the text', async () => {
    render({ text: '', icon: '' });
    click(ghost());
    click(picker());
    expect(onSave).not.toHaveBeenCalled();
    expect(picker().dataset.icon).toBe('cake');
    setText('  วันเกิด  ');
    await blurTo(null);
    expect(onSave).toHaveBeenCalledWith('2026-10-09', 'วันเกิด', 'cake');
    expect(input()).toBeNull(); // collapsed
  });

  it('an icon picked while there is text saves at once and keeps the editor open', async () => {
    render({ text: 'วันเกิด', icon: 'gift' });
    click(chip());
    click(picker());
    await flush();
    expect(onSave).toHaveBeenCalledWith('2026-10-09', 'วันเกิด', 'cake');
    expect(input()).not.toBeNull();
    // saved: the picker follows the saved note again (the parent has not passed the new icon in this test)
    expect(picker().dataset.icon).toBe('gift');
  });

  it('focus moving to the icon or ✓ button inside the field saves but does not collapse (the picker must stay usable)', async () => {
    render({ text: '', icon: '' });
    click(ghost());
    setText('วันเกิด');
    await blurTo(picker());
    expect(onSave).toHaveBeenCalledWith('2026-10-09', 'วันเกิด', '');
    expect(input()).not.toBeNull();
    // nothing typed yet and focus goes to the picker: no save, still open
    act(() => root!.unmount()); host!.remove();
    onSave = vi.fn(async () => true);
    render({ text: '', icon: '' });
    click(ghost());
    await blurTo(picker());
    expect(onSave).not.toHaveBeenCalled();
    expect(input()).not.toBeNull();
  });

  it('✓ while typing saves through the blur; ✓ after focus left saves directly', async () => {
    render({ text: '', icon: '' });
    click(ghost());
    setText('วันเกิด');
    act(() => input().focus());
    await act(async () => { done().click(); });
    await flush();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(input()).toBeNull();

    act(() => root!.unmount()); host!.remove();
    onSave = vi.fn(async () => true);
    render({ text: '', icon: '' });
    click(ghost());
    setText('ปีใหม่');
    act(() => { (document.activeElement as HTMLElement | null)?.blur?.(); }); // jsdom: leaves without a focusout we control
    onSave.mockClear();
    await act(async () => { done().click(); });
    await flush();
    expect(onSave).toHaveBeenCalledWith('2026-10-09', 'ปีใหม่', '');
  });

  it('nothing changed: collapses without saving (an icon alone is not a note)', async () => {
    render({ text: 'วันเกิด', icon: 'cake' });
    click(chip());
    await blurTo(null);
    expect(onSave).not.toHaveBeenCalled();
    expect(chip()).not.toBeNull();

    act(() => root!.unmount()); host!.remove();
    render({ text: '', icon: '' });
    click(ghost());
    click(picker());
    await blurTo(null);
    expect(onSave).not.toHaveBeenCalled();
    expect(ghost()).not.toBeNull();
  });

  it('the same text with another icon is a change', async () => {
    render({ text: 'วันเกิด', icon: 'gift' });
    click(chip());
    onSave.mockImplementationOnce(async () => false); // the immediate icon save fails: the icon is held
    click(picker());
    await flush();
    onSave.mockClear();
    await blurTo(null);
    expect(onSave).toHaveBeenCalledWith('2026-10-09', 'วันเกิด', 'cake');
  });

  it('clearing the text deletes the note', async () => {
    render({ text: 'วันเกิด', icon: 'cake' });
    click(chip());
    setText('   ');
    await blurTo(null);
    expect(onSave).toHaveBeenCalledWith('2026-10-09', '', 'cake');
  });

  it('a failed save keeps the editor, the typed text and the icon, with an inline error; Enter retries', async () => {
    onSave = vi.fn(async () => false);
    render({ text: '', icon: '' });
    click(ghost());
    click(picker());
    setText('วันเกิด');
    await blurTo(null);
    expect(input().value).toBe('วันเกิด');
    expect(input().getAttribute('aria-invalid')).toBe('true');
    expect(input().getAttribute('aria-describedby')).toBe('day-note-err');
    expect(q('#day-note-err')!.textContent).toContain('บันทึกโน้ตไม่สำเร็จ');
    expect(picker().dataset.icon).toBe('cake');

    onSave.mockImplementation(async () => true);
    act(() => input().focus());
    key(input(), 'Enter');
    await flush();
    expect(onSave).toHaveBeenLastCalledWith('2026-10-09', 'วันเกิด', 'cake');
    expect(input()).toBeNull();
    expect(q('#day-note-err')).toBeNull();
  });

  it('Esc puts the old text back, collapses, and does not reach the modal', async () => {
    const modalEsc = vi.fn();
    window.addEventListener('keydown', modalEsc);
    render({ text: 'วันเกิด', icon: 'gift' });
    click(chip());
    setText('พิมพ์ผิด');
    key(input(), 'Escape');
    expect(modalEsc).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(input()).toBeNull();
    expect(chip()!.textContent).toBe('วันเกิด');
    click(chip());
    expect(input().value).toBe('วันเกิด');
    window.removeEventListener('keydown', modalEsc);
  });

  it('the input is capped at 200 characters, like the backend', () => {
    render({ text: '', icon: '' });
    click(ghost());
    expect(input().maxLength).toBe(200);
  });
});
