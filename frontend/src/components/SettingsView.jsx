// src/components/SettingsView.jsx
import { useState, useEffect, useRef } from 'react';
import {
  PlusCircle, Trash2, Coins, CalendarClock, AlertCircle,
  Settings, ChevronUp, ChevronDown, Wallet, Lock, Unlock, Zap, X
} from 'lucide-react';
import { DAY_TYPE_CONFIG_KEY } from '../constants';

const COLOR_PALETTE = [
  '#EF4444','#F97316','#F59E0B','#EAB308',
  '#22C55E','#10B981','#14B8A6','#06B6D4',
  '#3B82F6','#6366F1','#8B5CF6','#A855F7',
  '#EC4899','#F43F5E','#64748B','#059669',
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
      className={`rounded-lg font-bold transition-all active:scale-95 ${
        confirming
          ? 'bg-red-500 text-white px-2 py-1 text-xs animate-pulse'
          : size === 'lg'
            ? `px-4 py-2 flex items-center gap-2 ${isDarkMode ? 'bg-red-900/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-900/50' : 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200'}`
            : `p-1.5 ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-500/80' : 'text-slate-400 hover:text-white hover:bg-red-500'}`
      }`}
      title={confirming ? 'กดอีกครั้งเพื่อยืนยัน' : 'ลบ'}
    >
      {confirming
        ? 'ยืนยัน?'
        : size === 'lg'
          ? <><Trash2 className="w-4 h-4" /> ล้างข้อมูลทั้งหมด</>
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
      const paletteW = 156;
      const paletteH = 110;
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
        className="w-7 h-7 rounded-lg border-2 cursor-pointer hover:scale-110 transition-transform shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-400"
        style={{ backgroundColor: color, borderColor: color }}
        title="เลือกสี"
      />
      {open && (
        <div
          ref={paletteRef}
          className={`fixed z-[9999] p-2.5 rounded-xl shadow-2xl border ${isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'}`}
          style={{ top: pos.top, left: pos.left, width: '156px' }}
        >
          <div className="grid grid-cols-8 gap-1 mb-2">
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className={`w-[15px] h-[15px] rounded-full transition-transform hover:scale-125 ${color === c ? 'ring-2 ring-offset-1 ring-slate-400 scale-125' : ''}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <div className={`flex items-center gap-1.5 border-t pt-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-100'}`}>
            <div className="w-5 h-5 rounded shrink-0 border" style={{ backgroundColor: color, borderColor: color }} />
            <input
              type="color"
              value={color}
              onChange={e => onChange(e.target.value)}
              className="w-6 h-5 cursor-pointer border-0 bg-transparent p-0 rounded"
              title="สีกำหนดเอง"
            />
            <span className={`text-[10px] font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{color}</span>
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
    `w-full px-2 py-1.5 border rounded-lg outline-none focus:ring-1 font-bold text-sm transition-colors ${
      isDarkMode
        ? `bg-transparent border-slate-600 focus:border-${color}-500 text-${color}-400`
        : `border-slate-300 focus:border-${color}-500 text-slate-800`
    }`;

  const accentColor = isIncome ? 'emerald' : 'blue';

  return (
    <div className={`flex flex-nowrap items-center gap-2 px-3 py-2.5 border-b last:border-0 transition-all duration-200 group ${
      !isIncome && cat.isFixed
        ? (isDarkMode ? 'bg-purple-900/10 hover:bg-purple-900/20' : 'bg-purple-50/30 hover:bg-purple-50/60')
        : (isDarkMode ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50')
    } ${isDarkMode ? 'border-slate-700/60' : 'border-slate-100'}`}>

      <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`}>
        <button onClick={() => onMove(cat.id, 'UP')} className={`p-0.5 rounded transition-colors ${isDarkMode ? 'hover:text-slate-200' : 'hover:text-slate-600'}`}>
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onMove(cat.id, 'DOWN')} className={`p-0.5 rounded transition-colors ${isDarkMode ? 'hover:text-slate-200' : 'hover:text-slate-600'}`}>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="text"
          value={cat.icon || ''}
          onChange={e => onChange(cat.id, 'icon', e.target.value)}
          maxLength="2"
          className={`w-9 h-9 text-center text-lg rounded-lg outline-none focus:ring-1 border shrink-0 transition-colors ${
            isDarkMode ? 'bg-slate-900 border-slate-600 text-white focus:ring-slate-400' : 'bg-slate-100 border-slate-200 text-slate-800 focus:ring-slate-400'
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

      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <select
          value={cat.cashflowGroup || (isIncome ? 'bonus' : 'variable')}
          onChange={e => onChange(cat.id, 'cashflowGroup', e.target.value)}
          className={`border rounded-lg text-xs font-bold py-1.5 px-2 outline-none transition-colors cursor-pointer ${
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
          <label className={`flex items-center gap-1 cursor-pointer px-2 py-1.5 rounded-lg transition-colors border text-xs font-bold ${
              cat.isFixed
                ? (isDarkMode ? 'bg-purple-900/40 text-purple-400 border-purple-800/50' : 'bg-purple-100 text-purple-700 border-purple-200')
                : (isDarkMode ? 'text-slate-500 border-slate-700 hover:border-slate-500' : 'text-slate-400 border-slate-200 hover:border-slate-300')
            }`} title="ตั้งเป็นภาระคงที่">
            <input type="checkbox" checked={!!cat.isFixed} onChange={e => onChange(cat.id, 'isFixed', e.target.checked)} className="w-3 h-3 accent-purple-600 cursor-pointer" />
            Fixed
          </label>
        )}

        <ColorPicker color={cat.color || '#64748B'} onChange={c => onChange(cat.id, 'color', c)} isDarkMode={isDarkMode} />
        <div className={`w-px h-5 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`} />
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
  handleDeleteAllData, saveSettingToDb,
  paymentMethods = [], setPaymentMethods, transactions = []
}) {
  const [unlockedWallets, setUnlockedWallets] = useState({});
  const [newCatId, setNewCatId] = useState(null);
  
  // State สำหรับ Modal ปรับจูนยอดเงิน
  const [adjustModal, setAdjustModal] = useState({ isOpen: false, pmId: null, pmName: '' });
  const [adjustAmount, setAdjustAmount] = useState('');
  const adjustInputRef = useRef(null);

  // Focus input อัตโนมัติเมื่อเปิด Modal
  useEffect(() => {
    if (adjustModal.isOpen && adjustInputRef.current) {
      adjustInputRef.current.focus();
    }
  }, [adjustModal.isOpen]);

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

  const handleAddPaymentMethod = () => {
    const newMethods = [
      ...paymentMethods,
      { id: `pm_${Date.now()}`, name: 'กระเป๋าใหม่', type: 'bank', color: '#3B82F6', initialBalance: 0 },
    ];
    setPaymentMethods(newMethods);
  };

  const handlePaymentMethodChange = (id, field, value) => {
    const newMethods = paymentMethods.map(pm =>
      pm.id === id ? { ...pm, [field]: value } : pm
    );
    setPaymentMethods(newMethods);
  };

  const handleDeletePaymentMethod = (id) => {
    const newMethods = paymentMethods.filter(pm => pm.id !== id);
    setPaymentMethods(newMethods);
  };

  const handleMovePaymentMethod = (id, direction) => {
    const index = paymentMethods.findIndex(pm => pm.id === id);
    if (index < 0) return;
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < paymentMethods.length) {
      const newMethods = [...paymentMethods];
      [newMethods[index], newMethods[targetIndex]] = [newMethods[targetIndex], newMethods[index]];
      setPaymentMethods(newMethods);
    }
  };

  // 🌟 เปิด Modal ปรับยอด
  const openAdjustModal = (pmId, pmName) => {
    setAdjustModal({ isOpen: true, pmId, pmName });
    setAdjustAmount('');
  };

  // 🌟 ยืนยันการปรับยอด (คำนวณและ Save)
  const confirmAdjustBalance = () => {
    if (!adjustAmount) return;
    const targetNum = parseFloat(adjustAmount.replace(/,/g, ''));
    if (isNaN(targetNum)) {
      alert("กรุณาใส่เป็นตัวเลขที่ถูกต้องครับ");
      return;
    }

    const pmId = adjustModal.pmId;
    const historySum = transactions.reduce((acc, tx) => {
      if (tx.paymentMethodId !== pmId) return acc;
      const amount = Number(tx.amount) || 0;

      if (tx.category === 'โอนเงินเข้า') return acc + amount;
      if (tx.category === 'โอนเงินออก') return acc - amount;

      const catObj = categories.find(c => c.name === tx.category);
      if (!catObj) return acc;
      return catObj.type === 'income' ? acc + amount : acc - amount;
    }, 0);

    const calculatedInitial = targetNum - historySum;
    handlePaymentMethodChange(pmId, 'initialBalance', calculatedInitial);
    
    alert(`✅ ปรับจูนยอด "${adjustModal.pmName}" สำเร็จ!\nยอดปัจจุบันของคุณจะแสดงเป็น ${targetNum.toLocaleString()} ฿`);
    setAdjustModal({ isOpen: false, pmId: null, pmName: '' });
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
    <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-500 w-full py-4 space-y-6">

      <div className={`rounded-xl px-4 py-3 text-sm border ${isDarkMode ? 'bg-blue-900/20 border-blue-800/50 text-blue-300' : 'bg-blue-50 border-blue-200 text-[#00509E]'}`}>
        <p className="font-bold flex items-center gap-2 mb-1">
          <Settings className="w-4 h-4" /> วิธีตั้งค่ากลุ่มกระแสเงินสด
        </p>
        <p className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          <strong>Fixed</strong> = ภาระคงที่ (ค่าหอ, ผ่อนรถ) &nbsp;·&nbsp;
          <strong>กลุ่มกระแสเงินสด</strong> = จัดกลุ่มเพื่อแสดงผลในตาราง Cashflow
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[3fr_2fr] gap-6 items-start">

        {/* LEFT: Categories */}
        <div className="space-y-6">
          {/* ── Income Categories ── */}
          <div className={`${surface} rounded-xl border ${border} overflow-hidden shadow-sm`}>
            <div className={`px-4 py-3 border-b flex justify-between items-center ${sectionHd('emerald')}`}>
              <h2 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`}>
                <Coins className="w-5 h-5" /> หมวดหมู่รายรับ
              </h2>
              <button onClick={() => onAddCategory('income')} className={`text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'bg-emerald-600/80 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                <PlusCircle className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
            <div>
              {categories.filter(c => c.type === 'income').length === 0 ? (
                <p className={`text-sm text-center py-8 ${textMuted}`}>ยังไม่มีหมวดหมู่รายรับ</p>
              ) : (
                categories.filter(c => c.type === 'income').map(cat => (
                  <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={true} isDarkMode={isDarkMode} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} />
                ))
              )}
            </div>
          </div>

          {/* ── Expense Categories ── */}
          <div className={`${surface} rounded-xl border ${border} overflow-hidden shadow-sm`}>
            <div className={`px-4 py-3 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h2 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                <Wallet className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`} /> หมวดหมู่รายจ่าย
              </h2>
              <button onClick={() => onAddCategory('expense')} className={`text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'bg-blue-600/80 hover:bg-blue-500' : 'bg-[#00509E] hover:bg-[#003d7a]'}`}>
                <PlusCircle className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
            <div>
              {categories.filter(c => c.type === 'expense').length === 0 ? (
                <p className={`text-sm text-center py-8 ${textMuted}`}>ยังไม่มีหมวดหมู่รายจ่าย</p>
              ) : (
                categories.filter(c => c.type === 'expense').map(cat => (
                  <CategoryRow key={cat.id} cat={cat} isNew={cat.id === newCatId} isIncome={false} isDarkMode={isDarkMode} onMove={handleMoveCategory} onChange={handleCategoryChange} onDelete={handleDeleteCategory} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: Day Types & Wallets */}
        <div className="space-y-6">
          {/* ── Day Types ── */}
          <div className={`${surface} rounded-xl border ${border} overflow-hidden shadow-sm`}>
            <div className={`px-4 py-3 border-b flex justify-between items-center ${sectionHd('orange')}`}>
              <h2 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-orange-400' : 'text-orange-800'}`}>
                <CalendarClock className="w-5 h-5" /> ชนิดของวันบนปฏิทิน
              </h2>
              <button onClick={handleAddDayType} className={`text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'bg-orange-600/80 hover:bg-orange-500' : 'bg-orange-600 hover:bg-orange-700'}`}>
                <PlusCircle className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
            <div className="p-3 space-y-2">
              {dayTypeConfig.map(dt => (
                <div key={dt.id} className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors group ${isDarkMode ? 'border-slate-700 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'}`}>
                  <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`}>
                    <button onClick={() => handleMoveDayType(dt.id, 'UP')} className={`p-0.5 rounded ${isDarkMode ? 'hover:text-orange-400' : 'hover:text-orange-600'}`}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleMoveDayType(dt.id, 'DOWN')} className={`p-0.5 rounded ${isDarkMode ? 'hover:text-orange-400' : 'hover:text-orange-600'}`}><ChevronDown className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: dt.color }} />
                  <input type="text" value={dt.label} onChange={e => handleDayTypeConfigChange(dt.id, 'label', e.target.value)} className={`flex-1 min-w-0 px-2 py-1.5 border rounded-lg outline-none focus:ring-1 font-bold text-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-orange-500' : 'border-slate-200 text-slate-800 focus:border-orange-400'}`} placeholder="ชื่อชนิดวัน" />
                  <ColorPicker color={dt.color} onChange={c => handleDayTypeConfigChange(dt.id, 'color', c)} isDarkMode={isDarkMode} />
                  <div className={`w-px h-5 shrink-0 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`} />
                  <button onClick={() => handleDeleteDayType(dt.id)} disabled={dayTypeConfig.length <= 2} className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-500/80' : 'text-slate-400 hover:text-white hover:bg-red-500'}`} title={dayTypeConfig.length <= 2 ? 'ต้องมีอย่างน้อย 2 ชนิด' : 'ลบ'}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* ── Payment Methods (กระเป๋าเงิน) ── */}
          <div className={`${surface} rounded-xl border ${border} overflow-hidden shadow-sm mt-6`}>
            <div className={`px-4 py-3 border-b flex justify-between items-center ${sectionHd('indigo')}`}>
              <h2 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-800'}`}>
                <Wallet className="w-5 h-5" /> กระเป๋าเงิน / ช่องทางจ่าย
              </h2>
              <button onClick={handleAddPaymentMethod} className={`text-white px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 ${isDarkMode ? 'bg-indigo-600/80 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                <PlusCircle className="w-4 h-4" /> เพิ่ม
              </button>
            </div>
            
            {/* 🌟 Info Banner อธิบายการใช้งานกระเป๋าเงิน */}
            <div className={`mx-3 mt-3 p-3 rounded-lg text-xs border ${isDarkMode ? 'bg-indigo-900/20 border-indigo-800/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'}`}>
               <p className="font-bold mb-1">💡 การจัดการยอดเงิน:</p>
               <ul className="space-y-1 ml-4 list-disc">
                 <li><strong>ช่องยอดยกมา:</strong> สามารถกด <Unlock className="inline w-3 h-3 text-orange-500" /> เพื่อปลดล็อคและพิมพ์ยอดตั้งต้นได้เอง</li>
                 <li><strong>ปุ่ม <Zap className="inline w-3 h-3 text-emerald-500" /> (ปรับยอดด่วน):</strong> กรอกแค่ <u>ยอดเงินจริงที่มีอยู่ตอนนี้</u> ระบบจะคำนวณยอดยกมาย้อนหลังให้ตรงเป๊ะอัตโนมัติ</li>
               </ul>
            </div>

            <div className="p-3 space-y-2">
              {paymentMethods.length === 0 && (
                <p className={`text-sm text-center py-4 ${textMuted}`}>ยังไม่มีช่องทางชำระเงิน</p>
              )}
              {paymentMethods.map(pm => (
                <div key={pm.id} className={`flex items-center gap-2 px-3 py-2.5 border rounded-xl transition-colors group ${isDarkMode ? 'border-slate-700 hover:bg-slate-800/60' : 'border-slate-100 hover:bg-slate-50'}`}>
                  
                  <div className={`flex flex-col items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`}>
                    <button onClick={() => handleMovePaymentMethod(pm.id, 'UP')} className={`p-0.5 rounded ${isDarkMode ? 'hover:text-indigo-400' : 'hover:text-indigo-600'}`}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleMovePaymentMethod(pm.id, 'DOWN')} className={`p-0.5 rounded ${isDarkMode ? 'hover:text-indigo-400' : 'hover:text-indigo-600'}`}><ChevronDown className="w-3.5 h-3.5" /></button>
                  </div>

                  <select value={pm.type || 'bank'} onChange={e => handlePaymentMethodChange(pm.id, 'type', e.target.value)} className={`border rounded-lg text-xs font-bold py-1.5 px-2 outline-none transition-colors cursor-pointer shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-white border-slate-300 text-slate-700'}`}>
                    <option value="bank">🏦 บัญชี</option>
                    <option value="credit">💳 เครดิต</option>
                    <option value="cash">💵 เงินสด</option>
                  </select>

                  <input type="text" value={pm.name} onChange={e => handlePaymentMethodChange(pm.id, 'name', e.target.value)} className={`flex-1 min-w-0 px-2 py-1.5 border rounded-lg outline-none focus:ring-1 font-bold text-sm transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-indigo-500' : 'border-slate-200 text-slate-800 focus:border-indigo-400'}`} placeholder="ชื่อกระเป๋า" />
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative w-[110px]">
                          <span className={`absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>฿</span>
                          <input
                            type="number"
                            value={pm.initialBalance === undefined ? '' : pm.initialBalance}
                            onChange={e => handlePaymentMethodChange(pm.id, 'initialBalance', parseFloat(e.target.value) || 0)}
                            disabled={!unlockedWallets[pm.id]}
                            className={`w-full pl-6 pr-2 py-1.5 border rounded-lg outline-none focus:ring-1 font-black text-sm text-right transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                                !unlockedWallets[pm.id] 
                                ? (isDarkMode ? 'bg-slate-800/50 text-slate-500 border-slate-700 cursor-not-allowed' : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed') 
                                : (isDarkMode ? 'bg-slate-900 border-indigo-500 text-slate-200 shadow-inner' : 'bg-white border-indigo-400 text-slate-800 shadow-inner')
                            }`}
                            placeholder="ยอดยกมา"
                          />
                      </div>
                      <button type="button" onClick={() => setUnlockedWallets(prev => ({ ...prev, [pm.id]: !prev[pm.id] }))} className={`p-1.5 rounded-lg transition-colors border ${!unlockedWallets[pm.id] ? (isDarkMode ? 'text-slate-500 border-slate-700 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100') : (isDarkMode ? 'text-orange-400 bg-orange-900/30 border-orange-800/50' : 'text-orange-600 bg-orange-50 border-orange-200')}`} title={!unlockedWallets[pm.id] ? "ปลดล็อคเพื่อแก้ไข" : "ล็อคยอดเงิน"}>
                          {!unlockedWallets[pm.id] ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                  </div>
                  
                  <ColorPicker color={pm.color || '#3B82F6'} onChange={c => handlePaymentMethodChange(pm.id, 'color', c)} isDarkMode={isDarkMode} />
                  <div className={`w-px h-5 shrink-0 ${isDarkMode ? 'bg-slate-600' : 'bg-slate-200'}`} />
                  
                  {/* ปุ่มเปิด Modal ปรับยอด */}
                  <button onClick={() => openAdjustModal(pm.id, pm.name)} className={`p-1.5 rounded-lg transition-all active:scale-95 border ${isDarkMode ? 'bg-emerald-900/20 text-emerald-400 border-emerald-800/50 hover:bg-emerald-500 hover:text-white' : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white'}`} title="ปรับยอดให้ตรงกับเงินจริงตอนนี้">
                    <Zap className="w-4 h-4" />
                  </button>
                  
                  <ConfirmDeleteButton onConfirm={() => handleDeletePaymentMethod(pm.id)} isDarkMode={isDarkMode} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Danger Zone ── */}
      <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'bg-red-900/10 border-red-900/50' : 'bg-red-50 border-red-200'}`}>
        <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'border-red-900/50' : 'border-red-200'}`}>
          <AlertCircle className="w-5 h-5 text-red-500" />
          <h2 className="font-bold text-red-500">Danger Zone</h2>
        </div>
        <div className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isDarkMode ? 'bg-slate-900/50' : 'bg-white'}`}>
          <div>
            <p className={`font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>ลบข้อมูลทั้งหมด (Factory Reset)</p>
            <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              ล้างรายการบัญชีและประวัติปฏิทินทั้งหมด — <strong className="text-red-500">ไม่สามารถกู้คืนได้</strong>
            </p>
          </div>
          <ConfirmDeleteButton onConfirm={handleDeleteAllData} isDarkMode={isDarkMode} size="lg" />
        </div>
      </div>

      {/* 🌟 Modal ปรับจูนยอดเงิน (แสดงทับส่วนอื่นๆ เมื่อถูกเรียก) */}
      {adjustModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-in fade-in duration-200">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
            {/* Modal Header */}
            <div className={`px-4 py-3 border-b flex justify-between items-center ${isDarkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <Zap className="w-5 h-5" /> ปรับยอดเงินปัจจุบัน
              </h3>
              <button 
                onClick={() => setAdjustModal({ isOpen: false, pmId: null, pmName: '' })}
                className={`p-1 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className={`block text-sm font-bold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  ยอดเงินใน <span className="text-indigo-500">"{adjustModal.pmName}"</span> ปัจจุบันมีเท่าไหร่?
                </label>
                <p className={`text-xs mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  ระบบจะคำนวณยอดยกมาย้อนหลังให้ตรงกับตัวเลขนี้โดยอัตโนมัติ
                </p>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 font-bold ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>฿</span>
                  <input
                    ref={adjustInputRef}
                    type="number"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && confirmAdjustBalance()}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-4 py-2.5 text-lg font-black rounded-xl border outline-none focus:ring-2 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                      isDarkMode 
                        ? 'bg-slate-900 border-slate-600 focus:border-emerald-500 focus:ring-emerald-500/20 text-white' 
                        : 'bg-slate-50 border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 text-slate-800'
                    }`}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAdjustModal({ isOpen: false, pmId: null, pmName: '' })}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-bold transition-colors ${
                    isDarkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={confirmAdjustBalance}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm"
                >
                  บันทึกยอดใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}