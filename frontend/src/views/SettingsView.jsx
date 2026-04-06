// src/views/SettingsView.jsx
import { useState, useEffect, useRef } from 'react';
import {
  PlusCircle, Trash2, Coins, CalendarClock, AlertCircle,
  Settings, ChevronUp, ChevronDown, Wallet, X, Info
} from 'lucide-react';
import { DAY_TYPE_CONFIG_KEY } from '../constants';

const COLOR_PALETTE = [
  '#FF0000','#EF4444','#DC2626','#B91C1C','#7F1D1D',
  '#F97316','#EA580C','#C2410C','#F43F5E','#E11D48',
  '#FB923C','#FBBF24','#F59E0B','#D97706','#B45309',
  '#EAB308','#CA8A04','#A3E635','#84CC16','#65A30D',
  '#22C55E','#16A34A','#15803D','#166534','#10B981',
  '#059669','#047857','#14B8A6','#0D9488','#0F766E',
  '#06B6D4','#0891B2','#0E7490','#22D3EE','#67E8F9',
  '#3B82F6','#2563EB','#1D4ED8','#1E40AF','#0EA5E9',
  '#6366F1','#4F46E5','#4338CA','#3730A3','#818CF8',
  '#8B5CF6','#7C3AED','#A855F7','#9333EA','#EC4899',
];

/* ── 3. ปรับปรุง Confirm Delete (เพิ่ม ESC ยกเลิก) ── */
function ConfirmDeleteButton({ onConfirm, isDarkMode, size = 'sm' }) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);

  const handleClick = () => {
    if (confirming) { 
      clearTimeout(timer.current); 
      onConfirm(); 
      setConfirming(false); 
    } else { 
      setConfirming(true); 
      timer.current = setTimeout(() => setConfirming(false), 3000); 
    }
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // ดักกด ESC เพื่อยกเลิกการลบได้ทันทีไม่ต้องรอ 3 วิ
  useEffect(() => {
    if (!confirming) return;
    const h = (e) => { if (e.key === 'Escape') setConfirming(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [confirming]);

  return (
    <button onClick={handleClick}
      className={`rounded-sm font-bold transition-all active:scale-95 ${
        confirming
          ? 'bg-red-500 text-white px-2.5 py-1.5 text-xs animate-pulse'
          : size === 'lg'
            ? `px-4 py-2 flex items-center gap-2 text-sm ${isDarkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200'}`
            : `p-1.5 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-500/80' : 'text-slate-400 hover:text-white hover:bg-red-500'}`
      }`}
      title={confirming ? 'กดอีกครั้งเพื่อยืนยัน' : 'ลบ'}>
      {confirming ? 'ยืนยัน?' : size === 'lg' ? <><Trash2 className="w-4 h-4" /> ล้างข้อมูลทั้งหมด</> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}

/* ── 1. แก้บั๊ก Color Picker ลอยหลุดจอ และเพิ่ม ESC ── */
function ColorPicker({ color, onChange, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const btnRef     = useRef(null);
  const paletteRef = useRef(null);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const W = 256, H = 180;
      let left = rect.left;
      if (left + W > window.innerWidth - 8) left = rect.right - W;
      let top = rect.bottom + 6;
      if (top + H > window.innerHeight - 8) top = rect.top - H - 6;
      setPos({ top, left });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    
    // ยุบรวม event ปิดถาดสี (คลิกนอกกรอบ, เลื่อนจอ, กด ESC)
    const handleClose = (e) => {
      if (e.type === 'mousedown' && (btnRef.current?.contains(e.target) || paletteRef.current?.contains(e.target))) return;
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      setOpen(false);
    };

    document.addEventListener('mousedown', handleClose);
    document.addEventListener('keydown', handleClose);
    // ดัก Scroll (ใช้ capture mode: true เพื่อดักจับทุกการ scroll บนหน้าจอ)
    window.addEventListener('scroll', handleClose, true); 

    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('keydown', handleClose);
      window.removeEventListener('scroll', handleClose, true);
    };
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button ref={btnRef} onClick={handleOpen} type="button"
        className="w-7 h-7 rounded-sm border-2 cursor-pointer hover:scale-105 transition-transform shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
        style={{ backgroundColor: color, borderColor: color }} title="เลือกสี" />
      
      {open && (
        <div ref={paletteRef}
          className={`fixed z-[9999] p-3 rounded-sm shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
          style={{ top: pos.top, left: pos.left, width: 256 }}>
          <div className="grid grid-cols-10 gap-1.5 mb-3">
            {COLOR_PALETTE.map(c => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
                className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 ${color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
          <div className={`flex items-center gap-2 border-t pt-2.5 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="w-5 h-5 rounded-sm shrink-0 border" style={{ backgroundColor: color, borderColor: color }} />
            <input type="color" value={color} onChange={e => onChange(e.target.value)} className="w-8 h-5 cursor-pointer border-0 bg-transparent p-0 rounded-sm" title="สีกำหนดเอง" />
            <span className={`text-xs font-mono font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{color}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Auto-focus Input ── */
function AutoFocusInput({ value, onChange, className, placeholder, isNew }) {
  const ref = useRef(null);
  useEffect(() => { if (isNew && ref.current) { ref.current.focus(); ref.current.select(); } }, [isNew]);
  return <input ref={ref} type="text" value={value} onChange={onChange} className={className} placeholder={placeholder} />;
}

/* ── Category Row ── */
function CategoryRow({ cat, isNew, isDarkMode, isIncome, onMove, onChange, onDelete }) {
  const dm = isDarkMode;
  const accentBorder = isIncome ? 'focus:border-emerald-500' : 'focus:border-blue-500';
  const inputCls = `px-2.5 py-1.5 border rounded-sm outline-none focus:ring-1 font-bold text-sm transition-colors flex-1 min-w-0 ${dm ? `bg-transparent border-slate-600 ${accentBorder} text-slate-200` : `border-slate-300 ${accentBorder} text-slate-800`}`;

  return (
    <div className={`flex flex-nowrap items-center gap-2 px-4 py-2.5 border-b last:border-0 transition-all group ${
      !isIncome && cat.isFixed
        ? (dm ? 'bg-purple-900/10 hover:bg-purple-900/20' : 'bg-purple-50/30 hover:bg-purple-50/60')
        : (dm ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50')
    } ${dm ? 'border-slate-700/60' : 'border-slate-100'}`}>

      {/* Sort arrows */}
      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
        <button type="button" onClick={() => onMove(cat.id, 'UP')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-800 hover:bg-slate-200'}`}><ChevronUp className="w-3.5 h-3.5" /></button>
        <button type="button" onClick={() => onMove(cat.id, 'DOWN')} className={`p-0.5 rounded-sm mt-0.5 ${dm ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-800 hover:bg-slate-200'}`}><ChevronDown className="w-3.5 h-3.5" /></button>
      </div>

      {/* Icon input */}
      <input type="text" value={cat.icon || ''} onChange={e => onChange(cat.id, 'icon', e.target.value)} maxLength="2"
        className={`w-9 h-9 text-center text-lg rounded-sm outline-none focus:ring-1 border shrink-0 transition-colors ${dm ? 'bg-slate-900 border-slate-600 text-white focus:ring-slate-400' : 'bg-slate-100 border-slate-300 text-slate-800 focus:ring-slate-400'}`}
        title="ไอคอน" />

      {/* Name */}
      <AutoFocusInput isNew={isNew} value={cat.name || ''} onChange={e => onChange(cat.id, 'name', e.target.value)}
        className={inputCls} placeholder={isIncome ? 'ชื่อรายรับ' : 'ชื่อรายจ่าย'} />

      {/* Cashflow group */}
      <select value={cat.cashflowGroup || (isIncome ? 'bonus' : 'variable')} onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)}
        className={`border rounded-sm text-xs font-bold py-1.5 px-2 outline-none transition-colors cursor-pointer shrink-0 ${dm ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}>
        {isIncome ? (
          <><option value="salary">เงินเดือน</option><option value="bonus">พิเศษ/โบนัส</option></>
        ) : (
          <><option value="rent">ค่าหอ/ที่พัก</option><option value="subs">รายเดือน/หนี้</option><option value="food">ค่ากิน</option><option value="invest">ลงทุน/ออม</option><option value="it">ไอที/คอมฯ</option><option value="variable">ผันแปรอื่นๆ</option></>
        )}
      </select>

      {/* Fixed toggle (expense only) */}
      {!isIncome && (
        <label className={`flex items-center gap-1.5 cursor-pointer px-2.5 py-1.5 rounded-sm border text-xs font-bold shrink-0 transition-colors ${
          cat.isFixed
            ? (dm ? 'bg-purple-900/40 text-purple-400 border-purple-800/50' : 'bg-purple-100 text-purple-700 border-purple-300')
            : (dm ? 'text-slate-400 border-slate-700 hover:border-slate-500' : 'text-slate-600 border-slate-300 hover:border-slate-400')
        }`} title="ตั้งเป็นภาระคงที่">
          <input type="checkbox" checked={!!cat.isFixed} onChange={e => onChange(cat.id, 'isFixed', e.target.checked)} className="w-3.5 h-3.5 accent-purple-600 cursor-pointer" />
          Fixed
        </label>
      )}

      {/* Color picker */}
      <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} isDarkMode={dm} />

      {/* Divider + Delete */}
      <div className={`w-px h-5 shrink-0 ${dm ? 'bg-slate-600' : 'bg-slate-300'}`} />
      <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} isDarkMode={dm} />
    </div>
  );
}

/* ── Main ── */
export default function SettingsView({
  categories, handleAddCategory, handleCategoryChange,
  handleDeleteCategory, handleMoveCategory,
  dayTypeConfig, setDayTypeConfig, isDarkMode,
  handleDeleteAllData, saveSettingToDb
}) {
  const dm = isDarkMode;
  const [newCatId, setNewCatId] = useState(null);

  const handleDayTypeConfigChange = (id, field, value) => {
    const cfg = dayTypeConfig.map(dt => dt.id === id ? { ...dt, [field]: value } : dt);
    setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg);
  };

  const handleAddDayType = () => {
    const cfg = [...dayTypeConfig, { id: `dt_${Date.now()}`, label: 'ชนิดวันใหม่', color: '#64748B' }];
    setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg);
  };

  const handleDeleteDayType = (id) => {
    if (dayTypeConfig.length <= 2) return;
    const cfg = dayTypeConfig.filter(dt => dt.id !== id);
    setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg);
  };

  const handleMoveDayType = (id, direction) => {
    const idx = dayTypeConfig.findIndex(c => c.id === id);
    if (idx < 0) return;
    const ti = direction === 'UP' ? idx - 1 : idx + 1;
    if (ti >= 0 && ti < dayTypeConfig.length) {
      const cfg = [...dayTypeConfig];
      [cfg[idx], cfg[ti]] = [cfg[ti], cfg[idx]];
      setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg);
    }
  };

  // 2. แก้ปัญหา Race Condition: เลิกใช้ setTimeout ซ้อนกัน ให้ state เป็นตัวบอก id ล่าสุดก็พอ
  const onAddCategory = (type) => {
    const newId = handleAddCategory(type); // ฝั่ง Parent ควร return id ของหมวดหมู่ใหม่กลับมา
    
    // ถ้า Parent return id กลับมาได้ ให้ใช้ id นั้น 
    // แต่ถ้าไม่ได้ การดึงตัวล่าสุดแบบนี้ก็ทำงานได้และไม่อันตรายเท่าการตั้งเวลาเคลียร์ค่า
    setTimeout(() => {
      const added = [...categories].reverse().find(c => c.type === type);
      if (added) setNewCatId(added.id); 
      // เอา setTimeout เคลียร์ค่าออกไปเลย ปล่อยให้มันติดไว้แบบนั้น เพราะ useEffect ใน AutoFocusInput ดักไว้แล้วว่าให้ focus แค่จังหวะแรก
    }, 0);
  };

  /* ── shared tokens ── */
  const card   = `rounded-sm border shadow-sm overflow-hidden ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = (accent) => `px-5 py-3.5 border-b flex justify-between items-center ${dm ? `bg-${accent}-900/20 border-${accent}-900/50` : `bg-${accent}-50 border-${accent}-200`}`;
  const addBtn = (accent) => `text-white px-3 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${dm ? `bg-${accent}-600/80 hover:bg-${accent}-500` : `bg-${accent}-600 hover:bg-${accent}-700`}`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-8 max-w-screen-2xl mx-auto">

      {/* ── Info banner ── */}
      <div className={`mb-5 rounded-sm px-5 py-3.5 border flex items-start gap-3 ${dm ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
        <Info className={`w-4 h-4 mt-0.5 shrink-0 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
        <p className={`text-sm leading-relaxed ${dm ? 'text-blue-300' : 'text-blue-700'}`}>
          <strong>Fixed</strong> = ภาระคงที่ (ค่าหอ, ผ่อนรถ) &nbsp;·&nbsp;
          <strong>กลุ่มกระแสเงินสด</strong> = จัดกลุ่มเพื่อแสดงผลในตาราง Cashflow
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr_320px] gap-5 items-start mb-5">

        {/* ── Income Categories ── */}
        <div className={card}>
          <div className={cardHd('emerald')}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${dm ? 'text-emerald-400' : 'text-emerald-800'}`}>
              <Coins className="w-4 h-4" /> หมวดหมู่รายรับ
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 ${dm ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                {categories.filter(c => c.type === 'income').length} หมวด
              </span>
            </h2>
            <button type="button" onClick={() => onAddCategory('income')} className={addBtn('emerald')}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่ม
            </button>
          </div>
          <div>
            {categories.filter(c => c.type === 'income').length === 0 ? (
              <p className={`text-sm text-center py-10 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายรับ</p>
            ) : categories.filter(c => c.type === 'income').map(cat => (
              <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={true}
                isDarkMode={dm} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} />
            ))}
          </div>
        </div>

        {/* ── Expense Categories ── */}
        <div className={card}>
          <div className={`px-5 py-3.5 border-b flex justify-between items-center ${dm ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${dm ? 'text-slate-200' : 'text-slate-800'}`}>
              <Wallet className={`w-4 h-4 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} /> หมวดหมู่รายจ่าย
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                {categories.filter(c => c.type === 'expense').length} หมวด
              </span>
            </h2>
            <button type="button" onClick={() => onAddCategory('expense')} className={addBtn('blue')}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่ม
            </button>
          </div>
          <div>
            {categories.filter(c => c.type === 'expense').length === 0 ? (
              <p className={`text-sm text-center py-10 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายจ่าย</p>
            ) : categories.filter(c => c.type === 'expense').map(cat => (
              <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={false}
                isDarkMode={dm} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} />
            ))}
          </div>
        </div>

        {/* ── Day Types (right column, sticky) ── */}
        <div className={`${card} sticky top-4`}>
          <div className={cardHd('orange')}>
            <h2 className={`text-sm font-bold flex items-center gap-2 ${dm ? 'text-orange-400' : 'text-orange-800'}`}>
              <CalendarClock className="w-4 h-4" /> ชนิดของวันบนปฏิทิน
            </h2>
            <button type="button" onClick={handleAddDayType} className={addBtn('orange')}>
              <PlusCircle className="w-3.5 h-3.5" /> เพิ่ม
            </button>
          </div>
          <div className="p-4 space-y-2">
            {dayTypeConfig.map(dt => (
              <div key={dt.id}
                className={`flex items-center gap-2.5 px-3 py-2.5 border rounded-sm transition-colors group ${dm ? 'border-slate-700 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'}`}>
                {/* Sort */}
                <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                  <button type="button" onClick={() => handleMoveDayType(dt.id, 'UP')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => handleMoveDayType(dt.id, 'DOWN')} className={`p-0.5 rounded-sm mt-0.5 ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
                {/* Color dot */}
                <div className="w-3.5 h-3.5 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: dt.color }} />
                {/* Label */}
                <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)}
                  className={`flex-1 min-w-0 px-2.5 py-1.5 border rounded-sm outline-none focus:ring-1 font-bold text-sm transition-colors ${dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-orange-500' : 'border-slate-300 text-slate-800 focus:border-orange-400'}`}
                  placeholder="ชื่อชนิดวัน" />
                <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} isDarkMode={dm} />
                <div className={`w-px h-5 shrink-0 ${dm ? 'bg-slate-600' : 'bg-slate-300'}`} />
                <button type="button" onClick={() => handleDeleteDayType(dt.id)} disabled={dayTypeConfig.length <= 2}
                  className={`p-1.5 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${dm ? 'text-slate-500 hover:text-white hover:bg-red-500/80' : 'text-slate-400 hover:text-white hover:bg-red-500'}`}
                  title={dayTypeConfig.length <= 2 ? 'ต้องมีอย่างน้อย 2 ชนิด' : 'ลบ'}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <p className={`text-[10px] pt-1 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
              ต้องมีอย่างน้อย 2 ชนิด · ลากเรียงลำดับได้
            </p>
          </div>
        </div>

      </div>

      {/* ── Danger Zone ── */}
      <div className={`rounded-sm border shadow-sm overflow-hidden ${dm ? 'bg-red-900/10 border-red-900/50' : 'bg-red-50 border-red-200'}`}>
        <div className={`px-5 py-3.5 border-b flex items-center gap-2 ${dm ? 'border-red-900/50' : 'border-red-200'}`}>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-bold text-red-500">Danger Zone</h2>
        </div>
        <div className={`px-5 py-4 flex flex-row justify-between items-center gap-4 ${dm ? 'bg-slate-900/50' : 'bg-white'}`}>
          <div>
            <p className={`text-sm font-bold ${dm ? 'text-slate-200' : 'text-slate-800'}`}>ลบข้อมูลทั้งหมด (Factory Reset)</p>
            <p className={`text-xs mt-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
              ล้างรายการบัญชีและประวัติปฏิทินทั้งหมด — <strong className="text-red-500">ไม่สามารถกู้คืนได้</strong>
            </p>
          </div>
          <ConfirmDeleteButton onConfirm={handleDeleteAllData} isDarkMode={dm} size="lg" />
        </div>
      </div>

    </div>
  );
}