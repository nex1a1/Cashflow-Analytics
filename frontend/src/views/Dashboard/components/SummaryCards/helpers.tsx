// src/views/Dashboard/components/SummaryCards/helpers.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatMoney } from '@/utils/formatters';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { BreakdownEntry } from './types';

/**
 * Formats a signed monetary value with the sign BEFORE the ฿ symbol.
 * e.g. -1234 → "-฿1,234.00"  |  1234 → "฿1,234.00"
 */
export const formatSignedMoney = (value: number): string => {
  const abs = Math.abs(value);
  return value < 0 ? `-฿${formatMoney(abs)}` : `฿${formatMoney(abs)}`;
};

export const Shimmer = ({ className }: { className?: string }) => (
  <div className={`rounded-none animate-pulse bg-neutral-800/80 ${className || ''}`} />
);

export const SectionHeader = ({ icon: Icon, title }: { icon?: LucideIcon; title: string }) => (
  <div className="px-4 py-1.5 flex items-center justify-between border-b border-line bg-surface/80">
    <div className="flex items-center gap-2">
      <div className="w-[3px] h-3 bg-accent shrink-0" />
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-neutral-200">
        {title}
      </span>
    </div>
  </div>
);

/**
 * The only place the dashboard's budget thresholds live. Card labels ("เกณฑ์แนะนำ < X%"),
 * card colours and the strategic grade all read these, so a red card is always a counted breach.
 * Percentages; `min` rules breach below, `max` rules breach above.
 */
export const BUDGET_RULES = {
  rent:            { max: 30 }, // % of income
  subscription:    { max: 5 },  // % of income
  subscriptionExp: { max: 8 },  // % of expense — fallback when the period has no income
  lifestyle:       { max: 30 }, // % of income
  food:            { max: 25 }, // % of expense
  surplus:         { min: 10 }, // (income − expense) % of income
} as const;

/** Past this share of a `max` the card warns (amber) before it breaches (red). */
export const WARN_AT = 0.8;

export interface BudgetInputs {
  rentPct: number;
  /** % of income, or % of expense when there is no income (see `subscriptionExp`). */
  subscriptionPct: number;
  hasIncome: boolean;
  lifestylePct: number;
  foodPctOfExpense: number;
  surplusPct: number;
  netCashflow: number;
}

const GRADES = [
  { g: 'A', label: 'ดีเยี่ยม', cls: 'text-income border-income/30 bg-income/10' },
  { g: 'B', label: 'ดี',      cls: 'text-income border-income/30 bg-income/10' },
  { g: 'C', label: 'พอใช้',   cls: 'text-amber-400 border-amber-500/30 bg-amber-950/40' },
  { g: 'D', label: 'ต้องปรับ', cls: 'text-danger border-danger/40 bg-danger/10' },
] as const;

/** One grade for the whole period: each breached rule costs a step, a deficit costs two. */
export function gradeBudget(x: BudgetInputs) {
  const subMax = x.hasIncome ? BUDGET_RULES.subscription.max : BUDGET_RULES.subscriptionExp.max;
  const breaches = [
    x.rentPct > BUDGET_RULES.rent.max && 'ที่พัก',
    x.subscriptionPct > subMax && 'บริการรายเดือน',
    x.lifestylePct > BUDGET_RULES.lifestyle.max && 'ตามใจ',
    x.foodPctOfExpense > BUDGET_RULES.food.max && 'ค่าอาหาร',
    x.netCashflow < 0 ? 'ขาดดุล' : x.hasIncome && x.surplusPct < BUDGET_RULES.surplus.min && 'เงินเหลือน้อย',
  ].filter(Boolean) as string[];
  const score = breaches.length + (x.netCashflow < 0 ? 1 : 0);
  return { breaches, grade: GRADES[Math.min(score, GRADES.length - 1)] };
}

export function getFoodStatus(pctOfExpense: number) {
  const { max } = BUDGET_RULES.food;
  if (pctOfExpense > max)           return { label: 'สัดส่วนสูง', cls: 'text-danger border-danger/30 bg-danger/10' };
  if (pctOfExpense > max * WARN_AT) return { label: 'ปานกลาง',   cls: 'text-amber-400 border-amber-500/30 bg-amber-950/40' };
  return                                   { label: 'สมดุลดี',   cls: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40' };
}

export function renderTopItemsOverlay(
  entries: BreakdownEntry[],
  emptyLabel: string,
  totalIcon: LucideIcon,
  totalIconColorClass: string,
  totalLabel: string,
  totalAmount: number
): React.ReactNode {
  if (entries.length === 0) {
    return (
      <div className="col-span-2 bg-canvas p-2 text-center text-[11px] text-neutral-400 flex items-center justify-center">
        {emptyLabel}
      </div>
    );
  }

  const cell = (wide: boolean, key: React.Key, icon: React.ReactNode, label: string, amount: number, pctLabel?: string) => (
    <div key={key} className={`bg-canvas p-2 flex text-left min-w-0 ${wide ? 'col-span-2 items-center justify-between' : 'flex-col justify-center'}`}>
      <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wide truncate flex items-center gap-1.5 leading-none">
        {icon} {label}
      </span>
      <div className={`flex items-baseline gap-1 leading-tight ${wide ? '' : 'mt-1'}`}>
        <span className="text-[13px] font-black text-white tabular-nums">฿{formatMoney(amount)}</span>
        {pctLabel && <span className="text-[11px] font-bold text-neutral-400">({pctLabel})</span>}
      </div>
    </div>
  );

  const TotalIcon = totalIcon;
  const totalCell = (wide: boolean, showPct: boolean) => cell(
    wide, 'total',
    <TotalIcon size={13} className={`shrink-0 ${totalIconColorClass}`} />,
    totalLabel, totalAmount, showPct ? '100%' : undefined
  );

  if (entries.length === 1) {
    const e = entries[0];
    return cell(true, e.key, <CategoryGlyph icon={e.icon} color={e.iconColor} size={13} />, e.label, e.amount, e.pctLabel);
  }

  const itemCells = entries.map(e => cell(false, e.key, <CategoryGlyph icon={e.icon} color={e.iconColor} size={13} />, e.label, e.amount, e.pctLabel));

  if (entries.length === 2) return <>{itemCells}{totalCell(true, false)}</>;
  if (entries.length === 3) return <>{itemCells}{totalCell(false, true)}</>;
  return itemCells;
}
