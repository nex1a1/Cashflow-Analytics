// src/views/Dashboard/components/CashflowTable/CashflowTableSummaryCells.tsx
import React from 'react';
import { formatMoney } from '@/utils/formatters';
import { getSummaryCellBg, renderMoMBadge } from './helpers';
import {
  SummaryTrendCellProps,
  SummaryNetCellProps,
  SummaryPctLeftCellProps,
  SummaryPctSpentCellProps,
  RowSummaryCellsProps,
} from './types';

function SummaryTrendCell({
  isExcluded, isTrendHovered, isRowHovered, thinBorder,
  currentAdjustedExpense, prevAdjustedExpense, onHover,
}: SummaryTrendCellProps) {
  const expMoMJSX = !isExcluded ? renderMoMBadge(currentAdjustedExpense, prevAdjustedExpense) : null;
  let bgCls = 'text-expense bg-canvas group-hover:bg-surface-hover';
  if (isExcluded) {
    bgCls = 'text-neutral-700 bg-canvas opacity-25 select-none line-through';
  } else if (isTrendHovered) {
    bgCls = 'text-expense bg-surface-hover';
  } else if (isRowHovered) {
    bgCls = 'text-accent bg-surface-hover/80';
  }

  return (
    <td
      onMouseEnter={() => onHover('trend')}
      onMouseLeave={() => onHover(null)}
      className={`px-3 py-2 font-bold border-l-2 !border-l-line-strong border-b ${thinBorder} sticky right-[250px] z-10 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.35)] transition-colors w-[155px] min-w-[155px] max-w-[155px] ${bgCls}`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="shrink-0">{expMoMJSX}</div>
        <span className="text-[13px] font-bold">{formatMoney(currentAdjustedExpense)}</span>
      </div>
    </td>
  );
}

function SummaryNetCell({ isExcluded, isNetHovered, isRowHovered, thinBorder, netAmount, onHover }: SummaryNetCellProps) {
  const isDeficit = !isExcluded && netAmount < 0;
  let netColor = '';
  if (!isExcluded) netColor = netAmount >= 0 ? 'text-emerald-400' : 'text-danger';
  let bgCls = getSummaryCellBg(isExcluded, isNetHovered, isRowHovered);
  if (isDeficit) {
    bgCls = isNetHovered || isRowHovered
      ? 'bg-expense/10 text-expense'
      : 'bg-expense/5 text-expense';
  }

  return (
    <td
      onMouseEnter={() => onHover('net')}
      onMouseLeave={() => onHover(null)}
      className={`px-3 py-2 font-black border-l border-b ${thinBorder} sticky right-[140px] z-10 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${bgCls} ${netColor} ${
        isDeficit ? 'shadow-[inset_0_0_0_1px_rgba(244,63,94,0.2)]' : ''
      }`}
    >
      {formatMoney(netAmount)}
    </td>
  );
}

function SummaryPctLeftCell({
  isExcluded, isPctLeftHovered, isRowHovered, thinBorder,
  currentAdjustedIncome, netAmount, onHover,
}: SummaryPctLeftCellProps) {
  let pctLeftColor = '';
  if (!isExcluded) {
    pctLeftColor = currentAdjustedIncome > 0 && netAmount < 0 ? 'text-danger' : 'text-emerald-400';
  }
  const pctLeftText =
    currentAdjustedIncome > 0 ? ((netAmount / currentAdjustedIncome) * 100).toFixed(1) + '%' : '0.0%';
  const bgCls = getSummaryCellBg(isExcluded, isPctLeftHovered, isRowHovered);

  return (
    <td
      onMouseEnter={() => onHover('pct-left')}
      onMouseLeave={() => onHover(null)}
      className={`px-2 py-2 font-black border-l border-b text-center ${thinBorder} sticky right-[70px] z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${bgCls} ${pctLeftColor}`}
    >
      {pctLeftText}
    </td>
  );
}

function SummaryPctSpentCell({
  isExcluded, isPctSpentHovered, isRowHovered, thinBorder,
  currentAdjustedIncome, currentAdjustedExpense, onHover,
}: SummaryPctSpentCellProps) {
  let pctSpentColor = '';
  if (!isExcluded) {
    const isOverSpent = currentAdjustedIncome > 0 && currentAdjustedExpense / currentAdjustedIncome * 100 > 100;
    pctSpentColor = isOverSpent ? 'text-danger' : 'text-neutral-200';
  }
  const pctSpentText =
    currentAdjustedIncome > 0
      ? ((currentAdjustedExpense / currentAdjustedIncome) * 100).toFixed(1) + '%'
      : '-';
  const bgCls = getSummaryCellBg(isExcluded, isPctSpentHovered, isRowHovered);

  return (
    <td
      onMouseEnter={() => onHover('pct-spent')}
      onMouseLeave={() => onHover(null)}
      className={`px-2 py-2 font-black border-l border-r border-b text-center ${thinBorder} sticky right-0 z-10 transition-colors w-[70px] min-w-[70px] max-w-[70px] ${bgCls} ${pctSpentColor}`}
    >
      {pctSpentText}
    </td>
  );
}

export function CashflowTableRowSummaryCells({
  currentAdjustedIncome, currentAdjustedExpense, prevAdjustedExpense,
  isExcluded, isRowHovered, hoveredCol, setHoveredCol, thinBorder,
}: RowSummaryCellsProps) {
  const netAmount = currentAdjustedIncome - currentAdjustedExpense;

  return (
    <>
      <SummaryTrendCell
        isExcluded={isExcluded}
        isTrendHovered={hoveredCol === 'trend'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        currentAdjustedExpense={currentAdjustedExpense}
        prevAdjustedExpense={prevAdjustedExpense}
        onHover={setHoveredCol}
      />
      <SummaryNetCell
        isExcluded={isExcluded}
        isNetHovered={hoveredCol === 'net'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        netAmount={netAmount}
        onHover={setHoveredCol}
      />
      <SummaryPctLeftCell
        isExcluded={isExcluded}
        isPctLeftHovered={hoveredCol === 'pct-left'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        currentAdjustedIncome={currentAdjustedIncome}
        netAmount={netAmount}
        onHover={setHoveredCol}
      />
      <SummaryPctSpentCell
        isExcluded={isExcluded}
        isPctSpentHovered={hoveredCol === 'pct-spent'}
        isRowHovered={isRowHovered}
        thinBorder={thinBorder}
        currentAdjustedIncome={currentAdjustedIncome}
        currentAdjustedExpense={currentAdjustedExpense}
        onHover={setHoveredCol}
      />
    </>
  );
}
