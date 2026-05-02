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

  return (
    <div className="relative">
      {tooltip && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] pointer-events-none transition-all duration-75 ease-out"
          style={{ left: tooltip.x + 16, top: tooltip.y - 12, transform: 'translateY(-100%)' }}
        >
          <div className={`rounded-xl shadow-2xl border min-w-[240px] max-w-[320px] overflow-hidden ${
            dm ? 'bg-slate-800 border-slate-600/50 shadow-black/80' : 'bg-white border-slate-200/80 shadow-slate-300/60'
          }`}>
            <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ backgroundColor: `${tooltip.cat?.color}20`, borderColor: dm ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}>
              <span className="text-xl leading-none drop-shadow-sm">{tooltip.cat?.icon}</span>
              <div>
                <p className={`text-sm font-black leading-tight ${dm ? 'text-slate-100' : 'text-slate-800'}`}>
                  {tooltip.cat?.name}
                </p>
                <p className={`text-[11px] font-bold tracking-wide leading-tight mt-0.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tooltip.date}
                </p>
              </div>
            </div>
            <div className={`divide-y max-h-[300px] overflow-y-auto custom-scrollbar ${dm ? 'divide-slate-700/50' : 'divide-slate-100'}`}>
              {tooltip.items.map((item, i) => (
                <div key={i} className="px-4 py-2 flex items-start justify-between gap-4">
                  <p className={`text-xs leading-relaxed flex-1 font-medium ${dm ? 'text-slate-300' : 'text-slate-600'}`}>
                    {item.description ? item.description : <span className={`italic opacity-50`}>ไม่มีรายละเอียด</span>}
                  </p>
                  <p className={`text-xs font-black tabular-nums shrink-0 mt-0.5 ${dm ? 'text-red-400' : 'text-red-600'}`}>
                    ฿{(parseFloat(item.amount) || 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
            {tooltip.items.length > 1 && (
              <div className={`px-4 py-2 flex items-center justify-between border-t ${dm ? 'border-slate-700 bg-slate-900/80' : 'border-slate-100 bg-slate-50'}`}>
                <p className={`text-[10px] font-bold uppercase tracking-wider ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                  รวม {tooltip.items.length} รายการ
                </p>
                <p className={`text-sm font-black tabular-nums ${dm ? 'text-red-400' : 'text-red-600'}`}>
                  ฿{tooltip.items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full custom-scrollbar" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        {/* 🔥 เปลี่ยนมาใช้ border-separate border-spacing-0 เพื่อแก้บั๊กมุมตาราง 100% 🔥 */}
        <table className="border-separate border-spacing-0 text-xs w-full table-fixed">
          <colgroup>
            <col style={{ width: '65px' }} />
            {activeCategories.map(cat => <col key={cat.id} />)}
            <col style={{ width: '85px' }} />
          </colgroup>
          
          <thead className="shadow-sm">
            <tr>
              {/* Top Left Corner */}
              <th className={`sticky top-0 left-0 z-50 px-1 py-2 text-center font-black text-[10px] uppercase tracking-wider border-b border-r ${dm ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                วันที่
              </th>
              
              {activeCategories.map(cat => (
                <th 
                  key={cat.id} 
                  className={`sticky top-0 z-40 px-0.5 py-0 text-center font-bold border-b border-r transition-colors duration-200 overflow-hidden ${dm ? 'bg-slate-900 border-slate-700' : 'bg-slate-50 border-slate-200'} ${hoveredCat === cat.id ? (dm ? '!bg-slate-800' : '!bg-slate-100') : ''}`}
                >
                  <div className="mx-auto my-1.5 px-0.5 py-1.5 rounded-lg flex flex-col items-center gap-1 w-full" style={{ backgroundColor: `${cat.color}18` }}>
                    <span className="text-base sm:text-lg leading-none drop-shadow-sm">{cat.icon}</span>
                    <span className="text-[9px] font-black leading-tight text-center truncate w-full px-0.5" style={{ color: cat.color, filter: dm ? 'brightness(1.3)' : 'none' }} title={cat.name}>
                      {cat.name}
                    </span>
                  </div>
                </th>
              ))}
              
              {/* Top Right Corner */}
              <th className={`sticky top-0 right-0 z-50 px-2 py-2 text-right font-black text-[10px] uppercase tracking-wider border-b border-l ${dm ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                รวม/วัน
              </th>
            </tr>
          </thead>

          <tbody onMouseLeave={handleCellLeave}>
            {activeDates.map((date) => {
              const { day, dayName, isWeekend } = formatDate(date);
              const total = dailyTotal[date] || 0;
              
              const defTypeId = isWeekend ? (dayTypeConfig[1]?.id || dayTypeConfig[0]?.id) : dayTypeConfig[0]?.id;
              const curTypeId = dayTypes[date] || defTypeId;
              const typeConf  = dayTypeConfig.find(dt => dt.id === curTypeId);
              
              const typeColor = typeConf ? typeConf.color : '#64748b';
              const typeRgb = typeConf ? hexToRgb(typeColor) : '100, 116, 139';
              const isRowHovered = hoveredDate === date;

              return (
                <tr key={date} className={`group transition-colors duration-75 ${isRowHovered ? (dm ? 'bg-slate-800/80' : 'bg-blue-50/60') : ''}`}>
                  
                  {/* Left Column (Sticky) */}
                  <td className={`sticky left-0 z-30 px-1 py-1 border-b border-r ${dm ? 'border-slate-700/60 bg-slate-900' : 'border-slate-200 bg-white'} ${isRowHovered ? (dm ? '!bg-slate-800' : '!bg-blue-50') : ''}`}>
                    <div 
                      className="flex flex-col items-center justify-center leading-none rounded-[4px] px-1 py-1.5 gap-0.5"
                      style={{
                        backgroundColor: `rgba(${typeRgb}, ${dm ? 0.12 : 0.06})`,
                        border: `1px solid rgba(${typeRgb}, ${dm ? 0.3 : 0.2})`
                      }}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[12px] font-black tabular-nums leading-tight" style={{ color: typeColor, filter: dm ? 'brightness(1.3)' : 'brightness(0.8)' }}>
                          {day}
                        </span>
                        <span className="text-[8px] font-bold mt-0.5" style={{ color: typeColor, filter: dm ? 'brightness(1.2)' : 'brightness(0.9)' }}>
                          {dayName}.
                        </span>
                      </div>
                    </div>
                  </td>
                  
                  {/* Middle Columns (Heatmap) */}
                  {activeCategories.map(cat => {
                    const items = cellMap[date]?.[cat.name] || [];
                    const cellSum = items.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
                    const hasData = items.length > 0;
                    const intensity = hasData ? Math.max(0.08, Math.min(0.8, (cellSum / maxCellValue) * 0.7)) : 0;
                    const isColHovered = hoveredCat === cat.id;
                    const isCellHovered = isRowHovered && isColHovered;

                    return (
                      <td
                        key={cat.id}
                        className={`text-center py-1.5 px-0.5 border-b border-r transition-all duration-100 overflow-hidden ${dm ? 'border-slate-700/40 bg-slate-900' : 'border-slate-100 bg-white'} ${hasData ? 'cursor-pointer' : ''} ${isColHovered && !isCellHovered ? (dm ? '!bg-slate-800/40' : '!bg-slate-50/60') : ''} ${isRowHovered && !isCellHovered ? (dm ? '!bg-slate-800/80' : '!bg-blue-50/60') : ''}`}
                        style={{ 
                          backgroundColor: hasData 
                            ? `rgba(${hexToRgb(cat.color)}, ${isCellHovered ? intensity + 0.15 : intensity})` 
                            : undefined,
                          transform: isCellHovered && hasData ? 'scale(1.02)' : 'scale(1)',
                          zIndex: isCellHovered ? 10 : 1
                        }}
                        onMouseEnter={(e) => handleCellHover(e, date, cat.id, cat, items)}
                        onMouseMove={hasData ? handleCellMouseMove : undefined}
                      >
                        {hasData ? (
                          <div className="flex flex-col items-center justify-center gap-0.5 w-full">
                            <span className="font-black tabular-nums text-[11px] sm:text-[12px] leading-none drop-shadow-sm truncate w-full px-0.5" style={{ color: cat.color, filter: dm ? 'brightness(1.5) saturate(1.2)' : 'brightness(0.6) saturate(1.5)' }}>
                              {cellSum >= 10000 ? `${(cellSum / 1000).toFixed(1)}k` : cellSum.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
                            </span>
                            {items.length > 1 && (
                              <span className={`text-[8px] font-black leading-none px-1 py-0.5 rounded-sm shadow-sm opacity-90 ${dm ? 'bg-slate-900/60 text-slate-300' : 'bg-white/80 text-slate-600'}`}>
                                ×{items.length}
                              </span>
                            )}
                          </div>
                        ) : (
                          // 🔥 เปลี่ยนไข่ปลาเป็นขีดบางๆ ลดสิ่งรบกวนสายตา 🔥
                          <span className={`text-[10px] select-none opacity-30 ${dm ? 'text-slate-600' : 'text-slate-300'}`}>-</span>
                        )}
                      </td>
                    );
                  })}

                  {/* Right Column (Sticky - Total per Day) 🔥 ใส่ Tint บางๆ ให้แยกจากตารางชัดเจน */}
                  <td className={`sticky right-0 z-30 px-2 py-1.5 text-right border-b border-l font-black tabular-nums text-[11px] sm:text-[12px] transition-colors duration-75 ${dm ? 'border-slate-700/60 text-red-400 bg-slate-900/95' : 'border-slate-200 text-red-600 bg-red-50/20'} ${isRowHovered ? (dm ? '!bg-slate-800' : '!bg-red-50/80') : ''}`}>
                    {total > 0 ? `฿${total.toLocaleString('th-TH', { maximumFractionDigits: 0 })}` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              {/* Bottom Left Corner 🔥 ย้ายเส้นขอบขึ้นมาที่ td แทน tr ป้องกันเส้นขาด */}
              <td className={`sticky bottom-0 left-0 z-50 px-2 py-3 text-center font-black text-[10px] uppercase tracking-wider border-t-2 border-r ${dm ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-300 text-slate-600'}`}>
                รวม
              </td>
              
              {activeCategories.map(cat => (
                <td 
                  key={cat.id} 
                  className={`sticky bottom-0 z-40 text-center px-0.5 py-3 font-black tabular-nums text-[11px] sm:text-[12px] border-t-2 border-r transition-colors overflow-hidden ${dm ? 'bg-slate-900 border-slate-600' : 'bg-slate-50 border-slate-300'} ${hoveredCat === cat.id ? (dm ? '!bg-slate-800' : '!bg-white') : ''}`} 
                  style={{ color: cat.color, filter: dm ? 'brightness(1.4)' : 'brightness(0.8)' }}
                >
                  <div className="truncate w-full px-0.5">
                    {categoryTotal[cat.name] > 0 ? `${categoryTotal[cat.name].toLocaleString('th-TH', { maximumFractionDigits: 0 })}` : '-'}
                  </div>
                </td>
              ))}
              
              {/* Bottom Right Corner */}
              <td className={`sticky bottom-0 right-0 z-50 px-2 py-3 text-right font-black tabular-nums text-[12px] sm:text-[13px] border-t-2 border-l ${dm ? 'bg-slate-900 border-slate-600 text-red-400' : 'bg-slate-50 border-slate-300 text-red-700'}`}>
                ฿{grandTotal.toLocaleString('th-TH', { maximumFractionDigits: 0 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}