import { describe, it, expect } from 'vitest';
import { DEFAULT_SHADE_STRENGTH, groupShades, parseShadeStrength, withGroupColors } from '../categoryColors';
import type { CashflowGroup, Category } from '../../types';

const lightness = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
};

const grp = (id: string, color: string | null): CashflowGroup =>
  ({ id, name: id, type: 'expense', allocation_type: 'need', order_index: 1, color });

describe('groupShades', () => {
  it('a single category takes the group colour itself', () => {
    expect(groupShades('#F97316', 1)).toEqual(['#F97316']);
  });

  it('gives distinct shades, darkest first, inside the readable band', () => {
    const shades = groupShades('#F0DD75', 10); // a pale group with many categories
    expect(new Set(shades).size).toBe(10);
    const ls = shades.map(lightness);
    ls.forEach((l, i) => {
      expect(l).toBeGreaterThanOrEqual(0.27);
      expect(l).toBeLessThanOrEqual(0.79);
      if (i > 0) expect(l).toBeGreaterThan(ls[i - 1]);
    });
  });

  it('a grey group stays a muted slate (no strong colour appears)', () => {
    for (const hex of groupShades('#C0C5CE', 4)) {
      const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(40);
    }
  });

  it('an unparsable colour is passed through', () => {
    expect(groupShades('tomato', 2)).toEqual(['tomato', 'tomato']);
    expect(groupShades('#123456', 0)).toEqual([]);
  });
});

describe('shade strength', () => {
  it('0 gives every category the group colour; a lower strength spreads less', () => {
    expect(groupShades('#1D4ED8', 4, 0)).toEqual(Array(4).fill('#1D4ED8'));
    const spread = (s: number) => { const ls = groupShades('#1D4ED8', 4, s).map(lightness); return ls[3] - ls[0]; };
    expect(spread(40)).toBeGreaterThan(0);
    expect(spread(40)).toBeLessThan(spread(100));
    expect(spread(40)).toBeCloseTo(spread(100) * 0.4, 1);
  });

  it('withGroupColors passes the strength through', () => {
    const cats: Category[] = [
      { id: 'a', name: 'A', color: '#000000', cashflowGroup: 'g', order_index: 1 },
      { id: 'b', name: 'B', color: '#000000', cashflowGroup: 'g', order_index: 2 },
    ];
    expect(withGroupColors(cats, [grp('g', '#F97316')], 0).map(c => c.color)).toEqual(['#F97316', '#F97316']);
  });

  it('parseShadeStrength: numbers and numeric strings snap to 10s inside 0–100, the rest is the default', () => {
    expect(parseShadeStrength(40)).toBe(40);
    expect(parseShadeStrength('73')).toBe(70);
    expect(parseShadeStrength(250)).toBe(100);
    expect(parseShadeStrength(-5)).toBe(0);
    expect(parseShadeStrength(undefined)).toBe(DEFAULT_SHADE_STRENGTH);
    expect(parseShadeStrength('')).toBe(DEFAULT_SHADE_STRENGTH);
    expect(parseShadeStrength('x')).toBe(DEFAULT_SHADE_STRENGTH);
  });
});

describe('withGroupColors', () => {
  const cats: Category[] = [
    { id: 'b', name: 'B', color: '#000001', cashflowGroup: 'g1', order_index: 2 },
    { id: 'a', name: 'A', color: '#000002', cashflowGroup: 'g1', order_index: 1 },
    { id: 'x', name: 'X', color: '#ABCDEF', cashflowGroup: 'g-none', order_index: 1 },
    { id: 'n', name: 'N', color: '#123123', cashflowGroup: 'g-nocolor', order_index: 1 },
    { id: 's', name: 'S', color: '#FEDCBA', cashflow_group_id: 'g2', order_index: 1 },
  ];
  const groups = [grp('g1', '#1D4ED8'), grp('g2', '#22C55E'), grp('g-nocolor', null)];

  it('colours each category by its group, in order_index order, and keeps the input order', () => {
    const out = withGroupColors(cats, groups);
    const [b, a] = groupShades('#1D4ED8', 2).reverse(); // a (order 1) gets the darker shade
    expect(out.map(c => c.id)).toEqual(['b', 'a', 'x', 'n', 's']);
    expect(out[0].color).toBe(b);
    expect(out[1].color).toBe(a);
    expect(out[4].color).toBe('#22C55E'); // cashflow_group_id works too
  });

  it('keeps the stored colour when the group is unknown or has no colour, and never mutates the input', () => {
    const out = withGroupColors(cats, groups);
    expect(out[2]).toBe(cats[2]);
    expect(out[3]).toBe(cats[3]);
    expect(cats[0].color).toBe('#000001');
  });

  it('before groups load, the categories are returned as they are', () => {
    expect(withGroupColors(cats, [])).toBe(cats);
  });
});
