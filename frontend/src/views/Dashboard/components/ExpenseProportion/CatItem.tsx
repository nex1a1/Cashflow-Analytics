// src/views/Dashboard/components/ExpenseProportion/CatItem.tsx
import React from 'react';
import { formatMoney, formatBaht } from '../../../../utils/formatters';
import { CatItemProps } from './types';
import CategoryGlyph from '../../../../components/shared/CategoryGlyph';
import { readable } from '@/constants/theme';
import { planOf } from './proportionHelpers';

/** hatched look of future-dated money, same as the plan tail everywhere else */
const PLAN_HATCH = 'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.09) 0 2px, transparent 2px 6px)';

/**
 * One category as a dense ranked row. The neutral wash behind it is its amount
 * against the biggest category (the Top Transactions idiom), ending in a 2px tip
 * of the category colour so the row links to its segment in the strip above.
 */
export const CatItem = React.memo<CatItemProps>(({ cat, idx, isHovered, onHover, maxAmount }) => {
  const plan = planOf(cat);
  const washPct = maxAmount > 0 ? (cat.amount / maxAmount) * 100 : 0;
  const planPct = maxAmount > 0 ? (plan / maxAmount) * 100 : 0;
  return (
    <div
      onMouseEnter={() => onHover(idx)}
      onMouseLeave={() => onHover(-1)}
      onFocus={() => onHover(idx)}
      onBlur={() => onHover(-1)}
      tabIndex={0}
      aria-label={`${cat.name}: ${formatBaht(cat.amount)} (${cat.percentage}%)${plan > 0 ? ` — แผนที่ยังไม่ถึง ${formatBaht(plan)}` : ''}`}
      className={`relative flex items-center gap-2 min-h-8 px-2.5 min-w-0 cursor-default outline-hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ink ${
        isHovered ? 'bg-surface-hover' : 'bg-surface'
      }`}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute inset-y-0 left-0 flex" style={{ width: `${washPct}%` }}>
          <div className={`h-full flex-1 ${isHovered ? 'bg-white/8' : 'bg-white/4'}`} />
          {planPct > 0 && <div className="h-full shrink-0" style={{ width: `${(planPct / washPct) * 100}%`, backgroundImage: PLAN_HATCH }} />}
        </div>
        {washPct > 0 && (
          <div className="absolute inset-y-0 w-[2px]" style={{ left: `calc(${washPct}% - 2px)`, backgroundColor: cat.color }} />
        )}
      </div>

      <CategoryGlyph icon={cat.icon} color={cat.color} size={14} className="relative shrink-0" />
      <span
        className={`relative flex-1 min-w-0 truncate text-[12px] font-bold ${isHovered ? 'text-ink-display' : 'text-ink-soft'}`}
        title={cat.name}
      >
        {cat.name}
      </span>
      {plan > 0 && (
        <span className="relative shrink-0 text-[11px] tabular-nums text-ink-muted" title="ส่วนที่ลงล่วงหน้า ยังไม่ถึงวันที่">
          แผน {formatMoney(plan)}
        </span>
      )}
      <span className="relative shrink-0 text-[11px] font-bold tabular-nums text-ink-body">{formatMoney(cat.amount)}</span>
      <span className="relative shrink-0 w-[46px] text-right text-[12px] font-black tabular-nums" style={{ color: readable(cat.color) }}>
        {cat.percentage}%
      </span>
    </div>
  );
});

CatItem.displayName = 'CatItem';
