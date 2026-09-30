import { describe, it, expect } from 'vitest';
import { countTxByGroup, findOrphanCategories } from '../settingsHelpers';

const cats = [
  { id: 'c1', name: 'ข้าว', cashflowGroup: 'g1' },
  { id: 'c2', name: 'เงินเดือน', cashflowGroup: 'g2' },
  { id: 'c3', name: 'ไม่มีกลุ่ม', cashflowGroup: undefined },
];

describe('countTxByGroup', () => {
  it('matches by category id, falls back to name, ignores unknown', () => {
    const tx = [
      { category_id: 'c1' }, { category_id: 'c1' },
      { category: 'เงินเดือน' },
      { category_id: 'c3' },
      { category_id: 'nope' },
    ] as any[];
    expect(countTxByGroup(cats as any, tx)).toEqual({ g1: 2, g2: 1 });
  });
});

describe('findOrphanCategories', () => {
  it('returns only categories pointing at a deleted group', () => {
    const orphans = findOrphanCategories(cats as any[], [{ id: 'g1' }]) as typeof cats;
    expect(orphans.map(c => c.id)).toEqual(['c2']);
  });
});
