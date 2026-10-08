// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import SectionCard, { SectionCardProps } from '../components/SectionCard';
import { click } from '@/test-utils/dom';

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = (p: Partial<SectionCardProps> = {}) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<SectionCard title="หัวข้อ" {...p}><p id="body">เนื้อหา</p></SectionCard>));
};
const card = () => container!.firstElementChild as HTMLElement;
const heading = () => container!.querySelector('h2')!;
const buttons = () => [...container!.querySelectorAll<HTMLButtonElement>('button')];

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
});

describe('SectionCard', () => {
  it('shows the title and the content', () => {
    mount();
    expect(heading().textContent).toBe('หัวข้อ');
    expect(container!.querySelector('#body')!.textContent).toBe('เนื้อหา');
  });

  it('puts the icon in front of the title', () => {
    mount({ icon: <svg data-testid="ic" /> });
    expect(heading().firstElementChild!.getAttribute('data-testid')).toBe('ic');
  });

  it('a count badge is shown, zero included; no badge when none is given', () => {
    mount({ badge: 3 });
    expect(heading().textContent).toBe('หัวข้อ3');
    act(() => root!.unmount()); container!.remove();
    mount({ badge: 0 });
    expect(heading().textContent).toBe('หัวข้อ0');
    act(() => root!.unmount()); container!.remove();
    mount({ badge: null });
    expect(heading().textContent).toBe('หัวข้อ');
    act(() => root!.unmount()); container!.remove();
    mount();
    expect(heading().textContent).toBe('หัวข้อ');
  });

  it('without a badge there is no empty pill either', () => {
    mount();
    expect(heading().querySelector('span')).toBeNull();
    act(() => root!.unmount()); container!.remove();
    mount({ badge: null });
    expect(heading().querySelector('span')).toBeNull();
  });

  it('text badges are fine too', () => {
    mount({ badge: 'ใหม่' });
    expect(heading().textContent).toBe('หัวข้อใหม่');
  });

  it('no buttons unless an action is given', () => {
    mount();
    expect(buttons()).toHaveLength(0);
  });

  it('the action is a button with its label that calls onClick', () => {
    const onClick = vi.fn();
    mount({ action: { label: 'เพิ่ม', onClick } });
    expect(buttons()).toHaveLength(1);
    expect(buttons()[0].textContent).toContain('เพิ่ม');
    expect(buttons()[0].type).toBe('button');
    click(buttons()[0]);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('a secondary action sits before the main one, with its own icon', () => {
    const main = vi.fn(); const sub = vi.fn();
    mount({ action: { label: 'หลัก', onClick: main }, subAction: { label: 'รอง', icon: <svg data-testid="sub-ic" />, onClick: sub } });
    expect(buttons().map(b => b.textContent!.trim())).toEqual(['รอง', 'หลัก']);
    expect(buttons()[0].querySelector('[data-testid="sub-ic"]')).not.toBeNull();
    click(buttons()[0]);
    expect(sub).toHaveBeenCalledTimes(1);
    expect(main).not.toHaveBeenCalled();
  });

  it.each([
    ['emerald', 'border-t-income', 'text-income'],
    ['brand', 'border-t-accent-ink', 'text-accent-ink'],
    ['purple', 'border-t-savings', 'text-savings'],
    ['orange', 'border-t-expense', 'text-expense'],
  ])('%s accent: coloured top edge and title', (accent, edge, title) => {
    mount({ accentColor: accent });
    expect(card().className).toContain(edge);
    expect(heading().className).toContain(title);
  });

  it('the main button takes the accent too', () => {
    mount({ accentColor: 'emerald', action: { label: 'เพิ่ม', onClick: () => {} } });
    expect(buttons()[0].className).toContain('text-income');
  });

  it('brand is the default and also the fallback for an unknown accent', () => {
    mount();
    expect(card().className).toContain('border-t-accent-ink');
    act(() => root!.unmount()); container!.remove();
    mount({ accentColor: 'nope' });
    expect(card().className).toContain('border-t-accent-ink');
    expect(heading().className).toContain('text-accent-ink');
  });
});
