import React, { useState, useRef, useCallback } from 'react';
import { Inbox } from 'lucide-react';

// Hooks & Logic
import { useHeatmapEngine } from '../../hooks/useHeatmapEngine';

// Sub-components
import HeatmapTooltip from './HeatmapTooltip';
import HeatmapHeader from './HeatmapHeader';
import HeatmapRow from './HeatmapRow';

export default function HorizontalLedgerView({
  displayTransactions, categories, formatMoney, dayTypes = {}, dayTypeConfig = [], allDates = []
}) {
  const dm = true;
  
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
  const handleCellHover = useCallback((e, date, catId, cat, items) => {
    setHoveredDate(date);
    setHoveredCat(catId);
    if (!items || items.length === 0) {
      setTooltip(null);
      return;
    }
    setTooltip({ x: e.clientX, y: e.clientY, date, cat, items });
  }, []);

  const handleCellMouseMove = useCallback((e) => {
    setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
  }, []);

  const handleCellLeave = useCallback(() => {
    setHoveredDate(null);
    setHoveredCat(null);
    setTooltip(null);
  }, []);

  const fmtCell = useCallback((v) => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);

  // ─── 3. Styles ───
  const border  = 'rgba(255,255,255,0.06)';
  const border2 = 'rgba(255,255,255,0.12)';
  const bgBase  = '#0f172a';
  const bgHead  = '#0d1424';
  const bgFoot  = '#0d1424';
  const ROW_H   = '34px';

  if (expenseTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <div className={`p-6 rounded-full mb-6 ${'bg-slate-800'}`}>
          <Inbox className={`w-16 h-16 ${'text-slate-600'}`} />
        </div>
        <p className={`text-lg font-black ${'text-slate-400'}`}>ยังไม่มีรายการจ่ายในมุมมองนี้</p>
        <p className={`text-sm mt-2 ${'text-slate-500'}`}>เพิ่มรายการรายจ่ายเพื่อวิเคราะห์แบบตารางความถี่ (Heatmap)</p>
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
                  isRowHovered={hoveredDate === date} hoveredCat={hoveredCat}
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
                color: '#64748b',
              }}>รวม</td>

              {activeCategories.map(cat => (
                <td key={cat.id} style={{
                  position: 'sticky', bottom: 0, zIndex: 40,
                  background: hoveredCat === cat.id
                    ? ('#1e293b')
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
                        filter: 'brightness(1.4)',
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
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#f87171', opacity: 0.8 }}>฿</span>
                  <span style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#f87171',
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