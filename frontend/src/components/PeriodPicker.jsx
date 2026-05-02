// src/components/PeriodPicker.jsx
import { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { getThaiMonth } from '../utils/formatters';

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export default function PeriodPicker({ filterPeriod, setFilterPeriod, groupedOptions, isDarkMode }) {
  const dm = isDarkMode;
  const [open, setOpen]               = useState(false);
  const [expandedYear, setExpandedYear] = useState(null);
  const ref = useRef(null);

  // คลิกนอกกรอบเพื่อปิด
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // 3. ดักปุ่ม ESC เพื่อปิด
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && open) setOpen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  // 2. เติม Dependencies ให้ครบ + 1. ป้องกันแอปพังถ้าข้อมูลยังไม่มา
  useEffect(() => {
    if (open) {
      const year = filterPeriod?.split('-')[0];
      if (year && groupedOptions?.yearsMap?.[year]) {
        setExpandedYear(year);
      } else {
        setExpandedYear(groupedOptions?.sortedYears?.[0] || null);
      }
    }
  }, [open, filterPeriod, groupedOptions]);

  const select = (val) => { setFilterPeriod(val); setOpen(false); };

  const getLabel = () => {
    if (!filterPeriod || filterPeriod === 'ALL') return 'ดูภาพรวมทั้งหมด';
    if (filterPeriod.match(/^\d{4}$/))           return `ทั้งปี ${filterPeriod}`;
    if (filterPeriod.match(/^\d{4}-H[12]$/)) {
      const [y, h] = filterPeriod.split('-');
      return `${y} ${h === 'H1' ? 'ครึ่งปีแรก' : 'ครึ่งปีหลัง'}`;
    }
    if (filterPeriod.match(/^\d{4}-Q[1-4]$/)) {
      const [y, q] = filterPeriod.split('-');
      return `${y} ไตรมาส ${q[1]}`;
    }
    if (filterPeriod.match(/^\d{4}-\d{2}$/)) return getThaiMonth(filterPeriod);
    return filterPeriod;
  };

  /* ── tokens ── */
  const surface    = dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const itemBase   = `flex items-center gap-2 w-full text-left px-3 py-1.5 text-xs rounded-sm transition-colors cursor-pointer`;
  const itemHover  = dm ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700';
  const itemActive = dm ? 'bg-blue-900/40 text-blue-300 font-bold' : 'bg-blue-50 text-[#00509E] font-bold';
  const isActive   = (val) => filterPeriod === val;
  const pillBase   = `w-full text-[10px] py-1 px-0 rounded-sm transition-colors font-medium`;
  const pillActive = dm ? 'bg-slate-700 text-blue-400' : 'bg-white text-[#00509E] shadow-sm ring-1 ring-[#00509E]/20'; // เพิ่ม ring ให้เด่นขึ้นนิดนึง
  const pillIdle   = dm ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600';

  const Item = ({ val, label }) => (
    <button onClick={() => select(val)} className={`${itemBase} ${isActive(val) ? itemActive : itemHover}`}>
      {isActive(val) ? <Check className="w-3 h-3 shrink-0" /> : <span className="w-3 h-3 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 border rounded-sm shadow-sm transition-colors text-xs font-semibold ${dm ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'}`}>
        <CalendarDays className="w-3.5 h-3.5 text-[#D81A21] shrink-0" />
        <span className="max-w-[160px] truncate">{getLabel()}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${dm ? 'text-slate-400' : 'text-slate-400'}`} />
      </button>

      {/* Dropdown */}
      {open && (
        // 4. เปลี่ยน style={{ width: 248 }} เป็น w-64 (256px) แทน ให้ตรงตามมาตรฐาน Tailwind
        <div className={`absolute right-0 top-full mt-1.5 z-[300] rounded-sm border shadow-2xl overflow-hidden w-72 ${surface}`}>

          {/* All Time */}
          <div className={`p-2 border-b ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            <Item val="ALL" label="ดูภาพรวมทั้งหมด (All Time)" />
          </div>

          {/* Per Year */}
          <div className="p-2 space-y-0.5 overflow-y-auto" style={{ maxHeight: 400, scrollbarWidth: 'thin' }}>
            {/* 1. เติม ?. กันแอปพังถ้า API ส่งข้อมูลช้าหรือไม่มีข้อมูล */}
            {groupedOptions?.sortedYears?.length === 0 ? (
               <div className={`text-center py-4 text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                 ยังไม่มีข้อมูลปี
               </div>
            ) : (
              groupedOptions?.sortedYears?.map(year => {
                const data       = groupedOptions.yearsMap[year];
                const isExpanded = expandedYear === year;
                const months     = Array.from(data.months).sort().reverse();
                return (
                  <div key={year}>
                    <button onClick={() => setExpandedYear(isExpanded ? null : year)}
                      className={`${itemBase} ${itemHover} font-bold`}>
                      <ChevronRight className={`w-3 h-3 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''} ${dm ? 'text-slate-400' : 'text-slate-400'}`} />
                      <span>📅 {year}</span>
                    </button>

                    {isExpanded && (
                      <div className={`ml-2 pl-2 border-l space-y-0.5 mt-0.5 mb-1 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                        <Item val={year} label={`ทั้งปี ${year}`} />

                        {/* ครึ่งปี */}
                        {(data.halves.has(`${year}-H1`) || data.halves.has(`${year}-H2`)) && (
                          <div className="grid grid-cols-2 gap-1 px-1 py-0.5">
                            {data.halves.has(`${year}-H1`) && (
                              <button onClick={() => select(`${year}-H1`)} className={`${pillBase} text-center ${isActive(`${year}-H1`) ? pillActive : pillIdle}`}>H1</button>
                            )}
                            {data.halves.has(`${year}-H2`) && (
                              <button onClick={() => select(`${year}-H2`)} className={`${pillBase} text-center ${isActive(`${year}-H2`) ? pillActive : pillIdle}`}>H2</button>
                            )}
                          </div>
                        )}

                        {/* ไตรมาส */}
                        {[1,2,3,4].some(q => data.quarters.has(`${year}-Q${q}`)) && (
                          <div className="grid grid-cols-4 gap-1 px-1 py-0.5">
                            {[1,2,3,4].map(q => data.quarters.has(`${year}-Q${q}`) ? (
                              <button key={q} onClick={() => select(`${year}-Q${q}`)} className={`${pillBase} text-center ${isActive(`${year}-Q${q}`) ? pillActive : pillIdle}`}>Q{q}</button>
                            ) : (
                              <span key={q} />
                            ))}
                          </div>
                        )}

                        {/* เดือน — 3 cols */}
                        <div className="grid grid-cols-3 gap-1 px-1 pt-0.5">
                          {months.map(m => {
                            const [, mo] = m.split('-');
                            return (
                              <button key={m} onClick={() => select(m)} className={`text-[10px] py-1.5 rounded-sm transition-colors font-medium ${isActive(m) ? pillActive : pillIdle}`}>
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
      )}
    </div>
  );
}