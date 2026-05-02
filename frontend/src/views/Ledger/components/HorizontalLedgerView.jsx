import React, { useState, useMemo, useRef } from 'react';
import { Inbox } from 'lucide-react';
import { hexToRgb } from '../../../utils/formatters';

export default function HorizontalLedgerView({
  displayTransactions, categories, isDarkMode, formatMoney, dayTypes = {}, dayTypeConfig = []
}) {
  const dm = isDarkMode;
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoveredCat, setHoveredCat] = useState(null);

  const expenseTransactions = useMemo(() =>
    displayTransactions.filter(t => {
      const cat = categories.find(c => c.name === t.category);
      return cat?.type === 'expense';
    }), [displayTransactions, categories]);

  const activeCategories = useMemo(() => {
    const usedCatNames = new Set(expenseTransactions.map(t => t.category));
    return categories.filter(c => c.type === 'expense' && usedCatNames.has(c.name));
  }, [categories, expenseTransactions]);

  const activeDates = useMemo(() => {
    const dates = [...new Set(expenseTransactions.map(t => t.date))];
    return dates.sort((a, b) => {
      const parse = d => d.split('/').reverse().join('');
      return parse(a) - parse(b);
    });
  }, [expenseTransactions]);

  const cellMap = useMemo(() => {
    const map = {};
    expenseTransactions.forEach(t => {
      if (!map[t.date]) map[t.date] = {};
      if (!map[t.date][t.category]) map[t.date][t.category] = [];
      map[t.date][t.category].push(t);
    });
    return map;
  }, [expenseTransactions]);

  const dailyTotal = useMemo(() => {
    const totals = {};
    activeDates.forEach(date => {
      totals[date] = expenseTransactions
        .filter(t => t.date === date)
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    });
    return totals;
  }, [activeDates, expenseTransactions]);

  const categoryTotal = useMemo(() => {
    const totals = {};
    activeCategories.forEach(cat => {
      totals[cat.name] = expenseTransactions
        .filter(t => t.category === cat.name)
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    });
    return totals;
  }, [activeCategories, expenseTransactions]);

  const grandTotal = useMemo(() =>
    expenseTransactions.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0),
    [expenseTransactions]);

  const maxCellValue = useMemo(() => {
    let max = 0;
    activeDates.forEach(date => {
      activeCategories.forEach(cat => {
        const items = cellMap[date]?.[cat.name] || [];
        const sum = items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        if (sum > max) max = sum;
      });
    });
    return max || 1;
  }, [activeDates, activeCategories, cellMap]);

  const handleCellHover = (e, date, catId, cat, items) => {
    setHoveredDate(date);
    setHoveredCat(catId);
    if (!items || items.length === 0) return;
    setTooltip({ x: e.clientX, y: e.clientY, date, cat, items });
  };

  const handleCellMouseMove = (e) => {
    if (!tooltip) return;
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  };

  const handleCellLeave = () => {
    setHoveredDate(null);
    setHoveredCat(null);
    setTooltip(null);
  };

  const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const DAY_NAMES = ['อา','จ','อ','พ','พฤ','ศ','ส'];

  const formatDate = (dateStr) => {
    const parts = dateStr.split('/');
    if (parts.length !== 3) return { day: dateStr, month: '', dayName: '', isWeekend: false };
    const dayNum   = parseInt(parts[0], 10);
    const monthIdx = parseInt(parts[1], 10) - 1;
    let yearNum    = parseInt(parts[2], 10);
    if (yearNum > 2500) yearNum -= 543;
    const dateObj  = new Date(yearNum, monthIdx, dayNum);
    const dow      = dateObj.getDay();
    return { day: dayNum, month: THAI_MONTHS_SHORT[monthIdx] || '', dayName: DAY_NAMES[dow], isWeekend: dow === 0 || dow === 6 };
  };

  const fmtCell = (v) => v.toLocaleString('th-TH', { maximumFractionDigits: 0 });

  if (expenseTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <div className={`p-6 rounded-full mb-6 ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
          <Inbox className={`w-16 h-16 ${dm ? 'text-slate-600' : 'text-slate-300'}`} />
        </div>
        <p className={`text-lg font-black ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ยังไม่มีรายการจ่ายในมุมมองนี้</p>
        <p className={`text-sm mt-2 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>เพิ่มรายการรายจ่ายเพื่อวิเคราะห์แบบตารางความถี่ (Heatmap)</p>
      </div>
    );
  }

  /* ─────────── style tokens ─────────── */
  const border  = dm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const border2 = dm ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
  const bgBase  = dm ? '#0f172a' : '#ffffff';
  const bgHead  = dm ? '#0d1424' : '#f8fafc';
  const bgFoot  = dm ? '#0d1424' : '#f1f5f9';

  /* row height: 31px — comfortable density with heat bar */
  const ROW_H = '31px';


  return (
    <div className="relative" style={{ fontFamily: "'DM Mono', 'IBM Plex Mono', 'Fira Code', monospace" }}>

      {/* ── Tooltip ── */}
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none"
          style={{ left: tooltip.x + 14, top: tooltip.y - 8, transform: 'translateY(-100%)' }}
        >
          <div style={{
            background: dm ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.98)',
            border: `1px solid ${dm ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
            borderRadius: 12,
            boxShadow: dm ? '0 20px 60px rgba(0,0,0,0.7)' : '0 16px 48px rgba(0,0,0,0.12)',
            minWidth: 220,
            maxWidth: 300,
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
          }}>
            {/* header */}
            <div style={{
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: `1px solid ${dm ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
              background: `${tooltip.cat?.color}18`,
            }}>
              <span style={{ fontSize: 18, lineHeight: 1 }}>{tooltip.cat?.icon}</span>
              <div>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 900, color: dm ? '#f1f5f9' : '#1e293b', lineHeight: 1.2 }}>
                  {tooltip.cat?.name}
                </p>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: dm ? '#94a3b8' : '#64748b', lineHeight: 1.3, marginTop: 1 }}>
                  {tooltip.date}
                </p>
              </div>
            </div>
            {/* rows */}
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              {tooltip.items.map((item, i) => (
                <div key={i} style={{
                  padding: '5px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                  borderBottom: i < tooltip.items.length - 1
                    ? `1px solid ${dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` : 'none',
                }}>
                  <p style={{ margin: 0, fontSize: 11, color: dm ? '#cbd5e1' : '#475569', flex: 1, lineHeight: 1.4, fontFamily: 'inherit' }}>
                    {item.description || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>ไม่มีรายละเอียด</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: dm ? '#f87171' : '#dc2626', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                    ฿{(parseFloat(item.amount) || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </p>
                </div>
              ))}
            </div>
            {/* footer sum */}
            {tooltip.items.length > 1 && (
              <div style={{
                padding: '5px 12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `1px solid ${dm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                background: dm ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: dm ? '#64748b' : '#94a3b8' }}>
                  รวม {tooltip.items.length} รายการ
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: dm ? '#f87171' : '#dc2626', fontFamily: 'inherit' }}>
                  ฿{tooltip.items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0).toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Table ── */}
      <div className="w-full" style={{ overflowX: 'auto' }}>
        <table
          onMouseLeave={handleCellLeave}
          style={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          width: '100%',
          tableLayout: 'fixed',
          fontSize: 12,
        }}>
          <colgroup>
            <col style={{ width: 48 }} />
            {activeCategories.map(cat => <col key={cat.id} />)}
            <col style={{ width: 100 }} />
          </colgroup>

          {/* ── HEAD ── */}
          <thead>
            <tr>
              {/* top-left */}
              <th style={{
                position: 'sticky', top: 0, left: 0, zIndex: 50,
                background: bgHead,
                borderBottom: `1.5px solid ${border2}`,
                borderRight: `1px solid ${border}`,
                padding: '4px 4px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: dm ? '#475569' : '#94a3b8',
              }}>วันที่</th>

              {/* category headers */}
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
                  overflow: 'visible', // Allow content to pop out
                }}>
                  {/* Pop-out Container */}
                  <div 
                    onMouseEnter={() => setHoveredCat(cat.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '5px 2px 6px',
                      borderRadius: 8,
                      background: hoveredCat === cat.id ? `${cat.color}25` : `${cat.color}16`,
                      transform: hoveredCat === cat.id ? 'scale(1.15) translateY(2px)' : 'scale(1)',
                      boxShadow: hoveredCat === cat.id ? `0 10px 25px -5px ${cat.color}40, 0 8px 10px -6px rgba(0,0,0,0.1)` : 'none',
                      transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      position: 'relative',
                      zIndex: hoveredCat === cat.id ? 100 : 1,
                      cursor: 'default',
                      width: '94%',
                      margin: '0 auto',
                    }}
                  >
                    <span style={{ 
                      fontSize: 18, 
                      lineHeight: 1,
                      transform: hoveredCat === cat.id ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.2s ease'
                    }}>{cat.icon}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 900,
                      color: cat.color,
                      filter: dm ? 'brightness(1.4)' : 'brightness(0.75)',
                      lineHeight: 1.1,
                      maxWidth: '100%',
                      overflow: hoveredCat === cat.id ? 'visible' : 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: hoveredCat === cat.id ? 'normal' : 'nowrap',
                      display: 'block',
                      textAlign: 'center',
                      letterSpacing: '-0.01em',
                      padding: '0 2px',
                    }} title={cat.name}>{cat.name}</span>
                  </div>
                </th>
              ))}

              {/* top-right */}
              <th style={{
                position: 'sticky', top: 0, right: 0, zIndex: 50,
                background: bgHead,
                borderBottom: `1.5px solid ${border2}`,
                borderLeft: `1px solid ${border}`,
                padding: '4px 6px',
                textAlign: 'right',
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: dm ? '#475569' : '#94a3b8',
              }}>รวม</th>
            </tr>
          </thead>

          {/* ── BODY ── */}
          <tbody onMouseLeave={handleCellLeave}>
            {activeDates.map((date, rowIdx) => {
              const { day, dayName, isWeekend } = formatDate(date);
              const total = dailyTotal[date] || 0;

              const defTypeId = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
              const curTypeId = dayTypes[date] || defTypeId;
              const typeConf  = dayTypeConfig.find(dt => dt.id === curTypeId);
              const typeColor = typeConf ? typeConf.color : '#64748b';
              const typeRgb   = typeConf ? hexToRgb(typeColor) : '100,116,139';

              const isRowHovered = hoveredDate === date;
              const rowBg = isRowHovered
                ? (dm ? 'rgba(99,102,241,0.07)' : 'rgba(99,102,241,0.04)')
                : (rowIdx % 2 === 1
                  ? (dm ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)')
                  : 'transparent');

              return (
                <tr key={date} style={{ height: ROW_H }}
                  onMouseEnter={() => setHoveredDate(date)}
                  onMouseLeave={handleCellLeave}
                >

                  {/* date cell */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 30,
                    background: isRowHovered ? (dm ? '#1a2035' : '#eef0ff') : bgBase,
                    borderBottom: `1px solid ${border}`,
                    borderRight: `1px solid ${border}`,
                    padding: '0 3px',
                    transition: 'background 0.08s',
                  }}>
                    {(() => {
                      // sparkline: fill width = daily total / max daily total
                      const sparkPct = grandTotal > 0 ? Math.max(4, Math.round((total / Math.max(...Object.values(dailyTotal))) * 100)) : 0;
                      return (
                        <div style={{
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 3,
                          height: ROW_H,
                          borderRadius: 3,
                          overflow: 'hidden',
                          background: `rgba(${typeRgb}, ${dm ? 0.08 : 0.04})`,
                        }}>
                          {/* sparkline fill */}
                          <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: `${sparkPct}%`,
                            background: `rgba(${typeRgb}, ${isRowHovered ? (dm ? 0.3 : 0.18) : (dm ? 0.18 : 0.1)})`,
                            borderRadius: '3px 0 0 3px',
                            transition: 'width 0.3s ease, background 0.15s',
                          }} />
                          {/* text on top */}
                          <span style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: typeColor,
                            filter: dm ? 'brightness(1.3)' : 'brightness(0.7)',
                            lineHeight: 1,
                            fontVariantNumeric: 'tabular-nums',
                            position: 'relative', zIndex: 1,
                          }}>{day}</span>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: typeColor,
                            filter: dm ? 'brightness(1.1)' : 'brightness(0.85)',
                            opacity: 0.7,
                            lineHeight: 1,
                            position: 'relative', zIndex: 1,
                          }}>{dayName}</span>
                        </div>
                      );
                    })()}
                  </td>

                  {/* heatmap cells */}
                  {activeCategories.map(cat => {
                    const items    = cellMap[date]?.[cat.name] || [];
                    const cellSum  = items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                    const hasData  = items.length > 0;
                    const intensity = hasData ? Math.max(0.07, Math.min(0.78, (cellSum / maxCellValue) * 0.72)) : 0;
                    const isColHovered  = hoveredCat === cat.id;
                    const isCellHovered = isRowHovered && isColHovered;

                    let cellBg;
                    if (hasData) {
                      cellBg = `rgba(${hexToRgb(cat.color)}, ${isCellHovered ? Math.min(intensity + 0.18, 0.92) : intensity})`;
                    } else if (isCellHovered) {
                      cellBg = dm ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)';
                    } else if (isRowHovered || isColHovered) {
                      cellBg = dm ? 'rgba(99,102,241,0.04)' : 'rgba(99,102,241,0.03)';
                    } else {
                      cellBg = rowBg;
                    }

                    /* bar width proportional to intensity */
                    const barW = hasData ? Math.max(8, Math.round(intensity * 125)) : 0;

                    return (
                      <td
                        key={cat.id}
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
                            height: ROW_H,
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
                            padding: '0 5px',
                          }}>
                            {/* count badge — positioned top-center carefully to avoid overlap */}
                            {items.length > 1 && (
                              <span style={{
                                position: 'absolute',
                                top: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '11px',
                                fontWeight: 900,
                                lineHeight: 1,
                                color: cat.color,
                                filter: dm ? 'brightness(1.5)' : 'brightness(0.6)',
                                opacity: 0.9,
                                background: `rgba(${hexToRgb(cat.color)}, ${dm ? 0.2 : 0.1})`,
                                borderRadius: '0 0 4px 4px',
                                padding: '1px 4px',
                                zIndex: 10,
                                whiteSpace: 'nowrap',
                              }}>
                                ×{items.length}
                              </span>
                            )}

                            {/* Accounting-style layout: Symbol size matches number size */}
                            {(() => {
                              const dynamicSize = 14 + Math.round(intensity * 4);
                              return (
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'baseline',
                                  width: '100%',
                                  gap: 2,
                                  marginTop: items.length > 1 ? '4px' : '0',
                                }}>
                                  <span style={{ 
                                    fontSize: `${dynamicSize}px`, 
                                    opacity: 0.6, 
                                    fontWeight: 700,
                                    color: cat.color,
                                    filter: dm ? 'brightness(1.5)' : 'brightness(0.6)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}>฿</span>
                                  <span style={{
                                    fontSize: `${dynamicSize}px`,
                                    fontWeight: intensity > 0.6 ? 900 : intensity > 0.3 ? 700 : 600,
                                    fontVariantNumeric: 'tabular-nums',
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    color: cat.color,
                                    filter: dm ? 'brightness(1.8) saturate(1.2)' : 'brightness(0.35) saturate(1.8)',
                                    lineHeight: 1,
                                    whiteSpace: 'nowrap',
                                    textShadow: intensity > 0.4 
                                      ? `0 1px 2px ${dm ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)'}` 
                                      : 'none',
                                    transform: isCellHovered ? 'scale(1.06)' : 'scale(1)',
                                    transition: 'all 0.15s ease',
                                  }}>
                                    {fmtCell(cellSum)}
                                  </span>
                                </div>
                              );
                            })()}
                            {/* heat bar — bottom strip */}
                            <div style={{
                              position: 'absolute',
                              bottom: 0,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: `${barW}%`,
                              height: isCellHovered ? 4 : 3,
                              borderRadius: '2px 2px 0 0',
                              background: `rgba(${hexToRgb(cat.color)}, ${dm ? 0.85 : 0.7})`,
                              transition: 'width 0.2s ease, height 0.1s ease',
                            }} />
                          </div>
                        ) : (
                          <span style={{ fontSize: 9, opacity: 0.15, color: dm ? '#94a3b8' : '#64748b', lineHeight: 1 }}>·</span>
                        )}
                      </td>
                    );
                  })}

                  {/* daily total */}
                  <td style={{
                    position: 'sticky', right: 0, zIndex: 30,
                    background: isRowHovered
                      ? (dm ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.07)')
                      : (dm ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.02)'),
                    borderBottom: `1px solid ${border}`,
                    borderLeft: `1px solid ${border}`,
                    padding: '0 6px',
                    transition: 'background 0.08s',
                    height: ROW_H,
                  }}>
                    {total > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        width: '100%',
                      }}>
                        <span style={{ fontSize: '15px', fontWeight: 700, color: dm ? '#f87171' : '#dc2626', opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>฿</span>
                        <span style={{
                          fontSize: '15px',
                          fontWeight: 900,
                          fontVariantNumeric: 'tabular-nums',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '-0.02em',
                          color: dm ? '#f87171' : '#dc2626',
                        }}>
                          {fmtCell(total)}
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* ── FOOT ── */}
          <tfoot>
            <tr>
              <td style={{
                position: 'sticky', bottom: 0, left: 0, zIndex: 50,
                background: bgFoot,
                borderTop: `1.5px solid ${border2}`,
                borderRight: `1px solid ${border}`,
                padding: '7px 4px',
                textAlign: 'center',
                fontSize: 13,
                fontWeight: 900,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: dm ? '#64748b' : '#94a3b8',
              }}>รวม</td>

              {activeCategories.map(cat => (
                <td key={cat.id} style={{
                  position: 'sticky', bottom: 0, zIndex: 40,
                  background: hoveredCat === cat.id
                    ? (dm ? '#1e293b' : '#ffffff')
                    : bgFoot,
                  borderTop: `1.5px solid ${border2}`,
                  borderRight: `1px solid ${border}`,
                  padding: '7px 6px',
                  transition: 'background 0.1s',
                }}>
                  {categoryTotal[cat.name] > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      width: '100%',
                    }}>
                      <span style={{ fontSize: '15px', fontWeight: 800, color: cat.color, opacity: 0.7, fontFamily: "'JetBrains Mono', monospace" }}>฿</span>
                      <span style={{
                        fontSize: '15px',
                        fontWeight: 1000,
                        fontVariantNumeric: 'tabular-nums',
                        fontFamily: "'JetBrains Mono', monospace",
                        color: cat.color,
                        filter: dm ? 'brightness(1.4)' : 'brightness(0.75)',
                      }}>
                        {fmtCell(categoryTotal[cat.name])}
                      </span>
                    </div>
                  )}
                </td>
              ))}

              <td style={{
                position: 'sticky', bottom: 0, right: 0, zIndex: 50,
                background: bgFoot,
                borderTop: `1.5px solid ${border2}`,
                borderLeft: `1px solid ${border}`,
                padding: '7px 6px',
                minWidth: 120,
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  width: '100%',
                }}>
                  <span style={{ fontSize: '17px', fontWeight: 900, color: dm ? '#f87171' : '#dc2626', opacity: 0.8, fontFamily: "'JetBrains Mono', monospace" }}>฿</span>
                  <span style={{
                    fontSize: '17px',
                    fontWeight: 1000,
                    fontVariantNumeric: 'tabular-nums',
                    fontFamily: "'JetBrains Mono', monospace",
                    color: dm ? '#f87171' : '#dc2626',
                  }}>
                    {grandTotal.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
