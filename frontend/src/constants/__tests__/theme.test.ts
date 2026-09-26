import { describe, it, expect } from 'vitest';
import { readable, contrast, tc } from '../theme';

describe('readable()', () => {
  it('lifts dark user colors to ≥4.5:1 on surface', () => {
    for (const hex of ['#4338CA', '#7E1DA5', '#64748B', '#000000']) {
      expect(contrast(readable(hex), tc('surface'))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('leaves already-legible colors unchanged', () => {
    expect(readable('#F2715A')).toBe('#F2715A');
  });
  it('passes through non-hex input and falls back when empty', () => {
    expect(readable('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
    expect(readable(undefined)).toBe(tc('ink-body'));
  });
});
