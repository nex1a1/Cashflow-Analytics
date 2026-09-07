import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronRight, Check, LayoutGrid, CalendarRange, ListChecks, X } from 'lucide-react';
import { getFilterLabel, getThaiMonth, THAI_MONTHS_SHORT } from '../../utils/formatters';
import { GroupedOptions } from '../../types';

interface ModeBtnProps {
  id: string;
  icon: any;
  label: string;
  active: boolean;
  onClick: (id: string) => void;
}

function ModeBtn({ id, icon: Icon, label, active, onClick }: ModeBtnProps) {
  return (
    <button 
      onClick={() => onClick(id)}
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
  const [expandedYear, setExpandedYear] = useState<string | null>(null);
  
  const [mode, setMode] = useState<string>('standard');
  
  // Pending States for Range and Multi
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);
  const [multiSelected, setMultiSelected] = useState<string[]>([]);

  const ref = useRef<HTMLDivElement | null>(null);

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

  // Initial state synchronization
  useEffect(() => {
    if (open) {
      if (filterPeriod?.includes('_')) {
        setMode('range');
        const [s, e] = filterPeriod.split('_');
        setRangeStart(s);
        setRangeEnd(e);
      } else if (filterPeriod?.includes(',')) {
        setMode('multi');
        setMultiSelected(filterPeriod.split(','));
      } else {
        setMode('standard');
        setRangeStart(null);
        setRangeEnd(null);
        setMultiSelected([]);
      }
      
      const year = filterPeriod?.split('-')[0];
      if (year && groupedOptions?.yearsMap?.[year]) {
         setExpandedYear(year);
      } else {
         setExpandedYear(groupedOptions?.sortedYears?.[0] || null);
      }
    }
  }, [open, filterPeriod, groupedOptions]);

  const select = (val: string) => { 
    setFilterPeriod(val); 
    setOpen(false); 
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

  const rangeSummaryText = useMemo(() => {
    if (mode !== 'range') return null;
    if (rangeStart && rangeEnd) return `${getThaiMonth(rangeStart)} — ${getThaiMonth(rangeEnd)}`;
    if (rangeStart) return `จาก: ${getThaiMonth(rangeStart)} ...`;
    return 'คลิกเลือกเดือนเริ่มต้น';
  }, [mode, rangeStart, rangeEnd]);

  // Styling helpers - Balanced Tactical Tokens
  const itemBase   = 'w-full text-left px-2.5 py-1.5 rounded-none text-xs flex items-center gap-2 transition-all border';
  const itemHover  = 'border-[#303030] bg-[#141414] text-[#cbd5e1] hover:text-white hover:bg-[#222222] hover:border-[#4a4a4a]';
  const itemActive = 'border-[#da291c] bg-[#da291c]/15 text-white font-bold pl-2 shadow-sm';

  const pillBase  = 'text-[11px] py-1 px-1.5 rounded-none font-medium transition-all border text-center';
  const pillIdle  = 'border-[#303030] bg-[#141414] text-[#888888] hover:text-white hover:bg-[#252525] hover:border-[#4a4a4a]';
  const pillActive = 'border-[#da291c] bg-[#da291c] text-white font-bold shadow-sm';
  
  const pillRangeActive = 'border-emerald-500 bg-emerald-500 text-white font-bold shadow-sm';
  const pillRangeBetween = 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 font-semibold';
  const pillIndependentActive = 'border-amber-500 bg-amber-500 text-white font-bold shadow-sm';

  const confirmBtnCls = mode === 'range' 
    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
    : 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 bg-[#121212] border border-[#383838] rounded-none hover:border-[#da291c] text-slate-100 text-xs font-bold transition-all focus:outline-none"
      >
        <span className="w-2 h-2 rounded-full bg-[#da291c]" />
        <span>{getFilterLabel(filterPeriod)}</span>
        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-[#181818] border border-[#3e3e3e] rounded-none shadow-2xl ring-1 ring-white/10 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-[#303030] p-1.5 bg-[#121212] gap-1.5">
            <ModeBtn id="standard" icon={LayoutGrid} label="เดี่ยว" active={mode === 'standard'} onClick={setMode} />
            <ModeBtn id="range" icon={CalendarRange} label="ช่วง" active={mode === 'range'} onClick={setMode} />
            <ModeBtn id="multi" icon={ListChecks} label="อิสระ" active={mode === 'multi'} onClick={setMode} />
          </div>

          <div className="max-h-[460px] overflow-y-auto custom-scrollbar">
            {mode === 'standard' && (
              <div className="p-2 border-b border-[#2d2d2d]">
                <button
                  onClick={() => select('ALL')}
                  className={`${itemBase} ${filterPeriod === 'ALL' ? itemActive : itemHover}`}
                >
                  {filterPeriod === 'ALL' ? <Check className="w-3.5 h-3.5 shrink-0 text-[#da291c]" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                  <span className="font-bold">ดูข้อมูลทั้งหมด (ALL TIME)</span>
                </button>
              </div>
            )}

            <div className="p-2 space-y-1">
              {groupedOptions?.sortedYears?.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#888888]">
                  ยังไม่มีข้อมูลปี
                </div>
              ) : (
                groupedOptions?.sortedYears?.map(year => {
                  const data = groupedOptions.yearsMap[year];
                  const isExpanded = expandedYear === year;
                  const months: string[] = Array.from(data.months).sort((a: string, b: string) => b.localeCompare(a));
                  return (
                    <div key={year} className="space-y-1">
                      <button onClick={() => setExpandedYear(isExpanded ? null : year)}
                        className="w-full text-left px-2.5 py-1.5 rounded-none text-xs flex items-center justify-between font-bold text-[#e0e0e0] bg-[#161616] border border-[#303030] hover:border-[#4a4a4a] hover:bg-[#222222] transition-colors">
                        <span className="flex items-center gap-1.5">
                          <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90 text-[#da291c]' : 'text-[#888888]'}`} />
                          <span>📅 {year}</span>
                        </span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {data.months.size} เดือน
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="ml-1.5 pl-1.5 border-l space-y-1 mt-1 mb-1 border-[#383838]">
                          {mode === 'standard' && (
                            <>
                              <button onClick={() => select(year)} className={`${itemBase} ${filterPeriod === year ? itemActive : itemHover}`}>
                                {filterPeriod === year ? <Check className="w-3.5 h-3.5 shrink-0 text-[#da291c]" /> : <span className="w-3.5 h-3.5 shrink-0" />}
                                <span>ทั้งปี {year}</span>
                              </button>

                              {(data.halves.has(`${year}-H1`) || data.halves.has(`${year}-H2`)) && (
                                <div className="grid grid-cols-2 gap-1 px-0.5">
                                  {['H1', 'H2'].map(h => {
                                    const hKey = `${year}-${h}`;
                                    if (!data.halves.has(hKey)) return null;
                                    const hStyle = filterPeriod === hKey ? pillActive : pillIdle;
                                    return (
                                      <button key={h} onClick={() => select(hKey)} className={`${pillBase} ${hStyle}`}>
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
                                    if (!data.quarters.has(qKey)) {
                                      return <span key={q} />;
                                    }
                                    const qStyle = filterPeriod === qKey ? pillActive : pillIdle;
                                    return (
                                      <button key={q} onClick={() => select(qKey)} className={`${pillBase} ${qStyle}`}>
                                        Q{q}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}

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
                                if (selected) currentStyle = pillIndependentActive;
                              } else if (selected) {
                                currentStyle = pillActive;
                              }

                              return (
                                <button key={m} onClick={() => handleMonthClick(m)}
                                  className={`${pillBase} ${currentStyle}`}>
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

          {/* Dynamic Summary Section (Range & Multi) */}
          {mode === 'multi' && multiSelected.length > 0 && (
             <div className="p-1.5 border-t flex flex-col gap-1.5 border-[#303030] bg-[#121212]/80">
                <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5 custom-scrollbar">
                    {[...multiSelected].sort((a, b) => a.localeCompare(b)).map(m => (
                        <div key={m} className="flex items-center gap-1 px-1 py-0.5 rounded-none border bg-amber-500/20 border-amber-500/50 text-amber-300 text-[10px]">
                            {THAI_MONTHS_SHORT[Number.parseInt(m.split('-')[1], 10) - 1]} {m.split('-')[0].slice(2)}
                            <button onClick={() => setMultiSelected(multiSelected.filter(x => x !== m))} className="hover:text-red-500 transition-colors ml-0.5">
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setMode('standard')} className="px-2 py-0.5 rounded-none text-[10px] font-medium transition-colors bg-[#121212] border border-[#3e3e3e] text-[#cbd5e1] hover:bg-[#303030]">ล้าง</button>
                    <button onClick={handleConfirmMulti} className={`flex-1 py-0.5 rounded-none text-[10.5px] font-bold transition-all active:scale-[0.98] ${confirmBtnCls}`}>
                        ยืนยันการเลือก ({multiSelected.length})
                    </button>
                </div>
             </div>
          )}

          {mode === 'range' && rangeSummaryText && (
             <div className="p-1.5 border-t flex flex-col gap-1.5 border-[#303030] bg-[#121212]/80">
                <div className="relative py-1 px-1.5 rounded-none border text-center flex items-center justify-between bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                    <p className="text-[10px] font-bold w-full">{rangeSummaryText}</p>
                    <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-3 h-3" />
                    </button>
                </div>
                {rangeStart && rangeEnd && (
                    <button onClick={handleConfirmRange} className={`w-full py-1 rounded-none text-[10.5px] font-bold transition-all active:scale-[0.98] ${confirmBtnCls}`}>
                        ยืนยันช่วงเวลานี้
                    </button>
                )}
             </div>
          )}
        </div>
      )}
    </div>
  );
}