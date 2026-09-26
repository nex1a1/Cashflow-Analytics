import { describe, it, expect } from 'vitest';
import { ALLOCATION_COLORS, getAllocColor } from '@/constants/theme';

describe('Allocation Colors and Select helpers', () => {
  it('defines valid hex colors for canonical allocation types', () => {
    expect(ALLOCATION_COLORS.need).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ALLOCATION_COLORS.want).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(ALLOCATION_COLORS.savings).toMatch(/^#[0-9A-Fa-f]{6}$/);

    expect(ALLOCATION_COLORS.need).toBe('#F43F5E'); // Rose
    expect(ALLOCATION_COLORS.want).toBe('#F59E0B'); // Amber
    expect(ALLOCATION_COLORS.savings).toBe('#8B93F8'); // Indigo
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
