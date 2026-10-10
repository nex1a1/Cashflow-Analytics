import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Calendar,
  ChevronDown,
  Check,
  X,
  RotateCcw,
  Briefcase,
  Palmtree,
} from 'lucide-react';
import { THAI_MONTHS } from '@/utils/formatters';
import {
  DAY_LABELS,
  parseValue,
  toValueStr,
  getDatesInRange,
  groupContiguousDates,
  formatDisplay,
  stepMonth,
  stepYear,
  getPresetDates,
  formatRangeLabel,
  MIN_YEAR,
  MAX_YEAR,
} from '@/utils/datePickerHelpers';
import { resolveDefaultDayTypeId } from '@/views/Calendar/utils/calendarPeriodHelpers';
import type { DayType } from '@/types';

interface ResolveDayStyleProps {
  dayIsSelected: boolean;
  hasPrev: boolean;
  hasNext: boolean;
  value?: string | null;
  draftDatesSize: number;
  weekend: boolean;
  isToday: boolean;
  textMain: string;
  hoverDay: string;
}

function resolveDayStyle({
  dayIsSelected,
  hasPrev,
  hasNext,
  value,
  draftDatesSize,
  weekend,
  isToday,
  textMain,
  hoverDay,
}: ResolveDayStyleProps) {
  if (dayIsSelected) {
    if (hasPrev && hasNext) {
      return { dayStyle: 'bg-accent/35 text-white font-bold border-y border-accent/60 shadow-none', isDimmed: false };
    }
    return { dayStyle: 'bg-accent text-on-accent font-black shadow-sm ring-1 ring-accent-ink', isDimmed: false };
  }
  if (value === 'WEEKDAY' && draftDatesSize === 0) {
    return weekend
      ? { dayStyle: 'text-ink-muted opacity-40', isDimmed: true }
      : { dayStyle: 'bg-blue-950/50 text-blue-300 font-bold border border-blue-500/40', isDimmed: false };
  }
  if (value === 'WEEKEND' && draftDatesSize === 0) {
    return weekend
      ? { dayStyle: 'bg-amber-950/50 text-amber-300 font-bold border border-amber-500/40', isDimmed: false }
      : { dayStyle: 'text-ink-muted opacity-40', isDimmed: true };
  }
  if (isToday) {
    return { dayStyle: `ring-1 ring-accent-ink ${textMain} ${hoverDay}`, isDimmed: false };
  }
  if (weekend) {
    return { dayStyle: `text-weekend font-bold ${hoverDay}`, isDimmed: false };
  }
  return { dayStyle: `${textMain} ${hoverDay}`, isDimmed: false };
}

// Same fallback as the calendar (CLAUDE.md 41(i)): an unmarked day, or one whose type was deleted, shows the default type
function resolveDayTypeObj(dateStr: string, weekend: boolean, dayTypes: Record<string, string>, dayTypeConfig: DayType[]) {
  return dayTypeConfig.find(dt => dt.id === dayTypes[dateStr])
    ?? dayTypeConfig.find(dt => dt.id === resolveDefaultDayTypeId(dayTypeConfig, weekend));
}

function getDayDataDotColor(val?: string | null) {
  if (val === 'WEEKDAY') return 'bg-blue-400';
  if (val === 'WEEKEND') return 'bg-amber-400';
  return 'bg-accent';
}

interface DatePickerDayCellProps {
  d: number;
  y: number;
  m: number;
  activeDraftDates: Set<string>;
  draftDatesSize: number;
  hasData: (d: number) => boolean;
  isToday: (d: number) => boolean;
  value?: string | null;
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
  textMain: string;
  hoverDay: string;
  onDayClick: (d: number, e: React.MouseEvent) => void;
  onMouseDown: (d: number, e: React.MouseEvent) => void;
  onMouseEnter: (d: number) => void;
}

function DatePickerDayCell({
  d,
  y,
  m,
  activeDraftDates,
  draftDatesSize,
  hasData,
  isToday,
  value,
  dayTypes,
  dayTypeConfig,
  textMain,
  hoverDay,
  onDayClick,
  onMouseDown,
  onMouseEnter,
}: DatePickerDayCellProps) {
  const dateStr = toValueStr(new Date(y, m, d));

  const weekend = new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6;
  const dayHasData = hasData(d);
  const dayIsSelected = activeDraftDates.has(dateStr);

  const prevDateStr = toValueStr(new Date(y, m, d - 1));
  const nextDateStr = toValueStr(new Date(y, m, d + 1));
  const hasPrev = activeDraftDates.has(prevDateStr);
  const hasNext = activeDraftDates.has(nextDateStr);

  const { dayStyle, isDimmed } = resolveDayStyle({
    dayIsSelected,
    hasPrev,
    hasNext,
    value,
    draftDatesSize,
    weekend,
    isToday: isToday(d),
    textMain,
    hoverDay,
  });

  const dayTypeObj = resolveDayTypeObj(dateStr, weekend, dayTypes, dayTypeConfig);

  return (
    <button
      key={d}
      type="button"
      onClick={(e) => onDayClick(d, e)}
      onMouseDown={(e) => onMouseDown(d, e)}
      onMouseEnter={() => onMouseEnter(d)}
      className={`relative h-7 w-full rounded-none text-xs font-medium transition-all flex items-center justify-center cursor-pointer select-none ${dayStyle}`}
      title={dayTypeObj ? `ประเภทวัน: ${dayTypeObj.label || dayTypeObj.name}` : undefined}
    >
      {dayTypeObj && (
        <span
          className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-10"
          style={{ backgroundColor: dayTypeObj.color ?? undefined }}
        />
      )}
      <span>{d}</span>
      {dayHasData && !dayIsSelected && !isDimmed && (
        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${getDayDataDotColor(value)}`} />
      )}
    </button>
  );
}

function parseDraftDatesFromValue(value?: string | null): Set<string> {
  if (!value || value === 'ALL' || value === 'WEEKDAY' || value === 'WEEKEND') {
    return new Set();
  }
  return new Set(value.split(','));
}

function applyRangeSelection(baseline: Set<string>, range: string[], mode: boolean): Set<string> {
  const next = new Set(baseline);
  if (mode) {
    range.forEach((d: string) => next.add(d));
  } else {
    range.forEach((d: string) => next.delete(d));
  }
  return next;
}

const formatConfirmedValue = (draftDates: Set<string>) => Array.from(draftDates).sort((a, b) => a.localeCompare(b)).join(',');

interface DatePickerTriggerProps {
  variant?: string;
  open: boolean;
  setOpen: (o: boolean) => void;
  isActive: boolean;
  value?: string | null;
  placeholder?: string;
  textMain: string;
  textMuted: string;
  className?: string;
}

function DatePickerTrigger({
  variant,
  open,
  setOpen,
  isActive,
  value,
  placeholder,
  textMain,
  textMuted,
  className,
}: DatePickerTriggerProps) {
  if (variant === 'hud') {
    return (
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`relative w-full text-left flex items-center border rounded-none bg-surface cursor-pointer select-none transition-colors ${
          isActive
            ? 'border-accent-ink text-white bg-surface'
            : 'border-line text-ink-body hover:border-accent/40 hover:bg-surface-elevated/20'
        }`}
      >
        <div
          className={`pl-2 pr-1.5 py-1 border-r flex items-center justify-center shrink-0 ${
            isActive ? 'border-accent/30 text-accent-ink' : 'border-line text-ink-muted'
          }`}
        >
          <Calendar className="w-3 h-3" />
        </div>

        <div className="w-full text-[11px] font-black py-1 pl-1.5 pr-7 truncate text-slate-300">
          {formatDisplay(value, placeholder)}
        </div>

        <div
          className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
            isActive ? 'text-accent-ink' : 'text-ink-muted'
          }`}
        >
          <ChevronDown className="w-3 h-3" />
        </div>

        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
            <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-accent"></span>
          </span>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={
        className ||
        'w-full h-9 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-bold transition-colors outline-none bg-canvas border-line-strong text-white hover:border-accent-ink focus:border-accent-ink'
      }
    >
      <span className={`${value && value !== 'ALL' ? textMain : textMuted} whitespace-nowrap truncate`}>
        {formatDisplay(value, placeholder)}
      </span>
      <Calendar className="w-3.5 h-3.5 shrink-0 text-ink-body" />
    </button>
  );
}

export interface DatePickerProps {
  value: string;
  onChange: (val: string) => void;
  variant?: 'default' | 'hud' | string;
  placeholder?: string;
  /** filter mode: "every day" (ALL) / weekday / weekend modes and picking several days, confirmed at the end */
  allowAll?: boolean;
  availableDates?: string[];
  filterPeriod?: string;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  className?: string;
  customTrigger?: (props: {
    open: boolean;
    setOpen: (o: boolean) => void;
    value: string;
    display: string;
  }) => React.ReactNode;
}

export default function DatePicker({
  value,
  onChange,
  variant = 'default',
  placeholder = 'เลือกวันที่',
  allowAll = false,
  availableDates = [],
  filterPeriod,
  dayTypes = {},
  dayTypeConfig = [],
  className,
  customTrigger,
}: DatePickerProps) {
  const isMulti = allowAll;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseValue(value, filterPeriod));

  // Draft dates set for multi-selection (Set of YYYY-MM-DD strings)
  const [draftDates, setDraftDates] = useState(() => parseDraftDatesFromValue(value));

  // Drag Sweep States
  // add = the press started on an unselected day (sweep adds), else the sweep removes
  const [drag, setDrag] = useState<{ start: string; current: string; baseline: Set<string>; add: boolean } | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [resolvedAlign, setResolvedAlign] = useState<'left' | 'right'>('left');
  const [resolvedVerticalAlign, setResolvedVerticalAlign] = useState<'bottom' | 'top'>('bottom');

  // Auto-detect horizontal and vertical alignment to avoid overflow clipping
  useEffect(() => {
    if (!open) return;
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      let limitRight = window.innerWidth;
      let limitBottom = window.innerHeight;
      let parent = containerRef.current.parentElement;
      while (parent && parent !== document.body) {
        const style = window.getComputedStyle(parent);
        if (
          style.overflowX === 'hidden' ||
          style.overflowX === 'auto' ||
          style.overflowY === 'auto' ||
          style.overflow === 'hidden' ||
          style.overflow === 'auto'
        ) {
          const pRect = parent.getBoundingClientRect();
          limitRight = Math.min(limitRight, pRect.right);
          limitBottom = Math.min(limitBottom, pRect.bottom);
        }
        parent = parent.parentElement;
      }

      // Horizontal check: Popover width is w-80 (320px) + buffer (16px)
      setResolvedAlign(rect.left + 336 > limitRight ? 'right' : 'left');

      // Vertical check: Popover height is ~380px (header, mode buttons, grid, summary, presets, footer)
      const popoverHeight = 380;
      const spaceBelow = limitBottom - rect.bottom;
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        setResolvedVerticalAlign('top');
      } else {
        setResolvedVerticalAlign('bottom');
      }
    }
  }, [open]);

  // Sync state when popover opens or value/period changes
  useEffect(() => {
    if (!open) return;
    const parsed = parseValue(value, filterPeriod);
    setViewDate(parsed);
    setDraftDates(parseDraftDatesFromValue(value));
  }, [open, value, filterPeriod]);

  // Click outside listener
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape key listener (Capture phase to prevent bubbling to parent modals)
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleEsc, true);
    return () => window.removeEventListener('keydown', handleEsc, true);
  }, [open]);

  // Global mouseup handler to release drag even if mouse leaves window
  // Compute active preview dates during drag
  const activeDraftDates = useMemo(() => drag
    ? applyRangeSelection(drag.baseline, getDatesInRange(drag.start, drag.current), drag.add)
    : draftDates, [drag, draftDates]);

  useEffect(() => {
    if (!drag) return;
    const handleGlobalMouseUp = () => {
      setDraftDates(activeDraftDates);
      setDrag(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [drag, activeDraftDates]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const today = new Date();

  const isAtMinYear = y <= MIN_YEAR;
  const isAtMaxYear = y >= MAX_YEAR;

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const blanks = ['b-sun', 'b-mon', 'b-tue', 'b-wed', 'b-thu', 'b-fri'].slice(0, firstDay);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isToday = (d: number) =>
    d === today.getDate() &&
    m === today.getMonth() &&
    y === today.getFullYear();

  const availableSet = useMemo(() => new Set(availableDates || []), [availableDates]);

  const dateOf = (d: number) => toValueStr(new Date(y, m, d));
  const hasData = (d: number) => availableSet.has(dateOf(d));

  const prevMonth = () => setViewDate(stepMonth(viewDate, -1));
  const nextMonth = () => setViewDate(stepMonth(viewDate, 1));
  // the year buttons are disabled at the limits, and stepYear clamps anyway
  const prevYear = () => setViewDate(stepYear(viewDate, -1));
  const nextYear = () => setViewDate(stepYear(viewDate, 1));

  // Click on day cell. A mouse already acted on mousedown; this is the keyboard path (Enter/Space = click with detail 0)
  const handleDayClick = (d: number, e: React.MouseEvent) => {
    const dateStr = dateOf(d);

    if (!isMulti) {
      onChange(dateStr);
      setOpen(false);
    } else if (e.detail === 0) {
      const next = new Set(draftDates);
      if (!next.delete(dateStr)) next.add(dateStr);
      setDraftDates(next);
    }
  };

  // Mouse Down handler on day cell (Start drag / single click)
  const handleMouseDown = (d: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text drag selection
    const dateStr = dateOf(d);

    if (!isMulti) {
      onChange(dateStr);
      setOpen(false);
      return;
    }

    setDrag({ start: dateStr, current: dateStr, baseline: draftDates, add: !draftDates.has(dateStr) });
  };

  // Mouse Enter handler on day cell (Update drag range)
  const handleMouseEnter = (d: number) => {
    setDrag(prev => prev && { ...prev, current: dateOf(d) });
  };

  // Remove contiguous range of dates
  const removeRange = (rangeToRemove: string[]) => {
    const next = new Set(draftDates);
    rangeToRemove.forEach((d: string) => next.delete(d));
    setDraftDates(next);
  };

  // Confirm multi-selection
  const handleConfirm = () => { // disabled while nothing is picked
    onChange(formatConfirmedValue(draftDates));
    setOpen(false);
  };

  const handleModeSelect = (mode: string) => {
    onChange(value === mode ? 'ALL' : mode); // the value changes, so the sync effect resets the draft
    // Do NOT auto-close so the user sees the mode change
  };

  const handleClear = () => {
    onChange('ALL'); // the draft is re-read from the value on the next open
    setOpen(false);
  };

  const handleApplyPreset = (targetDateStr: string) => {
    const [py, pm, pd] = targetDateStr.split('-').map(Number);
    const targetDate = new Date(py, pm - 1, pd);
    setViewDate(targetDate);

    if (!isMulti) {
      onChange(targetDateStr);
      setOpen(false);
    } else {
      setDraftDates(new Set([targetDateStr]));
    }
  };

  const presets = useMemo(() => getPresetDates(viewDate), [viewDate]);
  const now = getPresetDates(); // every render: a picker left mounted overnight must not keep yesterday's "today"

  const isActive = Boolean(value && value !== 'ALL');

  // Grouped contiguous ranges for smart summary box
  const dateRanges = useMemo(() => {
    return groupContiguousDates(Array.from(draftDates));
  }, [draftDates]);

  /* ── Styles ── */
  const surface = 'bg-surface-hover';
  const border = 'border-line-strong';
  const textMain = 'text-ink-display';
  const textMuted = 'text-ink-body';
  const hoverDay = 'hover:bg-surface-elevated hover:text-white';

  const verticalPositionClass = resolvedVerticalAlign === 'top' 
    ? 'bottom-[calc(100%+6px)]' 
    : 'top-[calc(100%+6px)]';

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-[60]' : 'z-20'} w-full`}>
      {customTrigger ? (
        customTrigger({
          open,
          setOpen,
          value,
          display: formatDisplay(value, placeholder),
        })
      ) : (
        <DatePickerTrigger
          variant={variant}
          open={open}
          setOpen={setOpen}
          isActive={isActive}
          value={value}
          placeholder={placeholder}
          textMain={textMain}
          textMuted={textMuted}
          className={className}
        />
      )}

      {open && (
        <div
          className={`absolute ${verticalPositionClass} ${
            resolvedAlign === 'right' ? 'right-0' : 'left-0'
          } z-[999] rounded-none border shadow-2xl p-3 w-80 select-none ${surface} ${border}`}
        >
          {allowAll && (
            <div className="flex rounded-none p-0.5 mb-2.5 border bg-surface border-line">
              <button
                type="button"
                onClick={() => handleModeSelect('ALL')}
                className={`flex-1 py-1 text-[11px] font-black uppercase transition-all rounded-none ${
                  (value === 'ALL' || !value) && draftDates.size === 0
                    ? 'bg-surface-elevated text-white font-extrabold shadow-sm'
                    : 'text-ink-body hover:text-slate-200 hover:bg-surface-elevated/30'
                }`}
              >
                ทุกวัน
              </button>
              <button
                type="button"
                onClick={() => handleModeSelect('WEEKDAY')}
                className={`flex-1 py-1 text-[11px] font-black uppercase transition-all rounded-none flex items-center justify-center gap-1 ${
                  value === 'WEEKDAY'
                    ? 'bg-blue-950/60 border border-blue-500/50 text-blue-400 font-extrabold shadow-sm'
                    : 'text-ink-body hover:text-slate-200 hover:bg-surface-elevated/30'
                }`}
              >
                <Briefcase className="w-3 h-3 shrink-0" />
                <span>จ-ศ</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeSelect('WEEKEND')}
                className={`flex-1 py-1 text-[11px] font-black uppercase transition-all rounded-none flex items-center justify-center gap-1 ${
                  value === 'WEEKEND'
                    ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400 font-extrabold shadow-sm'
                    : 'text-ink-body hover:text-slate-200 hover:bg-surface-elevated/30'
                }`}
              >
                <Palmtree className="w-3 h-3 shrink-0" />
                <span>ส-อา</span>
              </button>
            </div>
          )}

          {/* ================= HEADER CONTROLS (CLEAN FLAT TITLE + « < > ») ================= */}
          <div className="flex items-center justify-between mb-2.5 bg-surface px-2 py-1.5 border border-line">
            {/* Prev Year (-1 ปี) & Prev Month (-1 เดือน) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={prevYear}
                disabled={isAtMinYear}
                title={isAtMinYear ? `จำกัดปีขั้นต่ำ ${MIN_YEAR}` : 'ปีก่อนหน้า (-1 ปี)'}
                className="p-1 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={prevMonth}
                title="เดือนก่อนหน้า (-1 เดือน)"
                className="p-1 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Clean Flat Title: e.g. "กันยายน 2026" */}
            <div className="flex items-center justify-center">
              <span className="text-xs font-bold font-mono tracking-wider text-slate-100 select-none">
                {THAI_MONTHS[m]} {y}
              </span>
            </div>

            {/* Next Month (+1 เดือน) & Next Year (+1 ปี) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={nextMonth}
                title="เดือนถัดไป (+1 เดือน)"
                className="p-1 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={nextYear}
                disabled={isAtMaxYear}
                title={isAtMaxYear ? `จำกัดปีสูงสุด ${MAX_YEAR}` : 'ปีถัดไป (+1 ปี)'}
                className="p-1 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((l, i) => (
              <div
                key={l}
                className={`text-center text-[11px] font-bold py-1 ${
                  i === 0 || i === 6 ? 'text-weekend' : textMuted
                }`}
              >
                {l}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid with Connected Range Styling */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {blanks.map((blankKey) => (
              <div key={blankKey} />
            ))}
            {days.map((d) => (
              <DatePickerDayCell
                key={d}
                d={d}
                y={y}
                m={m}
                activeDraftDates={activeDraftDates}
                draftDatesSize={draftDates.size}
                hasData={hasData}
                isToday={isToday}
                value={value}
                dayTypes={dayTypes}
                dayTypeConfig={dayTypeConfig}
                textMain={textMain}
                hoverDay={hoverDay}
                onDayClick={handleDayClick}
                onMouseDown={handleMouseDown}
                onMouseEnter={handleMouseEnter}
              />
            ))}
          </div>

          {/* Smart Grouped Selected Dates Summary Box (Only shown in Multi-Selection Mode) */}
          {isMulti && (
            <div className="mt-2.5 pt-2 border-t border-line">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-black uppercase text-slate-400 font-mono">
                  สรุปวันที่เลือก ({draftDates.size} วัน):
                </span>
                <span className="text-[11px] text-ink-muted font-mono">
                  คลิก หรือลากค้างเพื่อเลือก
                </span>
              </div>

              <div className="bg-surface border border-line p-1.5 flex flex-wrap gap-1 items-center min-h-[32px]">
                {dateRanges.length === 0 ? (
                  <span className="text-[11px] text-ink-muted font-mono pl-1">
                    ยังไม่ได้เลือกวัน
                  </span>
                ) : (
                  dateRanges.map((range) => {
                    const label = range.length === 1 ? formatRangeLabel(range) : `${formatRangeLabel(range)} (${range.length} วัน)`;

                    return (
                      <span
                        key={range[0]}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-bold bg-accent/15 border border-accent/40 text-accent-ink rounded-pill"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => removeRange(range)}
                          className="hover:text-white text-accent-ink/70 transition-colors"
                          title="ลบช่วงนี้"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ================= QUICK PRESETS BAR ================= */}
          <div className="mt-2 pt-2 border-t border-line flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => handleApplyPreset(now.today)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(now.yesterday)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              เมื่อวาน
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(presets.startOfMonth)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              ต้นเดือน
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(presets.endOfMonth)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-pill bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              สิ้นเดือน
            </button>
          </div>

          {/* ================= ACTION & CONFIRMATION FOOTER ================= */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-line gap-1.5">
            <div className="flex items-center gap-1">
              {allowAll && <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-bold px-2 py-1 rounded-none transition-colors text-ink-body hover:text-white hover:bg-surface-elevated flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-ink-muted" /> ล้าง
              </button>}
            </div>

            {isMulti && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={draftDates.size === 0}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-black uppercase rounded-none border border-accent-ink bg-accent text-on-accent hover:bg-accent-active transition-colors shadow-sm font-mono cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent"
                title={draftDates.size === 0 ? 'กรุณาเลือกวันที่ก่อนยืนยัน' : undefined}
              >
                <Check className="w-3 h-3" />
                {draftDates.size > 0 ? `ยืนยัน (${draftDates.size})` : 'ยืนยัน'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}