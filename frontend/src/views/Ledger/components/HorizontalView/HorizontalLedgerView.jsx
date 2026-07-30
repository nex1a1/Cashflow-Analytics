import React, { useState, useCallback } from 'react';
import { Inbox } from 'lucide-react';

// Hooks & Logic
import { useHeatmapEngine } from '../../hooks/useHeatmapEngine';

// Sub-components
import HeatmapTooltip from './HeatmapTooltip';
import HeatmapHeader from './HeatmapHeader';
import HeatmapRow from './HeatmapRow';

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const parseYearMonth = (dateStr) => {
  let monthIdx = 0;
  let year = 0;
  if (!dateStr) return { year, monthIdx };

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      year = parseInt(parts[0], 10);
      monthIdx = parseInt(parts[1], 10) - 1;
    }
  } else {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      monthIdx = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
  }
  
  if (year > 0 && year < 2500) {
    year += 543;
  }
  return { year, monthIdx };
};

const DEFAULT_DAY_TYPES = {};
const DEFAULT_DAY_TYPE_CONFIG = [];
const DEFAULT_ALL_DATES = [];

export default function HorizontalLedgerView({
  displayTransactions, categories, formatMoney, 
  dayTypes = DEFAULT_DAY_TYPES, 
  dayTypeConfig = DEFAULT_DAY_TYPE_CONFIG, 
  allDates = DEFAULT_ALL_DATES
}) {
  const dm = true;
  
  // UI State
  const [tooltip, setTooltip] = useState(null);

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
    if (!items || items.length === 0) {
      setTooltip(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      date,
      cat,
      items,
      x: rect.left + rect.width / 2,
      y: rect.top,
      bottom: rect.bottom
    });
  }, []);

  const handleCellLeave = useCallback(() => {
    setTooltip(null);
  }, []);

  const fmtCell = useCallback((v) => v.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), []);

  // ─── 3. Styles ───
  const border  = 'rgba(255,255,255,0.06)';
  const border2 = 'rgba(255,255,255,0.12)';
  const bgBase  = '#181818';
  const bgHead  = '#1c1c1c';
  const bgFoot  = '#121212';
  const ROW_H   = '34px';

  if (expenseTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <div className="p-6 rounded-none border-2 border-[#3e3e3e] mb-6 bg-[#181818] shadow-[0_0_15px_rgba(0,0,0,0.3)]">
          <Inbox className="w-16 h-16 text-[#666666]" />
        </div>
        <p className="text-lg font-black text-[#cbd5e1]">ยังไม่มีรายการจ่ายในมุมมองนี้</p>
        <p className="text-sm mt-2 text-[#888888]">เพิ่มรายการรายจ่ายเพื่อวิเคราะห์แบบตารางความถี่ (Heatmap)</p>
      </div>
    );
  }

  return (
    <div className="relative">
      
      {/* ── Tooltip ── */}
      <HeatmapTooltip tooltip={tooltip} dm={dm} />

      {/* ── Table ── */}
      <div className="w-full" style={{ overflowX: 'auto' }}>
        <table
          onMouseLeave={handleCellLeave}
          className="heatmap-table"
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
          />

          <tbody>
            {sortedDates.map((date, rowIdx) => {
              const { day, month, dayName, isWeekend } = formatDate(date);
              
              const currentYM = parseYearMonth(date);
              const prevDate = rowIdx > 0 ? sortedDates[rowIdx - 1] : null;
              const prevYM = prevDate ? parseYearMonth(prevDate) : null;
              
              const isNewYear = !prevYM || currentYM.year !== prevYM.year;
              const isNewMonth = !prevYM || currentYM.monthIdx !== prevYM.monthIdx || currentYM.year !== prevYM.year;
              
              return (
                <React.Fragment key={date}>
                  {isNewMonth && (
                    <tr className="select-none">
                      <td
                        colSpan={activeCategories.length + 2}
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                          background: isNewYear 
                            ? 'linear-gradient(90deg, rgba(218, 41, 28, 0.2) 0%, rgba(24, 24, 24, 0.95) 100%)' 
                            : 'linear-gradient(90deg, rgba(48, 48, 48, 0.4) 0%, rgba(24, 24, 24, 0.95) 100%)',
                          borderTop: isNewYear ? '1.5px solid #da291c' : '1px solid rgba(255, 255, 255, 0.08)',
                          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                          padding: '6px 10px',
                          textAlign: 'left',
                          height: '32px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: isNewYear ? 'rgba(218, 41, 28, 0.2)' : 'rgba(100, 116, 139, 0.15)',
                            border: isNewYear ? '1px solid rgba(218, 41, 28, 0.4)' : '1px solid rgba(100, 116, 139, 0.25)',
                            color: isNewYear ? '#da291c' : '#888888',
                            fontSize: '9px',
                            fontWeight: 900,
                            padding: '1px 5px',
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', 'Bai Jamjuree', monospace",
                            letterSpacing: '0.05em',
                          }}>
                            {isNewYear ? 'YEAR' : 'MONTH'}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 900,
                            color: isNewYear ? '#da291c' : '#cbd5e1',
                            letterSpacing: '0.02em',
                            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', 'Bai Jamjuree', monospace",
                          }}>
                            {THAI_MONTHS_FULL[currentYM.monthIdx]} {currentYM.year}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  <HeatmapRow 
                    date={date} rowIdx={rowIdx} day={day} month={month} dayName={dayName} isWeekend={isWeekend}
                    dailyTotal={dailyTotal} grandTotal={grandTotal} cellMap={cellMap}
                    activeCategories={activeCategories} dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
                    handleCellLeave={handleCellLeave}
                    handleCellHover={handleCellHover}
                    dm={dm} bgBase={bgBase} border={border} ROW_H={ROW_H} maxCellValue={maxCellValue}
                    fmtCell={fmtCell}
                  />
                </React.Fragment>
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
                color: '#888888',
              }}>รวม</td>

              {activeCategories.map((cat, idx) => (
                <td key={cat.id} 
                  className={`heatmap-footer-cell col-idx-${idx}`}
                  style={{
                    position: 'sticky', bottom: 0, zIndex: 40,
                    background: bgFoot,
                    borderTop: `1.5px solid ${border2}`,
                    borderRight: `1px solid ${border}`,
                    padding: '8px 4px',
                    '--cat-color': cat.color,
                  }}
                >
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