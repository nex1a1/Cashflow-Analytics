import React, { useState, useMemo, useRef } from 'react';
import { Inbox } from 'lucide-react';
import { hexToRgb } from '../../../utils/formatters';
import { useTheme } from '../../../context/ThemeContext';

export default function HorizontalLedgerView({
  displayTransactions, categories, formatMoney, dayTypes = {}, dayTypeConfig = [], allDates = []
}) {
  const { isDarkMode: dm } = useTheme();
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

  const sortedDates = useMemo(() => {
    if (!allDates || allDates.length === 0) {
      const dates = [...new Set(expenseTransactions.map(t => t.date))];
      return dates.sort((a, b) => {
        const parse = d => d.split('/').reverse().join('');
        return parse(a) - parse(b);
      });
    }
    return allDates;
  }, [allDates, expenseTransactions]);

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
    sortedDates.forEach(date => {
      totals[date] = expenseTransactions
        .filter(t => t.date === date)
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    });
    return totals;
  }, [sortedDates, expenseTransactions]);

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
    sortedDates.forEach(date => {
      activeCategories.forEach(cat => {
        const items = cellMap[date]?.[cat.name] || [];
        const sum = items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
        if (sum > max) max = sum;
      });
    });
    return max || 1;
  }, [sortedDates, activeCategories, cellMap]);

  const handleCellHover = (e, date, catId, cat, items) => {
    setHoveredDate(date);
    setHoveredCat(catId);
    if (!items || items.length === 0) {
      setTooltip(null);
      return;
    }
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
  // กลับมาใช้ตัวย่อเพื่อประหยัดพื้นที่แนวกว้าง
  const DAY_NAMES = ['อา.','จ.','อ.','พ.','พฤ.','ศ.','ส.'];

  const formatDate = (dateStr) => {
    let dayNum, monthIdx, yearNum;
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return { day: dateStr, month: '', dayName: '', isWeekend: false };
      yearNum  = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      dayNum   = parseInt(parts[2], 10);
    } else {
      const parts = dateStr.split('/');
      if (parts.length !== 3) return { day: dateStr, month: '', dayName: '', isWeekend: false };
      dayNum   = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
      yearNum  = parseInt(parts[2], 10);
    }
    if (yearNum > 2500) yearNum -= 543;
    const dateObj = new Date(yearNum, monthIdx, dayNum);
    const dow     = dateObj.getDay();
    return { day: dayNum, month: THAI_MONTHS_SHORT[monthIdx] || '', dayName: DAY_NAMES[dow], isWeekend: dow === 0 || dow === 6 };
  };

  const fmtCell = (v) => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

  const border  = dm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const border2 = dm ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
  const bgBase  = dm ? '#0f172a' : '#ffffff';
  const bgHead  = dm ? '#0d1424' : '#f8fafc';
  const bgFoot  = dm ? '#0d1424' : '#f1f5f9';

  // ลดความสูงลงมานิดนึงให้ดูกะทัดรัดขึ้น
  const ROW_H = '34px';

  return (
    <div className="relative">

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
            borderRadius: 4,
            boxShadow: dm ? '0 10px 30px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.08)',
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
                  <p style={{ margin: 0, fontSize: 11, color: dm ? '#cbd5e1' : '#475569', flex: 1, lineHeight: 1.4 }}>
                    {item.description || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>ไม่มีรายละเอียด</span>}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 900, color: dm ? '#f87171' : '#dc2626', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
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
                borderTop: `1px solid ${dm ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                background: dm ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              }}>
                <p style={{ margin: 0, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: dm ? '#64748b' : '#94a3b8' }}>
                  รวม {tooltip.items.length} รายการ
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: dm ? '#f87171' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                  ฿{tooltip.items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
          minWidth: `${55 + (activeCategories.length * 65) + 100}px`,
          tableLayout: 'fixed',
          fontSize: 12,
        }}>
          <colgroup>
            {/* กำหนดความกว้างคอลัมน์ซ้ายขวา ส่วนตรงกลาง(หมวดหมู่) จะยืดหดแบ่งพื้นที่กันเอง */}
            <col style={{ width: 55 }} />
            {activeCategories.map(cat => <col key={cat.id} />)}
            <col style={{ width: 100 }} />
          </colgroup>

          {/* ── HEAD ── */}
          <thead>
            <tr>
              <th style={{
                position: 'sticky', top: 0, left: 0, zIndex: 50,
                background: bgHead,
                borderBottom: `1.5px solid ${border2}`,
                borderRight: `1px solid ${border}`,
                padding: '4px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '0.04em',
                color: dm ? '#475569' : '#94a3b8',
              }}>วันที่</th>

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

          {/* ── BODY ── */}
          <tbody>
            {sortedDates.map((date, rowIdx) => {
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

                  <td style={{
                    position: 'sticky', left: 0, zIndex: 30,
                    background: isRowHovered ? (dm ? '#1a2035' : '#eef0ff') : bgBase,
                    borderBottom: `1px solid ${border}`,
                    borderRight: `1px solid ${border}`,
                    padding: '2px',
                    transition: 'background 0.08s',
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
                          borderRadius: 3,
                          overflow: 'hidden',
                          background: `rgba(${typeRgb}, ${dm ? 0.08 : 0.04})`,
                          padding: '2px 0',
                        }}>
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
                              filter: dm ? 'brightness(1.2)' : 'brightness(0.7)',
                              opacity: 0.8,
                              marginBottom: '1px',
                            }}>{dayName}</span>
                            
                            <span style={{
                              fontSize: 14,
                              fontWeight: 900,
                              color: typeColor,
                              filter: dm ? 'brightness(1.4)' : 'brightness(0.65)',
                              fontVariantNumeric: 'tabular-nums',
                              letterSpacing: '-0.02em',
                            }}>{day}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>

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
                  })}

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
                        <span style={{ fontSize: '12px', fontWeight: 700, color: dm ? '#f87171' : '#dc2626', opacity: 0.6 }}>฿</span>
                        <span style={{
                          fontSize: '13px',
                          fontWeight: 900,
                          fontVariantNumeric: 'tabular-nums',
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

          <tfoot>
            <tr>
              <td style={{
                position: 'sticky', bottom: 0, left: 0, zIndex: 50,
                background: bgFoot,
                borderTop: `1.5px solid ${border2}`,
                borderRight: `1px solid ${border}`,
                padding: '8px 4px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 900,
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
                  padding: '8px 4px',
                  transition: 'background 0.1s',
                }}>
                  {categoryTotal[cat.name] > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      width: '100%',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: cat.color, opacity: 0.7 }}>฿</span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
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
                padding: '8px 6px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  width: '100%',
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: dm ? '#f87171' : '#dc2626', opacity: 0.8 }}>฿</span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    fontVariantNumeric: 'tabular-nums',
                    color: dm ? '#f87171' : '#dc2626',
                  }}>
                    {grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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