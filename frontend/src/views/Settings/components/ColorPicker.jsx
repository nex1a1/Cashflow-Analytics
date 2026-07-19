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
const ROWS = 10;
const COLOR_PALETTE = [];

// Generate the multi-dimensional color palette
// Varying hue horizontally, and saturation + lightness vertically to create pastels, vibrant, deep, and dark tones
for (let r = 0; r < ROWS; r++) {
  let s = 70;
  let l = 50;
  
  // Set distinct saturation & lightness profiles per row to provide rich variety
  if (r === 0) { s = 45; l = 85; }      // Very light pastel
  else if (r === 1) { s = 65; l = 78; } // Soft pastel
  else if (r === 2) { s = 80; l = 70; } // Bright pastel
  else if (r === 3) { s = 90; l = 60; } // Clear/Vibrant
  else if (r === 4) { s = 95; l = 50; } // Pure Vivid
  else if (r === 5) { s = 85; l = 42; } // Rich/Deep
  else if (r === 6) { s = 75; l = 34; } // Dark/Saturated
  else if (r === 7) { s = 65; l = 25; } // Deep shadows
  else if (r === 8) { s = 55; l = 16; } // Obsidian shades
  
  for (let c = 0; c < COLS; c++) {
    if (r === ROWS - 1) {
      // Last row is a beautifully smooth Grayscale from white to dark obsidian
      const grayL = Math.round(92 - (c / (COLS - 1)) * 80);
      COLOR_PALETTE.push(hslToHex(220, 10, grayL));
    } else {
      if (c === COLS - 1) {
        // Last column is a premium Slate/Gray tone matching the row's lightness profile
        COLOR_PALETTE.push(hslToHex(220, 12, l));
      } else {
        // Other columns span the full standard hue spectrum
        const h = Math.round((c / (COLS - 1)) * 360);
        COLOR_PALETTE.push(hslToHex(h, s, l));
      }
    }
  }
}

// Curated designer-picked palettes specifically chosen for dark mode UI
const CURATED_PALETTES = [
  {
    name: 'WARM & VIBRANT (โทนอุ่นและสดใส)',
    colors: [
      '#DA291C', '#FF4D4D', '#FF7675', '#FF9F43', '#F0932B', '#E17055',
      '#D63031', '#AE0E0E', '#FD79A8', '#E84393', '#F39C12', '#F1C40F'
    ]
  },
  {
    name: 'COOL & TEAL (โทนเย็นและธรรมชาติ)',
    colors: [
      '#10B981', '#2ECC71', '#27AE60', '#1ABC9C', '#16A085', '#7BED9F',
      '#3B82F6', '#3498DB', '#0984E3', '#74B9FF', '#00CEC9', '#54A0FF'
    ]
  },
  {
    name: 'NEON & OBSIDIAN (นีออนและมินิมอล)',
    colors: [
      '#8B5CF6', '#9B59B6', '#8E44AD', '#A29BFE', '#E056FD', '#6C5CE7',
      '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A'
    ]
  }
];

export default function ColorPicker({ color, onChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('spectrum'); // 'spectrum' or 'curated'
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
      const W = 290, H = 290;
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
        className="w-5 h-5 border rounded-none border-[#3e3e3e] cursor-pointer hover:border-[#da291c]/50 transition-colors shadow-sm outline-none focus:border-white focus:ring-1 focus:ring-white/20"
        style={{ backgroundColor: color }} 
        title="เลือกสี" 
      />
      
      {open && createPortal(
        <div 
          ref={paletteRef}
          className="fixed z-[9999] p-3 shadow-[0_0_24px_rgba(0,0,0,0.85)] border bg-[#181818] border-[#3e3e3e] rounded-none w-[290px] flex flex-col gap-2"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Tabs Header */}
          <div className="flex border-b border-[#303030] pb-1 mb-1">
            <button
              type="button"
              onClick={() => setTab('spectrum')}
              className={`flex-1 pb-1 text-[10px] font-black tracking-wider uppercase border-b-2 transition-all ${
                tab === 'spectrum' 
                  ? 'border-[#da291c] text-white font-black' 
                  : 'border-transparent text-[#666666] hover:text-[#888888]'
              }`}
            >
              แผงสเปกตรัม
            </button>
            <button
              type="button"
              onClick={() => setTab('curated')}
              className={`flex-1 pb-1 text-[10px] font-black tracking-wider uppercase border-b-2 transition-all ${
                tab === 'curated' 
                  ? 'border-[#da291c] text-white font-black' 
                  : 'border-transparent text-[#666666] hover:text-[#888888]'
              }`}
            >
              ธีมแนะนำ
            </button>
          </div>

          {/* Tab Content: Spectrum Grid */}
          {tab === 'spectrum' && (
            <div 
              className="grid gap-[1px] bg-[#3e3e3e] p-[1px] border border-[#303030]/50"
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
          )}

          {/* Tab Content: Curated Palettes */}
          {tab === 'curated' && (
            <div className="flex flex-col gap-2.5 py-1">
              {CURATED_PALETTES.map(grp => (
                <div key={grp.name} className="flex flex-col">
                  <span className="text-[8px] font-black tracking-widest text-[#666666] uppercase mb-1">
                    {grp.name}
                  </span>
                  <div className="grid grid-cols-12 gap-[2px]">
                    {grp.colors.map(c => {
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
                </div>
              ))}
            </div>
          )}

          {/* Color Preview & Custom Input Footer */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#303030] mt-1">
            {/* Color Preview Indicator Block */}
            <div 
              className="w-8 h-8 rounded-none border border-[#3e3e3e] shrink-0" 
              style={{ backgroundColor: color }}
              title="สีปัจจุบัน"
            />
            
            {/* Native Color Bucket Fallback */}
            <div className="relative w-8 h-8 border border-[#3e3e3e] bg-[#121212] flex items-center justify-center hover:bg-[#303030] hover:border-[#da291c] shrink-0 cursor-pointer">
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
            <div className="flex-1 flex items-center gap-1.5 bg-[#121212] border border-[#3e3e3e] px-2 py-1 h-8">
              <span className="text-[9px] font-mono text-[#666666] font-black select-none">HEX</span>
              <input
                type="text"
                value={hexInput}
                onChange={e => handleHexInputChange(e.target.value)}
                maxLength="7"
                className="w-full bg-transparent text-xs font-mono font-bold text-[#cbd5e1] outline-none text-right uppercase"
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
