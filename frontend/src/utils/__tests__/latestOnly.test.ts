import { describe, it, expect } from 'vitest';
import { latestOnly } from '../latestOnly';

describe('latestOnly', () => {
  it('only the most recent call is current', () => {
    const begin = latestOnly();
    const first = begin();
    const second = begin();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
  });

  it('a slow older response is detected as stale after a newer request started', async () => {
    const begin = latestOnly();
    const applied: string[] = [];
    const load = async (label: string, ms: number) => {
      const isCurrent = begin();
      await new Promise(r => setTimeout(r, ms));
      if (isCurrent()) applied.push(label);
    };
    await Promise.all([load('ALL (slow)', 30), load('this month (fast)', 5)]);
    expect(applied).toEqual(['this month (fast)']);
  });
});
