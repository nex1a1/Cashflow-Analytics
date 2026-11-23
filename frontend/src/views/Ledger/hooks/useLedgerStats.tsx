import React, { useMemo, useState } from 'react';
import { TransactionDisplay, Category, CashflowGroup } from '../../../types';
import CategoryGlyph from '../../../components/shared/CategoryGlyph';
import { monthKeyOf } from '../../../utils/payCycle';
import { formatBaht } from '../../../utils/formatters';
import { buildCatTypeMap, sumIncomeExpense } from '../ledgerMath';

import { tc, readable } from '@/constants/theme';
interface GroupBreakdownCategory {
  id: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  amount: number;
}

interface GroupBreakdown {
  total: number;
  txCount: number;
  categories: Record<string, GroupBreakdownCategory>;
}

interface LedgerStatsProps {
  displayTransactions?: TransactionDisplay[];
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  formatMoney: (val: number | string) => string;
  advancedFilterGroup?: string;
  setAdvancedFilterGroup?: (groupId: string) => void;
  allDatesInPeriod?: string[];
  filterPeriod?: string;
}

function resolveGroupPct(isIncome: boolean, isSavings: boolean, total: number, sumInc: number, sumExp: number) {
  if (isIncome || isSavings) {
    return sumInc > 0 ? ((total / sumInc) * 100).toFixed(1) : '0.0';
  }
  return sumExp > 0 ? ((total / sumExp) * 100).toFixed(1) : '0.0';
}

function resolveCardTheme(g: CashflowGroup, isIncome: boolean, isSavings: boolean) {
  if (isIncome) {
    return {
      activeBgColor: 'bg-income/5',
      defaultColor: tc('income'),
      amtColor: 'text-income',
      amtSign: '+',
      iconFallback: 'coins'
    };
  }
  if (isSavings) {
    return {
      activeBgColor: 'bg-savings/10',
      defaultColor: tc('savings'),
      amtColor: 'text-savings',
      amtSign: '±',
      iconFallback: 'piggy-bank'
    };
  }
  return {
    activeBgColor: 'bg-expense/5',
    defaultColor: g.color || tc('ink-muted'),
    amtColor: 'text-expense',
    amtSign: '−',
    iconFallback: 'trending-down'
  };
}

/** Categories shown in a collapsed row; the rest sit behind a "+N" toggle. */
const COLLAPSED_CATS = 4;

interface LedgerStatCategoryChipProps {
  cat: GroupBreakdownCategory;
  total: number;
  defaultColor: string;
}

const LedgerStatCategoryChip: React.FC<LedgerStatCategoryChipProps> = ({ cat, total, defaultColor }) => {
  const relativePct = total > 0 ? Math.round((cat.amount / total) * 100) : 0;
  const catColor = cat.color || defaultColor;

  return (
    <span data-cat className="inline-flex items-center gap-1.5 min-w-0 text-[11px] font-bold leading-none" style={{ color: catColor }}>
      <CategoryGlyph icon={cat.icon} color={catColor} size={11} fallbackEmoji="sparkles" />
      <span data-cat-name className="truncate max-w-[10rem] font-black">{cat.name}</span>
      <span className="font-mono tabular-nums opacity-80">{relativePct}%</span>
      <span className="font-mono tabular-nums font-extrabold">{formatBaht(cat.amount)}</span>
    </span>
  );
};

interface LedgerStatCardProps {
  g: CashflowGroup;
  breakdown: GroupBreakdown;
  sumInc: number;
  sumExp: number;
  uniqueMonths: number;
  formatMoney: (val: number | string) => string;
  isActive: boolean;
  isSavings: boolean;
  onCardClick: () => void;
}

/** One cashflow group as a single table-like line: the button (name → count) filters the Ledger,
 *  the category chips to its right fold behind "+N" when there are many. */
const LedgerStatCard: React.FC<LedgerStatCardProps> = ({
  g,
  breakdown,
  sumInc,
  sumExp,
  uniqueMonths,
  isActive,
  isSavings,
  onCardClick
}) => {
  const [showAllCats, setShowAllCats] = useState(false);
  const total = breakdown?.total || 0;
  const txCount = breakdown?.txCount || 0;
  const isIncome = g.type === 'income';
  const perMonth = uniqueMonths > 1;

  const pctOfTotal = resolveGroupPct(isIncome, isSavings, total, sumInc, sumExp);
  const theme = resolveCardTheme(g, isIncome, isSavings);
  const groupColor = g.color || theme.defaultColor;
  const barWidth = Math.min(100, Math.max(0, Number(pctOfTotal)));

  const sortedCats = Object.values(breakdown?.categories || {})
    .filter(c => c.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const hiddenCats = Math.max(0, sortedCats.length - COLLAPSED_CATS);
  const shownCats = showAllCats ? sortedCats : sortedCats.slice(0, COLLAPSED_CATS);

  return (
    <div
      className={`group relative grid ${perMonth ? 'grid-cols-[minmax(0,12rem)_8rem_7.5rem_5rem_7.5rem_minmax(0,1fr)]' : 'grid-cols-[minmax(0,12rem)_8rem_7.5rem_5rem_minmax(0,1fr)]'} items-center gap-x-4 pl-3.5 pr-3 py-1.5 ${
        isActive ? theme.activeBgColor : 'hover:bg-surface-hover'
      }`}
    >
      <span
        className={`absolute left-0 inset-y-0 w-[3px] ${isActive ? '' : 'opacity-60'}`}
        style={{ backgroundColor: groupColor }}
      />
      <button
        type="button"
        onClick={onCardClick}
        aria-pressed={isActive}
        className={`${perMonth ? 'col-span-5' : 'col-span-4'} grid grid-cols-subgrid items-center text-left cursor-pointer select-none`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className="w-[22px] h-[22px] flex items-center justify-center border shrink-0"
            style={{ backgroundColor: `${groupColor}20`, borderColor: `${groupColor}30` }}
          >
            <CategoryGlyph icon={g.icon} color={groupColor} size={13} fallbackEmoji={theme.iconFallback} />
          </span>
          <span
            className={`text-[12px] font-black truncate overflow-x-clip ${isActive ? 'text-ink-display' : 'text-ink-soft group-hover:text-ink-display'}`}
            title={g.name}
          >
            {g.name}
          </span>
        </span>

        <span
          className={`text-right font-mono text-[13px] font-black tabular-nums tracking-tight truncate ${theme.amtColor}`}
          title={`${theme.amtSign}${formatBaht(total)}`}
        >
          {theme.amtSign}{formatBaht(total)}
        </span>

        <span className="flex items-center gap-2">
          <span className="relative h-1.5 flex-1 bg-line/40">
            <span className="absolute inset-y-0 left-0" style={{ width: `${barWidth}%`, backgroundColor: groupColor }} />
          </span>
          <span data-share className="w-11 text-right font-mono text-[11px] font-black tabular-nums text-ink-body">
            {pctOfTotal}%
          </span>
        </span>

        <span className="text-right text-[11px] font-bold tabular-nums text-ink-muted">{txCount} รายการ</span>

        {perMonth && (
          <span className="text-right font-mono text-[11px] font-bold tabular-nums text-ink-muted truncate" title={`${formatBaht(total / uniqueMonths)}/เดือน`}>
            {formatBaht(total / uniqueMonths)}/ด.
          </span>
        )}
      </button>

      <div data-cats className={`flex items-center gap-x-4 gap-y-1.5 min-w-0 ${showAllCats ? 'flex-wrap' : 'overflow-x-clip'}`}>
        {shownCats.map(cat => (
          <LedgerStatCategoryChip key={cat.id} cat={cat} total={total} defaultColor={readable(groupColor)} />
        ))}
        {hiddenCats > 0 && (
          <button
            type="button"
            onClick={() => setShowAllCats(v => !v)}
            aria-expanded={showAllCats}
            className="shrink-0 px-1.5 py-0.5 rounded-pill border border-line text-[11px] font-black tabular-nums text-ink-muted hover:text-ink-display cursor-pointer"
            title={showAllCats ? 'ย่อรายการหมวด' : `ดูอีก ${hiddenCats} หมวด`}
          >
            {showAllCats ? 'ย่อ' : `+${hiddenCats}`}
          </button>
        )}
      </div>
    </div>
  );
};

export function useLedgerStats({
  displayTransactions = [],
  categories = [],
  cashflowGroups = [],
  formatMoney,
  advancedFilterGroup,
  setAdvancedFilterGroup,
  allDatesInPeriod = [],
  filterPeriod = ''
}: LedgerStatsProps) {
  const catTypeMap = useMemo(() => buildCatTypeMap(categories), [categories]);

  const { sumInc, sumExp, sumSav } = useMemo(() => {
    const { inc, exp, sav } = sumIncomeExpense(displayTransactions, catTypeMap);
    return { sumInc: inc, sumExp: exp, sumSav: sav };
  }, [displayTransactions, catTypeMap]);

  const net = sumInc - sumExp;
  const savingsRate = useMemo(() => {
    return sumInc > 0 ? Math.round((net / sumInc) * 100) : 0;
  }, [sumInc, net]);

  // ─── Logic: Aggregate Data by Cashflow Groups & Categories ───
  const groupBreakdowns = useMemo(() => {
    const breakdowns: Record<string, GroupBreakdown> = {};
    
    // Pre-initialize breakdowns for all cashflowGroups
    cashflowGroups.forEach(g => {
      breakdowns[g.id] = {
        total: 0,
        txCount: 0,
        categories: {}
      };
    });

    displayTransactions.forEach(t => {
      const cat = categories.find(c => c.id === t.category_id) || categories.find(c => c.name === t.category);
      if (cat) {
        const groupId = cat.cashflow_group_id || (cat as any).cashflowGroup;
        if (groupId && breakdowns[groupId]) {
          const amt = Number.parseFloat(t.amount as any) || 0;
          breakdowns[groupId].total += amt;
          breakdowns[groupId].txCount += 1;
          
          if (!breakdowns[groupId].categories[cat.id]) {
            breakdowns[groupId].categories[cat.id] = {
              id: cat.id,
              name: cat.name,
              icon: cat.icon,
              color: readable(cat.color),
              amount: 0
            };
          }
          breakdowns[groupId].categories[cat.id].amount += amt;
        }
      }
    });

    return breakdowns;
  }, [displayTransactions, categories, cashflowGroups]);

  // Calculate Monthly Average if period is long (months = pay cycles in cycle mode)
  const uniqueMonths = useMemo(() => {
    const months = new Set<string>();
    displayTransactions.forEach(t => {
      if (t.date) months.add(monthKeyOf(t.date, filterPeriod));
    });
    return months.size;
  }, [displayTransactions, filterPeriod]);

  const periodDays = Math.max(1, allDatesInPeriod?.length || 1);

  const getSubValue = (total: number) => {
    if (uniqueMonths > 1) {
      return `เฉลี่ย ${formatBaht(total / uniqueMonths)} / เดือน`;
    }
    return `เฉลี่ย ${formatBaht(total / periodDays)} / วัน`;
  };

  const renderCard = (g: CashflowGroup) => (
    <LedgerStatCard
      key={g.id}
      g={g}
      breakdown={groupBreakdowns[g.id]}
      sumInc={sumInc}
      sumExp={sumExp}
      uniqueMonths={uniqueMonths}
      formatMoney={formatMoney}
      isActive={advancedFilterGroup === g.id}
      isSavings={isSavingsGroup(g)}
      onCardClick={() => {
        if (setAdvancedFilterGroup) {
          setAdvancedFilterGroup(advancedFilterGroup === g.id ? 'ALL' : g.id);
        }
      }}
    />
  );

  // The group's type decides (item 36). Guessing from the name listed an income group called
  // "รายได้จากการลงทุน" under savings as well, and made "ค่าลงทุนธุรกิจ" a savings card.
  const isSavingsGroup = (g: CashflowGroup) => g.type === 'savings';
  const isIncomeGroup = (g: CashflowGroup) => g.type === 'income';
  const isExpenseGroup = (g: CashflowGroup) => !isIncomeGroup(g) && !isSavingsGroup(g);

  const activeIncomeCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isIncomeGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  const activeSavingsCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isSavingsGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  const activeExpenseCards = useMemo(() => {
    return cashflowGroups
      .filter(g => isExpenseGroup(g) && (groupBreakdowns[g.id]?.total || 0) > 0)
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
      .map(g => renderCard(g));
  }, [cashflowGroups, groupBreakdowns, uniqueMonths, formatMoney, sumInc, sumExp, advancedFilterGroup, setAdvancedFilterGroup]);

  return {
    sumInc,
    sumExp,
    sumSav,
    net,
    savingsRate,
    activeIncomeCards,
    activeSavingsCards,
    activeExpenseCards,
    getSubValue,
    catTypeMap
  };
}
