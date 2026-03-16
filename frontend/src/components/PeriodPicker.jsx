// src/components/PeriodPicker.jsx
import { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { getThaiMonth } from '../utils/formatters';

const THAI_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];

export default function PeriodPicker({ filterPeriod, setFilterPeriod, groupedOptions, isDarkMode }) {
  const [open, setOpen]           = useState(false);
  const [expandedYear, setExpandedYear] = useState(null);
  const ref = useRef(null);

  // ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-expand ปีของ value ปัจจุบัน
  useEffect(() => {
    if (open) {
      const year = filterPeriod?.split('-')[0] || filterPeriod?.split('-')[0];
      if (year && groupedOptions.yearsMap[year]) setExpandedYear(year);
      else setExpandedYear(groupedOptions.sortedYears[0] || null);
    }
  }, [open]);

  const select = (val) => { setFilterPeriod(val); setOpen(false); };

  // ── Label สำหรับปุ่มหลัก ──────────────────────────────────────────────
  const getLabel = () => {
    if (!filterPeriod || filterPeriod === 'ALL') return 'ดูภาพรวมทั้งหมด';
    if (filterPeriod.match(/^\d{4}$/)) return `ทั้งปี ${filterPeriod}`;
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

  // ── styles ────────────────────────────────────────────────────────────
  const surface   = isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200';
  const itemBase  = `flex items-center gap-2 w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors cursor-pointer`;
  const itemHover = isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700';
  const itemActive= isDarkMode ? 'bg-blue-900/40 text-blue-300 font-bold' : 'bg-blue-50 text-[#00509E] font-bold';
  const isActive  = (val) => filterPeriod === val;

  const Item = ({ val, label, indent = false }) => (
    <button
      onClick={() => select(val)}
      className={`${itemBase} ${isActive(val) ? itemActive : itemHover} ${indent ? 'pl-6' : ''}`}
    >
      {isActive(val)
        ? <Check className="w-3.5 h-3.5 shrink-0" />
        : <span className="w-3.5 h-3.5 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );

  return (
    <div ref={ref} className="relative">
      {/* ── Trigger Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg shadow-sm transition-colors text-sm font-semibold ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-white border-slate-300 text-slate-800 hover:bg-slate-50'}`}
      >
        <CalendarDays className="w-4 h-4 text-[#D81A21] shrink-0" />
        <span className="max-w-[160px] truncate">{getLabel()}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div className={`absolute right-0 top-full mt-1.5 z-[300] rounded-xl border shadow-2xl overflow-hidden ${surface}`} style={{ width: 260 }}>

          {/* All Time */}
          <div className="p-2 border-b border-inherit">
            <Item val="ALL" label="ดูภาพรวมทั้งหมด (All Time)" />
          </div>

          {/* Per Year */}
          <div className="p-2 space-y-0.5 overflow-y-auto" style={{ maxHeight: 420 }}>
            {groupedOptions.sortedYears.map(year => {
              const data      = groupedOptions.yearsMap[year];
              const isExpanded = expandedYear === year;
              const months    = Array.from(data.months).sort().reverse();

              return (
                <div key={year}>
                  {/* ── Year header ── */}
                  <button
                    onClick={() => setExpandedYear(isExpanded ? null : year)}
                    className={`${itemBase} ${itemHover} font-bold`}
                  >
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''} ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
                    <span>📅 {year}</span>
                  </button>

                  {/* ── Year sub-items ── */}
                  {isExpanded && (
                    <div className="ml-2 pl-2 border-l space-y-0.5 mt-0.5 mb-1" style={{ borderColor: isDarkMode ? '#334155' : '#e2e8f0' }}>

                      {/* ทั้งปี */}
                      <Item val={year} label={`ทั้งปี ${year}`} />

                      {/* ครึ่งปี */}
                      {(data.halves.has(`${year}-H1`) || data.halves.has(`${year}-H2`)) && (
                        <div className="flex gap-1 px-1 py-0.5">
                          {data.halves.has(`${year}-H1`) && (
                            <button onClick={() => select(`${year}-H1`)}
                              className={`flex-1 text-xs py-1 px-2 rounded-lg transition-colors ${isActive(`${year}-H1`) ? itemActive : (isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}>
                              H1
                            </button>
                          )}
                          {data.halves.has(`${year}-H2`) && (
                            <button onClick={() => select(`${year}-H2`)}
                              className={`flex-1 text-xs py-1 px-2 rounded-lg transition-colors ${isActive(`${year}-H2`) ? itemActive : (isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}>
                              H2
                            </button>
                          )}
                        </div>
                      )}

                      {/* ไตรมาส */}
                      {[1,2,3,4].some(q => data.quarters.has(`${year}-Q${q}`)) && (
                        <div className="flex gap-1 px-1 py-0.5">
                          {[1,2,3,4].map(q => data.quarters.has(`${year}-Q${q}`) && (
                            <button key={q} onClick={() => select(`${year}-Q${q}`)}
                              className={`flex-1 text-xs py-1 px-1 rounded-lg transition-colors ${isActive(`${year}-Q${q}`) ? itemActive : (isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}>
                              Q{q}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* เดือน — grid 3 คอลัมน์ */}
                      <div className="grid grid-cols-3 gap-1 px-1 pt-1">
                        {months.map(m => {
                          const [, mo] = m.split('-');
                          return (
                            <button key={m} onClick={() => select(m)}
                              className={`text-xs py-1.5 rounded-lg transition-colors font-medium ${isActive(m) ? itemActive : (isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600')}`}>
                              {THAI_MONTHS_SHORT[parseInt(mo)-1]}
                            </button>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}