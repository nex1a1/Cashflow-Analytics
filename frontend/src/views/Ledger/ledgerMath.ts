import { Category, TransactionDisplay } from '../../types';

export type CatTypeMap = Record<string, string | undefined>;

export function buildCatTypeMap(categories: Pick<Category, 'id' | 'name' | 'type'>[]): CatTypeMap {
  const map: CatTypeMap = {};
  categories.forEach(c => {
    map[c.id] = c.type;
    map[c.name] = c.type;
  });
  return map;
}

/** Category type of a transaction: matched by category_id first, then by name. */
export function resolveTxType(t: Pick<TransactionDisplay, 'category_id' | 'category'>, catTypeMap: CatTypeMap) {
  return (t.category_id ? catTypeMap[t.category_id] : undefined) || catTypeMap[t.category];
}

export function toAmount(v: unknown): number {
  return Number.parseFloat(v as string) || 0;
}

/** Income vs everything else. Savings and unmatched transactions count as expense (Ledger convention). */
export function sumIncomeExpense(
  transactions: Pick<TransactionDisplay, 'category_id' | 'category' | 'amount'>[],
  catTypeMap: CatTypeMap,
) {
  let inc = 0, exp = 0;
  transactions.forEach(t => {
    const amt = toAmount(t.amount);
    if (resolveTxType(t, catTypeMap) === 'income') inc += amt;
    else exp += amt;
  });
  return { inc, exp };
}
