import { describe, it, expect } from 'vitest';
import { ALLOCATION_COLORS, getAllocColor } from '@/constants/theme';

describe('Allocation Colors and Select helpers', () => {
  it('defines valid hex colors for canonical allocation types', () => {
    expect(ALLOCATION_COLORS.need).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ALLOCATION_COLORS.want).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ALLOCATION_COLORS.savings).toMatch(/^#[0-9A-Fa-f]{6}$/);

    // Exact values depend on the active theme; what matters is three distinct colors
    expect(new Set(Object.values(ALLOCATION_COLORS)).size).toBe(3);
  });

  it('resolves color correctly through getAllocColor helper', () => {
    expect(getAllocColor('need')).toBe(ALLOCATION_COLORS.need);
    expect(getAllocColor('needs')).toBe(ALLOCATION_COLORS.need);
    expect(getAllocColor('NEED')).toBe(ALLOCATION_COLORS.need);

    expect(getAllocColor('want')).toBe(ALLOCATION_COLORS.want);
    expect(getAllocColor('wants')).toBe(ALLOCATION_COLORS.want);
    expect(getAllocColor('WANT')).toBe(ALLOCATION_COLORS.want);

    expect(getAllocColor('savings')).toBe(ALLOCATION_COLORS.savings);
    expect(getAllocColor('save')).toBe(ALLOCATION_COLORS.savings);
    expect(getAllocColor('SAVE')).toBe(ALLOCATION_COLORS.savings);

    expect(getAllocColor(null)).toBe(ALLOCATION_COLORS.want);
    expect(getAllocColor(undefined)).toBe(ALLOCATION_COLORS.want);
    expect(getAllocColor('unknown')).toBe(ALLOCATION_COLORS.want);
  });
});
