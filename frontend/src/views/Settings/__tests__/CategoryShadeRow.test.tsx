// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import CategoryShadeRow from '../components/CategoryShadeRow';
import { cat, grp } from './fixtures';

let root: Root | null = null;
let container: HTMLElement | null = null;
const onPreview = vi.fn();
const onSave = vi.fn();

const FOOD = grp('g-food', { name: 'ค่ากิน', color: '#F97316', order_index: 1 });
const BILLS = grp('g-bills', { name: 'ค่าบิล', color: '#38BDF8', order_index: 2 });
const CATS = [
  cat('c1', { cashflowGroup: 'g-food', color: '#AA0000', order_index: 1 }),
  cat('c2', { cashflowGroup: 'g-food', color: '#BB0000', order_index: 2 }),
  cat('c3', { cashflowGroup: 'g-bills', color: '#CC0000', order_index: 1 }), // single category: no strip
];

const mount = (value = 40) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(
    <CategoryShadeRow value={value} onPreview={onPreview} onSave={onSave} categories={CATS} cashflowGroups={[BILLS, FOOD]} />,
  ));
};
const slider = () => container!.querySelector<HTMLInputElement>('input[type="range"]')!;
const slide = (v: number) => act(() => {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(slider(), String(v));
  slider().dispatchEvent(new Event('input', { bubbles: true }));
});
const fire = (ev: Event) => act(() => { slider().dispatchEvent(ev); });

afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  onPreview.mockClear(); onSave.mockClear();
});

describe('CategoryShadeRow', () => {
  it('shows the value and a labelled 0–100 slider in steps of 1', () => {
    mount(40);
    expect(slider().value).toBe('40');
    expect(slider().step).toBe('1');
    expect(container!.querySelector('label')!.htmlFor).toBe(slider().id);
    expect(container!.textContent).toContain('40%');
  });

  it('the filled part of the track follows the value', () => {
    mount(40);
    expect(slider().style.getPropertyValue('--range-fill')).toBe('0.4');
  });

  it('0 says every category uses the group colour', () => {
    mount(0);
    expect(slider().getAttribute('aria-valuetext')).toBe('ใช้สีกลุ่มเดียวกันทุกหมวด');
  });

  it('dragging previews live and saves once on release', () => {
    mount(40);
    slide(70);
    expect(onPreview).toHaveBeenLastCalledWith(70);
    expect(onSave).not.toHaveBeenCalled();
    fire(new Event('pointerup', { bubbles: true }));
    fire(new Event('focusout', { bubbles: true })); // blur after the drag must not save again
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(70);
  });

  it('a keyboard step saves; tabbing through without a change saves nothing', () => {
    mount(40);
    fire(new Event('focusout', { bubbles: true }));
    expect(onSave).not.toHaveBeenCalled();
    slide(50);
    fire(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true }));
    expect(onSave).toHaveBeenCalledWith(50);
  });

  it('one swatch strip per group with more than one category, coloured by the categories', () => {
    mount();
    const strips = [...container!.querySelectorAll('[data-shade-strip]')];
    expect(strips.map(s => s.textContent)).toEqual(['ค่ากิน']);
    expect([...strips[0].querySelectorAll<HTMLElement>('span[title]')].map(s => s.style.backgroundColor))
      .toEqual(['rgb(170, 0, 0)', 'rgb(187, 0, 0)']);
  });
});
