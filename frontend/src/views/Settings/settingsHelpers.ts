import { Category, CashflowGroup, TransactionDisplay } from '../../types';

/** Transactions per cashflow group, matching each transaction to its category by id first, then by name. */
export function countTxByGroup(
  categories: Pick<Category, 'id' | 'name' | 'cashflowGroup'>[],
  transactions: Pick<TransactionDisplay, 'category_id' | 'category'>[],
): Record<string, number> {
  const catToGroup: Record<string, string> = {};
  categories.forEach(c => {
    if (!c.cashflowGroup) return;
    catToGroup[c.id] = c.cashflowGroup;
    if (c.name) catToGroup[c.name] = c.cashflowGroup;
  });

  const counts: Record<string, number> = {};
  transactions.forEach(t => {
    const groupId = (t.category_id && catToGroup[t.category_id]) || (t.category && catToGroup[t.category]);
    if (groupId) counts[groupId] = (counts[groupId] || 0) + 1;
  });
  return counts;
}

/** Categories whose group id no longer exists. */
export function findOrphanCategories<C extends Pick<Category, 'cashflowGroup'>>(
  categories: C[],
  groups: Pick<CashflowGroup, 'id'>[],
): C[] {
  const valid = new Set(groups.map(g => g.id));
  return categories.filter(c => c.cashflowGroup && !valid.has(c.cashflowGroup));
}
