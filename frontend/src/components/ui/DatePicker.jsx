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

export default function DatePicker({ value, onChange, required }) {
  const isDarkMode = true;
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => parseValue(value));
  
  const containerRef = useRef(null);

  useEffect(() => {
    if (value) setViewDate(parseValue(value));
  }, [value]);

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
  const surface   = 'bg-[#1c1c1c]';
  const border    = 'border-[#3e3e3e]';
  const textMain  = 'text-[#e0e0e0]';
  const textMuted = 'text-[#888888]';
  const hoverDay  = 'hover:bg-[#303030] hover:text-white';

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full px-3 py-2.5 text-sm border rounded-none flex items-center justify-between gap-2 font-medium transition-colors outline-none
          ${'bg-[#121212] border-[#3e3e3e] text-white hover:border-[#da291c] focus:border-[#da291c]'
          }`}
      >
        <span className={`${value ? textMain : textMuted} whitespace-nowrap truncate`}>{formatDisplay(value)}</span>
        <Calendar className={`w-4 h-4 shrink-0 ${'text-[#888888]'}`} />
      </button>

      {open && (
        <div className={`absolute top-[calc(100%+6px)] left-0 z-[200] rounded-none border shadow-2xl p-3 w-72 ${surface} ${border}`}>

          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className={`p-1.5 rounded-none transition-colors ${'hover:bg-[#303030] text-white'}`}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold ${textMain}`}>
              {THAI_MONTHS[m]} {y}
            </span>
            <button type="button" onClick={nextMonth}
              className={`p-1.5 rounded-none transition-colors ${'hover:bg-[#303030] text-white'}`}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((l, i) => (
              <div key={l} className={`text-center text-[11px] font-bold py-1 ${i === 0 || i === 6 ? ('text-red-400') : textMuted}`}>
                {l}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {blanks.map((_, i) => <div key={`b${i}`} />)}
            {days.map(d => {
              const weekend = new Date(y, m, d).getDay() === 0 || new Date(y, m, d).getDay() === 6;
              return (
                <button
                   key={d}
                  type="button"
                  onClick={() => selectDay(d)}
                  className={`h-8 w-full rounded-none text-sm font-medium transition-all
                    ${isSelected(d)
                      ? 'bg-[#da291c] text-white font-bold shadow-none'
                      : isToday(d)
                        ? `ring-1 ring-[#da291c] ${textMain} ${hoverDay}`
                        : weekend
                          ? `${'text-red-400'} ${hoverDay}`
                          : `${textMain} ${hoverDay}`
                    }
                  `}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className={`flex justify-between mt-3 pt-2.5 border-t ${'border-[#303030]'}`}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className={`text-xs font-bold px-2 py-1 rounded-none transition-colors ${'text-[#888888] hover:text-white hover:bg-[#303030]'}`}>
              ล้าง
            </button>
            <button type="button" onClick={goToday}
              className={`text-xs font-bold px-2 py-1 rounded-none transition-colors ${'text-[#da291c] hover:bg-[#303030]'}`}>
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}