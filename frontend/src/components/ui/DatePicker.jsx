// src/components/ui/DatePicker.jsx
import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const THAI_MONTHS = [
  'มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม',
];
const DAY_LABELS = ['อา','จ','อ','พ','พฤ','ศ','ส'];

function parseValue(v) {
  if (!v) return new Date();
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toValueStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplay(v) {
  if (!v) return 'เลือกวันที่';
  const [y, m, d] = v.split('-').map(Number);
  return `${d} ${THAI_MONTHS[m - 1]} ${y}`;
}

export default function DatePicker({ value, onChange, isDarkMode, required }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseValue(value));
  
  // 1. ใช้ Ref ตัวเดียวคลุมทั้ง Input และ Dropdown เพื่อแก้ปัญหา ID ซ้ำกัน
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) setViewDate(parseValue(value));
  }, [value]);

  // 2. จัดการคลิกนอกกรอบโดยใช้ containerRef (สะอาดและปลอดภัยกว่า)
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

  // 3. เพิ่มการปิดด้วย ESC
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && open) setOpen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open]);

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();
  const today = new Date();

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectedDate = value ? parseValue(value) : null;

  const isSelected = (d) =>
    selectedDate &&
    d === selectedDate.getDate() &&
    m === selectedDate.getMonth() &&
    y === selectedDate.getFullYear();

  const isToday = (d) =>
    d === today.getDate() &&
    m === today.getMonth() &&
    y === today.getFullYear();

  const prevMonth = () => setViewDate(new Date(y, m - 1, 1));
  const nextMonth = () => setViewDate(new Date(y, m + 1, 1));

  const selectDay = (d) => {
    onChange(toValueStr(new Date(y, m, d)));
    setOpen(false);
  };

  const goToday = () => {
    const t = new Date();
    setViewDate(t);
    onChange(toValueStr(t));
    setOpen(false);
  };

  /* ── Styles ── */
  const surface   = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const border    = isDarkMode ? 'border-slate-600' : 'border-slate-300';
  const textMain  = isDarkMode ? 'text-slate-100' : 'text-slate-800';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const hoverDay  = isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-blue-50';

  return (
    // คลุมด้วย relative เพื่อเป็นจุดอ้างอิงให้ Popup
    <div ref={containerRef} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2.5 text-sm border rounded-sm flex items-center justify-between gap-2 font-medium transition-colors outline-none
          ${isDarkMode
            ? 'bg-slate-900 border-slate-700 text-white hover:border-blue-500 focus:border-blue-500'
            : 'bg-white border-slate-300 text-slate-800 hover:border-[#00509E] focus:border-[#00509E]'
          }`}
      >
        <span className={value ? textMain : textMuted}>{formatDisplay(value)}</span>
        <Calendar className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
      </button>

      {/* Calendar dropdown 
        4. เปลี่ยนจาก fixed ลอยๆ มาเป็น absolute 
        (เกาะติดกับ input เสมอ ไม่หลุดจอตอน scroll)
      */}
      {open && (
        <div className={`absolute top-[calc(100%+6px)] left-0 z-[200] rounded-sm border shadow-2xl p-3 w-72 ${surface} ${border}`}>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className={`p-1.5 rounded-sm transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold ${textMain}`}>
              {THAI_MONTHS[m]} {y}
            </span>
            <button type="button" onClick={nextMonth}
              className={`p-1.5 rounded-sm transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((l, i) => (
              <div key={l} className={`text-center text-[11px] font-bold py-1 ${i === 0 || i === 6 ? (isDarkMode ? 'text-red-400' : 'text-red-500') : textMuted}`}>
                {l}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {blanks.map((_, i) => <div key={`b${i}`} />)}
            {days.map(d => {
              const weekend = new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => selectDay(d)}
                  className={`h-8 w-full rounded-sm text-sm font-medium transition-all
                    ${isSelected(d)
                      ? 'bg-[#00509E] text-white font-bold shadow-sm'
                      : isToday(d)
                        ? `ring-1 ring-[#00509E] ${textMain} ${hoverDay}`
                        : weekend
                          ? `${isDarkMode ? 'text-red-400' : 'text-red-500'} ${hoverDay}`
                          : `${textMain} ${hoverDay}`
                    }
                  `}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`flex justify-between mt-3 pt-2.5 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className={`text-xs font-bold px-2 py-1 rounded-sm transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
              ล้าง
            </button>
            <button type="button" onClick={goToday}
              className={`text-xs font-bold px-2 py-1 rounded-sm transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-slate-700' : 'text-[#00509E] hover:bg-blue-50'}`}>
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}