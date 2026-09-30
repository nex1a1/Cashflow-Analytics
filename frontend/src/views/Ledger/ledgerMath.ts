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

/**
 * Income, expense and net savings/investment. Savings-type rows are kept apart from expense
 * (sells are negative, so `sav` is buys minus sells); unmatched transactions count as expense.
 */
export function sumIncomeExpense(
  transactions: Pick<TransactionDisplay, 'category_id' | 'category' | 'amount'>[],
  catTypeMap: CatTypeMap,
) {
  let inc = 0, exp = 0, sav = 0;
  transactions.forEach(t => {
    const amt = toAmount(t.amount);
    const type = resolveTxType(t, catTypeMap);
    if (type === 'income') inc += amt;
    else if (type === 'savings') sav += amt;
    else exp += amt;
  });
  return { inc, exp, sav };
}
