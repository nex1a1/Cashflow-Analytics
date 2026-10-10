// @vitest-environment jsdom
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect } from 'vitest';
import '@/test-utils/dom';
import AnimatedNumber from '../AnimatedNumber';

const text = (el: React.ReactElement) => {
  const host = document.createElement('div');
  const root = createRoot(host);
  act(() => root.render(el));
  const out = host.textContent;
  act(() => root.unmount());
  return out;
};

describe('AnimatedNumber', () => {
  it('money: two decimals with thousands separators', () => {
    expect(text(<AnimatedNumber value={1234.5} />)).toBe('1,234.50');
  });

  it('a negative amount uses the true minus', () => {
    expect(text(<AnimatedNumber value={-500} />)).toBe('−500.00');
  });

  it('no value is zero', () => {
    expect(text(<AnimatedNumber />)).toBe('0.00');
    expect(text(<AnimatedNumber value={null} />)).toBe('0.00');
    expect(text(<AnimatedNumber value={null} integer />)).toBe('0');
    expect(text(<AnimatedNumber integer />)).toBe('0');
  });

  it('integer: a rounded count without decimals', () => {
    expect(text(<AnimatedNumber value={12345} integer />)).toBe('12,345');
    expect(text(<AnimatedNumber value={2.5} integer />)).toBe('3');
    expect(text(<AnimatedNumber value={2.4} integer />)).toBe('2');
  });
});
