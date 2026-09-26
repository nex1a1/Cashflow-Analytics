import React, { memo } from 'react';
import { hexToRgb, formatMoney } from '../../../../utils/formatters';
import { Category, TransactionDisplay } from '../../../../types';

import { tc } from '@/constants/theme';
interface HeatmapCellProps {
  idx: number;
  date: string;
  cat: Category;
  items: TransactionDisplay[];
  cellSum: number;
  intensity: number;
  border: string;
  ROW_H: number | string;
  maxCellValue: number;
  handleCellHover: (e: React.SyntheticEvent<HTMLTableCellElement>, date: string, catId: string, cat: Category, items: TransactionDisplay[]) => void;
  handleCellLeave: () => void;
  formatMoney: (val: number | string) => string;
}

// Arrow keys jump to the nearest focusable data cell in that direction (empty cells are skipped).
const moveFocus = (e: React.KeyboardEvent<HTMLTableCellElement>) => {
  const dir = { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }[e.key];
  if (!dir) return;
  e.preventDefault();
  const td = e.currentTarget;
  const rows = Array.from(td.closest('tbody')?.rows ?? []);
  let r = rows.indexOf(td.parentElement as HTMLTableRowElement);
  let c = td.cellIndex;
  for (;;) {
    r += dir[0]; c += dir[1];
    const next = rows[r]?.cells[c];
    if (!next) return;
    if (next.tabIndex === 0) { next.focus(); next.scrollIntoView({ block: 'nearest', inline: 'nearest' }); return; }
  }
};

const HeatmapCell = memo(function HeatmapCell({
  idx, date, cat, items, cellSum, intensity,
  border, ROW_H, maxCellValue,
  handleCellHover, handleCellLeave, formatMoney
}: HeatmapCellProps) {
  const hasData = items.length > 0;
  const barW = hasData ? Math.max(8, Math.round(intensity * 125)) : 0;
  const sz = Math.min(14.5, 12.5 + Math.round(intensity * 2));

  return (
    <td
      className={`heatmap-cell col-idx-${idx}`}
      style={{
        background: 'transparent',
        borderBottom: `1px solid ${border}`,
        borderRight: `1px solid ${border}`,
        textAlign: 'center',
        padding: 0,
        cursor: hasData ? 'pointer' : 'default',
        height: ROW_H,
        overflow: 'hidden',
        position: 'relative',
        '--cat-color': cat.color,
        '--cat-color-rgb': hexToRgb(cat.color || '#000000'),
      } as React.CSSProperties}
      onMouseEnter={(e) => handleCellHover(e, date, cat.id, cat, items)}
      tabIndex={hasData ? 0 : undefined}
      aria-label={hasData ? `${date} ${cat.name} ฿${formatMoney(cellSum)} (${items.length} รายการ)` : undefined}
      onFocus={hasData ? (e) => handleCellHover(e, date, cat.id, cat, items) : undefined}
      onBlur={hasData ? handleCellLeave : undefined}
      onKeyDown={hasData ? moveFocus : undefined}
    >
      {hasData ? (
        <div style={{
          position: 'relative',
          height: '100%',
          minHeight: '30px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: `rgba(${hexToRgb(cat.color || '#000000')}, ${intensity * 0.45})`,
          padding: '2px 4px',
        }}>
          {items.length > 1 && (
            <span style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '11px',
              fontWeight: 900,
              lineHeight: 1,
              color: cat.color || undefined,
              filter: 'brightness(1.5)',
              opacity: 0.9,
              background: `rgba(${hexToRgb(cat.color || '#000000')}, 0.2)`,
              borderRadius: 0,
              padding: '1px 3px',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}>
              ×{items.length}
            </span>
          )}

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'baseline',
            justifyContent: 'center',
            width: '100%',
            marginTop: items.length > 1 ? '3px' : '0',
            overflow: 'hidden',
          }}>
            <span style={{
              fontSize: `${sz}px`,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              color: cat.color || undefined,
              filter: 'brightness(1.8) saturate(1.2)',
              lineHeight: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 0,
              letterSpacing: '-0.01em',
              textShadow: intensity > 0.4
                ? `0 1px 2px ${'rgba(0,0,0,0.6)'}`
                : 'none',
              transform: 'scale(1)',
            }}>
              {formatMoney(cellSum)}
            </span>
          </div>
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${barW}%`,
            height: 2,
            borderRadius: 0,
            background: `rgba(${hexToRgb(cat.color || '#000000')}, 0.85)`,
          }} />
        </div>
      ) : (
        <span style={{ fontSize: 11, opacity: 0.15, color: tc('ink-body'), lineHeight: 1 }}>·</span>
      )}
    </td>
  );
});

export default HeatmapCell;
