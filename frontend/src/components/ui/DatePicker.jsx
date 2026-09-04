// src/components/ui/DatePicker.jsx
import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, Check, X } from 'lucide-react';

const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];

const THAI_MONTHS_SHORT = [
  'ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.',
];

const DAY_LABELS = ['อา','จ','อ','พ','พฤ','ศ','ส'];

function parseValue(v, filterPeriod) {
  if (v && v !== 'ALL' && v !== 'WEEKDAY' && v !== 'WEEKEND') {
    const targetStr = v.includes(',') ? v.split(',')[0] : v.includes(':') ? v.split(':')[0] : v;
    const [y, m, d] = targetStr.split('-').map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  if (filterPeriod && filterPeriod.match(/^\d{4}-\d{2}$/)) {
    const [py, pm] = filterPeriod.split('-').map(Number);
    return new Date(py, pm - 1, 1);
  }
  return new Date();
}

function toValueStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDatesInRange(startStr, endStr) {
  let s = startStr;
  let e = endStr;
  if (s > e) [s, e] = [e, s];

  const dates = [];
  const [sy, sm, sd] = s.split('-').map(Number);
  const [ey, em, ed] = e.split('-').map(Number);
  
  let cur = new Date(sy, sm - 1, sd);
  const endDate = new Date(ey, em - 1, ed);

  while (cur <= endDate) {
    const cy = cur.getFullYear();
    const cm = String(cur.getMonth() + 1).padStart(2, '0');
    const cd = String(cur.getDate()).padStart(2, '0');
    dates.push(`${cy}-${cm}-${cd}`);
    const nextDate = new Date(cur);
    nextDate.setDate(nextDate.getDate() + 1);
    cur = nextDate;
  }
  return dates;
}

// Group sorted YYYY-MM-DD date strings into contiguous ranges
function groupContiguousDates(dateStrArray) {
  if (!dateStrArray || dateStrArray.length === 0) return [];
  const sorted = [...dateStrArray].sort((a, b) => a.localeCompare(b));
  
  const ranges = [];
  let currentRange = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prevStr = sorted[i - 1];
    const curStr = sorted[i];

    const [py, pm, pd] = prevStr.split('-').map(Number);
    const [cy, cm, cd] = curStr.split('-').map(Number);

    const prevDate = new Date(py, pm - 1, pd);
    const curDate = new Date(cy, cm - 1, cd);

    const diffDays = Math.round((curDate - prevDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentRange.push(curStr);
    } else {
      ranges.push(currentRange);
      currentRange = [curStr];
    }
  }
  if (currentRange.length > 0) {
    ranges.push(currentRange);
  }
  return ranges;
}

function formatDisplay(v, placeholder = 'เลือกวันที่') {
  if (!v || v === 'ALL') return placeholder;
  if (v === 'WEEKDAY') return '💼 วันทำงาน (จ.-ศ.)';
  if (v === 'WEEKEND') return '🏖️ วันหยุด (ส.-อา.)';

  const rawDates = v.includes(',') ? v.split(',') : v.includes(':') ? v.split(':') : [v];
  if (rawDates.length === 1) {
    const parts = rawDates[0].split('-').map(Number);
    if (parts.length < 3 || Number.isNaN(parts[0])) return placeholder;
    const [y, m, d] = parts;
    return `${d} ${THAI_MONTHS_SHORT[m - 1]} ${y}`;
  }

  const ranges = groupContiguousDates(rawDates);
  if (ranges.length === 1) {
    const r = ranges[0];
    const [y1, m1, d1] = r[0].split('-').map(Number);
    const [y2, m2, d2] = r[r.length - 1].split('-').map(Number);
    if (d1 === d2) return `${d1} ${THAI_MONTHS_SHORT[m1 - 1]} ${y1}`;
    return `📅 ${d1} - ${d2} ${THAI_MONTHS_SHORT[m1 - 1]} ${y1}`;
  }

  const summaryParts = ranges.map(r => {
    const [, , d1] = r[0].split('-').map(Number);
    const [, , d2] = r[r.length - 1].split('-').map(Number);
    return d1 === d2 ? `${d1}` : `${d1}-${d2}`;
  });

  const lastRange = ranges[ranges.length - 1];
  const [, lm] = lastRange[lastRange.length - 1].split('-').map(Number);

  return `📅 ${summaryParts.join(', ')} ${THAI_MONTHS_SHORT[lm - 1]}`;
}

export default function DatePicker({
  value,
  onChange,
  required,
  variant = 'default',
  placeholder = 'เลือกวันที่',
  allowAll = false,
  isMulti = allowAll,
  availableDates = [],
  filterPeriod,
  dayTypes = {},
  dayTypeConfig = []
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseValue(value, filterPeriod));
  
  // Draft dates set for multi-selection (Set of YYYY-MM-DD strings)
  const [draftDates, setDraftDates] = useState(() => {
    if (value && value !== 'ALL' && value !== 'WEEKDAY' && value !== 'WEEKEND') {
      if (value.includes(',')) return new Set(value.split(','));
      if (value.includes(':')) {
        const [s, e] = value.split(':');
        return new Set(getDatesInRange(s, e));
      }
      return new Set([value]);
    }
    return new Set();
  });

  // Drag Sweep States
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);
  const [dragBaseline, setDragBaseline] = useState(new Set());
  const [dragMode, setDragMode] = useState(true); // true = add range, false = remove range

  const containerRef = useRef(null);

  // Sync state when popover opens or value/period changes
  useEffect(() => {
    if (!open) return;
    setViewDate(parseValue(value, filterPeriod));
    if (value && value !== 'ALL' && value !== 'WEEKDAY' && value !== 'WEEKEND') {
      if (value.includes(',')) setDraftDates(new Set(value.split(',')));
      else if (value.includes(':')) {
        const [s, e] = value.split(':');
        setDraftDates(new Set(getDatesInRange(s, e)));
      } else {
        setDraftDates(new Set([value]));
      }
    } else {
      setDraftDates(new Set());
    }
  }, [open, value, filterPeriod]);

  // Click outside listener
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape key listener
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  // Global mouseup handler to release drag even if mouse leaves window
  useEffect(() => {
    if (!isDragging) return;
    const handleGlobalMouseUp = () => {
      if (dragStart && dragCurrent) {
        const range = getDatesInRange(dragStart, dragCurrent);
        const next = new Set(dragBaseline);
        if (dragMode) {
          range.forEach(d => next.add(d));
        } else {
          range.forEach(d => next.delete(d));
        }
        setDraftDates(next);
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
    const next = new Set(dragBaseline);
    if (dragMode) {
      range.forEach(d => next.add(d));
    } else {
      range.forEach(d => next.delete(d));
    }
    return next;
  }, [isDragging, dragStart, dragCurrent, dragBaseline, dragMode, draftDates]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const today = new Date();

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const isToday = (d) =>
    d === today.getDate() &&
    m === today.getMonth() &&
    y === today.getFullYear();

  const availableSet = useMemo(() => new Set(availableDates || []), [availableDates]);

  const hasData = (d) => {
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${monthStr}-${dayStr}`;
    return availableSet.has(dateStr);
  };

  const prevMonth = () => setViewDate(new Date(y, m - 1, 1));
  const nextMonth = () => setViewDate(new Date(y, m + 1, 1));

  // Mouse Down handler on day cell (Start drag / single click)
  const handleMouseDown = (d, e) => {
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
  const handleMouseEnter = (d) => {
    if (!isMulti || !isDragging) return;
    const monthStr = String(m + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${monthStr}-${dayStr}`;

    setDragCurrent(dateStr);
  };

  // Remove contiguous range of dates
  const removeRange = (rangeToRemove) => {
    const next = new Set(draftDates);
    rangeToRemove.forEach(d => next.delete(d));
    setDraftDates(next);
  };

  // Confirm multi-selection
  const handleConfirm = () => {
    if (draftDates.size === 0) {
      onChange(allowAll ? 'ALL' : '');
    } else if (draftDates.size === 1) {
      onChange(Array.from(draftDates)[0]);
    } else {
      const sorted = Array.from(draftDates).sort((a, b) => a.localeCompare(b));
      onChange(sorted.join(','));
    }
    setOpen(false);
  };

  const handleModeSelect = (mode) => {
    setDraftDates(new Set());
    if (value === mode) {
      onChange(allowAll ? 'ALL' : '');
    } else {
      onChange(mode);
    }
    setOpen(false);
  };

  const handleClear = () => {
    setDraftDates(new Set());
    onChange(allowAll ? 'ALL' : '');
    setOpen(false);
  };

  const goToday = () => {
    const t = new Date();
    const tStr = toValueStr(t);
    setViewDate(t);
    if (!isMulti) {
      onChange(tStr);
      setOpen(false);
    } else {
      setDraftDates(new Set([tStr]));
    }
  };

  const isActive = value && value !== 'ALL';

  // Grouped contiguous ranges for smart summary box
  const dateRanges = useMemo(() => {
    return groupContiguousDates(Array.from(draftDates));
  }, [draftDates]);

  /* ── Styles ── */
  const surface   = 'bg-[#1c1c1c]';
  const border    = 'border-[#3e3e3e]';
  const textMain  = 'text-[#e0e0e0]';
  const textMuted = 'text-[#888888]';
  const hoverDay  = 'hover:bg-[#303030] hover:text-white';

  return (
    <div ref={containerRef} className="relative z-50 w-full">
      {variant === 'hud' ? (
        <button 
          type="button"
          onClick={() => setOpen(!open)}
          className={`relative w-full text-left flex items-center border rounded-none bg-[#121212] cursor-pointer select-none transition-colors ${
            isActive 
              ? 'border-[#da291c] text-white bg-[#121212]' 
              : 'border-[#303030] text-[#888888] hover:border-[#da291c]/40 hover:bg-[#303030]/20'
          }`}
        >
          <div className={`pl-2 pr-1.5 py-1 border-r flex items-center justify-center shrink-0 ${
            isActive ? 'border-[#da291c]/30 text-[#da291c]' : 'border-[#303030] text-[#666666]'
          }`}>
            <Calendar className="w-3 h-3" />
          </div>
          
          <div className="w-full text-[11px] font-black py-1 pl-1.5 pr-7 truncate text-[#cbd5e1]">
            {formatDisplay(value, placeholder)}
          </div>
          
          <div className={`absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
            isActive ? 'text-[#da291c]' : 'text-[#666666]'
          }`}>
            <ChevronDown className="w-3 h-3" />
          </div>
          
          {isActive && (
            <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
              <span className="relative inline-flex rounded-none h-1.5 w-1.5 bg-[#da291c]"></span>
            </span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full px-3 py-2.5 text-sm border rounded-none flex items-center justify-between gap-2 font-medium transition-colors outline-none bg-[#121212] border-[#3e3e3e] text-white hover:border-[#da291c] focus:border-[#da291c]"
        >
          <span className={`${value && value !== 'ALL' ? textMain : textMuted} whitespace-nowrap truncate`}>
            {formatDisplay(value, placeholder)}
          </span>
          <Calendar className="w-4 h-4 shrink-0 text-[#888888]" />
        </button>
      )}

      {open && (
        <div className={`absolute top-[calc(100%+6px)] left-0 z-[999] rounded-none border shadow-2xl p-3 w-80 select-none ${surface} ${border}`}>

          {allowAll && (
            <div className="flex rounded-none p-0.5 mb-2.5 border bg-[#121212] border-[#303030]">
              <button
                type="button"
                onClick={() => handleModeSelect('ALL')}
                className={`flex-1 py-1 text-[10px] font-black uppercase transition-all rounded-none ${
                  (value === 'ALL' || !value) && draftDates.size === 0
                    ? 'bg-[#303030] text-white font-extrabold shadow-sm'
                    : 'text-[#888888] hover:text-slate-200 hover:bg-[#303030]/30'
                }`}
              >
                ทุกวัน
              </button>
              <button
                type="button"
                onClick={() => handleModeSelect('WEEKDAY')}
                className={`flex-1 py-1 text-[10px] font-black uppercase transition-all rounded-none ${
                  value === 'WEEKDAY'
                    ? 'bg-blue-950/60 border border-blue-500/50 text-blue-400 font-extrabold shadow-sm'
                    : 'text-[#888888] hover:text-slate-200 hover:bg-[#303030]/30'
                }`}
              >
                💼 จ-ศ
              </button>
              <button
                type="button"
                onClick={() => handleModeSelect('WEEKEND')}
                className={`flex-1 py-1 text-[10px] font-black uppercase transition-all rounded-none ${
                  value === 'WEEKEND'
                    ? 'bg-amber-950/60 border border-amber-500/50 text-amber-400 font-extrabold shadow-sm'
                    : 'text-[#888888] hover:text-slate-200 hover:bg-[#303030]/30'
                }`}
              >
                🏖️ ส-อา
              </button>
            </div>
          )}

          <div className="flex items-center justify-between mb-2.5">
            <button type="button" onClick={prevMonth}
              className="p-1.5 rounded-none transition-colors hover:bg-[#303030] text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-xs font-bold font-mono tracking-wider ${textMain}`}>
              {THAI_MONTHS[m]} {y}
            </span>
            <button type="button" onClick={nextMonth}
              className="p-1.5 rounded-none transition-colors hover:bg-[#303030] text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((l, i) => (
              <div key={l} className={`text-center text-[11px] font-bold py-1 ${i === 0 || i === 6 ? 'text-red-400' : textMuted}`}>
                {l}
              </div>
            ))}
          </div>

          {/* Calendar Day Grid with Connected Range Styling */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {blanks.map((_, i) => <div key={`b${i}`} />)}
            {days.map(d => {
              const monthStr = String(m + 1).padStart(2, '0');
              const dayStr = String(d).padStart(2, '0');
              const dateStr = `${y}-${monthStr}-${dayStr}`;

              const weekend = new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6;
              const dayHasData = hasData(d);
              const dayIsSelected = activeDraftDates.has(dateStr);

              // Check contiguous neighbors
              const prevDateObj = new Date(y, m, d - 1);
              const nextDateObj = new Date(y, m, d + 1);
              const prevDateStr = toValueStr(prevDateObj);
              const nextDateStr = toValueStr(nextDateObj);

              const hasPrev = activeDraftDates.has(prevDateStr);
              const hasNext = activeDraftDates.has(nextDateStr);

              let dayStyle = `${textMain} ${hoverDay}`;
              let isDimmed = false;

              if (dayIsSelected) {
                if (hasPrev && hasNext) {
                  // Middle of range
                  dayStyle = 'bg-[#da291c]/35 text-white font-bold border-y border-[#da291c]/60 shadow-none';
                } else if (!hasPrev && hasNext) {
                  // Start of range
                  dayStyle = 'bg-[#da291c] text-white font-black shadow-sm ring-1 ring-[#da291c]';
                } else if (hasPrev && !hasNext) {
                  // End of range
                  dayStyle = 'bg-[#da291c] text-white font-black shadow-sm ring-1 ring-[#da291c]';
                } else {
                  // Single isolated date
                  dayStyle = 'bg-[#da291c] text-white font-black shadow-sm ring-1 ring-[#da291c]';
                }
              } else if (value === 'WEEKDAY' && draftDates.size === 0) {
                if (!weekend) {
                  dayStyle = 'bg-blue-950/50 text-blue-300 font-bold border border-blue-500/40';
                } else {
                  isDimmed = true;
                  dayStyle = 'text-[#555555] opacity-40';
                }
              } else if (value === 'WEEKEND' && draftDates.size === 0) {
                if (weekend) {
                  dayStyle = 'bg-amber-950/50 text-amber-300 font-bold border border-amber-500/40';
                } else {
                  isDimmed = true;
                  dayStyle = 'text-[#555555] opacity-40';
                }
              } else if (isToday(d)) {
                dayStyle = `ring-1 ring-[#da291c] ${textMain} ${hoverDay}`;
              } else if (weekend) {
                dayStyle = `text-red-400 ${hoverDay}`;
              }

              let dayTypeObj = null;
              if (dayTypeConfig && dayTypeConfig.length > 0) {
                const explicitTypeId = dayTypes[dateStr];
                if (explicitTypeId) {
                  dayTypeObj = dayTypeConfig.find(dt => dt.id === explicitTypeId);
                }
                if (!dayTypeObj) {
                  const dow = new Date(y, m, d).getDay();
                  const isWknd = (dow === 0 || dow === 6);
                  if (isWknd) {
                    dayTypeObj = dayTypeConfig.find(dt => 
                      dt.id === 'HOLIDAY' || dt.id === 'OFF' || dt.name === 'HOLIDAY' || dt.label?.includes('หยุด')
                    ) || dayTypeConfig[1] || dayTypeConfig[0];
                  } else {
                    dayTypeObj = dayTypeConfig.find(dt => 
                      dt.id === 'WORK' || dt.name === 'WORK' || dt.label?.includes('ทำงาน')
                    ) || dayTypeConfig[0];
                  }
                }
              }

              return (
                <button
                  key={d}
                  type="button"
                  onMouseDown={(e) => handleMouseDown(d, e)}
                  onMouseEnter={() => handleMouseEnter(d)}
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
                    <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${
                      value === 'WEEKDAY' ? 'bg-blue-400' : value === 'WEEKEND' ? 'bg-amber-400' : 'bg-[#da291c]'
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Smart Grouped Selected Dates Summary Box (Only shown in Multi-Selection Mode) */}
          {isMulti && (
            <div className="mt-2.5 pt-2 border-t border-[#303030]">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] font-black uppercase text-slate-400 font-mono">
                  สรุปวันที่เลือก ({draftDates.size} วัน):
                </span>
                <span className="text-[9.5px] text-[#666666] font-mono">
                  คลิก หรือลากค้างเพื่อเลือก
                </span>
              </div>

              <div className="bg-[#121212] border border-[#303030] p-1.5 flex flex-wrap gap-1 items-center min-h-[32px]">
                {dateRanges.length === 0 ? (
                  <span className="text-[10px] text-[#555555] font-mono pl-1">
                    ยังไม่ได้เลือกวัน
                  </span>
                ) : (
                  dateRanges.map((range, idx) => {
                    const [y1, m1, d1] = range[0].split('-').map(Number);
                    const [, , d2] = range[range.length - 1].split('-').map(Number);
                    
                    const label = range.length === 1
                      ? `${d1} ${THAI_MONTHS_SHORT[m1 - 1]}`
                      : `${d1} - ${d2} ${THAI_MONTHS_SHORT[m1 - 1]} (${range.length} วัน)`;

                    return (
                      <span 
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-mono font-bold bg-[#da291c]/15 border border-[#da291c]/40 text-[#da291c] rounded-none"
                      >
                        {label}
                        <button 
                          type="button" 
                          onClick={() => removeRange(range)} 
                          className="hover:text-white text-[#da291c]/70 transition-colors"
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

          {/* Action & Confirmation Footer */}
          <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-[#303030] gap-1.5">
            <div className="flex items-center gap-1">
              <button type="button" onClick={handleClear}
                className="text-[11px] font-bold px-2 py-1 rounded-none transition-colors text-[#888888] hover:text-white hover:bg-[#303030]">
                ล้าง
              </button>
              <button type="button" onClick={goToday}
                className="text-[11px] font-bold px-2 py-1 rounded-none transition-colors text-slate-300 hover:bg-[#303030]">
                วันนี้
              </button>
            </div>

            {isMulti && (
              <button 
                type="button" 
                onClick={handleConfirm}
                className="flex items-center gap-1 px-3 py-1 text-[11px] font-black uppercase rounded-none border border-[#da291c] bg-[#da291c] text-white hover:bg-[#b81d13] transition-colors shadow-sm font-mono"
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