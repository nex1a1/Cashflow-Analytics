import { describe, it, expect } from 'vitest';
import { readable, contrast, tc, muteColor, visibleFill } from '../theme';

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

describe('muteColor()', () => {
  const neon = ['#10B981', '#F2715A', '#E056FD', '#E84393', '#F1C40F', '#FF4D4D', '#3B82F6'];
  it('changes neon colors and is idempotent (safe to save back)', () => {
    for (const hex of neon) {
      const m = muteColor(hex);
      expect(m).not.toBe(hex);
      expect(muteColor(m)).toBe(m);
    }
  });
  it('leaves low-chroma and non-hex values alone', () => {
    expect(muteColor('#64748B')).toBe('#64748B');
    expect(muteColor('rgb(1, 2, 3)')).toBe('rgb(1, 2, 3)');
  });
});

describe('visibleFill()', () => {
  it('separates near-surface user fills from both extreme surfaces', () => {
    for (const hex of ['#E8E8E8', '#FFFFFF', '#181818', '#101114']) {
      const f = visibleFill(hex);
      expect(contrast(f, tc('canvas'))).toBeGreaterThanOrEqual(1.5);
      expect(contrast(f, tc('surface-elevated'))).toBeGreaterThanOrEqual(1.5);
    }
  });
});
