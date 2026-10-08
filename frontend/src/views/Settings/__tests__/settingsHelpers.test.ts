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

describe('countTxByGroup precedence and name clashes', () => {
  it('the category id wins over the name when they point at different groups', () => {
    const c = [{ id: 'a', name: 'ชื่อ-a', cashflowGroup: 'g1' }, { id: 'b', name: 'ชื่อ-b', cashflowGroup: 'g2' }];
    expect(countTxByGroup(c, [{ category_id: 'a', category: 'ชื่อ-b' }] as any[])).toEqual({ g1: 1 });
  });

  it('an unknown id falls back to the name', () => {
    const c = [{ id: 'a', name: 'ข้าว', cashflowGroup: 'g1' }];
    expect(countTxByGroup(c, [{ category_id: 'old-id', category: 'ข้าว' }] as any[])).toEqual({ g1: 1 });
  });

  it('a category without a group does not wipe the group of another category with the same name', () => {
    const c = [{ id: 'a', name: 'ซ้ำ', cashflowGroup: 'g1' }, { id: 'b', name: 'ซ้ำ', cashflowGroup: undefined }];
    expect(countTxByGroup(c, [{ category: 'ซ้ำ' }] as any[])).toEqual({ g1: 1 });
  });

  it('a nameless category is reachable by id only', () => {
    const c = [{ id: 'a', name: '', cashflowGroup: 'g1' }];
    expect(countTxByGroup(c, [{ category_id: 'a' }, { category: '' }] as any[])).toEqual({ g1: 1 });
  });

  it('nothing to count gives an empty result', () => {
    expect(countTxByGroup([], [])).toEqual({});
    expect(countTxByGroup(cats as any, [])).toEqual({});
  });
});

describe('findOrphanCategories edge cases', () => {
  it('a category with no group at all is never an orphan', () => {
    expect(findOrphanCategories([{ cashflowGroup: undefined }, { cashflowGroup: null }, { cashflowGroup: '' }] as any[], [])).toEqual([]);
  });

  it('keeps the input order and the objects themselves', () => {
    const a = { id: 'a', cashflowGroup: 'x' }; const b = { id: 'b', cashflowGroup: 'y' };
    const out = findOrphanCategories([a, b] as any[], [{ id: 'z' }]);
    expect(out[0]).toBe(a);
    expect(out[1]).toBe(b);
  });
});
