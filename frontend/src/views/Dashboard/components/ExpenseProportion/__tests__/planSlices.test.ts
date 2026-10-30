import { describe, it, expect } from 'vitest';
import { planOf } from '../proportionHelpers';

const cat = (name: string, amount: number, planAmount?: number) =>
  ({ id: name, name, color: '#10B981', amount, planAmount, percentage: '10.0' }) as any;

describe('plan part of a proportion item', () => {
  it('is zero when nothing is planned', () => {
    expect(planOf(cat('a', 100))).toBe(0);
  });

  it('never exceeds the item (e.g. after a what-if exclusion)', () => {
    expect(planOf(cat('a', 30, 80))).toBe(30);
    expect(planOf(cat('a', 100, 40))).toBe(40);
  });
});
