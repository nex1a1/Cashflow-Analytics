// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import TabToggleRow from '../components/TabToggleRow';
import { click } from '@/test-utils/dom';

let root: Root | null = null;
let container: HTMLElement | null = null;
let onChange: ReturnType<typeof vi.fn>;
const mount = (enabled: boolean) => {
  onChange = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(
    <TabToggleRow icon={<svg data-testid="ic" />} title="โหมดภาษี" onText="แสดงแท็บอยู่" offText="ซ่อนแท็บไว้" enabled={enabled} onChange={onChange as never} />,
  ));
};
const on = () => container!.querySelector<HTMLButtonElement>('button[aria-label="เปิดโหมดภาษี"]')!;
const off = () => container!.querySelector<HTMLButtonElement>('button[aria-label="ปิดโหมดภาษี"]')!;
const text = () => container!.textContent ?? '';

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('TabToggleRow', () => {
  it('on: the title and the "shown" sentence, the on switch is the checked one', () => {
    mount(true);
    expect(text()).toContain('โหมดภาษี');
    expect(text()).toContain('แสดงแท็บอยู่');
    expect(text()).not.toContain('ซ่อนแท็บไว้');
    expect(on().getAttribute('aria-checked')).toBe('true');
    expect(off().getAttribute('aria-checked')).toBe('false');
  });

  it('off: the "hidden" sentence, the off switch is the checked one', () => {
    mount(false);
    expect(text()).toContain('ซ่อนแท็บไว้');
    expect(text()).not.toContain('แสดงแท็บอยู่');
    expect(on().getAttribute('aria-checked')).toBe('false');
    expect(off().getAttribute('aria-checked')).toBe('true');
  });

  it('the two switches are real switches in a group named after the row', () => {
    mount(true);
    expect(on().getAttribute('role')).toBe('switch');
    expect(off().getAttribute('role')).toBe('switch');
    expect(container!.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('โหมดภาษี');
    expect(on().type).toBe('button');
  });

  it('clicking a switch reports the state it stands for', () => {
    mount(true);
    click(off());
    expect(onChange).toHaveBeenLastCalledWith(false);
    click(on());
    expect(onChange).toHaveBeenLastCalledWith(true);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('the active switch is highlighted, the other is not', () => {
    mount(true);
    expect(on().className).toContain('bg-accent');
    expect(off().className).not.toContain('bg-accent');
    expect(off().className).toContain('text-ink-muted');
    act(() => root!.unmount()); container!.remove();
    mount(false);
    expect(off().className).toContain('bg-surface-elevated');
    expect(on().className).not.toContain('bg-accent text-on-accent');
  });

  it('the icon is lit when on and muted when off', () => {
    mount(true);
    const iconWrap = () => container!.querySelector('[data-testid="ic"]')!.parentElement!;
    expect(iconWrap().className).toContain('text-accent-ink');
    expect(iconWrap().getAttribute('aria-hidden')).toBe('true');
    act(() => root!.unmount()); container!.remove();
    mount(false);
    expect(iconWrap().className).toContain('text-ink-muted');
  });
});
