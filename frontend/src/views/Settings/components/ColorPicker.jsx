import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

// Helper to convert HSL values to standard HEX format
function hslToHex(h, s, l) {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

const COLS = 15;
const ROWS = 17;
const COLOR_PALETTE = [];

// Generate the 255-color palette (rendered row-by-row)
for (let r = 0; r < ROWS; r++) {
  // Calculate lightness from 95% (light pastel) down to 12% (rich dark obsidian shade)
  const l = Math.round(95 - (r / (ROWS - 1)) * 83);
  for (let c = 0; c < COLS; c++) {
    if (c === COLS - 1) {
      // Last column (Col 14) is premium Slate/Gray
      COLOR_PALETTE.push(hslToHex(220, 10, l));
    } else {
      // Other columns span the full standard hue spectrum
      const h = Math.round((c / (COLS - 1)) * 360);
      COLOR_PALETTE.push(hslToHex(h, 70, l));
    }
  }
}

export default function ColorPicker({ color, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [hexInput, setHexInput] = useState(color);
  
  const btnRef = useRef(null);
  const paletteRef = useRef(null);
  const initialScroll = useRef({ top: 0, left: 0 });

  // Keep internal hex state synchronized with external prop
  useEffect(() => {
    setHexInput(color);
  }, [color]);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const W = 274, H = 372;
      let left = rect.left; 
      if (left + W > window.innerWidth - 8) left = rect.right - W;
      let top = rect.bottom + 4; 
      if (top + H > window.innerHeight - 8) top = rect.top - H - 4;
      
      setPos({ top, left });
      initialScroll.current = {
        top: window.scrollY || document.documentElement.scrollTop,
        left: window.scrollX || document.documentElement.scrollLeft
      };
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleClose = (e) => {
      if (e.type === 'mousedown' && (btnRef.current?.contains(e.target) || paletteRef.current?.contains(e.target))) return;
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      if (e.type === 'scroll') {
        const currentTop = window.scrollY || document.documentElement.scrollTop;
        const currentLeft = window.scrollX || document.documentElement.scrollLeft;
        const diffY = Math.abs(currentTop - initialScroll.current.top);
        const diffX = Math.abs(currentLeft - initialScroll.current.left);
        if (diffY < 5 && diffX < 5) return;
      }
      setOpen(false);
    };
    
    document.addEventListener('mousedown', handleClose);
    document.addEventListener('keydown', handleClose);
    window.addEventListener('scroll', handleClose, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open]);

  const handleHexInputChange = (val) => {
    setHexInput(val);
    const cleanVal = val.trim();
    if (/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i.test(cleanVal)) {
      const formatted = cleanVal.startsWith('#') ? cleanVal : `#${cleanVal}`;
      onChange(formatted);
    }
  };

  return (
    <div className="relative shrink-0 flex items-center select-none">
      {/* Trigger Button - Slick Obsidian Square */}
      <button 
        ref={btnRef} 
        onClick={handleOpen} 
        type="button"
        className="w-5 h-5 border rounded-none border-slate-900/80 cursor-pointer hover:border-slate-600 transition-colors shadow-sm outline-none focus:border-white focus:ring-1 focus:ring-white/20"
        style={{ backgroundColor: color }} 
        title="เลือกสี" 
      />
      
      {open && createPortal(
        <div 
          ref={paletteRef}
          className="fixed z-[9999] p-3 shadow-[0_0_24px_rgba(0,0,0,0.85)] border bg-slate-950 border-slate-800 rounded-none w-[274px] flex flex-col gap-2"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Swatch Header */}
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-900">
            <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase select-none">
              เฉดสีมาตรฐาน (255 สี)
            </span>
          </div>

          {/* Color Swatch Matrix with hairline gaps */}
          <div 
            className="grid gap-[1px] bg-slate-800/80 p-[1px] border border-slate-900/50"
            style={{ gridTemplateColumns: 'repeat(15, minmax(0, 1fr))' }}
          >
            {COLOR_PALETTE.map(c => {
              const isSelected = color?.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={`aspect-square w-full rounded-none cursor-pointer relative hover:z-10 hover:ring-1 hover:ring-white focus:outline-none ${
                    isSelected ? 'ring-1 ring-white z-10 scale-105 shadow-[0_0_6px_rgba(255,255,255,0.4)]' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              );
            })}
          </div>

          {/* Color Preview & Custom Input Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-900 mt-1">
            {/* Color Preview Indicator Block */}
            <div 
              className="w-8 h-8 rounded-none border border-slate-850 shrink-0" 
              style={{ backgroundColor: color }}
              title="สีปัจจุบัน"
            />
            
            {/* Native Color Bucket Fallback */}
            <div className="relative w-8 h-8 border border-slate-800 bg-slate-900 flex items-center justify-center hover:bg-slate-850 hover:border-slate-700 shrink-0 cursor-pointer">
              <span className="text-xs select-none">🎨</span>
              <input 
                type="color" 
                value={color} 
                onChange={e => onChange(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer" 
                title="สีกำหนดเอง" 
              />
            </div>

            {/* Custom HEX Value Editor */}
            <div className="flex-1 flex items-center gap-1.5 bg-slate-950 border border-slate-850 px-2 py-1 h-8">
              <span className="text-[9px] font-mono text-slate-550 font-black select-none">HEX</span>
              <input
                type="text"
                value={hexInput}
                onChange={e => handleHexInputChange(e.target.value)}
                maxLength="7"
                className="w-full bg-transparent text-xs font-mono font-bold text-slate-200 outline-none text-right uppercase"
                placeholder="#000000"
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
