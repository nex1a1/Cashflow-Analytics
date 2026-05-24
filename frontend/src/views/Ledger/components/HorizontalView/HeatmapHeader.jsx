import React, { memo } from 'react';

const HeatmapHeader = memo(function HeatmapHeader({ 
  activeCategories, dm, bgHead, border, border2 
}) {
  return (
    <thead>
      <tr>
        <th style={{
          position: 'sticky', top: 0, left: 0, zIndex: 50,
          background: bgHead,
          borderBottom: `1.5px solid ${border2}`,
          borderRight: `1px solid ${border}`,
          padding: '4px',
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: '0.02em',
          color: '#475569',
        }}>DATE</th>

        {activeCategories.map((cat, idx) => (
          <th key={cat.id} 
            className={`heatmap-header-cell col-idx-${idx}`}
            style={{
              position: 'sticky', top: 0, zIndex: 40,
              background: bgHead,
              borderBottom: `2px solid ${border2}`,
              borderTop: `2px solid transparent`,
              borderRight: `1px solid ${border}`,
              padding: '2px 1px',
              overflow: 'visible',
              '--cat-color': cat.color,
              '--cat-color-20': `${cat.color}20`,
              '--cat-color-30': `${cat.color}30`,
            }}
          >
            <div 
              className="heatmap-header-div"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '4px 2px 5px',
                borderRadius: 0,
                border: '1px solid rgba(255,255,255,0.08)',
                background: `${cat.color}08`,
                position: 'relative',
                zIndex: 1,
                cursor: 'default',
                width: '92%',
                margin: '0 auto',
              }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>{cat.icon}</span>
              <span style={{
                fontSize: 10,
                fontWeight: 900,
                color: cat.color,
                filter: 'brightness(1.4)',
                lineHeight: 1.1,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
                textAlign: 'center',
                letterSpacing: '-0.01em',
                padding: '0 2px',
              }} title={cat.name}>{cat.name}</span>
            </div>
          </th>
        ))}

        <th style={{
          position: 'sticky', top: 0, right: 0, zIndex: 50,
          background: bgHead,
          borderBottom: `1.5px solid ${border2}`,
          borderLeft: `1px solid ${border}`,
          padding: '4px 6px',
          textAlign: 'right',
          fontSize: 12,
          fontWeight: 900,
          color: '#475569',
        }}>รวมรายวัน</th>
      </tr>
    </thead>
  );
});

export default HeatmapHeader;