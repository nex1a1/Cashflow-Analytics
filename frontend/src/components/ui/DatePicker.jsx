// src/components/ui/DatePicker.jsx
// ─────────────────────────────────────────────────────────────
// Custom date picker ที่ follow dark/light mode ของเว็บ
// แทนที่ native <input type="date"> ที่ควบคุม theme ไม่ได้
//
// Props:
//   value      — string "YYYY-MM-DD"
//   onChange   — (value: "YYYY-MM-DD") => void
//   isDarkMode — boolean
// ─────────────────────────────────────────────────────────────
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

export default function DatePicker({ value, onChange, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [viewDate, setViewDate] = useState(() => parseValue(value));
  const ref = useRef(null);

  const handleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const dropW = 288; // w-72
      const dropH = 320;
      let left = rect.left;
      let top = rect.bottom + 6;
      if (left + dropW > window.innerWidth - 8) left = rect.right - dropW;
      if (top + dropH > window.innerHeight - 8) top = rect.top - dropH - 6;
      setPos({ top, left });
    }
    setOpen(v => !v);
  };
  useEffect(() => {
    if (value) setViewDate(parseValue(value));
  }, [value]);

  // ปิด picker เมื่อคลิกนอก
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!ref.current?.contains(e.target) && !document.getElementById('datepicker-portal')?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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

  // ── Styles ────────────────────────────────────────────────
  const surface   = isDarkMode ? 'bg-slate-800' : 'bg-white';
  const border    = isDarkMode ? 'border-slate-600' : 'border-slate-300';
  const textMain  = isDarkMode ? 'text-slate-100' : 'text-slate-800';
  const textMuted = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const hoverDay  = isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-blue-50';

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full px-3 py-2.5 text-sm border rounded-lg flex items-center justify-between gap-2 font-medium transition-colors outline-none
          ${isDarkMode
            ? 'bg-slate-800 border-slate-700 text-white hover:border-blue-500 focus:border-blue-500'
            : 'bg-slate-50 border-slate-300 text-slate-800 hover:border-[#00509E] focus:border-[#00509E]'
          }`}
      >
        <span className={value ? textMain : textMuted}>{formatDisplay(value)}</span>
        <Calendar className={`w-4 h-4 shrink-0 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} />
      </button>

      {/* Calendar dropdown — fixed ลอยทับทุกอย่าง ไม่กระทบ layout */}
      {open && (
        <div
          id="datepicker-portal"
          className={`fixed z-[9999] rounded-xl border shadow-2xl p-3 w-72 ${surface} ${border}`}
          style={{ top: pos.top, left: pos.left }}
        >

          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={prevMonth}
              className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={`text-sm font-bold ${textMain}`}>
              {THAI_MONTHS[m]} {y}
            </span>
            <button
              onClick={nextMonth}
              className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((l, i) => (
              <div
                key={l}
                className={`text-center text-[11px] font-bold py-1 ${
                  i === 0 || i === 6
                    ? (isDarkMode ? 'text-red-400' : 'text-red-500')
                    : textMuted
                }`}
              >
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
                  onClick={() => selectDay(d)}
                  className={`h-8 w-full rounded-lg text-sm font-medium transition-all
                    ${isSelected(d)
                      ? 'bg-[#00509E] text-white font-bold'
                      : isToday(d)
                        ? `ring-2 ring-[#00509E] ${textMain} ${hoverDay}`
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
            <button
              onClick={() => { onChange(''); setOpen(false); }}
              className={`text-xs font-bold px-2 py-1 rounded transition-colors ${isDarkMode ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              ล้าง
            </button>
            <button
              onClick={goToday}
              className={`text-xs font-bold px-2 py-1 rounded transition-colors ${isDarkMode ? 'text-blue-400 hover:bg-slate-700' : 'text-[#00509E] hover:bg-blue-50'}`}
            >
              วันนี้
            </button>
          </div>
        </div>
      )}
    </div>
  );
}