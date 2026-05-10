import React from 'react';
import { hexToRgb } from '../../../../utils/formatters';

export default function HeatmapCell({
  date, cat, items, cellSum, intensity, 
  isRowHovered, isColHovered, isCellHovered,
  dm, border, ROW_H, maxCellValue,
  handleCellHover, handleCellMouseMove, fmtCell
}) {
  const hasData = items.length > 0;
  const barW = hasData ? Math.max(8, Math.round(intensity * 125)) : 0;

  return (
    <td
      style={{
        background: 'transparent',
        borderBottom: `1px solid ${border}`,
        borderRight: `1px solid ${isColHovered ? `rgba(${hexToRgb(cat.color)}, 0.4)` : border}`,
        textAlign: 'center',
        padding: 0,
        cursor: hasData ? 'pointer' : 'default',
        transition: 'background 0.08s, border-color 0.1s',
        height: ROW_H,
        overflow: 'hidden',
        position: 'relative',
      }}
      onMouseEnter={(e) => handleCellHover(e, date, cat.id, cat, items)}
      onMouseMove={hasData ? handleCellMouseMove : undefined}
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
          background: isCellHovered
            ? `rgba(${hexToRgb(cat.color)}, 0.14)`
            : isColHovered
              ? `rgba(${hexToRgb(cat.color)}, ${intensity * 0.45 + 0.06})`
              : isRowHovered
                ? `rgba(${hexToRgb(cat.color)}, ${intensity * 0.45 + 0.04})`
                : `rgba(${hexToRgb(cat.color)}, ${intensity * 0.45})`,
          transition: 'background 0.1s',
          padding: '2px 4px',
        }}>
          {items.length > 1 && (
            <span style={{
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '9px',
              fontWeight: 900,
              lineHeight: 1,
              color: cat.color,
              filter: dm ? 'brightness(1.5)' : 'brightness(0.6)',
              opacity: 0.9,
              background: `rgba(${hexToRgb(cat.color)}, ${dm ? 0.2 : 0.1})`,
              borderRadius: '0 0 3px 3px',
              padding: '1px 3px',
              zIndex: 10,
              whiteSpace: 'nowrap',
            }}>
              ×{items.length}
            </span>
          )}

          {(() => {
            const sz = Math.min(14.5, 12.5 + Math.round(intensity * 2));
            return (
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
                  color: cat.color,
                  filter: dm ? 'brightness(1.8) saturate(1.2)' : 'brightness(0.35) saturate(1.8)',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minWidth: 0,
                  letterSpacing: '-0.01em',
                  textShadow: intensity > 0.4 
                    ? `0 1px 2px ${dm ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.7)'}` 
                    : 'none',
                  transform: isCellHovered ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.15s ease',
                }}>
                  {fmtCell(cellSum)}
                </span>
              </div>
            );
          })()}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: `${barW}%`,
            height: isCellHovered ? 3 : 2,
            borderRadius: '2px 2px 0 0',
            background: `rgba(${hexToRgb(cat.color)}, ${dm ? 0.85 : 0.7})`,
            transition: 'width 0.2s ease, height 0.1s ease',
          }} />
        </div>
      ) : (
        <span style={{ fontSize: 10, opacity: 0.15, color: dm ? '#94a3b8' : '#64748b', lineHeight: 1 }}>·</span>
      )}
    </td>
  );
}