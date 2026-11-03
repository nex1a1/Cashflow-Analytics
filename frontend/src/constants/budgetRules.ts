/**
 * The only place the budget thresholds live (header verdict, Ledger panel, reflection hints).
 * Percentages; `min` rules breach below, `max` rules breach above.
 */
export const BUDGET_RULES = {
  rent:            { max: 30 }, // % of income
  subscription:    { max: 5 },  // % of income
  subscriptionExp: { max: 8 },  // % of expense — fallback when the period has no income
  lifestyle:       { max: 30 }, // % of income
  food:            { max: 25 }, // % of expense
  surplus:         { min: 20 }, // (income − expense) % of income — same 20% as SAVE in 50/30/20 (Kakeibo goal)
} as const;

/** Past this share of a `max` a figure warns (amber) before it breaches (red). */
export const WARN_AT = 0.8;
