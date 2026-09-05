import { useState, useRef, useEffect, useMemo } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Check, LayoutGrid, CalendarRange, ListChecks, X } from 'lucide-react';
import { getFilterLabel, getThaiMonth, THAI_MONTHS_SHORT } from '../../utils/formatters';

function ModeBtn({ id, icon: Icon, label, active, onClick }) {
  return (
    <button 
      onClick={() => onClick(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-none transition-all ${
        active 
          ? 'bg-[#da291c] text-white font-bold border border-[#da291c]'
          : 'text-[#888888] hover:text-[#e0e0e0] hover:bg-[#303030] border border-transparent'
      }`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="text-[10px] uppercase">{label}</span>
    </button>
  );
}

export default function PeriodPicker({ filterPeriod, setFilterPeriod, groupedOptions }) {
  const [open, setOpen]               = useState(false);
  const [expandedYear, setExpandedYear] = useState(null);
  
  const [mode, setMode] = useState('standard');
  
  // Pending States สำหรับโหมด Range และ Multi
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd]     = useState(null);
  const [multiSelected, setMultiSelected] = useState([]);

  const ref = useRef(null);

  // คลิกนอกกรอบเพื่อปิด
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ดักปุ่ม ESC เพื่อปิด
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && open) setOpen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  // จัดการ State เริ่มต้นเมื่อเปิด Dropdown + ป้องกันข้อมูลยังไม่โหลด
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

  const select = (val) => { 
    setFilterPeriod(val); 
    setOpen(false); 
  };

  const handleMonthClick = (m) => {
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

  const isMonthSelected = (m) => {
    if (mode === 'multi') return multiSelected.includes(m);
    if (mode === 'range') return m === rangeStart || m === rangeEnd;
    return filterPeriod === m;
  };

  const isMonthInRange = (m) => {
    if (mode === 'range' && rangeStart && rangeEnd) {
      return m >= rangeStart && m <= rangeEnd;
    }
    return false;
  };

  const rangeSummaryText = useMemo(() => {
    if (mode !== 'range') return null;
    if (rangeStart && rangeEnd) return `${getThaiMonth(rangeStart)} — ${getThaiMonth(rangeEnd)}`;
    if (rangeStart) return `จาก: ${getThaiMonth(rangeStart)} ...`;
    return null;
  }, [mode, rangeStart, rangeEnd]);

  /* ── 🎨 Tokens: ปรับปรุงสีสำหรับการเลือกให้ชัดเจนยิ่งขึ้น ── */
  const surface    = 'bg-[#181818] border-[#3e3e3e]';
  const itemBase   = `flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs rounded-none transition-colors cursor-pointer`;
  const itemHover  = 'hover:bg-[#303030] text-[#cbd5e1]';
  
  // Standard Active (แบบดั้งเดิมที่นุ่มนวล)
  const itemActive = 'bg-[#da291c]/20 text-[#da291c] font-bold';
  const pillActive = 'bg-[#3e3e3e] text-[#da291c]';
  
  const pillBase    = `w-full text-[10px] py-1.5 px-0.5 rounded-none transition-all font-bold border border-transparent flex items-center justify-center gap-1 leading-none`; 
  const pillIdle    = 'bg-[#121212] border-[#303030] hover:bg-[#303030] hover:border-[#da291c]/50 text-[#cbd5e1]';

  // Blueprint Sky Tone for range selection
  const pillRangeActive  = 'bg-sky-500/20 border-sky-500/60 text-sky-400 font-black shadow-sm';
  const pillRangeBetween = 'bg-sky-500/10 border-sky-500/20 text-sky-300';

  // Dark: แดงเข้มหม่น | Light: แดงกุหลาบทึบ ตัดกับจอขาว
  const pillIndependentActive = 'bg-[#da291c]/30 border-[#da291c]/80 text-[#da291c] shadow-none'; 

  // --- UI Action Colors ---
  const confirmBtnCls = 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 font-bold transition-all';

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger */}
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 border-2 rounded-none shadow-sm transition-colors text-xs font-semibold ${
          'bg-[#121212] border-[#303030] text-white hover:bg-[#303030]/50 hover:border-[#3e3e3e]'
        }`}>
        <div className="flex items-center gap-2 min-w-0">
          <CalendarDays className="w-3.5 h-3.5 text-[#da291c] shrink-0" />
          <span className="whitespace-nowrap">{getFilterLabel(filterPeriod)}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${'text-[#888888]'}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute right-0 top-full mt-1.5 z-[300] rounded-none border-2 shadow-2xl overflow-hidden w-72 flex flex-col ${surface}`}>

          {/* Mode Bar */}
          <div className={`flex gap-1 p-1.5 border-b ${'bg-[#1c1c1c] border-[#303030]'}`}>
            <ModeBtn id="standard" icon={LayoutGrid} label="หลัก" active={mode === 'standard'} onClick={setMode} />
            <ModeBtn id="range" icon={CalendarRange} label="ช่วง" active={mode === 'range'} onClick={setMode} />
            <ModeBtn id="multi" icon={ListChecks} label="อิสระ" active={mode === 'multi'} onClick={setMode} />
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 360, scrollbarWidth: 'thin' }}>
            {mode === 'standard' && (
              <div className={`p-2 border-b ${'border-[#303030]'}`}>
                <button onClick={() => select('ALL')} className={`${itemBase} ${filterPeriod === 'ALL' ? itemActive : itemHover}`}>
                  {filterPeriod === 'ALL' ? <Check className="w-3 h-3 shrink-0 text-[#da291c]" /> : <span className="w-3 h-3 shrink-0" />}
                  <span className="truncate">ดูภาพรวมทั้งหมด (All Time)</span>
                </button>
              </div>
            )}

            <div className="p-2 space-y-0.5">
              {groupedOptions?.sortedYears?.length === 0 ? (
                <div className={`text-center py-4 text-xs ${'text-[#888888]'}`}>
                  ยังไม่มีข้อมูลปี
                </div>
              ) : (
                groupedOptions?.sortedYears?.map(year => {
                  const data = groupedOptions.yearsMap[year];
                  const isExpanded = expandedYear === year;
                  const months = Array.from(data.months).sort((a, b) => b.localeCompare(a));
                  return (
                    <div key={year}>
                      <button onClick={() => setExpandedYear(isExpanded ? null : year)}
                        className={`${itemBase} ${itemHover} font-bold`}>
                        <ChevronRight className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''} ${'text-[#888888]'}`} />
                        <span>📅 {year}</span>
                      </button>

                      {isExpanded && (
                        <div className={`ml-2 pl-2 border-l space-y-0.5 mt-0.5 mb-1 ${'border-[#303030]'}`}>
                          {mode === 'standard' && (
                            <>
                              <button onClick={() => select(year)} className={`${itemBase} ${filterPeriod === year ? itemActive : itemHover}`}>
                                {filterPeriod === year ? <Check className="w-3 h-3 shrink-0 text-[#da291c]" /> : <span className="w-3 h-3 shrink-0" />}
                                <span>ทั้งปี {year}</span>
                              </button>

                              {(data.halves.has(`${year}-H1`) || data.halves.has(`${year}-H2`)) && (
                                <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
                                  {['H1', 'H2'].map(h => {
                                    const hKey = `${year}-${h}`;
                                    if (!data.halves.has(hKey)) return null;
                                    const hStyle = filterPeriod === hKey ? pillActive : pillIdle;
                                    return (
                                      <button key={h} onClick={() => select(hKey)} className={`${pillBase} text-center ${hStyle}`}>
                                        {h}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}

                              {[1, 2, 3, 4].some(q => data.quarters.has(`${year}-Q${q}`)) && (
                                <div className="grid grid-cols-4 gap-1 px-1 py-0.5">
                                  {[1, 2, 3, 4].map(q => {
                                    const qKey = `${year}-Q${q}`;
                                    if (!data.quarters.has(qKey)) {
                                      return <span key={q} />;
                                    }
                                    const qStyle = filterPeriod === qKey ? pillActive : pillIdle;
                                    return (
                                      <button key={q} onClick={() => select(qKey)} className={`${pillBase} text-center ${qStyle}`}>
                                        Q{q}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          )}

                          <div className="grid grid-cols-3 gap-1 px-1 pt-0.5">
                            {months.map(m => {
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
          {(mode === 'multi' && multiSelected.length > 0) && (
             <div className={`p-2 border-t flex flex-col gap-2 ${'border-[#303030] bg-[#121212]/50'}`}>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1 custom-scrollbar">
                    {[...multiSelected].sort((a, b) => a.localeCompare(b)).map(m => (
                        <div key={m} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-none border ${'bg-amber-500/20 border-amber-500/50 text-amber-300'}`}>
                            {THAI_MONTHS_SHORT[Number.parseInt(m.split('-')[1], 10) - 1]} {m.split('-')[0].slice(2)}
                            <button onClick={() => setMultiSelected(multiSelected.filter(x => x !== m))} className="hover:text-red-500 transition-colors ml-0.5">
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-1.5">
                    <button onClick={() => setMode('standard')} className={`px-2 py-1 rounded-none text-[10px] font-medium transition-colors ${'bg-[#121212] border border-[#3e3e3e] text-[#cbd5e1] hover:bg-[#303030]'}`}>ล้าง</button>
                    <button onClick={handleConfirmMulti} className={`flex-1 py-1 rounded-none text-[11px] font-bold transition-all active:scale-[0.98] ${confirmBtnCls}`}>
                        ยืนยันการเลือก ({multiSelected.length})
                    </button>
                </div>
             </div>
          )}

          {(mode === 'range' && rangeSummaryText) && (
             <div className={`p-2 border-t flex flex-col gap-2 ${'border-[#303030] bg-[#121212]/50'}`}>
                <div className={`relative py-1.5 px-2 rounded-none border text-center flex items-center justify-between ${'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                    <p className="text-[11px] font-bold w-full">{rangeSummaryText}</p>
                    <button onClick={() => { setRangeStart(null); setRangeEnd(null); }} className="text-slate-400 hover:text-red-500 transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
                {rangeStart && rangeEnd && (
                    <button onClick={handleConfirmRange} className={`w-full py-1.5 rounded-none text-[11px] font-bold transition-all active:scale-[0.98] ${confirmBtnCls}`}>
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