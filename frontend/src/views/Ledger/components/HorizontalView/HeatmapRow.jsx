import React, { memo } from 'react';
import { hexToRgb } from '../../../../utils/formatters';
import HeatmapCell from './HeatmapCell';

const HeatmapRow = memo(function HeatmapRow({
  date, rowIdx, day, month, dayName, isWeekend,
  dailyTotal, grandTotal, cellMap, activeCategories,
  dayTypes, dayTypeConfig,
  handleCellLeave, handleCellHover, handleCellMouseMove,
  dm, bgBase, border, ROW_H, maxCellValue, fmtCell
}) {
  const total = dailyTotal[date] || 0;

  const defTypeId = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
  const curTypeId = dayTypes[date] || defTypeId;
  const typeConf  = dayTypeConfig.find(dt => dt.id === curTypeId);
  const typeColor = typeConf ? typeConf.color : '#64748b';
  const typeRgb   = typeConf ? hexToRgb(typeColor) : '100,116,139';

  return (
    <tr style={{ height: ROW_H }}
      onMouseLeave={handleCellLeave}
    >
      <td style={{
        position: 'sticky', left: 0, zIndex: 30,
        background: bgBase,
        borderBottom: `1px solid ${border}`,
        borderRight: `1px solid ${border}`,
        padding: '2px',
      }}>
        {(() => {
          const dailyValues = Object.values(dailyTotal);
          const maxDaily = dailyValues.length > 0 ? Math.max(...dailyValues) : 1;
          const sparkPct = grandTotal > 0 ? Math.max(4, Math.round((total / maxDaily) * 100)) : 0;
          return (
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
              background: `rgba(${typeRgb}, ${dm ? 0.08 : 0.04})`,
              borderLeft: `2.5px solid ${typeColor}`,
              padding: '2px 0',
              '--type-rgb': typeRgb,
            }}>
              <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${sparkPct}%`,
                background: `rgba(${typeRgb}, ${dm ? 0.18 : 0.1})`,
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
                  fontSize: 9,
                  fontWeight: 800,
                  color: typeColor,
                  filter: 'brightness(1.2)',
                  opacity: 0.8,
                  marginBottom: '1px',
                }}>{dayName}</span>
                
                <span style={{
                  fontSize: 14,
                  fontWeight: 900,
                  color: typeColor,
                  filter: 'brightness(1.4)',
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: '-0.02em',
                }}>
                  {day}
                  <span style={{
                    fontSize: '8px',
                    fontWeight: 900,
                    marginLeft: '2px',
                    opacity: 0.8,
                    textTransform: 'uppercase',
                    verticalAlign: 'top',
                    display: 'inline-block',
                    marginTop: '1px'
                  }}>{month}</span>
                </span>
              </div>
            </div>
          );
        })()}
      </td>

      {activeCategories.map((cat, idx) => {
        const items    = cellMap[date]?.[cat.name] || [];
        const cellSum  = items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        const intensity = items.length > 0 ? Math.max(0.07, Math.min(0.78, (cellSum / maxCellValue) * 0.72)) : 0;
        
        return (
          <HeatmapCell
            key={cat.id}
            idx={idx}
            date={date} cat={cat} items={items} cellSum={cellSum} intensity={intensity}
            dm={dm} border={border} ROW_H={ROW_H} maxCellValue={maxCellValue}
            handleCellHover={handleCellHover} handleCellMouseMove={handleCellMouseMove} fmtCell={fmtCell}
          />
        );
      })}

      <td style={{
        position: 'sticky', right: 0, zIndex: 30,
        background: 'rgba(239, 68, 68, 0.04)',
        borderBottom: `1px solid ${border}`,
        borderLeft: `1px solid ${border}`,
        padding: '0 6px',
        height: ROW_H,
      }}>
        {total > 0 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            width: '100%',
          }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f87171', opacity: 0.6 }}>฿</span>
            <span style={{
              fontSize: '13px',
              fontWeight: 900,
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '-0.02em',
              color: '#f87171',
            }}>
              {fmtCell(total)}
            </span>
          </div>
        )}
      </td>
    </tr>
  );
});

export default HeatmapRow;