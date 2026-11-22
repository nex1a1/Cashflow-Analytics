import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Inbox } from 'lucide-react';

// Hooks & Logic
import { useHeatmapEngine, HeatmapEngineOptions } from '../../hooks/useHeatmapEngine';

// Sub-components
import HeatmapTooltip, { TooltipData } from './HeatmapTooltip';
import HeatmapHeader from './HeatmapHeader';
import HeatmapRow from './HeatmapRow';
import { TransactionDisplay, Category, DayType } from '../../../../types';
import { THAI_MONTHS, formatBaht } from '../../../../utils/formatters';
import { parseDateStrToObj } from '../../../../utils/dateHelpers';
import { isCyclePeriod, toCycleKey, cycleRange, cycleLabel, cycleRangeLabel } from '../../../../utils/payCycle';
import useToday from '@/hooks/useToday';
import { runningTotals } from '../../ledgerMath';

import { tc, FONT_MONO, readable } from '@/constants/theme';
const parseYearMonth = (dateStr: string) => {
  if (!dateStr) return { year: 0, monthIdx: 0 };
  const dateObj = parseDateStrToObj(dateStr);
  let year = dateObj.getFullYear();
  const monthIdx = dateObj.getMonth();

  if (year > 0 && year < 2500) {
    year += 543;
  }
  return { year, monthIdx };
};

/** below this width per category column the header name no longer fits: icon-only headers */
const DENSE_COL_PX = 84;
/** compact mode: the table always fits the screen (no sideways scroll), down to this per category
    column; the date / daily-total columns narrow too */
const DENSE_MIN_COL_PX = 30;
/** 11px bold digits are ~6px wide (measured); + the cell's side padding */
const DENSE_CHAR_PX = 6;
const DENSE_PAD_PX = 5;
const DATE_COL = { normal: 64, dense: 52 };
const TOTAL_COL = { normal: 100, dense: 90 };

/** whole days from ISO a to ISO b (b − a) */
const daysBetween = (a: string, b: string) =>
  (Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000;

const DEFAULT_DAY_TYPES: Record<string, string> = {};
const DEFAULT_DAY_TYPE_CONFIG: DayType[] = [];
const DEFAULT_ALL_DATES: string[] = [];

interface HorizontalLedgerViewProps {
  displayTransactions: TransactionDisplay[];
  categories: Category[];
  formatMoney: (val: number | string) => string;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  allDates?: string[];
  /** the selected period: `cycle:…` groups rows by pay cycle (25 → 24) instead of calendar month */
  period?: string;
  filterOptions?: HeatmapEngineOptions;
  clearFilters?: () => void;
  isFilterActive?: boolean;
}

function tooltipFor(e: React.SyntheticEvent<HTMLTableCellElement>, date: string, cat: Category, items: TransactionDisplay[]): TooltipData {
  const rect = e.currentTarget.getBoundingClientRect();
  return { date, cat, items, x: rect.left + rect.width / 2, y: rect.top, bottom: rect.bottom };
}

export default function HorizontalLedgerView({
  displayTransactions, categories, formatMoney, 
  dayTypes = DEFAULT_DAY_TYPES, 
  dayTypeConfig = DEFAULT_DAY_TYPE_CONFIG, 
  allDates = DEFAULT_ALL_DATES,
  period,
  filterOptions = {},
  clearFilters,
  isFilterActive = false
}: HorizontalLedgerViewProps) {
  // UI State
  // The hover tooltip follows the mouse; clicked cells pin theirs (several at once, each takes the
  // mouse so a long list can be scrolled) while hovering other cells still shows theirs next to them.
  const [hover, setHover] = useState<{ key: string; data: TooltipData } | null>(null);
  const [pinned, setPinned] = useState<{ key: string; data: TooltipData }[]>([]);
  const anyPinned = pinned.length > 0;
  const today = useToday();
  const cycleMode = isCyclePeriod(period);
  // rows group under a banner per pay cycle in cycle mode, per calendar month otherwise
  const groupOf = (iso: string) => (cycleMode ? toCycleKey(iso) : iso.slice(0, 7));

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
    maxDailyTotal,
    formatDate
  } = useHeatmapEngine(displayTransactions, categories, allDates, filterOptions);

  // ─── 2. Event Handlers ───
  const handleCellHover = useCallback((e: React.SyntheticEvent<HTMLTableCellElement>, date: string, catId: string, cat: Category, items: TransactionDisplay[]) => {
    if (!items || items.length === 0) {
      setHover(null);
      return;
    }
    setHover({ key: `${date}|${catId}`, data: tooltipFor(e, date, cat, items) });
  }, []);

  const handleCellLeave = useCallback(() => { setHover(null); }, []);

  const unpinAll = useCallback(() => { setPinned([]); }, []);
  const unpinKey = useCallback((key: string) => { setPinned(p => p.filter(t => t.key !== key)); }, []);

  const handleCellPin = useCallback((e: React.SyntheticEvent<HTMLTableCellElement>, date: string, catId: string, cat: Category, items: TransactionDisplay[]) => {
    const key = `${date}|${catId}`;
    if (!items || items.length === 0) return;
    const data = tooltipFor(e, date, cat, items);
    data.below = data.y < 220;
    // Clicking a pinned cell again unpins it (back to a plain hover tooltip); any other cell adds one.
    setPinned(p => (p.some(t => t.key === key) ? p.filter(t => t.key !== key) : [...p, { key, data }]));
  }, []);

  useEffect(() => {
    if (!anyPinned) return;
    const inTip = (t: EventTarget | null) => t instanceof Element && !!t.closest('[data-heatmap-tip]');
    // A data cell's own click toggles its pin; anything else outside the tooltips closes them all.
    const onDown = (e: PointerEvent) => {
      if (inTip(e.target) || (e.target as Element).closest?.('.heatmap-cell[tabindex="0"]')) return;
      unpinAll();
    };
    // Esc closes the newest pin first.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPinned(p => p.slice(0, -1)); };
    // Scrolling the page or the table moves each pinned tooltip with its cell (once per frame);
    // a pin whose cell is gone (filtered out, other month) closes.
    let frame = 0;
    const follow = () => {
      frame = 0;
      setPinned(p => {
        let changed = false;
        const next = p.flatMap(t => {
          const cell = document.querySelector(`[data-cell-key="${CSS.escape(t.key)}"]`);
          if (!cell) { changed = true; return []; }
          const r = cell.getBoundingClientRect();
          const x = r.left + r.width / 2;
          if (x === t.data.x && r.top === t.data.y) return [t];
          changed = true;
          return [{ ...t, data: { ...t.data, x, y: r.top, bottom: r.bottom } }];
        });
        return changed ? next : p;
      });
    };
    const onScroll = (e: Event) => {
      if (inTip(e.target) || frame) return;
      frame = requestAnimationFrame(follow);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [anyPinned, unpinAll]);

  // Cycle mode: what the cycle has spent so far, under each day's total (the question there is
  // "does this pay last until the next one"). Future days show nothing: they haven't happened yet.
  // Compact mode: once a category column is too narrow for its name (long periods bring many
  // categories), headers show the icon alone and cell numbers shrink. Measured, not counted,
  // so it follows the window width too.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([entry]) => setTableWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [expenseTransactions.length === 0]); // the table (and its ref) only exists once there are rows
  const dense = tableWidth > 0 && activeCategories.length > 0
    && (tableWidth - DATE_COL.normal - TOTAL_COL.normal) / activeCategories.length < DENSE_COL_PX;

  // Compact widths: each category column gets room for its own footer total (the widest number in
  // that column), so a ฿47,089.30 column isn't cut while a ฿49 one gives its spare room away.
  // Satang stays: the numbers are never shortened.
  const colNeed = activeCategories.map(cat =>
    Math.max(DENSE_MIN_COL_PX, formatMoney(categoryTotal[cat.name] || 0).length * DENSE_CHAR_PX + DENSE_PAD_PX));
  const needSum = colNeed.reduce((a, b) => a + b, 0);
  const denseAvail = tableWidth - DATE_COL.dense - TOTAL_COL.dense;
  const denseScale = needSum > 0 && needSum < denseAvail ? denseAvail / needSum : 1;

  const sinceCycleStart = cycleMode ? runningTotals(sortedDates, dailyTotal, groupOf) : null;

  // ─── 3. Styles ───
  const border  = 'rgb(var(--overlay) / 0.06)';
  const border2 = 'rgb(var(--overlay) / 0.12)';
  const bgBase  = tc('canvas');
  const bgHead  = tc('surface-hover');
  const bgFoot  = tc('surface');
  const ROW_H   = '34px';

  if (expenseTransactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <div className="p-6 rounded-none border-2 border-line-strong mb-6 bg-canvas">
          <Inbox className="w-16 h-16 text-ink-muted" />
        </div>
        <p className="text-lg font-black text-ink-soft">ยังไม่มีรายการจ่ายในมุมมองนี้</p>
        <p className="text-sm mt-2 mb-4 text-ink-body">เพิ่มรายจ่ายเพื่อดูในตารางรายวัน</p>
        {isFilterActive && clearFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="px-4 py-1.5 rounded-none text-xs font-bold border bg-surface-elevated/60 border-line-strong text-ink-soft hover:bg-surface-elevated hover:text-ink-display cursor-pointer transition-colors font-mono"
          >
            ล้างตัวกรองตาราง
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      
      {/* ── Tooltip ── */}
      {pinned.map(t => (
        <HeatmapTooltip key={t.key} tooltip={t.data} pinned onClose={() => unpinKey(t.key)} />
      ))}
      <HeatmapTooltip tooltip={hover && !pinned.some(t => t.key === hover.key) ? hover.data : null} />

      {/* ── Table ── */}
      <div ref={scrollRef} className="w-full" style={{ overflowX: 'auto' }}>
        <table
          onMouseLeave={handleCellLeave}
          className="heatmap-table"
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: '100%',
            minWidth: dense
              ? `${DATE_COL.dense + needSum + TOTAL_COL.dense}px`
              : `${DATE_COL.normal + activeCategories.length * 65 + TOTAL_COL.normal}px`,
            tableLayout: 'fixed',
            fontSize: 12,
          }}
        >
          <colgroup>
            <col style={{ width: dense ? DATE_COL.dense : DATE_COL.normal }} />
            {activeCategories.map((cat, i) => (
              <col key={cat.id} style={dense ? { width: Math.floor(colNeed[i] * denseScale) } : undefined} />
            ))}
            <col style={{ width: dense ? TOTAL_COL.dense : TOTAL_COL.normal }} />
          </colgroup>

          <HeatmapHeader
            activeCategories={activeCategories} dense={dense}
            bgHead={bgHead} border={border} border2={border2}
          />

          <tbody>
            {sortedDates.map((date, rowIdx) => {
              const { day, month, dayName, isWeekend } = formatDate(date);
              
              const currentYM = parseYearMonth(date);
              const prevDate = rowIdx > 0 ? sortedDates[rowIdx - 1] : null;
              const group = groupOf(date);
              const prevGroup = prevDate ? groupOf(prevDate) : null;
              const isNewGroup = group !== prevGroup;
              // YEAR only where the year really turns over, never on the first row
              const isNewYear = isNewGroup && prevGroup !== null && group.slice(0, 4) !== prevGroup.slice(0, 4);
              // inside one pay cycle the calendar month still turns over: a slim divider, not a second banner
              const isMonthTurn = cycleMode && !isNewGroup && !!prevDate && prevDate.slice(0, 7) !== date.slice(0, 7);
              let daysLeft: number | null = null;
              if (cycleMode && isNewGroup) {
                const { start, end } = cycleRange(group);
                if (today >= start && today <= end) daysLeft = daysBetween(today, end);
              }

              return (
                <React.Fragment key={date}>
                  {isMonthTurn && (
                    <tr className="select-none" aria-hidden="true">
                      <td colSpan={activeCategories.length + 2} style={{ position: 'sticky', left: 0, padding: 0, height: 18 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px' }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: tc('ink-muted'), fontFamily: FONT_MONO, whiteSpace: 'nowrap' }}>
                            {THAI_MONTHS[currentYM.monthIdx]} {currentYM.year}
                          </span>
                          <span style={{ flex: 1, height: 1, background: 'rgb(var(--overlay) / 0.12)' }} />
                        </div>
                      </td>
                    </tr>
                  )}
                  {isNewGroup && (
                    <tr className="select-none">
                      <td
                        colSpan={activeCategories.length + 2}
                        style={{
                          position: 'sticky',
                          left: 0,
                          zIndex: 20,
                          background: isNewYear ? tc('accent', 0.14) : tc('surface'),
                          borderTop: isNewYear ? `1.5px solid ${tc('accent-ink')}` : '1px solid rgb(var(--overlay) / 0.08)',
                          borderBottom: '1px solid rgb(var(--overlay) / 0.08)',
                          padding: '6px 10px',
                          textAlign: 'left',
                          height: '32px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            background: isNewYear ? tc('accent', 0.2) : tc('gray-500', 0.15),
                            border: isNewYear ? `1px solid ${tc('accent', 0.4)}` : `1px solid ${tc('gray-500', 0.25)}`,
                            color: isNewYear ? tc('accent-ink') : tc('ink-body'),
                            fontSize: '11px',
                            fontWeight: 900,
                            padding: '1px 5px',
                            fontFamily: FONT_MONO,
                            letterSpacing: '0.05em',
                          }}>
                            {isNewYear ? 'YEAR' : cycleMode ? 'รอบ' : 'MONTH'}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: 900,
                            color: isNewYear ? tc('accent-ink') : tc('gray-300'),
                            letterSpacing: '0.02em',
                            fontFamily: FONT_MONO,
                          }}>
                            {cycleMode
                              ? `${cycleLabel(group).replace(/^รอบ /, '')} · ${cycleRangeLabel(group)}`
                              : `${THAI_MONTHS[currentYM.monthIdx]} ${currentYM.year}`}
                          </span>
                          {daysLeft !== null && (
                            <span style={{ fontSize: 11, fontWeight: 700, color: tc('ink-muted') }}>
                              {daysLeft === 0 ? 'วันนี้วันสุดท้ายของรอบ' : `เหลืออีก ${daysLeft} วัน`}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  
                  <HeatmapRow 
                    date={date} rowIdx={rowIdx} day={day} month={month} dayName={dayName} isWeekend={isWeekend}
                    isToday={date === today} isFuture={date > today}
                    sinceStart={sinceCycleStart && date <= today ? sinceCycleStart[date] : undefined}
                    dailyTotal={dailyTotal} grandTotal={grandTotal} cellMap={cellMap}
                    activeCategories={activeCategories} dense={dense} dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
                    handleCellLeave={handleCellLeave}
                    handleCellHover={handleCellHover}
                    handleCellPin={handleCellPin}
                    bgBase={bgBase} border={border} ROW_H={ROW_H} maxCellValue={maxCellValue}
                    maxDailyTotal={maxDailyTotal}
                    formatMoney={formatMoney}
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
                boxShadow: '2px 0 5px rgb(0 0 0 / calc(0.3 * var(--shadow-k)))',
                padding: '8px 4px',
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 900,
                color: tc('ink-body'),
              }}>รวม</td>

              {activeCategories.map((cat, idx) => (
                <td key={cat.id} 
                  className={`heatmap-footer-cell col-idx-${idx}`}
                  style={{
                    position: 'sticky', bottom: 0, zIndex: 40,
                    background: bgFoot,
                    borderTop: `1.5px solid ${border2}`,
                    borderRight: `1px solid ${border}`,
                    padding: dense ? '8px 2px' : '8px 4px',
                    '--cat-color': cat.color,
                  } as React.CSSProperties}
                >
                  {/* compact: the number alone, like the cells above it (the ฿ wouldn't fit) */}
                  {dense && categoryTotal[cat.name] > 0 && (
                    <div title={formatBaht(categoryTotal[cat.name])} style={{
                      fontSize: 11,
                      fontWeight: 900,
                      fontVariantNumeric: 'tabular-nums',
                      letterSpacing: '-0.02em',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflowX: 'clip',
                      color: readable(cat.color),
                    }}>
                      {formatMoney(categoryTotal[cat.name])}
                    </div>
                  )}
                  {!dense && categoryTotal[cat.name] > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      width: '100%',
                      whiteSpace: 'nowrap',
                    }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: readable(cat.color) }}>฿</span>
                      <span style={{
                        fontSize: '13px',
                        fontWeight: 900,
                        fontVariantNumeric: 'tabular-nums',
                        color: readable(cat.color),
                      }}>
                        {formatMoney(categoryTotal[cat.name])}
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
                boxShadow: '-2px 0 5px rgb(0 0 0 / calc(0.3 * var(--shadow-k)))',
                padding: dense ? '8px 4px' : '8px 6px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  width: '100%',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontSize: dense ? '12px' : '13px', fontWeight: 900, color: tc('expense') }}>฿</span>
                  <span style={{
                    fontSize: dense ? '13px' : '15px',
                    fontWeight: 900,
                    fontVariantNumeric: 'tabular-nums',
                    color: tc('expense'),
                  }}>
                    {formatMoney(grandTotal)}
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
