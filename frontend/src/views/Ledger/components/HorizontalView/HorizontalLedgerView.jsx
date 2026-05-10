import React, { useState, useRef } from 'react';
import { Inbox } from 'lucide-react';
import { useTheme } from '../../../../context/ThemeContext';

// Hooks & Logic
import { useHeatmapEngine } from '../../hooks/useHeatmapEngine';

// Sub-components
import HeatmapTooltip from './HeatmapTooltip';
import HeatmapHeader from './HeatmapHeader';
import HeatmapRow from './HeatmapRow';

export default function HorizontalLedgerView({
  displayTransactions, categories, formatMoney, dayTypes = {}, dayTypeConfig = [], allDates = []
}) {
  const { isDarkMode: dm } = useTheme();
  
  // UI State
  const [tooltip, setTooltip] = useState(null);
  const tooltipRef = useRef(null);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [hoveredCat, setHoveredCat] = useState(null);

  // ─── 1. Engine: Pure Data Logic ───
  const {
    expenseTransactions,
    activeCategories,
    sortedDates,
    cellMap,
    dailyTotal,
    categoryTotal,
    grandTotal,
    maxCellValue,
    formatDate
  } = useHeatmapEngine(displayTransactions, categories, allDates);

  // ─── 2. Event Handlers ───
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

  const fmtCell = (v) => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ─── 3. Styles ───
  const border  = dm ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)';
  const border2 = dm ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
  const bgBase  = dm ? '#0f172a' : '#ffffff';
  const bgHead  = dm ? '#0d1424' : '#f8fafc';
  const bgFoot  = dm ? '#0d1424' : '#f1f5f9';
  const ROW_H   = '34px';

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
      
      {/* ── Tooltip ── */}
      <HeatmapTooltip tooltip={tooltip} tooltipRef={tooltipRef} dm={dm} />

      {/* ── Table ── */}
      <div className="w-full" style={{ overflowX: 'auto' }}>
        <table
          onMouseLeave={handleCellLeave}
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: '100%',
            minWidth: `${64 + (activeCategories.length * 65) + 100}px`,
            tableLayout: 'fixed',
            fontSize: 12,
          }}
        >
          <colgroup>
            <col style={{ width: 64 }} />
            {activeCategories.map(cat => <col key={cat.id} />)}
            <col style={{ width: 100 }} />
          </colgroup>

          <HeatmapHeader 
            activeCategories={activeCategories}
            dm={dm} bgHead={bgHead} border={border} border2={border2}
            hoveredCat={hoveredCat} setHoveredCat={setHoveredCat}
          />

          <tbody>
            {sortedDates.map((date, rowIdx) => {
              const { day, month, dayName, isWeekend } = formatDate(date);
              return (
                <HeatmapRow 
                  key={date}
                  date={date} rowIdx={rowIdx} day={day} month={month} dayName={dayName} isWeekend={isWeekend}
                  dailyTotal={dailyTotal} grandTotal={grandTotal} cellMap={cellMap}
                  activeCategories={activeCategories} dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
                  hoveredDate={hoveredDate} hoveredCat={hoveredCat}
                  setHoveredDate={setHoveredDate} handleCellLeave={handleCellLeave}
                  handleCellHover={handleCellHover} handleCellMouseMove={handleCellMouseMove}
                  dm={dm} bgBase={bgBase} border={border} ROW_H={ROW_H} maxCellValue={maxCellValue}
                  fmtCell={fmtCell}
                />
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