import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, Check, LayoutGrid, CalendarRange, ListChecks, X, CalendarDays, Zap } from 'lucide-react';
import { getFilterLabel, getThaiMonth, THAI_MONTHS_SHORT } from '../../utils/formatters';
import { GroupedOptions } from '../../types';

interface ModeBtnProps {
  id: string;
  icon: React.ElementType;
  label: string;
  title: string;
  active: boolean;
  onClick: (id: string) => void;
}

function ModeBtn({ id, icon: Icon, label, title, active, onClick }: ModeBtnProps) {
  return (
    <button
      onClick={() => onClick(id)}
      title={title}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-none transition-all ${
        active
          ? 'bg-[#da291c] text-white font-bold border border-[#da291c] shadow-sm'
          : 'text-[#888888] hover:text-white bg-[#141414] hover:bg-[#252525] border border-[#303030] hover:border-[#4a4a4a]'
      }`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="text-[10px] uppercase font-semibold">{label}</span>
    </button>
  );
}

export interface PeriodPickerProps {
  filterPeriod: string;
  setFilterPeriod: (period: string) => void;
  groupedOptions: GroupedOptions;
}

export default function PeriodPicker({ filterPeriod, setFilterPeriod, groupedOptions }: PeriodPickerProps) {
  const [open, setOpen] = useState<boolean>(false);
  // Multi-expand: Set of expanded year keys (range/multi allow multiple open at once)
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  const [mode, setMode] = useState<string>('standard');

  // Pending States for Range and Multi
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);

  const ref = useRef<HTMLDivElement | null>(null);

  // Quick-access shortcut values (computed once)
  const { currentMonth, lastMonth, currentYear } = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const cm = `${y}-${String(m).padStart(2, '0')}`;
    const lmDate = new Date(y, m - 2, 1);
    const ly = lmDate.getFullYear();
    const lm = lmDate.getMonth() + 1;
    const lmStr = `${ly}-${String(lm).padStart(2, '0')}`;
    return { currentMonth: cm, lastMonth: lmStr, currentYear: String(y) };
  }, []);

  // Click outside to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  // State sync on open — detect mode from current filterPeriod
  useEffect(() => {
    if (!open) return;

    const initialExpanded = new Set<string>();

    if (filterPeriod?.includes('_')) {
      setMode('range');
      const [s, e] = filterPeriod.split('_');
      setRangeStart(s);
      setRangeEnd(e);
      // Auto-expand all years involved in the range
      const sYear = s.split('-')[0];
      const eYear = e.split('-')[0];
      initialExpanded.add(sYear);
      if (eYear !== sYear) initialExpanded.add(eYear);
    } else if (filterPeriod?.includes(',')) {
      setMode('multi');
      const months = filterPeriod.split(',');
      setMultiSelected(months);
      // Auto-expand years of all selected months
      for (const m of months) initialExpanded.add(m.split('-')[0]);
    } else {
      setMode('standard');
      setRangeStart(null);
      setRangeEnd(null);
      setMultiSelected([]);
      const year = filterPeriod?.split('-')[0];
      if (year && groupedOptions?.yearsMap?.[year]) {
        initialExpanded.add(year);
      } else {
        const firstYear = groupedOptions?.sortedYears?.[0];
        if (firstYear) initialExpanded.add(firstYear);
      }
    }

    setExpandedYears(initialExpanded);
  }, [open, filterPeriod, groupedOptions]);

  const select = (val: string) => {
    setFilterPeriod(val);
    setOpen(false);
  };

  // Switch mode and clear pending states from the previous mode
  const handleModeChange = (newMode: string) => {
    if (newMode === mode) return;
    setMode(newMode);
    setRangeStart(null);
    setRangeEnd(null);
    setMultiSelected([]);
  };

  // Toggle accordion — single-expand in standard, multi-expand in range/multi
  const toggleYear = (year: string) => {
    const isMultiExpand = mode === 'range' || mode === 'multi';
    setExpandedYears(prev => {
      const next = new Set(prev);
      if (next.has(year)) {
        next.delete(year);
      } else {
        if (!isMultiExpand) next.clear(); // collapse others in standard mode
        next.add(year);
      }
      return next;
    });
  };

  const handleMonthClick = (m: string) => {
    if (mode === 'standard') {
      select(m);
      return;
    }
    if (mode === 'range') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(m);
        setRangeEnd(null);
      } else {
        const [s, e] = [rangeStart, m].sort((a, b) => a.localeCompare(b));
        setRangeStart(s);
        setRangeEnd(e);
      }
      return;
    }
    if (mode === 'multi') {
      setMultiSelected(prev =>
        prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
      );
    }
  };

  const handleConfirmRange = () => {
    if (rangeStart && rangeEnd) select(`${rangeStart}_${rangeEnd}`);
    else if (rangeStart) select(rangeStart);
  };

  const handleConfirmMulti = () => {
    if (multiSelected.length === 0) return;
    if (multiSelected.length === 1) select(multiSelected[0]);
    else select([...multiSelected].sort((a, b) => a.localeCompare(b)).join(','));
  };

  const isMonthSelected = (m: string) => {
    if (mode === 'multi') return multiSelected.includes(m);
    if (mode === 'range') return m === rangeStart || m === rangeEnd;
    return filterPeriod === m;
  };

  const isMonthInRange = (m: string) => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return m >= rangeStart && m <= rangeEnd;
    }
    return false;
  };

  // Range footer text — step-aware instructions
  const rangeFooterText = useMemo(() => {
    if (rangeStart && rangeEnd) return `${getThaiMonth(rangeStart)} — ${getThaiMonth(rangeEnd)}`;
    if (rangeStart) return `จาก: ${getThaiMonth(rangeStart)} → เลือกเดือนสิ้นสุด`;
    return 'คลิกเดือนเริ่มต้น จากนั้นเลือกเดือนสิ้นสุด';
  }, [rangeStart, rangeEnd]);

  // Mode badge shown on trigger button when period is range/multi
  const modeBadge = useMemo(() => {
    if (filterPeriod?.includes('_')) {
      return { label: 'RANGE', cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' };
    }
    if (filterPeriod?.includes(',')) {
      return { label: `${filterPeriod.split(',').length}M`, cls: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    }
    return null;
  }, [filterPeriod]);

  // Whether a year has any selection inside (for dot indicator)
  const yearHasSelection = (year: string): boolean => {
    if (mode === 'multi') return multiSelected.some(m => m.startsWith(`${year}-`));
    if (mode === 'range') {
      if (!rangeStart) return false;
      const sYear = rangeStart.split('-')[0];
      const eYear = rangeEnd ? rangeEnd.split('-')[0] : sYear;
      return year >= sYear && year <= eYear;
    }
    return filterPeriod?.startsWith(year) && filterPeriod !== 'ALL';
  };

  // Quick shortcut availability (only show if data exists for that period)
  const hasCurrentMonth = !!groupedOptions?.yearsMap?.[currentYear]?.months?.has(currentMonth);
  const hasLastMonth = !!groupedOptions?.yearsMap?.[lastMonth.split('-')[0]]?.months?.has(lastMonth);
  const hasCurrentYear = !!groupedOptions?.yearsMap?.[currentYear];

  // ── Styling Tokens ────────────────────────────────────────────────────────
  const itemBase   = 'w-full text-left px-2.5 py-1.5 rounded-none text-xs flex items-center gap-2 transition-all border';
  const itemHover  = 'border-[#303030] bg-[#141414] text-[#cbd5e1] hover:text-white hover:bg-[#222222] hover:border-[#4a4a4a]';
  const itemActive = 'border-[#da291c] bg-[#da291c]/15 text-white font-bold pl-2 shadow-sm';

  const pillBase  = 'text-[11px] py-1 px-1.5 rounded-none font-medium transition-all border text-center';
  const pillIdle  = 'border-[#303030] bg-[#141414] text-[#888888] hover:text-white hover:bg-[#252525] hover:border-[#4a4a4a]';
  const pillActive = 'border-[#da291c] bg-[#da291c] text-white font-bold shadow-sm';

  const pillRangeActive    = 'border-emerald-500 bg-emerald-500 text-white font-bold shadow-sm';
  const pillRangeBetween   = 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-semibold';
  const pillMultiActive    = 'border-amber-500 bg-amber-500 text-white font-bold shadow-sm';

  const confirmRangeCls = 'bg-emerald-700 hover:bg-emerald-600 text-white shadow-sm disabled:bg-[#1a2a1a] disabled:text-emerald-900 disabled:cursor-not-allowed';
  const confirmMultiCls = 'bg-amber-700 hover:bg-amber-600 text-white shadow-sm disabled:bg-[#2a1f00] disabled:text-amber-900 disabled:cursor-not-allowed';

  return (
    <div className="relative" ref={ref}>
      {/* ── Trigger Button ─────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-[#383838] rounded-none hover:border-[#da291c] text-slate-100 text-xs font-bold transition-all focus:outline-none min-w-[190px]"
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0 text-[#da291c]" />
        <span className="flex-1 text-left truncate">{getFilterLabel(filterPeriod)}</span>
        {modeBadge && (
          <span className={`text-[9px] font-bold px-1 py-0.5 border rounded-none shrink-0 ${modeBadge.cls}`}>
            {modeBadge.label}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-[#181818] border border-[#3e3e3e] rounded-none shadow-2xl ring-1 ring-white/10 z-50 overflow-hidden">

          {/* ── Mode Switcher Tabs ──────────────────────────────────────── */}
          <div className="flex border-b border-[#303030] p-1.5 bg-[#121212] gap-1.5">
            <ModeBtn id="standard"  icon={LayoutGrid}   label="เดี่ยว"      title="เลือก 1 เดือน, ไตรมาส, หรือปี"          active={mode === 'standard'} onClick={handleModeChange} />
            <ModeBtn id="range"     icon={CalendarRange} label="ช่วงเวลา"   title="เลือกช่วงเดือนต่อเนื่อง"                 active={mode === 'range'}    onClick={handleModeChange} />
            <ModeBtn id="multi"     icon={ListChecks}    label="หลายเดือน"  title="เลือกหลายเดือนแบบอิสระ ไม่ต้องต่อเนื่อง" active={mode === 'multi'}    onClick={handleModeChange} />
          </div>

          {/* ── Quick Shortcuts (Standard mode only) ───────────────────── */}
          {mode === 'standard' && (hasCurrentMonth || hasLastMonth || hasCurrentYear) && (
            <div className="flex items-center gap-1 px-2 py-1.5 border-b border-[#2a2a2a] bg-[#111111]">
              <span className="flex items-center gap-1 text-[9px] text-[#555555] uppercase font-bold tracking-wider pr-1 shrink-0">
                <Zap className="w-2.5 h-2.5" />
                ด่วน
              </span>
              {hasCurrentMonth && (
                <button
                  onClick={() => select(currentMonth)}
                  className={`flex-1 text-center text-[10px] font-semibold px-1 py-0.5 border transition-all rounded-none ${
                    filterPeriod === currentMonth
                      ? 'bg-[#da291c]/15 border-[#da291c] text-white'
                      : 'border-[#2e2e2e] bg-[#141414] text-[#999999] hover:text-white hover:border-[#4a4a4a] hover:bg-[#1e1e1e]'
                  }`}
                >
                  เดือนนี้
                </button>
              )}
              {hasLastMonth && (
                <button
                  onClick={() => select(lastMonth)}
                  className={`flex-1 text-center text-[10px] font-semibold px-1 py-0.5 border transition-all rounded-none ${
                    filterPeriod === lastMonth
                      ? 'bg-[#da291c]/15 border-[#da291c] text-white'
                      : 'border-[#2e2e2e] bg-[#141414] text-[#999999] hover:text-white hover:border-[#4a4a4a] hover:bg-[#1e1e1e]'
                  }`}
                >
                  เดือนก่อน
                </button>
              )}
              {hasCurrentYear && (
                <button
                  onClick={() => select(currentYear)}
                  className={`flex-1 text-center text-[10px] font-semibold px-1 py-0.5 border transition-all rounded-none ${
                    filterPeriod === currentYear
                      ? 'bg-[#da291c]/15 border-[#da291c] text-white'
                      : 'border-[#2e2e2e] bg-[#141414] text-[#999999] hover:text-white hover:border-[#4a4a4a] hover:bg-[#1e1e1e]'
                  }`}
                >
                  ทั้งปี {currentYear}
                </button>
              )}
            </div>
          )}

          {/* ── Range Mode Step Instruction ─────────────────────────────── */}
          {mode === 'range' && (
            <div className="px-2.5 py-1.5 border-b border-emerald-500/20 bg-emerald-950/30 flex items-center gap-2">
              <span className={`inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-none border shrink-0 ${
                !rangeStart
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-emerald-500/40 text-emerald-600'
              }`}>1</span>
              <span className="text-[10px] text-emerald-400/70 mx-[-2px]">→</span>
              <span className={`inline-flex items-center justify-center w-4 h-4 text-[9px] font-bold rounded-none border shrink-0 ${
                rangeStart && !rangeEnd
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'border-emerald-500/40 text-emerald-600'
              }`}>2</span>
              <span className="text-[10px] text-emerald-400/70 flex-1 truncate">
                {!rangeStart
                  ? 'เลือกเดือนเริ่มต้น'
                  : !rangeEnd
                  ? 'เลือกเดือนสิ้นสุด'
                  : '✓ พร้อมยืนยัน'}
              </span>
            </div>
          )}

          {/* ── Multi Mode Instruction (shown only when empty) ──────────── */}
          {mode === 'multi' && multiSelected.length === 0 && (
            <div className="px-2.5 py-1.5 border-b border-amber-500/20 bg-amber-950/20">
              <span className="text-[10px] text-amber-400/70">คลิกเดือนใดก็ได้เพื่อเพิ่มเข้าการเลือก</span>
            </div>
          )}

          {/* ── Scrollable Month List ───────────────────────────────────── */}
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
            {mode === 'standard' && (
              <div className="p-2 border-b border-[#2d2d2d]">
                <button
                  onClick={() => select('ALL')}
                  className={`${itemBase} ${filterPeriod === 'ALL' ? itemActive : itemHover}`}
                >
                  {filterPeriod === 'ALL'
                    ? <Check className="w-3.5 h-3.5 shrink-0 text-[#da291c]" />
                    : <span className="w-3.5 h-3.5 shrink-0" />}
                  <span className="font-bold">ดูข้อมูลทั้งหมด (ALL TIME)</span>
                </button>
              </div>
            )}

            <div className="p-2 space-y-1">
              {groupedOptions?.sortedYears?.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#888888]">ยังไม่มีข้อมูลปี</div>
              ) : (
                groupedOptions?.sortedYears?.map(year => {
                  const data = groupedOptions.yearsMap[year];
                  const isExpanded = expandedYears.has(year);
                  const hasSelection = yearHasSelection(year);
                  const months: string[] = Array.from(data.months).sort((a: string, b: string) => b.localeCompare(a));

                  return (
                    <div key={year} className="space-y-1">
                      {/* Year Header */}
                      <button
                        onClick={() => toggleYear(year)}
                        className="w-full text-left px-2.5 py-1.5 rounded-none text-xs flex items-center justify-between font-bold text-[#e0e0e0] bg-[#161616] border border-[#303030] hover:border-[#4a4a4a] hover:bg-[#222222] transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90 text-[#da291c]' : 'text-[#888888]'}`} />
                          <span>📅 {year}</span>
                          {/* Selection dot indicator */}
                          {hasSelection && (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              mode === 'range' ? 'bg-emerald-400' : mode === 'multi' ? 'bg-amber-400' : 'bg-[#da291c]'
                            }`} />
                          )}
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {data.months.size} เดือน
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="ml-1.5 pl-1.5 border-l space-y-1 mt-1 mb-1 border-[#383838]">
                          {/* Year/Half/Quarter shortcuts — Standard mode only */}
                          {mode === 'standard' && (
                            <>
                              <button onClick={() => select(year)} className={`${itemBase} ${filterPeriod === year ? itemActive : itemHover}`}>
                                {filterPeriod === year
                                  ? <Check className="w-3.5 h-3.5 shrink-0 text-[#da291c]" />
                                  : <span className="w-3.5 h-3.5 shrink-0" />}
                                <span>ทั้งปี {year}</span>
                              </button>

                              {(data.halves.has(`${year}-H1`) || data.halves.has(`${year}-H2`)) && (
                                <div className="grid grid-cols-2 gap-1 px-0.5">
                                  {['H1', 'H2'].map(h => {
                                    const hKey = `${year}-${h}`;
                                    if (!data.halves.has(hKey)) return null;
                                    return (
                                      <button key={h} onClick={() => select(hKey)} className={`${pillBase} ${filterPeriod === hKey ? pillActive : pillIdle}`}>
                                        {h}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {[1, 2, 3, 4].some(q => data.quarters.has(`${year}-Q${q}`)) && (
                                <div className="grid grid-cols-4 gap-1 px-0.5">
                                  {[1, 2, 3, 4].map(q => {
                                    const qKey = `${year}-Q${q}`;
                                    if (!data.quarters.has(qKey)) return <span key={q} />;
                                    return (
                                      <button key={q} onClick={() => select(qKey)} className={`${pillBase} ${filterPeriod === qKey ? pillActive : pillIdle}`}>
                                        Q{q}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}

                          {/* Month Grid */}
                          <div className="grid grid-cols-3 gap-1 px-0.5 pt-0.5">
                            {months.map((m: string) => {
                              const [, mo] = m.split('-');
                              const selected = isMonthSelected(m);
                              const ranged = isMonthInRange(m);

                              let currentStyle = pillIdle;
                              if (mode === 'range') {
                                if (selected) currentStyle = pillRangeActive;
                                else if (ranged) currentStyle = pillRangeBetween;
                              } else if (mode === 'multi') {
                                if (selected) currentStyle = pillMultiActive;
                              } else if (selected) {
                                currentStyle = pillActive;
                              }

                              return (
                                <button key={m} onClick={() => handleMonthClick(m)} className={`${pillBase} ${currentStyle}`}>
                                  {THAI_MONTHS_SHORT[Number.parseInt(mo, 10) - 1]}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Range Footer (always visible in range mode) ─────────────── */}
          {mode === 'range' && (
            <div className="p-1.5 border-t flex flex-col gap-1.5 border-[#303030] bg-[#0f0f0f]">
              <div className="relative py-1 px-2 border flex items-center justify-between bg-emerald-500/10 border-emerald-500/30 text-emerald-400 min-h-[28px]">
                <p className="text-[10px] font-bold flex-1">{rangeFooterText}</p>
                {(rangeStart || rangeEnd) && (
                  <button
                    onClick={() => { setRangeStart(null); setRangeEnd(null); }}
                    className="text-slate-500 hover:text-red-400 transition-colors shrink-0 ml-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <button
                onClick={handleConfirmRange}
                disabled={!rangeStart || !rangeEnd}
                className={`w-full py-1 rounded-none text-[10.5px] font-bold transition-all active:scale-[0.98] ${confirmRangeCls}`}
              >
                {rangeStart && rangeEnd ? 'ยืนยันช่วงเวลานี้' : 'รอเลือกช่วงเวลา...'}
              </button>
            </div>
          )}

          {/* ── Multi Footer ────────────────────────────────────────────── */}
          {mode === 'multi' && (
            <div className="p-1.5 border-t flex flex-col gap-1.5 border-[#303030] bg-[#0f0f0f]">
              {multiSelected.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-0.5 custom-scrollbar">
                  {[...multiSelected].sort((a, b) => a.localeCompare(b)).map(m => (
                    <div key={m} className="flex items-center gap-1 px-1 py-0.5 rounded-none border bg-amber-500/20 border-amber-500/50 text-amber-300 text-[10px]">
                      {THAI_MONTHS_SHORT[Number.parseInt(m.split('-')[1], 10) - 1]} {m.split('-')[0].slice(2)}
                      <button
                        onClick={() => setMultiSelected(prev => prev.filter(x => x !== m))}
                        className="hover:text-red-400 transition-colors ml-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1">
                {/* ล้าง = clear selection only, no mode change */}
                <button
                  onClick={() => setMultiSelected([])}
                  disabled={multiSelected.length === 0}
                  className="px-2 py-0.5 rounded-none text-[10px] font-medium transition-colors bg-[#121212] border border-[#3e3e3e] text-[#cbd5e1] hover:bg-[#303030] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ล้าง
                </button>
                <button
                  onClick={handleConfirmMulti}
                  disabled={multiSelected.length === 0}
                  className={`flex-1 py-0.5 rounded-none text-[10.5px] font-bold transition-all active:scale-[0.98] ${confirmMultiCls}`}
                >
                  {multiSelected.length > 0
                    ? `ยืนยันการเลือก (${multiSelected.length})`
                    : 'เลือกเดือนที่ต้องการ'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}