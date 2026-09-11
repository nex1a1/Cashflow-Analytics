// src/views/Dashboard/components/ExpenseProportion/CatItem.tsx
import React from 'react';
import { formatMoney } from '../../../../utils/formatters';
import { CatItemProps } from './types';
import CategoryGlyph from '../../../../components/shared/CategoryGlyph';

/**
 * Sub-component for individual category cell (Table-like HUD)
 */
export const CatItem = React.memo<CatItemProps>(({ cat, idx, isHovered, onHover }) => (
  <div 
    onMouseEnter={() => onHover(idx)}
    onMouseLeave={() => onHover(-1)}
    className={`flex flex-col min-w-0 p-2 group cursor-default h-full border-l-2 ${
      isHovered 
        ? 'bg-[#303030]/90 border-[#da291c] shadow-md z-10'
        : 'bg-[#181818]/45 hover:bg-[#303030]/90 border-[#303030]'
    }`}
    style={{ borderLeftColor: isHovered ? undefined : cat.color }}
  >
    <div className="flex justify-between items-start gap-1 mb-1">
      <span 
        className="text-[12px] font-black truncate flex items-center gap-1 min-w-0" 
        style={{ color: '#94a3b8' }}
        title={cat.name}
      >
        <CategoryGlyph icon={cat.icon} color={cat.color} size={14} className="shrink-0 leading-none" />
        <span className="truncate group-hover:text-[#da291c] uppercase tracking-tight">{cat.name}</span>
      </span>
      <div className="flex flex-col items-end shrink-0 leading-none">
        <span className="text-[10px] font-bold tabular-nums opacity-60 mb-0.5" style={{ color: '#cbd5e1' }}>
          {formatMoney(cat.amount)}
        </span>
        <span className="text-xs font-black tabular-nums" style={{ color: cat.color }}>{cat.percentage}%</span>
      </div>
    </div>
    
    <div className="mt-auto flex flex-col gap-1">
      <div className="w-full rounded-none h-[4px] overflow-hidden bg-[#181818]">
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
