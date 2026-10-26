import { describe, it, expect } from 'vitest';
import { ALLOCATION_COLORS } from '@/constants/theme';

describe('Allocation Colors and Select helpers', () => {
  it('defines valid hex colors for canonical allocation types', () => {
    expect(ALLOCATION_COLORS.need).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ALLOCATION_COLORS.want).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ALLOCATION_COLORS.savings).toMatch(/^#[0-9A-Fa-f]{6}$/);

    // Exact values depend on the active theme; what matters is three distinct colors
    expect(new Set(Object.values(ALLOCATION_COLORS)).size).toBe(3);
  });
});
