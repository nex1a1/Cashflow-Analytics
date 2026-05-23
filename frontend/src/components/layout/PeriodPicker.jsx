import { useState, useRef, useEffect, useMemo } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Check, LayoutGrid, CalendarRange, ListChecks, X } from 'lucide-react';
import { getFilterLabel, getThaiMonth } from '../../utils/formatters';

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export default function PeriodPicker({ filterPeriod, setFilterPeriod, groupedOptions }) {
  const dm = true;
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
        const [s, e] = [rangeStart, m].sort();
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
    else select(multiSelected.sort().join(','));
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
  const surface    = 'bg-slate-900 border-slate-700';
  const itemBase   = `flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs rounded-none transition-colors cursor-pointer`;
  const itemHover  = 'hover:bg-slate-700 text-slate-200';
  
  // Standard Active (แบบดั้งเดิมที่นุ่มนวล)
  const itemActive = 'bg-blue-900/40 text-blue-300 font-bold';
  const pillActive = 'bg-slate-700 text-blue-400';
  
  const pillBase    = `w-full text-[10px] py-1.5 px-0.5 rounded-none transition-all font-bold border border-transparent flex items-center justify-center gap-1 leading-none`; 
  const pillIdle    = 'bg-slate-800 hover:bg-slate-700 text-slate-300';

  // Dark: ฟ้าโปร่งแสงนุ่มๆ | Light: ฟ้าสว่างขอบคมชัด
  const pillRangeActive  = 'bg-blue-500/20 border-blue-500/40 text-blue-300';
  const pillRangeBetween = 'bg-blue-500/10 border-transparent text-blue-400/60';

  // Dark: แดงเข้มหม่น | Light: แดงกุหลาบทึบ ตัดกับจอขาว
  const pillIndependentActive = 'bg-rose-900 border-rose-700 text-rose-200 shadow-sm'; 

  // --- UI Action Colors ---
  const confirmBtnCls = 'bg-[#10B981] hover:bg-[#059669] text-white shadow-lg border-[#059669]';

  const ModeBtn = ({ id, icon: Icon, label }) => (
    <button 
      onClick={() => setMode(id)}
      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-none transition-all ${
        mode === id 
          ? ('bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-500/30 border border-indigo-500')
          : ('text-slate-400 hover:text-slate-300 hover:bg-slate-800 border border-transparent')
      }`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span className="text-[10px] uppercase">{label}</span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 border-2 rounded-none shadow-sm transition-colors text-xs font-semibold ${
          'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
        }`}>
        <CalendarDays className="w-3.5 h-3.5 text-[#D81A21] shrink-0" />
        <span className="max-w-[160px] truncate">{getFilterLabel(filterPeriod)}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${'text-slate-400'}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className={`absolute right-0 top-full mt-1.5 z-[300] rounded-none border-2 shadow-2xl overflow-hidden w-72 flex flex-col ${surface}`}>

          {/* Mode Bar */}
          <div className={`flex gap-1 p-1.5 border-b ${'bg-slate-800/80 border-slate-700'}`}>
            <ModeBtn id="standard" icon={LayoutGrid} label="หลัก" />
            <ModeBtn id="range" icon={CalendarRange} label="ช่วง" />
            <ModeBtn id="multi" icon={ListChecks} label="อิสระ" />
          </div>

          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 360, scrollbarWidth: 'thin' }}>
            {mode === 'standard' && (
              <div className={`p-2 border-b ${'border-slate-700'}`}>
                <button onClick={() => select('ALL')} className={`${itemBase} ${filterPeriod === 'ALL' ? itemActive : itemHover}`}>
                  {filterPeriod === 'ALL' ? <Check className="w-3 h-3 shrink-0 text-blue-400" /> : <span className="w-3 h-3 shrink-0" />}
                  <span className="truncate">ดูภาพรวมทั้งหมด (All Time)</span>
                </button>
              </div>
            )}

            <div className="p-2 space-y-0.5">
              {groupedOptions?.sortedYears?.length === 0 ? (
                <div className={`text-center py-4 text-xs ${'text-slate-500'}`}>
                  ยังไม่มีข้อมูลปี
                </div>
              ) : (
                groupedOptions?.sortedYears?.map(year => {
                  const data = groupedOptions.yearsMap[year];
                  const isExpanded = expandedYear === year;
                  const months = Array.from(data.months).sort().reverse();
                  return (
                    <div key={year}>
                      <button onClick={() => setExpandedYear(isExpanded ? null : year)}
                        className={`${itemBase} ${itemHover} font-bold`}>
                        <ChevronRight className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''} ${'text-slate-400'}`} />
                        <span>📅 {year}</span>
                      </button>

                      {isExpanded && (
                        <div className={`ml-2 pl-2 border-l space-y-0.5 mt-0.5 mb-1 ${'border-slate-700'}`}>
                          {mode === 'standard' && (
                            <>
                              <button onClick={() => select(year)} className={`${itemBase} ${filterPeriod === year ? itemActive : itemHover}`}>
                                {filterPeriod === year ? <Check className="w-3 h-3 shrink-0 text-blue-400" /> : <span className="w-3 h-3 shrink-0" />}
                                <span>ทั้งปี {year}</span>
                              </button>

                              {(data.halves.has(`${year}-H1`) || data.halves.has(`${year}-H2`)) && (
                                <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
                                  {['H1', 'H2'].map(h => data.halves.has(`${year}-${h}`) && (
                                    <button key={h} onClick={() => select(`${year}-${h}`)} className={`${pillBase} text-center ${filterPeriod === `${year}-${h}` ? pillActive : pillIdle}`}>
                                      {h}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {[1, 2, 3, 4].some(q => data.quarters.has(`${year}-Q${q}`)) && (
                                <div className="grid grid-cols-4 gap-1 px-1 py-0.5">
                                  {[1, 2, 3, 4].map(q => data.quarters.has(`${year}-Q${q}`) ? (
                                    <button key={q} onClick={() => select(`${year}-Q${q}`)} className={`${pillBase} text-center ${filterPeriod === `${year}-Q${q}` ? pillActive : pillIdle}`}>
                                      Q{q}
                                    </button>
                                  ) : (
                                    <span key={q} />
                                  ))}
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
                              } else {
                                if (selected) currentStyle = pillActive;
                              }

                              return (
                                <button key={m} onClick={() => handleMonthClick(m)}
                                  className={`${pillBase} ${currentStyle}`}>
                                  {THAI_MONTHS_SHORT[parseInt(mo) - 1]}
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
             <div className={`p-2 border-t flex flex-col gap-2 ${'border-slate-700 bg-slate-800/50'}`}>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1 custom-scrollbar">
                    {multiSelected.sort().map(m => (
                        <div key={m} className={`flex items-center gap-1 px-1.5 py-0.5 rounded-none border ${'bg-amber-500/20 border-amber-500/50 text-amber-300'}`}>
                            {THAI_MONTHS_SHORT[parseInt(m.split('-')[1]) - 1]} {m.split('-')[0].slice(2)}
                            <button onClick={() => setMultiSelected(multiSelected.filter(x => x !== m))} className="hover:text-red-500 transition-colors ml-0.5">
                                <X className="w-2.5 h-2.5" />
                            </button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-1.5">
                    <button onClick={() => setMultiSelected([])} className={`px-2 py-1 rounded-none text-[10px] font-medium transition-colors ${'bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700'}`}>ล้าง</button>
                    <button onClick={handleConfirmMulti} className={`flex-1 py-1 rounded-none text-[11px] font-bold transition-all active:scale-[0.98] ${confirmBtnCls}`}>
                        ยืนยันการเลือก ({multiSelected.length})
                    </button>
                </div>
             </div>
          )}

          {(mode === 'range' && rangeSummaryText) && (
             <div className={`p-2 border-t flex flex-col gap-2 ${'border-slate-700 bg-slate-800/50'}`}>
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