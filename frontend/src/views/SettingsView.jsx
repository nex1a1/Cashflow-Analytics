// src/views/SettingsView.jsx  (PC-first · tight · sharp)
import { useState, useEffect, useRef } from 'react';
import {
  PlusCircle, Trash2, Coins, CalendarClock, AlertCircle,
  ChevronUp, ChevronDown, Wallet, Info, Grid, Settings2,
} from 'lucide-react';
import { DAY_TYPE_CONFIG_KEY, CASHFLOW_GROUPS_KEY } from '../constants';

/* ─────────────────────────────────────────────
   ConfirmDeleteButton
───────────────────────────────────────────── */
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
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [confirming]);

  if (size === 'lg') {
    return (
      <button onClick={handleClick} disabled={disabled}
        className={`flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-bold transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed border ${
          confirming ? 'bg-red-600 text-white border-red-600 animate-pulse'
          : isDarkMode ? 'bg-red-950/60 text-red-300 hover:bg-red-600 hover:text-white border-red-800'
          : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border-red-200'
        }`}
        title={confirming ? 'ยืนยันการลบ?' : tooltip}>
        <Trash2 className="w-3.5 h-3.5" />
        {confirming ? 'ยืนยัน? คลิกอีกครั้ง' : 'ล้างข้อมูลทั้งหมด'}
      </button>
    );
  }
  return (
    <button onClick={handleClick} disabled={disabled}
      className={`p-1 rounded-sm transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${
        confirming ? 'bg-red-500 text-white animate-pulse'
        : isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-500/80'
        : 'text-slate-400 hover:text-white hover:bg-red-500'
      }`}
      title={confirming ? 'ยืนยันการลบ?' : tooltip}>
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

/* ─────────────────────────────────────────────
   ColorPicker
───────────────────────────────────────────── */
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

function ColorPicker({ color, onChange, isDarkMode }) {
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
    document.addEventListener('mousedown', h); document.addEventListener('keydown', h); window.addEventListener('scroll', h, true);
    return () => { document.removeEventListener('mousedown', h); document.removeEventListener('keydown', h); window.removeEventListener('scroll', h, true); };
  }, [open]);

  return (
    <div className="relative shrink-0 flex items-center">
      <button ref={btnRef} onClick={handleOpen} type="button"
        className="w-5 h-5 rounded-sm border cursor-pointer hover:scale-110 transition-transform shadow-sm outline-none"
        style={{ backgroundColor: color, borderColor: color }} title="เลือกสี" />
      {open && (
        <div ref={paletteRef}
          className={`fixed z-[9999] p-2.5 rounded-sm shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
          style={{ top: pos.top, left: pos.left, width: 256 }}>
          <div className="grid grid-cols-10 gap-1 mb-2.5">
            {COLOR_PALETTE.map(c => (
              <button key={c} type="button" onClick={() => { onChange(c); setOpen(false); }}
                className={`rounded-sm transition-transform hover:scale-125 ${color === c ? 'ring-1 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                style={{ backgroundColor: c, width: '1.05rem', height: '1.05rem' }} title={c} />
            ))}
          </div>
          <div className={`flex items-center gap-2 border-t pt-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <input type="color" value={color} onChange={e => onChange(e.target.value)}
              className="w-6 h-5 cursor-pointer border-0 bg-transparent p-0 rounded-sm" title="สีกำหนดเอง" />
            <span className={`text-[11px] font-mono font-bold ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{color}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   AutoFocusInput
───────────────────────────────────────────── */
function AutoFocusInput({ value, onChange, className, placeholder, isNew }) {
  const ref = useRef(null);
  useEffect(() => { if (isNew && ref.current) { ref.current.focus(); ref.current.select(); } }, [isNew]);
  return <input ref={ref} type="text" value={value} onChange={onChange} className={className} placeholder={placeholder} />;
}

/* ─────────────────────────────────────────────
   CategoryRow
───────────────────────────────────────────── */
function CategoryRow({ cat, isNew, isDarkMode, isIncome, onMove, onChange, onDelete, cashflowGroups = [] }) {
  const dm = isDarkMode;
  const accentFocus = isIncome ? 'focus:border-emerald-500' : 'focus:border-blue-500';
  const inputCls = `px-2 py-1 border rounded-sm outline-none font-semibold text-[13px] transition-colors flex-1 min-w-0 ${
    dm ? `bg-slate-800 border-slate-600/80 ${accentFocus} text-slate-200 placeholder:text-slate-600`
       : `bg-white border-slate-200 ${accentFocus} text-slate-800 placeholder:text-slate-400`
  }`;

  return (
    <div className={`flex flex-nowrap items-center gap-1.5 px-2.5 py-1.5 border-b last:border-0 transition-colors group/cat ${
      !isIncome && cat.isFixed
        ? (dm ? 'bg-purple-900/10 hover:bg-purple-900/20' : 'bg-purple-50/40 hover:bg-purple-50/80')
        : (dm ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50')
    } ${dm ? 'border-slate-700/40' : 'border-slate-100'}`}>

      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cat:opacity-100 transition-opacity ${dm ? 'text-slate-600' : 'text-slate-300'}`}>
        <button type="button" onClick={() => onMove(cat.id, 'UP')}
          className={`p-0.5 rounded-sm ${dm ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-700 hover:bg-slate-200'}`}>
          <ChevronUp className="w-3 h-3" />
        </button>
        <button type="button" onClick={() => onMove(cat.id, 'DOWN')}
          className={`p-0.5 rounded-sm ${dm ? 'hover:text-slate-200 hover:bg-slate-700' : 'hover:text-slate-700 hover:bg-slate-200'}`}>
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      <input type="text" value={cat.icon || ''} onChange={e => onChange(cat.id, 'icon', e.target.value)} maxLength="2"
        className={`w-7 h-7 text-center text-base rounded-sm outline-none border shrink-0 transition-colors ${
          dm ? 'bg-slate-900 border-slate-600 text-white focus:border-slate-400' : 'bg-slate-50 border-slate-200 focus:border-slate-400'
        }`} title="ไอคอน" />

      <AutoFocusInput isNew={isNew} value={cat.name || ''} onChange={e => onChange(cat.id, 'name', e.target.value)}
        className={inputCls} placeholder={isIncome ? 'ชื่อรายรับ' : 'ชื่อรายจ่าย'} />

      <select value={cat.cashflowGroup || ''} onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)}
        className={`border rounded-sm text-[12px] font-semibold py-1 px-1.5 outline-none transition-colors cursor-pointer shrink-0 w-28 ${
          dm ? 'bg-slate-800 border-slate-600 text-slate-300 focus:border-blue-500' : 'bg-white border-slate-200 text-slate-700 focus:border-blue-400'
        }`}>
        <option value="" disabled>-- กลุ่ม --</option>
        {cashflowGroups.filter(g => g.type === (isIncome ? 'income' : 'expense')).sort((a, b) => a.order - b.order).map(g => (
          <option key={g.id} value={g.id}>{g.name}</option>
        ))}
      </select>

      {!isIncome && (
        <label className={`flex items-center justify-center gap-1 cursor-pointer px-1.5 py-1 rounded-sm border text-[11px] font-bold shrink-0 w-14 transition-colors ${
          cat.isFixed
            ? (dm ? 'bg-purple-900/40 text-purple-400 border-purple-700/50' : 'bg-purple-50 text-purple-700 border-purple-300')
            : (dm ? 'text-slate-500 border-slate-700 hover:border-slate-500' : 'text-slate-400 border-slate-200 hover:border-slate-400')
        }`} title="ตั้งเป็นภาระคงที่">
          <input type="checkbox" checked={!!cat.isFixed} onChange={e => onChange(cat.id, 'isFixed', e.target.checked)} className="w-3 h-3 accent-purple-600 cursor-pointer" />
          Fixed
        </label>
      )}

      <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} isDarkMode={dm} />
      <div className={`w-px h-4 shrink-0 ${dm ? 'bg-slate-700' : 'bg-slate-200'}`} />
      <ConfirmDeleteButton onConfirm={() => onDelete(cat.id)} isDarkMode={dm} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   SectionCard
───────────────────────────────────────────── */
function SectionCard({ isDarkMode, accentColor, icon, title, badge, action, children }) {
  const dm = isDarkMode;
  const accentMap = {
    emerald: { header: dm ? 'bg-emerald-950/50 border-emerald-900/40' : 'bg-emerald-50 border-emerald-100', title: dm ? 'text-emerald-400' : 'text-emerald-800', btn: dm ? 'bg-emerald-700/80 hover:bg-emerald-600 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    blue:    { header: dm ? 'bg-blue-950/50 border-blue-900/40'       : 'bg-blue-50 border-blue-100',       title: dm ? 'text-blue-400'    : 'text-[#00509E]',   btn: dm ? 'bg-blue-700/80 hover:bg-blue-600 text-white'       : 'bg-blue-600 hover:bg-blue-700 text-white' },
    purple:  { header: dm ? 'bg-purple-950/50 border-purple-900/40'   : 'bg-purple-50 border-purple-100',   title: dm ? 'text-purple-400'  : 'text-purple-800',  btn: dm ? 'bg-purple-700/80 hover:bg-purple-600 text-white'   : 'bg-purple-600 hover:bg-purple-700 text-white' },
    orange:  { header: dm ? 'bg-orange-950/50 border-orange-900/40'   : 'bg-orange-50 border-orange-100',   title: dm ? 'text-orange-400'  : 'text-orange-800',  btn: dm ? 'bg-orange-600/80 hover:bg-orange-500 text-white'   : 'bg-orange-500 hover:bg-orange-600 text-white' },
  };
  const a = accentMap[accentColor] || accentMap.blue;

  return (
    <div className={`rounded-sm border overflow-hidden shadow-sm ${dm ? 'bg-slate-900 border-slate-700/70' : 'bg-white border-slate-200'}`}>
      <div className={`px-3 py-2 border-b flex items-center justify-between ${a.header}`}>
        <h2 className={`text-[13px] font-bold flex items-center gap-1.5 ${a.title}`}>
          {icon}
          {title}
          {badge != null && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ml-1 ${dm ? 'bg-slate-700/80 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              {badge}
            </span>
          )}
        </h2>
        {action && (
          <button type="button" onClick={action.onClick}
            className={`text-[11px] font-bold px-2 py-1 rounded-sm flex items-center gap-1 transition-all active:scale-95 ${a.btn}`}>
            <PlusCircle className="w-3 h-3" /> {action.label}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main SettingsView
───────────────────────────────────────────── */
export default function SettingsView({
  categories, handleAddCategory, handleCategoryChange, handleDeleteCategory, handleMoveCategory,
  dayTypeConfig, setDayTypeConfig, isDarkMode, handleDeleteAllData, saveSettingToDb,
  cashflowGroups = [], setCashflowGroups,
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
    const idx = dayTypeConfig.findIndex(c => c.id === id); if (idx < 0) return;
    const ti = direction === 'UP' ? idx - 1 : idx + 1;
    if (ti >= 0 && ti < dayTypeConfig.length) {
      const cfg = [...dayTypeConfig]; [cfg[idx], cfg[ti]] = [cfg[ti], cfg[idx]];
      setDayTypeConfig(cfg); saveSettingToDb(DAY_TYPE_CONFIG_KEY, cfg);
    }
  };
  const onAddCategory = (type) => {
    handleAddCategory(type);
    setTimeout(() => { const added = [...categories].reverse().find(c => c.type === type); if (added) setNewCatId(added.id); }, 0);
  };
  const handleAddCashflowGroup = () => {
    const g = { id: `cg_${Date.now()}`, name: 'คอลัมน์ใหม่', type: 'expense', isDefault: false, order: cashflowGroups.length + 1, color: '#6366F1', highlightBg: false };
    const updated = [...cashflowGroups, g]; setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated);
  };
  const handleChangeCashflowGroup = (id, field, value) => {
    const updated = cashflowGroups.map(g => g.id === id ? { ...g, [field]: value } : g);
    setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated);
  };
  const handleDeleteCashflowGroup = (id) => {
    if (categories.some(c => c.cashflowGroup === id)) { alert('ไม่สามารถลบได้! มี "หมวดหมู่" กำลังใช้งานกลุ่มนี้อยู่'); return; }
    const updated = cashflowGroups.filter(g => g.id !== id);
    setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated);
  };
  const handleMoveCashflowGroup = (id, direction) => {
    const idx = cashflowGroups.findIndex(g => g.id === id); if (idx < 0) return;
    const ti = direction === 'UP' ? idx - 1 : idx + 1;
    if (ti >= 0 && ti < cashflowGroups.length) {
      const updated = [...cashflowGroups]; [updated[idx], updated[ti]] = [updated[ti], updated[idx]];
      updated.forEach((g, i) => { g.order = i + 1; });
      setCashflowGroups(updated); saveSettingToDb(CASHFLOW_GROUPS_KEY, updated);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[1440px] mx-auto px-1 pt-1 pb-10">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-3 gap-4">
        <h1 className={`text-lg font-black flex items-center gap-2 ${dm ? 'text-slate-100' : 'text-slate-800'}`}>
          <Settings2 className="w-5 h-5 text-[#00509E]" /> การตั้งค่าระบบ
        </h1>
        <div className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 border text-[11px] ${dm ? 'bg-blue-950/30 border-blue-900/40 text-blue-300' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
          <Info className={`w-3 h-3 shrink-0 ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
          <span><b>Fixed</b> = รายจ่ายคงที่ &nbsp;·&nbsp; <b>Bg</b> = เทสีพื้นหลังคอลัมน์ใน Dashboard</span>
        </div>
      </div>

      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_360px] xl:grid-cols-[1fr_1fr_400px] gap-3 items-start mb-3">

        {/* Col 1: รายรับ */}
        <SectionCard
          isDarkMode={dm} accentColor="emerald"
          icon={<Coins className="w-3.5 h-3.5" />}
          title="หมวดหมู่รายรับ"
          badge={categories.filter(c => c.type === 'income').length}
          action={{ label: 'เพิ่มรายรับ', onClick: () => onAddCategory('income') }}
        >
          <div>
            {categories.filter(c => c.type === 'income').map(cat => (
              <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={true}
                isDarkMode={dm} onMove={handleMoveCategory} onChange={handleCategoryChange}
                onDelete={handleDeleteCategory} cashflowGroups={cashflowGroups} />
            ))}
            {categories.filter(c => c.type === 'income').length === 0 && (
              <p className={`text-center py-6 text-xs ${dm ? 'text-slate-600' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายรับ</p>
            )}
          </div>
        </SectionCard>

        {/* Col 2: รายจ่าย */}
        <SectionCard
          isDarkMode={dm} accentColor="blue"
          icon={<Wallet className="w-3.5 h-3.5" />}
          title="หมวดหมู่รายจ่าย"
          badge={categories.filter(c => c.type === 'expense').length}
          action={{ label: 'เพิ่มรายจ่าย', onClick: () => onAddCategory('expense') }}
        >
          <div>
            {categories.filter(c => c.type === 'expense').map(cat => (
              <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={false}
                isDarkMode={dm} onMove={handleMoveCategory} onChange={handleCategoryChange}
                onDelete={handleDeleteCategory} cashflowGroups={cashflowGroups} />
            ))}
            {categories.filter(c => c.type === 'expense').length === 0 && (
              <p className={`text-center py-6 text-xs ${dm ? 'text-slate-600' : 'text-slate-400'}`}>ยังไม่มีหมวดหมู่รายจ่าย</p>
            )}
          </div>
        </SectionCard>

        {/* Col 3: System settings stacked */}
        <div className="flex flex-col gap-3">

          {/* Cashflow Groups */}
          <SectionCard
            isDarkMode={dm} accentColor="purple"
            icon={<Grid className="w-3.5 h-3.5" />}
            title="คอลัมน์ Cashflow"
            badge={cashflowGroups.length}
            action={{ label: 'เพิ่ม', onClick: handleAddCashflowGroup }}
          >
            <div className={`p-2 space-y-1.5 ${dm ? '' : 'bg-slate-50/40'}`}>
              {cashflowGroups.sort((a, b) => a.order - b.order).map(group => (
                <div key={group.id}
                  className={`flex items-center gap-1.5 p-1.5 border rounded-sm transition-colors group/cg ${
                    dm ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}>
                  <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/cg:opacity-100 transition-opacity ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                    <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'UP')}
                      className={`p-0.5 rounded-sm ${dm ? 'hover:text-purple-400 hover:bg-slate-700' : 'hover:text-purple-600 hover:bg-slate-200'}`}>
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => handleMoveCashflowGroup(group.id, 'DOWN')}
                      className={`p-0.5 rounded-sm ${dm ? 'hover:text-purple-400 hover:bg-slate-700' : 'hover:text-purple-600 hover:bg-slate-200'}`}>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <ColorPicker color={group.color || '#64748B'} onChange={c => handleChangeCashflowGroup(group.id, 'color', c)} isDarkMode={dm} />

                  <label className={`flex items-center gap-0.5 cursor-pointer px-1.5 py-0.5 border rounded-sm text-[10px] font-bold shrink-0 transition-colors ${
                    group.highlightBg
                      ? (dm ? 'bg-amber-900/40 text-amber-400 border-amber-800/50' : 'bg-amber-50 text-amber-700 border-amber-200')
                      : (dm ? 'text-slate-600 border-slate-700 hover:border-slate-500' : 'text-slate-400 border-slate-200 hover:border-slate-400')
                  }`} title="เทสีพื้นหลังคอลัมน์">
                    <input type="checkbox" checked={!!group.highlightBg} onChange={e => handleChangeCashflowGroup(group.id, 'highlightBg', e.target.checked)} className="hidden" />
                    <span className={`w-1.5 h-1.5 rounded-full ${group.highlightBg ? 'bg-amber-500' : (dm ? 'bg-slate-600' : 'bg-slate-300')}`} />
                    Bg
                  </label>

                  <select value={group.type} onChange={e => handleChangeCashflowGroup(group.id, 'type', e.target.value)}
                    disabled={group.isDefault}
                    className={`p-1 rounded-sm text-[11px] font-bold outline-none border w-[68px] shrink-0 ${
                      dm ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                    } ${group.isDefault ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer focus:border-purple-500'}`}>
                    <option value="income">รายรับ</option>
                    <option value="expense">รายจ่าย</option>
                  </select>

                  <input type="text" value={group.name} onChange={e => handleChangeCashflowGroup(group.id, 'name', e.target.value)}
                    className={`flex-1 min-w-0 px-2 py-1 border rounded-sm outline-none font-semibold text-[13px] transition-colors ${
                      dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-purple-500 placeholder:text-slate-600'
                         : 'bg-white border-slate-200 text-slate-800 focus:border-purple-400'
                    }`} placeholder="ชื่อคอลัมน์" />

                  <ConfirmDeleteButton onConfirm={() => handleDeleteCashflowGroup(group.id)} disabled={group.isDefault} isDarkMode={dm} tooltip={group.isDefault ? 'ห้ามลบ' : 'ลบ'} />
                </div>
              ))}
              {cashflowGroups.length === 0 && (
                <p className={`text-center py-4 text-xs ${dm ? 'text-slate-600' : 'text-slate-400'}`}>ยังไม่มีคอลัมน์</p>
              )}
            </div>
          </SectionCard>

          {/* Day Types */}
          <SectionCard
            isDarkMode={dm} accentColor="orange"
            icon={<CalendarClock className="w-3.5 h-3.5" />}
            title="ชนิดวันบนปฏิทิน"
            action={{ label: 'เพิ่ม', onClick: handleAddDayType }}
          >
            <div className={`p-2 space-y-1.5 ${dm ? '' : 'bg-slate-50/40'}`}>
              {dayTypeConfig.map(dt => (
                <div key={dt.id}
                  className={`flex items-center gap-2 px-2 py-1.5 border rounded-sm transition-colors group/dt ${
                    dm ? 'bg-slate-800/70 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'
                  }`}>
                  <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover/dt:opacity-100 transition-opacity ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
                    <button type="button" onClick={() => handleMoveDayType(dt.id, 'UP')}
                      className={`p-0.5 rounded-sm ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}>
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button type="button" onClick={() => handleMoveDayType(dt.id, 'DOWN')}
                      className={`p-0.5 rounded-sm ${dm ? 'hover:text-orange-400 hover:bg-slate-700' : 'hover:text-orange-600 hover:bg-slate-200'}`}>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/10" style={{ backgroundColor: dt.color }} />

                  <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)}
                    className={`flex-1 min-w-0 px-2 py-1 border rounded-sm outline-none font-semibold text-[13px] transition-colors ${
                      dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-orange-500'
                         : 'bg-white border-slate-200 text-slate-800 focus:border-orange-400'
                    }`} placeholder="ชื่อชนิดวัน" />

                  <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} isDarkMode={dm} />
                  <div className={`w-px h-4 shrink-0 ${dm ? 'bg-slate-700' : 'bg-slate-200'}`} />
                  <ConfirmDeleteButton onConfirm={() => handleDeleteDayType(dt.id)} disabled={dayTypeConfig.length <= 2} isDarkMode={dm} tooltip={dayTypeConfig.length <= 2 ? 'ห้ามลบ' : 'ลบ'} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`rounded-sm border-2 overflow-hidden ${dm ? 'bg-red-950/20 border-red-900/50' : 'bg-red-50 border-red-200'}`}>
        <div className={`px-4 py-2 border-b-2 flex items-center gap-2 ${dm ? 'bg-red-900/20 border-red-900/40' : 'bg-red-100/60 border-red-200'}`}>
          <AlertCircle className={`w-4 h-4 ${dm ? 'text-red-400' : 'text-red-600'}`} />
          <h2 className={`text-sm font-black tracking-wide ${dm ? 'text-red-400' : 'text-red-700'}`}>Danger Zone</h2>
        </div>
        <div className={`px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${dm ? '' : 'bg-white/60'}`}>
          <div className="flex-1">
            <h3 className={`text-sm font-bold mb-0.5 ${dm ? 'text-slate-200' : 'text-slate-800'}`}>ล้างข้อมูลทั้งหมด (Factory Reset)</h3>
            <p className={`text-xs leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
              จะลบ<strong className="text-red-500 mx-1">รายการบัญชีทั้งหมด</strong>,
              <strong className="text-red-500 mx-1">ประวัติปฏิทิน</strong> และ
              <strong className="text-red-500 mx-1">รีเซ็ตการตั้งค่า</strong>กลับเป็นค่าเริ่มต้น
              — <span className="font-bold text-red-600">ไม่สามารถกู้คืนได้</span>
            </p>
          </div>
          <ConfirmDeleteButton onConfirm={() => handleDeleteAllData({ setShowToast: () => {} })} isDarkMode={dm} size="lg" />
        </div>
      </div>

    </div>
  );
}