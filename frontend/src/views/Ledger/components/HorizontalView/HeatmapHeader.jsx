import React from 'react';

export default function HeatmapHeader({ 
  activeCategories, dm, bgHead, border, border2, 
  hoveredCat, setHoveredCat 
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
          color: dm ? '#475569' : '#94a3b8',
        }}>DATE</th>

        {activeCategories.map(cat => (
          <th key={cat.id} style={{
            position: 'sticky', top: 0, zIndex: 40,
            background: hoveredCat === cat.id
              ? (dm ? '#1e293b' : `${cat.color}08`)
              : bgHead,
            borderBottom: `2px solid ${hoveredCat === cat.id ? cat.color : border2}`,
            borderTop: `2px solid ${hoveredCat === cat.id ? cat.color : 'transparent'}`,
            borderRight: `1px solid ${border}`,
            padding: '2px 1px',
            transition: 'background 0.1s, border-color 0.1s',
            overflow: 'visible',
          }}>
            <div 
              onMouseEnter={() => setHoveredCat(cat.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                padding: '4px 2px 5px',
                borderRadius: 6,
                background: hoveredCat === cat.id ? `${cat.color}28` : `${cat.color}16`,
                boxShadow: hoveredCat === cat.id ? `0 0 0 1.5px ${cat.color}60, 0 4px 16px -4px ${cat.color}40` : 'none',
                transition: 'background 0.15s ease, box-shadow 0.15s ease',
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
                filter: dm ? 'brightness(1.4)' : 'brightness(0.75)',
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
          color: dm ? '#475569' : '#94a3b8',
        }}>รวมรายวัน</th>
      </tr>
    </thead>
  );
}