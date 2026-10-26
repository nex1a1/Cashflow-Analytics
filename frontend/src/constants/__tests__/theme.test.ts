import { describe, it, expect } from 'vitest';
import { readable, contrast, tc } from '../theme';

describe('readable()', () => {
  it('lifts dark user colors to ≥4.5:1 on surface', () => {
    for (const hex of ['#4338CA', '#7E1DA5', '#64748B', '#000000']) {
      expect(contrast(readable(hex), tc('surface'))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('leaves already-legible, already-muted colors unchanged', () => {
    expect(readable(tc('ink-body'))).toBe(tc('ink-body'));
  });
  it('passes through non-hex input and falls back when empty', () => {
    expect(readable('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
    expect(readable(undefined)).toBe(tc('ink-body'));
  });
});

describe('active theme tokens', () => {
  it('every text-role token clears 4.5:1 on canvas and surface', () => {
    const text = ['ink-display', 'ink-soft', 'ink-body', 'ink-muted', 'accent-ink', 'income', 'expense',
      'savings', 'danger', 'warn', 'info', 'orange', 'purple', 'alloc-need', 'alloc-want'] as const;
    for (const t of text) for (const bg of ['canvas', 'surface'] as const) {
      expect(contrast(tc(t), tc(bg)), `${t} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

