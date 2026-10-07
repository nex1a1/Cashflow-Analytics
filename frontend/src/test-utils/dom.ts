// DOM helpers for the jsdom component tests (no @testing-library): every interaction goes through act().
import { act } from 'react';

// Without this React ignores act() and warns that the environment is not a test one.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

/** Let pending promises / timers settle inside act so state updates are applied. */
export const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });
/** Three ticks: enough for react-hook-form's async validation + the save that follows it. */
export const flushAll = async () => { await flush(); await flush(); await flush(); };

export const click = (el: Element | null | undefined) => {
  if (!el) throw new Error('click target missing');
  act(() => (el as HTMLElement).click());
};

export const key = (el: Element, k: string) => act(() => {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
});

/** Sets an input's value the way a user typing does (React tracks the native setter, so assign through it). */
export const type = (el: Element | null, value: string) => {
  const input = el as HTMLInputElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
  act(() => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
};

/** Picks an option of a native <select>. */
export const choose = (el: Element | null, value: string) => {
  const select = el as HTMLSelectElement;
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!;
  act(() => { setter.call(select, value); select.dispatchEvent(new Event('change', { bubbles: true })); });
};

export const q = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);

/** First element matching `sel` whose trimmed text is exactly `text`. */
export const byText = (sel: string, text: string) =>
  [...document.querySelectorAll<HTMLElement>(sel)].find(e => e.textContent?.trim() === text) ?? null;
