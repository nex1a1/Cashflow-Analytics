// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { act } from 'react';
import '@/test-utils/dom';

vi.mock('../App', async () => {
  const React = await import('react');
  return { default: () => React.createElement('p', { id: 'app' }, 'app') };
});

describe('main.tsx (entry)', () => {
  it('sets the theme and renders the app into #root without loading Chart.js', async () => {
    localStorage.setItem('shark_theme', 'old');
    localStorage.setItem('cashflow_shark_theme_v2', 'old');
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await act(async () => { await import('../main'); });

    // Chart.js belongs to the Dashboard / Portfolio chunks (utils/chartSetup.ts), not the entry
    const { Chart } = await import('chart.js');
    expect(() => Chart.registry.getController('bar')).toThrow();

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
