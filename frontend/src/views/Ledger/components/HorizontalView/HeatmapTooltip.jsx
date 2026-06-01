import React, { memo } from 'react';

const HeatmapTooltip = memo(function HeatmapTooltip({ tooltip, tooltipRef, dm }) {
  const isVisible = !!tooltip;

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={{ 
        display: isVisible ? 'block' : 'none', 
        transform: 'translateY(-100%)',
        position: 'fixed'
      }}
    >
      {isVisible && (
        <div style={{
          background: 'rgba(18, 18, 18, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 0,
          boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
          minWidth: 240,
          maxWidth: 320,
          overflow: 'hidden',
          backdropFilter: 'blur(16px)',
        }}>
          <div style={{
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            background: `${tooltip.cat?.color}12`,
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{tooltip.cat?.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {tooltip.cat?.name}
              </p>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#888888', lineHeight: 1.3, marginTop: 2, fontFamily: 'monospace', letterSpacing: '0.02em' }}>
                {tooltip.date}
              </p>
            </div>
          </div>
          <div style={{ maxHeight: 240, overflowY: 'auto' }} className="custom-scrollbar">
            {tooltip.items.map((item, i) => (
              <div key={i} style={{
                padding: '6px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: 12,
                borderBottom: i < tooltip.items.length - 1
                  ? '1px solid rgba(255, 255, 255, 0.04)' : 'none',
              }}>
                <p style={{ margin: 0, fontSize: 10.5, color: '#cbd5e1', flex: 1, lineHeight: 1.4, fontWeight: 500 }}>
                  {item.description || <span style={{ opacity: 0.3, fontStyle: 'italic' }}>ไม่มีรายละเอียด</span>}
                </p>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: '#f87171', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                  ฿{(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            ))}
          </div>
          {tooltip.items.length > 1 && (
            <div style={{
              padding: '6px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              background: 'rgba(255, 255, 255, 0.02)',
            }}>
              <p style={{ margin: 0, fontSize: 8.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', fontFamily: 'monospace' }}>
                รวม {tooltip.items.length} รายการ
              </p>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#f87171', fontVariantNumeric: 'tabular-nums', fontFamily: 'monospace' }}>
                ฿{tooltip.items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default HeatmapTooltip;