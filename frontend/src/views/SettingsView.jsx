// src/views/SettingsView.jsx
import { useState, useEffect, useRef } from 'react';
import {
  PlusCircle, Trash2, Coins, CalendarClock, AlertCircle,
  Settings, ChevronUp, ChevronDown, Wallet, X
} from 'lucide-react';
import { DAY_TYPE_CONFIG_KEY } from '../constants';

const COLOR_PALETTE = [
  // ── แดง ──────────────────────────────
  '#FF0000','#EF4444','#DC2626','#B91C1C','#7F1D1D',
  // ── ส้ม-แดง ──────────────────────────
  '#F97316','#EA580C','#C2410C','#F43F5E','#E11D48',
  // ── ส้ม-เหลือง ───────────────────────
  '#FB923C','#FBBF24','#F59E0B','#D97706','#B45309',
  // ── เหลือง-เขียว ─────────────────────
  '#EAB308','#CA8A04','#A3E635','#84CC16','#65A30D',
  // ── เขียว ────────────────────────────
  '#22C55E','#16A34A','#15803D','#166534','#10B981',
  // ── เขียว-ฟ้า (Teal) ─────────────────
  '#059669','#047857','#14B8A6','#0D9488','#0F766E',
  // ── ฟ้าอ่อน (Cyan) ───────────────────
  '#06B6D4','#0891B2','#0E7490','#22D3EE','#67E8F9',
  // ── น้ำเงิน ──────────────────────────
  '#3B82F6','#2563EB','#1D4ED8','#1E40AF','#0EA5E9',
  // ── ม่วง-น้ำเงิน (Indigo) ────────────
  '#6366F1','#4F46E5','#4338CA','#3730A3','#818CF8',
  // ── ม่วง-ชมพู ────────────────────────
  '#8B5CF6','#7C3AED','#A855F7','#9333EA','#EC4899',
];

// ── Inline Confirm Button ──────────────────────────────────────────────────
function ConfirmDeleteButton({ onConfirm, isDarkMode, size = 'sm' }) {
  const [confirming, setConfirming] = useState(false);
  const timerRef = useRef(null);

  const handleClick = () => {
    if (confirming) {
      clearTimeout(timerRef.current);
      onConfirm();
      setConfirming(false);
    } else {
      setConfirming(true);
      timerRef.current = setTimeout(() => setConfirming(false), 3000);
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      onClick={handleClick}
      className={`rounded-sm font-bold transition-all active:scale-95 ${
        confirming
          ? 'bg-red-500 text-white px-3 py-1.5 text-sm animate-pulse'
          : size === 'lg'
            ? `px-5 py-2.5 flex items-center gap-2 text-base ${isDarkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200'}`
            : `p-2 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-500/80' : 'text-slate-400 hover:text-white hover:bg-red-500'}`
      }`}
      title={confirming ? 'กดอีกครั้งเพื่อยืนยัน' : 'ลบ'}
    >
      {confirming
        ? 'ยืนยัน?'
        : size === 'lg'
          ? <><Trash2 className="w-5 h-5" /> ล้างข้อมูลทั้งหมด</>
          : <Trash2 className="w-4 h-4" />
      }
    </button>
  );
}

// ── Color Picker with Palette ─────────────────────────────────────────────
function ColorPicker({ color, onChange, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const paletteRef = useRef(null);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const paletteW = 256; // กว้างขึ้นนิดหน่อย
      const paletteH = 180;
      let left = rect.left;
      if (left + paletteW > window.innerWidth - 8) left = rect.right - paletteW;
      let top = rect.bottom + 6;
      if (top + paletteH > window.innerHeight - 8) top = rect.top - paletteH - 6;
      setPos({ top, left });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const inBtn     = btnRef.current?.contains(e.target);
      const inPalette = paletteRef.current?.contains(e.target);
      if (!inBtn && !inPalette) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="w-8 h-8 rounded-sm border-2 cursor-pointer hover:scale-105 transition-transform shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
        style={{ backgroundColor: color, borderColor: color }}
        title="เลือกสี"
      />
      {open && (
        <div
          ref={paletteRef}
          className={`fixed z-[9999] p-3 rounded-sm shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
          style={{ top: pos.top, left: pos.left, width: '256px' }}
        >
          <div className="grid grid-cols-10 gap-1.5 mb-3">
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 ${color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className={`flex items-center gap-2 border-t pt-3 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="w-6 h-6 rounded-sm shrink-0 border" style={{ backgroundColor: color, borderColor: color }} />
            <input
              type="color"
              value={color}
              onChange={e => onChange(e.target.value)}
              className="w-8 h-6 cursor-pointer border-0 bg-transparent p-0 rounded-sm"
              title="สีกำหนดเอง"
            />
            <span className={`text-xs font-mono font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{color}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Auto-focus input ─────────────────────────────────────────────────────
function AutoFocusInput({ value, onChange, className, placeholder, isNew }) {
  const ref = useRef(null);
  useEffect(() => {
    if (isNew && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [isNew]);
  return (
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
    />
  );
}

// ── Category Row ───────────────────────────────────────────────────────────
function CategoryRow({ cat, isNew, isDarkMode, isIncome, onMove, onChange, onDelete }) {
  const inputClass = (color) =>
    `w-full px-3 py-2 border rounded-sm outline-none focus:ring-1 font-bold text-base transition-colors ${
      isDarkMode
        ? `bg-transparent border-slate-600 focus:border-${color}-500 text-${color}-400`
        : `border-slate-300 focus:border-${color}-500 text-slate-800`
    }`;

  const accentColor = isIncome ? 'emerald' : 'blue';

  return (
    <div className={`flex flex-nowrap items-center gap-3 px-4 py-3 border-b last:border-0 transition-all duration-200 group ${
      !isIncome && cat.isFixed
        ? (isDarkMode ? 'bg-purple-900/10 hover:bg-purple-900/20' : 'bg-purple-50/30 hover:bg-purple-50/60')
        : (isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50')
    } ${isDarkMode ? 'border-slate-700/60' : 'border-slate-100'}`}>

      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        <button onClick={() => onMove(cat.id, 'UP')} className={`p-0.5 rounded-sm transition-colors ${isDarkMode ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-800 hover:bg-slate-200'}`}>
          <ChevronUp className="w-4 h-4" />
        </button>
        <button onClick={() => onMove(cat.id, 'DOWN')} className={`p-0.5 rounded-sm transition-colors mt-1 ${isDarkMode ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-800 hover:bg-slate-200'}`}>
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
        <input
          type="text"
          value={cat.icon || ''}
          onChange={e => onChange(cat.id, 'icon', e.target.value)}
          maxLength="2"
          className={`w-10 h-10 text-center text-xl rounded-sm outline-none focus:ring-1 border shrink-0 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-600 text-white focus:ring-slate-400' : 'bg-slate-100 border-slate-300 text-slate-800 focus:ring-slate-400'  
          }`}
          title="ไอคอน"
        />
        <AutoFocusInput
          isNew={isNew}
          value={cat.name || ''}
          onChange={e => onChange(cat.id, 'name', e.target.value)}
          className={`${inputClass(accentColor)} flex-1 min-w-0`}
          placeholder={isIncome ? 'ชื่อรายรับ' : 'ชื่อรายจ่าย'}
        />
      </div>

      <div className="flex items-center gap-3 shrink-0 flex-wrap">
        <select
          value={cat.cashflowGroup || (isIncome ? 'bonus' : 'variable')}
          onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)}
          className={`border rounded-sm text-sm font-bold py-2 px-3 outline-none transition-colors cursor-pointer ${
            isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
          }`}
        >
          {isIncome ? (
            <>
              <option value="salary">เงินเดือน</option>
              <option value="bonus">พิเศษ/โบนัส</option>
            </>
          ) : (
            <>
              <option value="rent">ค่าหอ/ที่พัก</option>
              <option value="subs">รายเดือน/หนี้</option>
              <option value="food">ค่ากิน</option>
              <option value="invest">ลงทุน/ออม</option>
              <option value="it">ไอที/คอมฯ</option>
              <option value="variable">ผันแปรอื่นๆ</option>
            </>
          )}
        </select>

        {!isIncome && (
          <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-sm transition-colors border text-sm font-bold ${
              cat.isFixed
                ? (isDarkMode ? 'bg-purple-900/40 text-purple-400 border-purple-800/50' : 'bg-purple-100 text-purple-700 border-purple-300')
                : (isDarkMode ? 'text-slate-400 border-slate-700 hover:border-slate-500 hover:bg-slate-800' : 'text-slate-600 border-slate-300 hover:border-slate-400 hover:bg-slate-50')
            }`} title="ตั้งเป็นภาระคงที่">
            <input type="checkbox" checked={!!cat.isFixed} onChange={e => onChange(cat.id, 'isFixed', e.target.checked)} className="w-4 h-4 accent-purple-600 cursor-pointer rounded-sm" />
            Fixed
          </label>
        )}

        <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} isDarkMode={isDarkMode} />
        <div className={`w-px h-6 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
        <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SettingsView({
  categories, handleAddCategory, handleCategoryChange,
  handleDeleteCategory, handleMoveCategory,
  dayTypeConfig, setDayTypeConfig, isDarkMode,
  handleDeleteAllData, saveSettingToDb
}) {
  const [newCatId, setNewCatId] = useState(null);

  const handleDayTypeConfigChange = (id, field, value) => {
    const newConfig = dayTypeConfig.map(dt =>
      dt.id === id ? { ...dt, [field]: value } : dt
    );
    setDayTypeConfig(newConfig);
    saveSettingToDb(DAY_TYPE_CONFIG_KEY, newConfig);
  };

  const handleAddDayType = () => {
    const newConfig = [
      ...dayTypeConfig,
      { id: `dt_${Date.now()}`, label: 'ชนิดวันใหม่', color: '#64748B' },
    ];
    setDayTypeConfig(newConfig);
    saveSettingToDb(DAY_TYPE_CONFIG_KEY, newConfig);
  };

  const handleDeleteDayType = (id) => {
    if (dayTypeConfig.length <= 2) return;
    const newConfig = dayTypeConfig.filter(dt => dt.id !== id);
    setDayTypeConfig(newConfig);
    saveSettingToDb(DAY_TYPE_CONFIG_KEY, newConfig);
  };

  const handleMoveDayType = (id, direction) => {
    const index = dayTypeConfig.findIndex(c => c.id === id);
    if (index < 0) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < dayTypeConfig.length) {
      const newConfig = [...dayTypeConfig];
      [newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]];
      setDayTypeConfig(newConfig);
      saveSettingToDb(DAY_TYPE_CONFIG_KEY, newConfig);
    }
  };

  const onAddCategory = (type) => {
    handleAddCategory(type);
    setTimeout(() => {
      const added = [...categories].reverse().find(c => c.type === type);
      if (added) setNewCatId(added.id);
      setTimeout(() => setNewCatId(null), 1000);
    }, 50);
  };

  const surface    = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const border     = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textMuted  = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const sectionHd  = (color) => isDarkMode ? `bg-${color}-900/20 border-${color}-900/50` : `bg-${color}-50 border-${color}-200`;

  return (
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full py-4 space-y-8 max-w-screen-2xl mx-auto">

      <div className={`rounded-sm px-6 py-4 border shadow-sm ${isDarkMode ? 'bg-blue-900/20 border-blue-800/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-[#00509E]'}`}>
        <p className="text-base font-bold flex items-center gap-2 mb-2">
          <Settings className="w-5 h-5" /> วิธีตั้งค่ากลุ่มกระแสเงินสด
        </p>
        <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
          <strong>Fixed</strong> = ภาระคงที่ (ค่าหอ, ผ่อนรถ) &nbsp;·&nbsp;
          <strong>กลุ่มกระแสเงินสด</strong> = จัดกลุ่มเพื่อแสดงผลในตาราง Cashflow
        </p>
      </div>

      <div className="grid grid-cols-[3fr_2fr] gap-8 items-start">

        {/* LEFT: Categories */}
        <div className="space-y-8">
          {/* ── Income Categories ── */}
          <div className={`${surface} rounded-sm border ${border} overflow-hidden shadow-sm`}>
            <div className={`px-5 py-4 border-b flex justify-between items-center ${sectionHd('emerald')}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                <Coins className="w-5 h-5" /> หมวดหมู่รายรับ
              </h2>
              <button onClick={() => onAddCategory('income')} className={`text-white px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'bg-emerald-600/80 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}>     
                <PlusCircle className="w-4 h-4" /> เพิ่มรายรับ
              </button>
            </div>
            <div>
              {categories.filter(c => c.type === 'income').length === 0 ? (
                <p className={`text-base text-center py-10 ${textMuted}`}>ยังไม่มีหมวดหมู่รายรับ</p>
              ) : (
                categories.filter(c => c.type === 'income').map(cat => (
                  <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={true} isDarkMode={isDarkMode} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} />
                ))
              )}
            </div>
          </div>

          {/* ── Expense Categories ── */}
          <div className={`${surface} rounded-sm border ${border} overflow-hidden shadow-sm`}>
            <div className={`px-5 py-4 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <Wallet className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} /> หมวดหมู่รายจ่าย
              </h2>
              <button onClick={() => onAddCategory('expense')} className={`text-white px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'bg-blue-600/80 hover:bg-blue-500' : 'bg-[#00509E] hover:bg-[#003d7a]'}`}>
                <PlusCircle className="w-4 h-4" /> เพิ่มรายจ่าย
              </button>
            </div>
            <div>
              {categories.filter(c => c.type === 'expense').length === 0 ? (
                <p className={`text-base text-center py-10 ${textMuted}`}>ยังไม่มีหมวดหมู่รายจ่าย</p>
              ) : (
                categories.filter(c => c.type === 'expense').map(cat => (
                  <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={false} isDarkMode={isDarkMode} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Day Types */}
        <div className="space-y-8">
          {/* ── Day Types ── */}
          <div className={`${surface} rounded-sm border ${border} overflow-hidden shadow-sm`}>
            <div className={`px-5 py-4 border-b flex justify-between items-center ${sectionHd('orange')}`}>
              <h2 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-orange-400' : 'text-orange-800'}`}>
                <CalendarClock className="w-5 h-5" /> ชนิดของวันบนปฏิทิน
              </h2>
              <button onClick={handleAddDayType} className={`text-white px-4 py-2 rounded-sm font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'bg-orange-600/80 hover:bg-orange-500' : 'bg-orange-600 hover:bg-orange-700'}`}>
                <PlusCircle className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
            <div className="p-4 space-y-3">
              {dayTypeConfig.map(dt => (
                <div key={dt.id} className={`flex items-center gap-3 px-4 py-3 border rounded-sm transition-colors group ${isDarkMode ? 'border-slate-700 hover:bg-slate-800/60' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    <button onClick={() => handleMoveDayType(dt.id, 'UP')} className={`p-0.5 rounded-sm ${isDarkMode ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}><ChevronUp className="w-4 h-4" /></button>
                    <button onClick={() => handleMoveDayType(dt.id, 'DOWN')} className={`p-0.5 rounded-sm mt-1 ${isDarkMode ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}><ChevronDown className="w-4 h-4" /></button>
                  </div>
                  <div className="w-4 h-4 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: dt.color }} />
                  <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)} className={`flex-1 min-w-0 px-3 py-2 border rounded-sm outline-none focus:ring-1 font-bold text-base transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-orange-500' : 'border-slate-300 text-slate-800 focus:border-orange-400'}`} placeholder="ชื่อชนิดวัน" />
                  <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} isDarkMode={isDarkMode} />
                  <div className={`w-px h-6 shrink-0 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`} />
                  <button onClick={() => handleDeleteDayType(dt.id)} disabled={dayTypeConfig.length <= 2} className={`p-2 rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-500/80' : 'text-slate-400 hover:text-white hover:bg-red-500'}`} title={dayTypeConfig.length <= 2 ? 'ต้องมีอย่างน้อย 2 ชนิด' : 'ลบ'}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`rounded-sm border shadow-sm overflow-hidden ${isDarkMode ? 'bg-red-900/10 border-red-900/50' : 'bg-red-50 border-red-200'}`}>
        <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDarkMode ? 'border-red-900/50' : 'border-red-200'}`}>
          <AlertCircle className="w-6 h-6 text-red-500" />
          <h2 className="text-lg font-bold text-red-500">Danger Zone</h2>
        </div>
        <div className={`p-5 flex flex-row justify-between items-center gap-4 ${isDarkMode ? 'bg-slate-900/50' : 'bg-white'}`}>      
          <div>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>ลบข้อมูลทั้งหมด (Factory Reset)</p>
            <p className={`text-base mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              ล้างรายการบัญชีและประวัติปฏิทินทั้งหมด — <strong className="text-red-500">ไม่สามารถกู้คืนได้</strong>
            </p>
          </div>
          <ConfirmDeleteButton onConfirm={handleDeleteAllData} isDarkMode={isDarkMode} size="lg" />
        </div>
      </div>

    </div>
  );
}