// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import '@/test-utils/dom';

vi.mock('../App', async () => {
  const React = await import('react');
  return { default: () => React.createElement('p', { id: 'app' }, 'app') };
});

describe('main.tsx (entry)', () => {
  it('registers the chart types the views draw, sets chart defaults and the theme, then renders the app into #root', async () => {
    localStorage.setItem('shark_theme', 'old');
    localStorage.setItem('cashflow_shark_theme_v2', 'old');
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await act(async () => { await import('../main'); });

    const { Chart, defaults } = await import('chart.js');
    const { tc } = await import('@/constants/theme');
    for (const id of ['bar', 'line', 'sankey']) expect(Chart.registry.getController(id)).toBeTruthy();
    for (const id of ['arc', 'flow']) expect(Chart.registry.getElement(id)).toBeTruthy();
    expect(Chart.registry.getScale('logarithmic')).toBeTruthy();
    expect(defaults.font.family).toBe("'Inter', 'Bai Jamjuree', sans-serif");
    expect(defaults.color).toBe(tc('ink-body'));
    expect(defaults.borderColor).toBe(tc('line'));

    // applyTheme: RGB channels on :root for Tailwind, dark scheme, legacy theme keys gone
    const css = document.documentElement.style;
    expect(css.getPropertyValue('--accent')).toBe('218 41 28'); // #DA291C
    expect(css.getPropertyValue('--shadow-k')).toBe('1');
    expect(css.colorScheme).toBe('dark');
    expect(localStorage.getItem('shark_theme')).toBeNull();
    expect(localStorage.getItem('cashflow_shark_theme_v2')).toBeNull();

    expect(root.querySelector('#app')!.textContent).toBe('app');
  });
});

describe('applyTheme', () => {
  it('writes every token to the element it is given and survives storage that throws', async () => {
    const { applyTheme, TOKENS } = await import('@/constants/theme');
    const el = document.createElement('div');
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => applyTheme(el)).not.toThrow();
    expect(el.style.getPropertyValue('--canvas')).toBe('24 24 24'); // #181818
    for (const name of Object.keys(TOKENS)) expect(el.style.getPropertyValue(`--${name}`)).not.toBe('');
    spy.mockRestore();
  });
});
