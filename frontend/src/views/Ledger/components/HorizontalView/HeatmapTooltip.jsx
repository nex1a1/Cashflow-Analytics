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
          background: 'rgba(15,23,42,0.97)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 0,
          boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
          minWidth: 220,
          maxWidth: 300,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
        }}>
        <div style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: `1px solid ${'rgba(255,255,255,0.07)'}`,
          background: `${tooltip.cat?.color}18`,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{tooltip.cat?.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: '#f1f5f9', lineHeight: 1.2 }}>
              {tooltip.cat?.name}
            </p>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94a3b8', lineHeight: 1.3, marginTop: 1 }}>
              {tooltip.date}
            </p>
          </div>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {tooltip.items.map((item, i) => (
            <div key={i} style={{
              padding: '5px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
              borderBottom: i < tooltip.items.length - 1
                ? `1px solid ${'rgba(255,255,255,0.05)'}` : 'none',
            }}>
              <p style={{ margin: 0, fontSize: 11, color: '#cbd5e1', flex: 1, lineHeight: 1.4 }}>
                {item.description || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>ไม่มีรายละเอียด</span>}
              </p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: '#f87171', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                ฿{(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          ))}
        </div>
        {tooltip.items.length > 1 && (
          <div style={{
            padding: '5px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `1px solid ${'rgba(255,255,255,0.08)'}`,
            background: 'rgba(255,255,255,0.03)',
          }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              รวม {tooltip.items.length} รายการ
            </p>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: '#f87171', fontVariantNumeric: 'tabular-nums' }}>
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