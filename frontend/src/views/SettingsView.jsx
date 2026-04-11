// src/views/SettingsView.jsx
import { useState, useEffect, useRef } from 'react';
import { PlusCircle, Trash2, Coins, CalendarClock, AlertCircle, ChevronUp, ChevronDown, Wallet, Info, Grid, Settings2 } from 'lucide-react';
import { DAY_TYPE_CONFIG_KEY, CASHFLOW_GROUPS_KEY } from '../constants';

const COLOR_PALETTE = [
  '#FF0000','#EF4444','#DC2626','#B91C1C','#7F1D1D','#F97316','#EA580C','#C2410C','#F43F5E','#E11D48',
  '#FB923C','#FBBF24','#F59E0B','#D97706','#B45309','#EAB308','#CA8A04','#A3E635','#84CC16','#65A30D',
  '#22C55E','#16A34A','#15803D','#166534','#10B981','#059669','#047857','#14B8A6','#0D9488','#0F766E',
  '#06B6D4','#0891B2','#0E7490','#22D3EE','#67E8F9','#3B82F6','#2563EB','#1D4ED8','#1E40AF','#0EA5E9',
  '#6366F1','#4F46E5','#4338CA','#3730A3','#818CF8','#8B5CF6','#7C3AED','#A855F7','#9333EA','#EC4899',
];

function ConfirmDeleteButton({ onConfirm, isDarkMode, size = 'sm', disabled = false, tooltip = 'ลบ' }) {
  const [confirming, setConfirming] = useState(false);
  const timer = useRef(null);
  const handleClick = () => {
    if (disabled) return;
    if (confirming) { clearTimeout(timer.current); onConfirm(); setConfirming(false); } 
    else { setConfirming(true); timer.current = setTimeout(() => setConfirming(false), 3000); }
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!confirming) return;
    const h = (e) => { if (e.key === 'Escape') setConfirming(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [confirming]);
  return (
    <button onClick={handleClick} disabled={disabled}
      className={`rounded-sm font-bold transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
        confirming ? 'bg-red-500 text-white px-2 py-1 text-xs animate-pulse' : size === 'lg'
            ? `px-3 py-1.5 flex items-center gap-1.5 text-sm ${isDarkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200'}`
            : `p-1 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-500/80' : 'text-slate-400 hover:text-white hover:bg-red-500'}`
      }`} title={disabled ? tooltip : (confirming ? 'ยืนยัน?' : tooltip)}>
      {confirming ? 'ยืนยัน?' : size === 'lg' ? <><Trash2 className="w-3.5 h-3.5" /> ล้างข้อมูลทั้งหมด</> : <Trash2 className="w-3.5 h-3.5" />}
    </button>
  );
}

function ColorPicker({ color, onChange, isDarkMode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const paletteRef = useRef(null);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const W = 256, H = 180;
      let left = rect.left; if (left + W > window.innerWidth - 8) left = rect.right - W;
      let top = rect.bottom + 4; if (top + H > window.innerHeight - 8) top = rect.top - H - 4;
      setPos({ top, left });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleClose = (e) => {
      if (e.type === 'mousedown' && (btnRef.current?.contains(e.target) || paletteRef.current?.contains(e.target))) return;
      if (e.type === 'keydown' && e.key !== 'Escape') return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handleClose); document.addEventListener('keydown', handleClose); window.addEventListener('scroll', handleClose, true); 
    return () => { document.removeEventListener('mousedown', handleClose); document.removeEventListener('keydown', handleClose); window.removeEventListener('scroll', handleClose, true); };
  }, [open]);

  return (
    <div className="relative shrink-0 flex items-center">
      <button ref={btnRef} onClick={handleOpen} type="button" className="w-5 h-5 rounded-sm border cursor-pointer hover:scale-110 transition-transform shadow-sm outline-none" style={{ backgroundColor: color, borderColor: color }} title="เลือกสี" />
      {open && (
        <div ref={paletteRef} className={`fixed z-[9999] p-2.5 rounded-sm shadow-xl border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`} style={{ top: pos.top, left: pos.left, width: 256 }}>
          <div className="grid grid-cols-10 gap-1 mb-2.5">
            {COLOR_PALETTE.map(c => (<button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }} className={`w-4 h-4 rounded-sm transition-transform hover:scale-125 ${color === c ? 'ring-1 ring-offset-1 ring-slate-400 scale-125' : ''}`} style={{ backgroundColor: c }} title={c} />))}
          </div>
          <div className={`flex items-center gap-2 border-t pt-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <input type="color" value={color} onChange={e => onChange(e.target.value)} className="w-6 h-5 cursor-pointer border-0 bg-transparent p-0 rounded-sm" title="สีกำหนดเอง" />
            <span className={`text-[11px] font-mono font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{color}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function AutoFocusInput({ value, onChange, className, placeholder, isNew }) {
  const ref = useRef(null);
  useEffect(() => { if (isNew && ref.current) { ref.current.focus(); ref.current.select(); } }, [isNew]);
  return <input ref={ref} type="text" value={value} onChange={onChange} className={className} placeholder={placeholder} />;
}

function CategoryRow({ cat, isNew, isDarkMode, isIncome, onMove, onChange, onDelete, cashflowGroups = [] }) {
  const dm = isDarkMode;
  const accentBorder = isIncome ? 'focus:border-emerald-500' : 'focus:border-blue-500';
  const inputCls = `px-2 py-1 border rounded-sm outline-none focus:ring-1 font-bold text-[13px] transition-colors flex-1 min-w-0 ${dm ? `bg-transparent border-slate-600 ${accentBorder} text-slate-200` : `border-slate-300 ${accentBorder} text-slate-800`}`;

  return (
    <div className={`flex flex-nowrap items-center gap-2 px-3 py-1.5 border-b last:border-0 transition-colors group/cat ${!isIncome && cat.isFixed ? (dm ? 'bg-purple-900/10 hover:bg-purple-900/20' : 'bg-purple-50/30 hover:bg-purple-50/60') : (dm ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50')} ${dm ? 'border-slate-700/60' : 'border-slate-100'}`}>
      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cat:opacity-100 transition-opacity ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
        <button type="button" onClick={() => onMove(cat.id, 'UP')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-800 hover:bg-slate-200'}`}><ChevronUp className="w-3 h-3" /></button>
        <button type="button" onClick={() => onMove(cat.id, 'DOWN')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-800 hover:bg-slate-200'}`}><ChevronDown className="w-3 h-3" /></button>
      </div>
      <input type="text" value={cat.icon || ''} onChange={e => onChange(cat.id, 'icon', e.target.value)} maxLength="2" className={`w-7 h-7 text-center text-base rounded-sm outline-none border shrink-0 transition-colors shadow-sm ${dm ? 'bg-slate-900 border-slate-600 text-white focus:border-slate-400' : 'bg-white border-slate-300 text-slate-800 focus:border-slate-400'}`} title="ไอคอน" />
      <AutoFocusInput isNew={isNew} value={cat.name || ''} onChange={e => onChange(cat.id, 'name', e.target.value)} className={inputCls} placeholder={isIncome ? 'ชื่อรายรับ' : 'ชื่อรายจ่าย'} />
      <select value={cat.cashflowGroup || ''} onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)} className={`border rounded-sm text-[13px] font-bold py-1 px-1.5 outline-none transition-colors cursor-pointer shrink-0 w-28 ${dm ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}>
        <option value="" disabled>-- เลือกกลุ่ม --</option>
        {cashflowGroups.filter(g => g.type === (isIncome ? 'income' : 'expense')).sort((a, b) => a.order - b.order).map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
      </select>
      {!isIncome && (
        <label className={`flex items-center justify-center gap-1 cursor-pointer px-1.5 py-1 rounded-sm border text-[11px] font-bold shrink-0 w-16 transition-colors ${cat.isFixed ? (dm ? 'bg-purple-900/40 text-purple-400 border-purple-800/50' : 'bg-purple-100 text-purple-700 border-purple-300') : (dm ? 'text-slate-400 border-slate-700 hover:border-slate-500' : 'text-slate-500 border-slate-300 hover:border-slate-400')}`} title="ตั้งเป็นภาระคงที่">
          <input type="checkbox" checked={!!cat.isFixed} onChange={e => onChange(cat.id, 'isFixed', e.target.checked)} className="w-3 h-3 accent-purple-600 cursor-pointer" /> Fixed
        </label>
      )}
      <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} isDarkMode={dm} />
      <div className={`w-px h-4 shrink-0 mx-0.5 ${dm ? 'bg-slate-700' : 'bg-slate-200'}`} />
      <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} isDarkMode={dm} />
    </div>
  );
}

export default function SettingsView({ categories, handleAddCategory, handleCategoryChange, handleDeleteCategory, handleMoveCategory, dayTypeConfig, setDayTypeConfig, isDarkMode, handleDeleteAllData, saveSettingToDb, cashflowGroups = [], setCashflowGroups }) {
  const dm = isDarkMode;
  const [newCatId, setNewCatId] = useState(null);

  const handleDayTypeConfigChange = (id, field, value) => { const cfg = dayTypeConfig.map(dt => dt.id === id ? { ...dt, [field]: value } : dt); setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg); };
  const handleAddDayType = () => { const cfg = [...dayTypeConfig, { id: `dt_${Date.now()}`, label: 'ชนิดวันใหม่', color: '#64748B' }]; setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg); };
  const handleDeleteDayType = (id) => { if (dayTypeConfig.length <= 2) return; const cfg = dayTypeConfig.filter(dt => dt.id !== id); setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg); };
  const handleMoveDayType = (id, direction) => { const idx = dayTypeConfig.findIndex(c => c.id === id); if (idx < 0) return; const ti = direction === 'UP' ? idx - 1 : idx + 1; if (ti >= 0 && ti < dayTypeConfig.length) { const cfg = [...dayTypeConfig]; [cfg[idx], cfg[ti]] = [cfg[ti], cfg[idx]]; setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg); } };
  
  const onAddCategory = (type) => { const newId = handleAddCategory(type); setTimeout(() => { const added = [...categories].reverse().find(c => c.type === type); if (added) setNewCatId(added.id); }, 0); };

  const handleAddCashflowGroup = () => {
    // 🚀 เพิ่ม properties highlightBg เข้าไปใน default ด้วย
    const newGroup = { id: `cg_${Date.now()}`, name: 'คอลัมน์ใหม่', type: 'expense', isDefault: false, order: cashflowGroups.length + 1, color: '#6366F1', highlightBg: false };
    const updated = [...cashflowGroups, newGroup]; setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated);
  };
  const handleChangeCashflowGroup = (id, field, value) => { const updated = cashflowGroups.map(g => g.id === id ? { ...g, [field]: value } : g); setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated); };
  const handleDeleteCashflowGroup = (id) => { if (categories.some(c => c.cashflowGroup === id)) { alert('ไม่สามารถลบได้! มี "หมวดหมู่" กำลังใช้งานกลุ่มนี้อยู่'); return; } const updated = cashflowGroups.filter(g => g.id !== id); setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated); };
  const handleMoveCashflowGroup = (id, direction) => { const idx = cashflowGroups.findIndex(g => g.id === id); if (idx < 0) return; const ti = direction === 'UP' ? idx - 1 : idx + 1; if (ti >= 0 && ti < cashflowGroups.length) { const updated = [...cashflowGroups]; [updated[idx], updated[ti]] = [updated[ti], updated[idx]]; updated.forEach((g, i) => { g.order = i + 1; }); setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated); } };

  const card = `rounded-md border shadow-sm ${dm ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'}`;
  const cardHd = (accent) => `px-4 py-2.5 border-b flex justify-between items-center ${dm ? `bg-${accent}-900/20 border-${accent}-900/40` : `bg-${accent}-50 border-${accent}-200`}`;
  const addBtn = (accent) => `text-white px-2.5 py-1.5 rounded-sm font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 ${dm ? `bg-${accent}-600/80 hover:bg-${accent}-500` : `bg-${accent}-600 hover:bg-${accent}-700`}`;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full pb-10 max-w-[1400px] mx-auto px-4 pt-4">
      <div className="mb-5">
        <h1 className={`text-xl font-black mb-3 flex items-center gap-2 ${dm ? 'text-slate-100' : 'text-slate-800'}`}><Settings2 className="w-6 h-6" /> การตั้งค่าระบบ (Settings)</h1>
        <div className={`rounded-sm px-4 py-3 border flex items-start gap-2 shadow-sm ${dm ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'}`}>
          <Info className={`w-4 h-4 mt-0.5 shrink-0 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          <div className={`text-xs leading-relaxed ${dm ? 'text-blue-200' : 'text-blue-800'}`}>
            <span className="font-bold">Fixed:</span> ใช้ตั้งค่ารายจ่ายคงที่ (ค่าหอ, ผ่อนรถ) &nbsp;·&nbsp;
            <span className="font-bold">คอลัมน์ตาราง:</span> เลือกเปิด Bg เพื่อเทสีพื้นหลังให้คอลัมน์นั้นเด่นขึ้นในตาราง Cashflow
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_480px] gap-5 items-start">
        {/* คอลัมน์ซ้าย: หมวดหมู่ */}
        <div className="flex flex-col gap-5">
          <div className={card}>
            <div className={cardHd('emerald')}>
              <h2 className={`text-sm font-bold flex items-center gap-1.5 ${dm ? 'text-emerald-400' : 'text-emerald-800'}`}><Coins className="w-4 h-4" /> หมวดหมู่รายรับ <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 ${dm ? 'bg-emerald-900/50 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>{categories.filter(c => c.type === 'income').length}</span></h2>
              <button type="button" onClick={() => onAddCategory('income')} className={addBtn('emerald')}><PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายรับ</button>
            </div>
            <div>
              {categories.filter(c => c.type === 'income').length === 0 ? <p className={`text-xs text-center py-6 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายรับ</p> : categories.filter(c => c.type === 'income').map(cat => (<CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={true} isDarkMode={dm} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} cashflowGroups={cashflowGroups} />))}
            </div>
          </div>
          <div className={card}>
            <div className={cardHd('blue')}>
              <h2 className={`text-sm font-bold flex items-center gap-1.5 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`}><Wallet className="w-4 h-4" /> หมวดหมู่รายจ่าย <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 ${dm ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>{categories.filter(c => c.type === 'expense').length}</span></h2>
              <button type="button" onClick={() => onAddCategory('expense')} className={addBtn('blue')}><PlusCircle className="w-3.5 h-3.5" /> เพิ่มรายจ่าย</button>
            </div>
            <div>
              {categories.filter(c => c.type === 'expense').length === 0 ? <p className={`text-xs text-center py-6 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายจ่าย</p> : categories.filter(c => c.type === 'expense').map(cat => (<CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={false} isDarkMode={dm} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} cashflowGroups={cashflowGroups} />))}
            </div>
          </div>
        </div>

        {/* คอลัมน์ขวา: ตั้งค่าระบบ */}
        <div className="flex flex-col gap-5">
          <div className={card}>
            <div className={cardHd('purple')}>
              <h2 className={`text-sm font-bold flex items-center gap-1.5 ${dm ? 'text-purple-400' : 'text-purple-800'}`}><Grid className="w-4 h-4" /> คอลัมน์ตาราง Cashflow <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 ${dm ? 'bg-purple-900/40 text-purple-300' : 'bg-purple-100 text-purple-700'}`}>{cashflowGroups.length}</span></h2>
              <button type="button" onClick={handleAddCashflowGroup} className={addBtn('purple')}><PlusCircle className="w-3.5 h-3.5" /> เพิ่ม</button>
            </div>
            <div className={`p-3 space-y-2 ${dm ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
              {cashflowGroups.sort((a,b) => a.order - b.order).map(group => (
                <div key={group.id} className={`flex items-center gap-1.5 p-2 border rounded-sm transition-colors group/cg ${dm ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`}>
                  <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cg:opacity-100 transition-opacity ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                    <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'UP')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-purple-400 hover:bg-slate-700' : 'hover:text-purple-600 hover:bg-slate-200'}`}><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'DOWN')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-purple-400 hover:bg-slate-700' : 'hover:text-purple-600 hover:bg-slate-200'}`}><ChevronDown className="w-3 h-3" /></button>
                  </div>
                  
                  <ColorPicker color={group.color || (group.type === 'income' ? '#10B981' : '#64748B')} onChange={c => handleChangeCashflowGroup(group.id, 'color', c)} isDarkMode={dm} />
                  
                  {/* 🚀 ปุ่มสำหรับเปิดปิดเทสีพื้นหลัง (Bg) */}
                  <label className={`flex items-center gap-1 cursor-pointer px-1 py-0.5 border rounded-sm text-[10px] font-bold shrink-0 transition-colors ${group.highlightBg ? (dm ? 'bg-amber-900/40 text-amber-400 border-amber-800/50' : 'bg-amber-100 text-amber-700 border-amber-300') : (dm ? 'text-slate-500 border-slate-700 hover:border-slate-500' : 'text-slate-400 border-slate-300 hover:border-slate-400')}`} title="เทสีพื้นหลังคอลัมน์">
                    <input type="checkbox" checked={!!group.highlightBg} onChange={e => handleChangeCashflowGroup(group.id, 'highlightBg', e.target.checked)} className="hidden" />
                    <span className={`w-1.5 h-1.5 rounded-full ${group.highlightBg ? 'bg-amber-500' : (dm?'bg-slate-600':'bg-slate-300')}`}></span>
                    Bg
                  </label>

                  <select value={group.type} onChange={e => handleChangeCashflowGroup(group.id, 'type', e.target.value)} disabled={group.isDefault} className={`p-1 rounded-sm text-[11px] font-bold outline-none border w-[72px] shrink-0 ${dm ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'} ${group.isDefault ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:border-purple-500'}`}>
                    <option value="income">รายรับ</option>
                    <option value="expense">รายจ่าย</option>
                  </select>
                  <input type="text" value={group.name} onChange={e => handleChangeCashflowGroup(group.id, 'name', e.target.value)} className={`flex-1 min-w-0 px-2 py-1 border rounded-sm outline-none font-bold text-[13px] transition-colors ${dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-purple-500' : 'bg-white border-slate-300 text-slate-800 focus:border-purple-400'}`} placeholder="ชื่อคอลัมน์" />
                  <ConfirmDeleteButton onConfirm={() => handleDeleteCashflowGroup(group.id)} disabled={group.isDefault} isDarkMode={dm} tooltip={group.isDefault ? "ห้ามลบ" : "ลบ"} />
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <div className={cardHd('orange')}>
              <h2 className={`text-sm font-bold flex items-center gap-1.5 ${dm ? 'text-orange-400' : 'text-orange-800'}`}><CalendarClock className="w-4 h-4" /> ชนิดวันบนปฏิทิน</h2>
              <button type="button" onClick={handleAddDayType} className={addBtn('orange')}><PlusCircle className="w-3.5 h-3.5" /> เพิ่ม</button>
            </div>
            <div className={`p-3 space-y-2 ${dm ? 'bg-slate-900/50' : 'bg-slate-50/50'}`}>
              {dayTypeConfig.map(dt => (
                <div key={dt.id} className={`flex items-center gap-2 px-3 py-2 border rounded-sm transition-colors group/dt shadow-sm ${dm ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                  <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/dt:opacity-100 transition-opacity ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                    <button type="button" onClick={() => handleMoveDayType(dt.id, 'UP')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}><ChevronUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => handleMoveDayType(dt.id, 'DOWN')} className={`p-0.5 rounded-sm ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}><ChevronDown className="w-3 h-3" /></button>
                  </div>
                  <div className="w-3.5 h-3.5 rounded-sm shrink-0 shadow-sm border border-black/10" style={{ backgroundColor: dt.color }} />
                  <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)} className={`flex-1 min-w-0 px-2 py-1 border rounded-sm outline-none focus:ring-1 font-bold text-[13px] transition-colors ${dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-orange-500' : 'bg-white border-slate-300 text-slate-800 focus:border-orange-400'}`} placeholder="ชื่อชนิดวัน" />
                  <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} isDarkMode={dm} />
                  <div className={`w-px h-5 shrink-0 mx-0.5 ${dm ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <ConfirmDeleteButton onConfirm={() => handleDeleteDayType(dt.id)} disabled={dayTypeConfig.length <= 2} isDarkMode={dm} tooltip={dayTypeConfig.length <= 2 ? 'ห้ามลบ' : 'ลบ'} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}