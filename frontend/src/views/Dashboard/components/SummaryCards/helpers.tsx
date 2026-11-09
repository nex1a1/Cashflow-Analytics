// src/views/Dashboard/components/SummaryCards/helpers.tsx
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { formatBaht } from '@/utils/formatters';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { BreakdownEntry } from './types';
import { PanelTitle } from '../panelParts';
import { BUDGET_RULES, WARN_AT } from '@/constants/budgetRules';

export const Shimmer = ({ className }: { className?: string }) => (
  <div className={`rounded-none animate-pulse bg-surface-elevated ${className || ''}`} />
);

export const SectionHeader = ({ icon: Icon, title }: { icon?: LucideIcon; title: string }) => (
  <div className="px-4 py-1.5 flex items-center justify-between border-b border-line bg-surface/80">
    <div className="flex items-center gap-2">
      <PanelTitle icon={Icon} title={title} />
    </div>
  </div>
);

// Budget thresholds live in constants/budgetRules; re-exported so the summary cards keep one import.
export { BUDGET_RULES, WARN_AT };

/** Where a share sits against a `max` rule: past WARN_AT of it warns, past it breaches. */
export type RuleLevel = 'ok' | 'warn' | 'over';

export function ruleLevel(pct: number, max: number): RuleLevel {
  if (pct > max) return 'over';
  if (pct > max * WARN_AT) return 'warn';
  return 'ok';
}

/** Shape shared by every small status pill on the summary cards. */
export const PILL = 'px-1.5 py-0.5 rounded-pill border text-[11px] font-semibold leading-none whitespace-nowrap shrink-0';

/** Pill colours per level, from theme tokens only. */
export const LEVEL_PILL: Record<RuleLevel, string> = {
  ok:   'text-income border-income/30 bg-income/10',
  warn: 'text-warn border-warn/30 bg-warn/10',
  over: 'text-danger border-danger/30 bg-danger/10',
};

/** Neutral pill: a fact, not a verdict. */
export const NEUTRAL_PILL = 'text-ink-body border-line bg-surface-elevated/40';

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
  { g: 'A', label: 'ดีเยี่ยม', cls: LEVEL_PILL.ok },
  { g: 'B', label: 'ดี',      cls: LEVEL_PILL.ok },
  { g: 'C', label: 'พอใช้',   cls: LEVEL_PILL.warn },
  { g: 'D', label: 'ต้องปรับ', cls: LEVEL_PILL.over },
] as const;

/**
 * One grade for the whole period: each breached rule costs a step, a deficit costs two.
 * Rules measured against income (rent, WANT) only count when there is income to measure against.
 */
export function gradeBudget(x: BudgetInputs) {
  const subMax = x.hasIncome ? BUDGET_RULES.subscription.max : BUDGET_RULES.subscriptionExp.max;
  const breaches = [
    x.hasIncome && x.rentPct > BUDGET_RULES.rent.max && 'ที่พัก',
    x.subscriptionPct > subMax && 'บริการรายเดือน',
    x.hasIncome && x.lifestylePct > BUDGET_RULES.lifestyle.max && 'WANT',
    x.foodPctOfExpense > BUDGET_RULES.food.max && 'ค่าอาหาร',
    x.netCashflow < 0 ? 'ขาดดุล' : x.hasIncome && x.surplusPct < BUDGET_RULES.surplus.min && 'เงินเหลือน้อย',
  ].filter(Boolean) as string[];
  const score = breaches.length + (x.netCashflow < 0 ? 1 : 0);
  return { breaches, grade: GRADES[Math.min(score, GRADES.length - 1)] };
}

/** Says in words what a coloured card means — red alone also means "expense" in this theme. */
export const LevelBadge = ({ level }: { level: RuleLevel }) => {
  if (level === 'ok') return null;
  return <span className={`${PILL} ${LEVEL_PILL[level]}`}>{level === 'over' ? 'เกินเกณฑ์' : 'ใกล้เกณฑ์'}</span>;
};

export function getFoodStatus(pctOfExpense: number) {
  const level = ruleLevel(pctOfExpense, BUDGET_RULES.food.max);
  const label = level === 'over' ? 'สัดส่วนสูง' : level === 'warn' ? 'ปานกลาง' : 'สมดุลดี';
  return { level, label, cls: LEVEL_PILL[level] };
}

/** Where the rule line sits on every meter track; the rest of the track shows how far past it a share went. */
export const METER_RULE_AT = 80;

/**
 * One scale for every rule card: the fill is the share as a fraction of its limit, the tick is the limit.
 * Same length on two cards = same distance from their rules.
 */
export const RuleMeter = ({ pct, max, level, toneBar }: { pct: number; max: number; level: RuleLevel; toneBar: string }) => {
  const width = Math.min(100, Math.max(0, (pct / max) * METER_RULE_AT));
  const fill = level === 'over' ? 'bg-danger' : level === 'warn' ? 'bg-warn' : toneBar;
  return (
    <div className="relative w-full h-1.5 bg-surface-elevated/60" aria-hidden="true">
      <div className={`absolute left-0 top-0 h-full ${fill}`} style={{ width: `${width}%` }} />
      <div className="absolute inset-y-0 w-px bg-ink-muted" style={{ left: `${METER_RULE_AT}%` }} />
    </div>
  );
};

/** Colours a rule card uses while it is within its rule. */
export interface CardTone { text: string; bar: string }

export const CARD_TONES = {
  rent:         { text: 'text-info',       bar: 'bg-info' },
  subscription: { text: 'text-purple-400', bar: 'bg-purple-400' },
  want:         { text: 'text-warn',       bar: 'bg-warn' },
  food:         { text: 'text-orange-400', bar: 'bg-orange-400' },
} as const satisfies Record<string, CardTone>;

/** Left edge bar of a rule card: only a broken rule gets one (red), so a coloured edge always means a counted breach. */
export const ruleEdge = (level: RuleLevel) => (level === 'over' ? 'bg-danger' : undefined);

/** The body every rule card shares: share of its base, the amount behind it, and the meter against the rule. */
export const RuleHero = ({ pct, base, amount, max, level, tone, hasBase = true, children }: {
  pct: number;
  /** "ของรายรับ" / "ของรายจ่าย" */
  base: string;
  amount: number;
  max: number;
  level: RuleLevel;
  tone: CardTone;
  /** false when the base is zero (no income): the share is meaningless, so it says so instead of 0%. */
  hasBase?: boolean;
  children?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-2">
      {hasBase ? (
        <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${level === 'over' ? 'text-danger' : tone.text}`}>
          {pct.toFixed(1)}%
          <span className="text-xs text-ink-muted font-normal ml-1">{base}</span>
        </div>
      ) : (
        <div className="text-[13px] font-semibold text-ink-muted leading-none">ไม่มีรายรับให้เทียบ</div>
      )}
      <div className="text-xs font-semibold text-ink-body tabular-nums">{formatBaht(amount)}</div>
    </div>
    {hasBase && <RuleMeter pct={pct} max={max} level={level} toneBar={tone.bar} />}
    {children}
  </div>
);

/** Footer row of a rule card: the rule itself. */
export const RuleFooter = ({ max, base }: { max: number; base: string }) => (
  <div className="flex items-center justify-between text-[11px] text-ink-muted leading-none">
    <span>เกณฑ์ (ขีดบนแถบ)</span>
    <span className="text-ink-soft font-semibold tabular-nums">&lt; {max}% {base}</span>
  </div>
);

/** One labelled number in a card's detail grid. */
export const StatCell = ({ icon, label, value, sub, wide = false, valueClassName = 'text-ink-display' }: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  wide?: boolean;
  valueClassName?: string;
}) => (
  <div className={`bg-canvas px-2 py-1 flex text-left min-w-0 ${wide ? 'col-span-2 items-center justify-between gap-2' : 'flex-col justify-center'}`}>
    <span className="text-[11px] font-medium text-ink-muted truncate flex items-center gap-1.5 leading-tight">
      {icon}{label}
    </span>
    <div className={`flex items-baseline gap-1 leading-tight ${wide ? '' : 'mt-1'}`}>
      <span className={`text-[13px] font-bold tabular-nums ${valueClassName}`}>{value}</span>
      {sub && <span className="text-[11px] text-ink-muted">{sub}</span>}
    </div>
  </div>
);

/** Shown in a detail grid when there is nothing to break down. */
export const EmptyCell = ({ text }: { text: string }) => (
  <div className="col-span-2 bg-canvas p-2 text-center text-[11px] text-ink-muted flex items-center justify-center">
    {text}
  </div>
);

export function renderTopItemsOverlay(
  entries: BreakdownEntry[],
  emptyLabel: string,
  totalIcon: LucideIcon,
  totalIconColorClass: string,
  totalLabel: string,
  totalAmount: number
): React.ReactNode {
  if (entries.length === 0) return <EmptyCell text={emptyLabel} />;

  const glyph = (e: BreakdownEntry) => <CategoryGlyph icon={e.icon} color={e.iconColor} size={13} />;
  const item = (e: BreakdownEntry, wide: boolean) => (
    <StatCell key={e.key} wide={wide} icon={glyph(e)} label={e.label} value={formatBaht(e.amount)} sub={`(${e.pctLabel})`} />
  );

  const TotalIcon = totalIcon;
  const totalCell = (wide: boolean, showPct: boolean) => (
    <StatCell
      key="total" wide={wide}
      icon={<TotalIcon size={13} className={`shrink-0 ${totalIconColorClass}`} />}
      label={totalLabel} value={formatBaht(totalAmount)} sub={showPct ? '(100%)' : undefined}
    />
  );

  if (entries.length === 1) return item(entries[0], true);
  const itemCells = entries.map(e => item(e, false));
  if (entries.length === 2) return <>{itemCells}{totalCell(true, false)}</>;
  if (entries.length === 3) return <>{itemCells}{totalCell(false, true)}</>;
  return itemCells;
}
