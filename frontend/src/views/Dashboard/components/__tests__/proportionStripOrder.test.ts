import { describe, it, expect } from 'vitest';
import { stripOrder } from '../ExpenseProportion/ExpenseProportionGrid';
import type { CategoryItemData } from '../ExpenseProportion/types';

const item = (id: string, group: string | undefined, amount: number): CategoryItemData =>
  ({ id, name: id, color: '#000000', amount, percentage: 0, cashflow_group_id: group });

describe('stripOrder', () => {
  it('puts whole groups side by side, biggest group first, biggest category first inside', () => {
    // rows arrive sorted by amount: rent, family, power, food, water
    const items = [item('rent', 'home', 4500), item('family', 'other', 2117), item('power', 'home', 1557), item('food', 'eat', 1335), item('water', 'home', 100)];
    const out = stripOrder(items);
    expect(out.map(o => o.cat.id)).toEqual(['rent', 'power', 'water', 'family', 'food']);
    // each segment keeps its row index, so hovering a segment still lights the right row
    expect(out.map(o => o.idx)).toEqual([0, 2, 4, 1, 3]);
  });

  it('a category without a group stands as its own block', () => {
    const out = stripOrder([item('a', 'g', 50), item('loose', undefined, 80), item('b', 'g', 40)]);
    expect(out.map(o => o.cat.id)).toEqual(['a', 'b', 'loose']);
  });
});
