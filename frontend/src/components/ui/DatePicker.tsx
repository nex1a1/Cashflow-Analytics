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
import { THAI_MONTHS, THAI_MONTHS_SHORT } from '@/utils/formatters';
import {
  DAY_LABELS,
  splitDateValue,
  parseValue,
  toValueStr,
  getDatesInRange,
  groupContiguousDates,
  formatDisplay,
  stepMonth,
  stepYear,
  getPresetDates,
  MIN_YEAR,
  MAX_YEAR,
} from '@/utils/datePickerHelpers';

export { DAY_LABELS, splitDateValue, parseValue, toValueStr, getDatesInRange, groupContiguousDates, formatDisplay };

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
    return { dayStyle: 'bg-accent text-on-accent font-black shadow-sm ring-1 ring-accent', isDimmed: false };
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
    return { dayStyle: `ring-1 ring-accent ${textMain} ${hoverDay}`, isDimmed: false };
  }
  if (weekend) {
    return { dayStyle: `text-red-400 ${hoverDay}`, isDimmed: false };
  }
  return { dayStyle: `${textMain} ${hoverDay}`, isDimmed: false };
}

function resolveDayTypeObj(y: number, m: number, d: number, dateStr: string, dayTypes: Record<string, string>, dayTypeConfig: any[]) {
  if (!dayTypeConfig || dayTypeConfig.length === 0) return null;
  const explicitTypeId = dayTypes[dateStr];
  if (explicitTypeId) {
    const found = dayTypeConfig.find((dt: any) => dt.id === explicitTypeId);
    if (found) return found;
  }
  const dow = new Date(y, m, d).getDay();
  const isWknd = dow === 0 || dow === 6;
  if (isWknd) {
    return dayTypeConfig.find((dt: any) =>
      dt.id === 'HOLIDAY' || dt.id === 'OFF' || dt.name === 'HOLIDAY' || dt.label?.includes('หยุด')
    ) || dayTypeConfig[1] || dayTypeConfig[0];
  }
  return dayTypeConfig.find((dt: any) =>
    dt.id === 'WORK' || dt.name === 'WORK' || dt.label?.includes('ทำงาน')
  ) || dayTypeConfig[0];
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
  dayTypeConfig: any[];
  textMain: string;
  hoverDay: string;
  onDayClick: (d: number) => void;
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
  const monthStr = String(m + 1).padStart(2, '0');
  const dayStr = String(d).padStart(2, '0');
  const dateStr = `${y}-${monthStr}-${dayStr}`;

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

  const dayTypeObj = resolveDayTypeObj(y, m, d, dateStr, dayTypes, dayTypeConfig);

  return (
    <button
      key={d}
      type="button"
      onClick={() => onDayClick(d)}
      onMouseDown={(e) => onMouseDown(d, e)}
      onMouseEnter={() => onMouseEnter(d)}
      className={`relative h-7 w-full rounded-none text-xs font-medium transition-all flex items-center justify-center cursor-pointer select-none ${dayStyle}`}
      title={dayTypeObj ? `ชนิดวัน: ${dayTypeObj.label || dayTypeObj.name}` : undefined}
    >
      {dayTypeObj && (
        <span
          className="absolute top-0 inset-x-0 h-[2.5px] pointer-events-none z-10"
          style={{ backgroundColor: dayTypeObj.color }}
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
  if (value.includes(',')) return new Set(value.split(','));
  if (value.includes(':')) {
    const [s, e] = value.split(':');
    return new Set(getDatesInRange(s, e));
  }
  return new Set([value]);
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

function formatConfirmedValue(draftDates: Set<string>, allowAll?: boolean): string {
  if (draftDates.size === 0) return allowAll ? 'ALL' : '';
  if (draftDates.size === 1) return Array.from(draftDates)[0];
  const sorted = Array.from(draftDates).sort((a: string, b: string) => a.localeCompare(b));
  return sorted.join(',');
}

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
            ? 'border-accent text-white bg-surface'
            : 'border-line text-ink-body hover:border-accent/40 hover:bg-surface-elevated/20'
        }`}
      >
        <div
          className={`pl-2 pr-1.5 py-1 border-r flex items-center justify-center shrink-0 ${
            isActive ? 'border-accent/30 text-accent' : 'border-line text-ink-muted'
          }`}
        >
          <Calendar className="w-3 h-3" />
        </div>

        <div className="w-full text-[11px] font-black py-1 pl-1.5 pr-7 truncate text-slate-300">
          {formatDisplay(value, placeholder)}
        </div>

        <div
          className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
            isActive ? 'text-accent' : 'text-ink-muted'
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
        'w-full h-9 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-bold transition-colors outline-none bg-canvas border-line-strong text-white hover:border-accent focus:border-accent'
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
  required?: boolean;
  variant?: 'default' | 'hud' | string;
  placeholder?: string;
  allowAll?: boolean;
  isMulti?: boolean;
  availableDates?: string[];
  filterPeriod?: string;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: any[];
  className?: string;
  align?: 'left' | 'right' | 'auto';
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
  isMulti = allowAll,
  availableDates = [],
  filterPeriod,
  dayTypes = {},
  dayTypeConfig = [],
  className,
  align = 'auto',
  customTrigger,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseValue(value, filterPeriod));

  // Draft dates set for multi-selection (Set of YYYY-MM-DD strings)
  const [draftDates, setDraftDates] = useState(() => parseDraftDatesFromValue(value));

  // Drag Sweep States
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragCurrent, setDragCurrent] = useState<string | null>(null);
  const [dragBaseline, setDragBaseline] = useState<Set<string>>(new Set());
  const [dragMode, setDragMode] = useState(true); // true = add range, false = remove range

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [resolvedAlign, setResolvedAlign] = useState<'left' | 'right'>(align === 'right' ? 'right' : 'left');
  const [resolvedVerticalAlign, setResolvedVerticalAlign] = useState<'bottom' | 'top'>('bottom');

  // Auto-detect horizontal and vertical alignment to avoid overflow clipping
  useEffect(() => {
    if (!open) return;
    if (align === 'left' || align === 'right') {
      setResolvedAlign(align);
    }

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
      if (align !== 'left' && align !== 'right') {
        if (rect.left + 336 > limitRight) {
          setResolvedAlign('right');
        } else {
          setResolvedAlign('left');
        }
      }

      // Vertical check: Popover height is ~380px (header, mode buttons, grid, summary, presets, footer)
      const popoverHeight = 380;
      const spaceBelow = limitBottom - rect.bottom;
      if (spaceBelow < popoverHeight && rect.top > popoverHeight) {
        setResolvedVerticalAlign('top');
      } else {
        setResolvedVerticalAlign('bottom');
      }
    }
  }, [open, align]);

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
  useEffect(() => {
    if (!isDragging) return;
    const handleGlobalMouseUp = () => {
      if (dragStart && dragCurrent) {
        const range = getDatesInRange(dragStart, dragCurrent);
        setDraftDates(applyRangeSelection(dragBaseline, range, dragMode));
      }
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, dragStart, dragCurrent, dragBaseline, dragMode]);

  // Compute active preview dates during drag
  const activeDraftDates = useMemo(() => {
    if (!isDragging || !dragStart || !dragCurrent) return draftDates;
    const range = getDatesInRange(dragStart, dragCurrent);
    return applyRangeSelection(dragBaseline, range, dragMode);
  }, [isDragging, dragStart, dragCurrent, dragBaseline, dragMode, draftDates]);

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

  const hasData = (d: number) => {
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${monthStr}-${dayStr}`;
    return availableSet.has(dateStr);
  };

  const prevMonth = () => setViewDate(stepMonth(viewDate, -1));
  const nextMonth = () => setViewDate(stepMonth(viewDate, 1));
  const prevYear = () => {
    if (isAtMinYear) return;
    const next = stepYear(viewDate, -1);
    setViewDate(next);
  };
  const nextYear = () => {
    if (isAtMaxYear) return;
    const next = stepYear(viewDate, 1);
    setViewDate(next);
  };

  // Click on day cell
  const handleDayClick = (d: number) => {
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${monthStr}-${dayStr}`;

    if (!isMulti) {
      onChange(dateStr);
      setOpen(false);
    }
  };

  // Mouse Down handler on day cell (Start drag / single click)
  const handleMouseDown = (d: number, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text drag selection
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${monthStr}-${dayStr}`;

    if (!isMulti) {
      onChange(dateStr);
      setOpen(false);
      return;
    }

    const alreadySelected = draftDates.has(dateStr);
    const mode = !alreadySelected; // true = add range, false = remove range

    setIsDragging(true);
    setDragStart(dateStr);
    setDragCurrent(dateStr);
    setDragBaseline(new Set(draftDates));
    setDragMode(mode);
  };

  // Mouse Enter handler on day cell (Update drag range)
  const handleMouseEnter = (d: number) => {
    if (!isMulti || !isDragging) return;
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${monthStr}-${dayStr}`;

    setDragCurrent(dateStr);
  };

  // Remove contiguous range of dates
  const removeRange = (rangeToRemove: string[]) => {
    const next = new Set(draftDates);
    rangeToRemove.forEach((d: string) => next.delete(d));
    setDraftDates(next);
  };

  // Confirm multi-selection
  const handleConfirm = () => {
    if (draftDates.size === 0) return;
    onChange(formatConfirmedValue(draftDates, allowAll));
    setOpen(false);
  };

  const handleModeSelect = (mode: string) => {
    setDraftDates(new Set());
    if (value === mode) {
      onChange(allowAll ? 'ALL' : '');
    } else {
      onChange(mode);
    }
    // Do NOT auto-close so the user sees the mode change
  };

  const handleClear = () => {
    setDraftDates(new Set());
    onChange(allowAll ? 'ALL' : '');
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
  const todayStr = useMemo(() => toValueStr(new Date()), []);
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toValueStr(d);
  }, []);

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
            {/* Prev Year ( -1 ปี ) & Prev Month ( -1 เดือน ) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={prevYear}
                disabled={isAtMinYear}
                title={isAtMinYear ? `จำกัดปีขั้นต่ำ ${MIN_YEAR}` : 'ปีก่อนหน้า ( -1 ปี )'}
                className="p-1 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors disabled:opacity-20 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={prevMonth}
                title="เดือนก่อนหน้า ( -1 เดือน )"
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

            {/* Next Month ( +1 เดือน ) & Next Year ( +1 ปี ) */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={nextMonth}
                title="เดือนถัดไป ( +1 เดือน )"
                className="p-1 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={nextYear}
                disabled={isAtMaxYear}
                title={isAtMaxYear ? `จำกัดปีสูงสุด ${MAX_YEAR}` : 'ปีถัดไป ( +1 ปี )'}
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
                    const [, m1, d1] = range[0].split('-').map(Number);
                    const lastDate = range[range.length - 1] || '';
                    const [, , d2] = lastDate.split('-').map(Number);

                    const label =
                      range.length === 1
                        ? `${d1} ${THAI_MONTHS_SHORT[m1 - 1]}`
                        : `${d1} - ${d2} ${THAI_MONTHS_SHORT[m1 - 1]} (${range.length} วัน)`;

                    return (
                      <span
                        key={`${range[0]}_${lastDate}`}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-bold bg-accent/15 border border-accent/40 text-accent rounded-none"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => removeRange(range)}
                          className="hover:text-white text-accent/70 transition-colors"
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
              onClick={() => handleApplyPreset(todayStr)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-none bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(yesterdayStr)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-none bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              เมื่อวาน
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(presets.startOfMonth)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-none bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              ต้นเดือน
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(presets.endOfMonth)}
              className="text-[11px] font-bold px-2 py-0.5 rounded-none bg-surface border border-line text-slate-300 hover:text-white hover:bg-surface-elevated hover:border-accent/40 transition-all cursor-pointer"
            >
              สิ้นเดือน
            </button>
          </div>

          {/* ================= ACTION & CONFIRMATION FOOTER ================= */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-line gap-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-bold px-2 py-1 rounded-none transition-colors text-ink-body hover:text-white hover:bg-surface-elevated flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-ink-muted" /> ล้าง
              </button>
            </div>

            {isMulti && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={draftDates.size === 0}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-black uppercase rounded-none border border-accent bg-accent text-on-accent hover:bg-accent-active transition-colors shadow-sm font-mono cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent"
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