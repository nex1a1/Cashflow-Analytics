import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../../context/ThemeContext';

const COLOR_PALETTE = [
  '#F43F5E','#E11D48','#BE123C','#FB7185','#9F1239',
  '#F97316','#EA580C','#C2410C','#FB923C','#9A3412',
  '#F59E0B','#D97706','#B45309','#FBBF24','#78350F',
  '#10B981','#059669','#047857','#34D399','#064E3B',
  '#22C55E','#16A34A','#15803D','#4ADE80','#14532D',
  '#06B6D4','#0891B2','#0E7490','#22D3EE','#164E63',
  '#14B8A6','#0D9488','#0F766E','#2DD4BF','#134E4A',
  '#3B82F6','#2563EB','#1D4ED8','#60A5FA','#1E3A8A',
  '#6366F1','#4F46E5','#4338CA','#818CF8','#312E81',
  '#8B5CF6','#7C3AED','#6D28D9','#A78BFA','#4C1D95',
  '#A855F7','#9333EA','#7E22CE','#C084FC','#581C87',
  '#EC4899','#DB2777','#BE185D','#F472B6','#831843',
  '#64748B','#475569','#334155','#94A3B8','#1E293B',
];

export default function ColorPicker({ color, onChange }) {
  const { isDarkMode } = useTheme();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const paletteRef = useRef(null);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const W = 256, H = 185;
      let left = rect.left; if (left + W > window.innerWidth - 8) left = rect.right - W;
      let top = rect.bottom + 4; if (top + H > window.innerHeight - 8) top = rect.top - H - 4;
      setPos({ top, left });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.type === 'mousedown' && (btnRef.current?.contains(e.target) || paletteRef.current?.contains(e.target))) return;
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      setOpen(false);
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', h);
    window.addEventListener('scroll', h, true);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', h);
      window.removeEventListener('scroll', h, true);
    };
  }, [open]);

  return (
    <div className="relative shrink-0 flex items-center">
      <button ref={btnRef} onClick={handleOpen} type="button"
        className="w-5 h-5 border cursor-pointer hover:scale-110 transition-transform shadow-sm outline-none"
        style={{ backgroundColor: color, borderColor: color }} title="เลือกสี" />
      {open && (
        <div ref={paletteRef}
          className={`fixed z-[9999] p-2.5 shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
          style={{ top: pos.top, left: pos.left, width: 256 }}>
          <div className="grid grid-cols-10 gap-1 mb-2.5">
            {COLOR_PALETTE.map(c => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
                className={`transition-transform hover:scale-125 ${color === c ? 'ring-1 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                style={{ backgroundColor: c, width: '1.05rem', height: '1.05rem' }} title={c} />
            ))}
          </div>
          <div className={`flex items-center gap-2 border-t pt-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <input type="color" value={color} onChange={e => onChange(e.target.value)}
              className="w-6 h-5 cursor-pointer border-0 bg-transparent p-0" title="สีกำหนดเอง" />
            <span className={`text-[11px] font-mono font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{color}</span>
          </div>
        </div>
      )}
    </div>
  );
}
