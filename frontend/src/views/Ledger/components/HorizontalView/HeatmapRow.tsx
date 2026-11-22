import React, { memo } from 'react';
import { hexToRgb } from '../../../../utils/formatters';
import HeatmapCell from './HeatmapCell';
import { resolveDefaultDayTypeId } from '@/views/Calendar/utils/calendarPeriodHelpers';
import { Category, TransactionDisplay, DayType } from '../../../../types';

import { tc, readable, TOKENS } from '@/constants/theme';
const EMPTY_ARRAY: TransactionDisplay[] = [];

interface HeatmapRowProps {
  date: string;
  rowIdx: number;
  day: number | string;
  month: string;
  dayName: string;
  isWeekend: boolean;
  isToday?: boolean;
  /** not reached yet: an empty row here means "not yet", not "spent nothing", so the date dims */
  isFuture?: boolean;
  /** cycle mode: spending since the cycle started, up to and including this day */
  sinceStart?: number;
  dailyTotal: Record<string, number>;
  grandTotal: number;
  cellMap: Record<string, Record<string, TransactionDisplay[]>>;
  activeCategories: Category[];
  /** many narrow columns: smaller cell numbers */
  dense?: boolean;
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
  handleCellLeave: () => void;
  handleCellHover: (e: React.SyntheticEvent<HTMLTableCellElement>, date: string, catId: string, cat: Category, items: TransactionDisplay[]) => void;
  handleCellPin: (e: React.SyntheticEvent<HTMLTableCellElement>, date: string, catId: string, cat: Category, items: TransactionDisplay[]) => void;
  bgBase: string;
  border: string;
  ROW_H: number | string;
  maxCellValue: number;
  maxDailyTotal: number;
  formatMoney: (val: number | string) => string;
}

const HeatmapRow = memo(function HeatmapRow({
  date, rowIdx, day, month, dayName, isWeekend, isToday = false, isFuture = false, sinceStart,
  dailyTotal, grandTotal, cellMap, activeCategories, dense = false,
  dayTypes, dayTypeConfig,
  handleCellLeave, handleCellHover, handleCellPin,
  bgBase, border, ROW_H, maxCellValue, maxDailyTotal, formatMoney
}: HeatmapRowProps) {
  const total = dailyTotal[date] || 0;

  const curTypeId = dayTypes[date] || resolveDefaultDayTypeId(dayTypeConfig, isWeekend);
  const typeConf  = dayTypeConfig.find(dt => dt.id === curTypeId);
  const typeColor = typeConf?.color || tc('ink-muted');
  const typeRgb   = typeConf?.color ? hexToRgb(typeConf.color) : hexToRgb(TOKENS['ink-muted']);
  // A day with spending always shows at least a sliver; a day with none shows no bar.
  const sparkPct  = total > 0 ? Math.max(4, Math.round((total / maxDailyTotal) * 100)) : 0;

  return (
    <tr className="group/row" style={{ height: ROW_H, background: isToday ? tc('accent', 0.07) : undefined }}
      aria-current={isToday ? 'date' : undefined}
      onMouseLeave={handleCellLeave}
    >
      <td style={{
        position: 'sticky', left: 0, zIndex: 30,
        background: bgBase,
        borderBottom: `1px solid ${border}`,
        borderRight: `1px solid ${border}`,
        boxShadow: '2px 0 5px rgb(0 0 0 / calc(0.25 * var(--shadow-k)))',
        padding: '2px',
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '30px',
          borderRadius: 0,
          overflow: 'hidden',
          background: `rgba(${typeRgb}, 0.08)`,
          borderLeft: `2.5px solid ${typeColor}`,
          padding: '2px 0',
          opacity: isFuture ? 0.4 : undefined,
          // box-shadow, not a border: the global border lock would turn a coloured border into a grey hairline
          boxShadow: isToday ? `inset 0 0 0 1.5px ${tc('accent-ink')}` : undefined,
          '--type-rgb': typeRgb,
        } as React.CSSProperties} >
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${sparkPct}%`,
            background: `rgba(${typeRgb}, 0.18)`,
            borderRadius: 0,
          }} />

          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            lineHeight: 1,
          }}>
            <span style={{
              fontSize: 11,
              fontWeight: 800,
              color: readable(typeColor),
              marginBottom: '1px',
            }}>{dayName}</span>

            <span style={{
              fontSize: 14,
              fontWeight: 900,
              color: readable(typeColor),
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
            }}>
              {day}
              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                marginLeft: '2px',
                textTransform: 'uppercase',
                verticalAlign: 'top',
                display: 'inline-block',
                marginTop: '1px'
              }}>{month}</span>
            </span>
          </div>
        </div>
      </td>

      {activeCategories.map((cat, idx) => {
        const items    = cellMap[date]?.[cat.name] || EMPTY_ARRAY;
        const cellSum  = items.reduce((s, t) => s + (Number.parseFloat(t.amount as any) || 0), 0);
        const intensity = items.length > 0 ? Math.max(0.07, Math.min(0.78, (cellSum / maxCellValue) * 0.72)) : 0;
        
        return (
          <HeatmapCell
            key={cat.id}
            idx={idx}
            date={date} cat={cat} items={items} cellSum={cellSum} intensity={intensity}
            border={border} ROW_H={ROW_H} maxCellValue={maxCellValue} dense={dense}
            handleCellHover={handleCellHover} handleCellPin={handleCellPin} handleCellLeave={handleCellLeave} formatMoney={formatMoney}
          />
        );
      })}

      <td style={{
        position: 'sticky', right: 0, zIndex: 30,
        background: tc('expense', 0.04),
        borderBottom: `1px solid ${border}`,
        borderLeft: `1px solid ${border}`,
        boxShadow: '-2px 0 5px rgb(0 0 0 / calc(0.25 * var(--shadow-k)))',
        padding: dense ? '0 4px' : '0 6px',
        height: ROW_H,
      }}>
        {total > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            width: '100%',
            lineHeight: 1.1,
          }}>
            <span style={{ fontSize: dense ? '11px' : '12px', fontWeight: 700, color: tc('expense') }}>฿</span>
            <span style={{
              fontSize: dense ? '12px' : '13px',
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              color: tc('expense'),
            }}>
              {formatMoney(total)}
            </span>
          </div>
        )}
        {sinceStart !== undefined && sinceStart > 0 && (
          // Shown only while the row is hovered or has focus (today's always shows), so the column stays
          // clean. `invisible` keeps its line reserved: rows don't change height when it appears.
          <div title="ใช้ไปแล้วตั้งแต่ต้นรอบ"
            className={isToday ? undefined : 'invisible group-hover/row:visible group-focus-within/row:visible'}
            style={{
            // secondary to the day's own total: regular weight, the faintest colour that keeps 4.5:1
            fontSize: 11,
            fontWeight: 400,
            lineHeight: 1.1,
            textAlign: 'right',
            color: tc('ink-muted'),
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}>
            สะสม {formatMoney(sinceStart)}
          </div>
        )}
      </td>
    </tr>
  );
});

export default HeatmapRow;
