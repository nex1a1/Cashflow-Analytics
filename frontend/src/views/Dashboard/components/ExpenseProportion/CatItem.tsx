// src/views/Dashboard/components/ExpenseProportion/CatItem.tsx
import React from 'react';
import { formatMoney } from '../../../../utils/formatters';
import { CatItemProps } from './types';
import CategoryGlyph from '../../../../components/shared/CategoryGlyph';

import { tc, readable } from '@/constants/theme';
/**
 * Sub-component for individual category cell (Table-like HUD)
 */
export const CatItem = React.memo<CatItemProps>(({ cat, idx, isHovered, onHover }) => (
  <div
    onMouseEnter={() => onHover(idx)}
    onMouseLeave={() => onHover(-1)}
    onFocus={() => onHover(idx)}
    onBlur={() => onHover(-1)}
    tabIndex={0}
    aria-label={`${cat.name}: ฿${formatMoney(cat.amount)} (${cat.percentage}%)`}
    className={`relative overflow-hidden flex flex-col min-w-0 p-2 group cursor-default h-full border-l-2 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
      isHovered
        ? 'bg-surface-elevated/90 border-accent z-10'
        : 'bg-canvas/45 hover:bg-surface-elevated/90 border-line'
    }`}
    style={{ borderLeftColor: isHovered ? undefined : cat.color }}
  >
    {/* Large watermark glyph fills the cell's leftover vertical space now that rows are taller. */}
    <CategoryGlyph
      icon={cat.icon}
      color={cat.color}
      size={48}
      className="absolute right-1 top-1/2 -translate-y-1/2 opacity-[0.1] group-hover:opacity-[0.18] pointer-events-none"
    />

    <div className="relative flex justify-between items-start gap-1 mb-1">
      <span
        className="text-[12px] font-black truncate flex items-center gap-1.5 min-w-0"
        style={{ color: tc('ink-body') }}
        title={cat.name}
      >
        <CategoryGlyph icon={cat.icon} color={cat.color} size={16} className="shrink-0 leading-none" />
        <span className="truncate group-hover:text-accent uppercase tracking-tight">{cat.name}</span>
      </span>
      <div className="flex flex-col items-end shrink-0 leading-none">
        <span className="text-[11px] font-bold tabular-nums mb-0.5" style={{ color: tc('ink-body') }}>
          {formatMoney(cat.amount)}
        </span>
        <span className="text-xs font-black tabular-nums" style={{ color: readable(cat.color) }}>{cat.percentage}%</span>
      </div>
    </div>

    <div className="relative mt-auto flex flex-col gap-1">
      <div className="w-full rounded-none h-[4px] overflow-hidden bg-canvas">
        <div
          className="h-full"
          style={{
            width: `${cat.percentage}%`,
            backgroundColor: cat.color,
            opacity: 0.9
          }}
        />
      </div>
    </div>
  </div>
));

CatItem.displayName = 'CatItem';
export default CatItem;
