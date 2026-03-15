// src/components/DayDetailModal.jsx
import { useState } from 'react';
import { X, Trash2, PlusCircle, Coins, Wallet, CheckCircle, Zap } from 'lucide-react';
import { formatMoney, hexToRgb } from '../utils/formatters';

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export default function DayDetailModal({
  dateStr,
  transactions,
  categories,
  isDarkMode,
  onClose,
  onSave,
  onDelete,
}) {
  const [dd, mm, yyyy] = dateStr.split('/');
  const dateObj  = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  const dayOfWeek = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][dateObj.getDay()];
  const displayDate = `${parseInt(dd)} ${THAI_MONTHS[parseInt(mm) - 1]} ${yyyy}`;

  const defaultExpenseCat = categories.find(c => c.type === 'expense')?.name || '';
  const defaultIncomeCat  = categories.find(c => c.type === 'income')?.name || '';


  const [localItems, setLocalItems]           = useState([]);
  const [formType, setFormType]               = useState('expense');
  const [formCat, setFormCat]                 = useState(defaultExpenseCat);
  const [formDesc, setFormDesc]               = useState('');
  const [formAmt, setFormAmt]                 = useState('');
  const [isSaving, setIsSaving]               = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // filter localItems ออกถ้า id นั้นถูก save ลง transactions จริงแล้ว (ป้องกัน duplicate key)
  const txIds = new Set(transactions.map(t => t.id));
  const pendingItems = localItems.filter(i => !txIds.has(i.id));
  const dayTx   = [...transactions.filter(t => t.date === dateStr), ...pendingItems];
  const expenses = dayTx.filter(t => categories.find(c => c.name === t.category)?.type !== 'income');
  const income   = dayTx.filter(t => categories.find(c => c.name === t.category)?.type === 'income');
  const totalExp = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalInc = income.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const switchType = (type) => {
    setFormType(type);
    setFormCat(type === 'expense' ? defaultExpenseCat : defaultIncomeCat);
  };

  const handleSave = async () => {
    const amt = parseFloat(formAmt);
    if (!amt || amt <= 0 || !formCat) return;

    const newItem = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: dateStr,
      category: formCat,
      description: formDesc || formCat,
      amount: amt,
      dayNote: '',
    };

    // 1. อัปเดต UI ทันที (Optimistic Update)
    const catObj = categories.find(c => c.name === formCat);
    setLocalItems(prev => [...prev, { ...newItem, _catObj: catObj }]);
    setFormDesc('');
    setFormAmt('');

    // 2. ส่ง DB ใน background
    setIsSaving(true);
    try {
      await onSave(newItem); // รอจนบันทึกลง DB และโหลดข้อมูลใหม่เสร็จ
      
      // 🟢 เพิ่มบรรทัดนี้: ลบออกจาก localItems เพราะข้อมูลจริงวิ่งเข้า transactions แล้ว
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      
    } catch (err) {
      // ถ้า save ไม่สำเร็จ ให้เอา optimistic item ออก
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      console.error('Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      // ถ้าเป็น optimistic item ให้ลบออกจาก localItems ได้เลย
      const isLocal = localItems.some(i => i.id === id);
      if (isLocal) {
        setLocalItems(prev => prev.filter(i => i.id !== id));
      } else {
        onDelete(id);
      }
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(c => c === id ? null : c), 3000);
    }
  };

  const surface     = isDarkMode ? 'bg-slate-900' : 'bg-white';
  const surfaceAlt  = isDarkMode ? 'bg-slate-800' : 'bg-slate-50';
  const border      = isDarkMode ? 'border-slate-700' : 'border-slate-200';
  const textPrimary = isDarkMode ? 'text-slate-100' : 'text-slate-800';
  const textMuted   = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const inputClass  = `px-3 py-2 rounded-xl border outline-none focus:ring-1 text-sm font-medium transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]'}`;

  const TxRow = ({ tx }) => {
    const cat = categories.find(c => c.name === tx.category);
    const isInc = cat?.type === 'income';
    const color = cat?.color || '#94a3b8';
    const isConfirming = confirmDeleteId === tx.id;
    return (
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${isDarkMode ? 'border-slate-700/60' : 'border-slate-100'}`}
        style={{ backgroundColor: `rgba(${hexToRgb(color)}, ${isDarkMode ? 0.06 : 0.04})` }}
      >
        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${textPrimary}`}>{tx.description || tx.category}</p>
          <p className="text-[11px] font-medium" style={{ color, filter: isDarkMode ? 'brightness(1.3)' : 'brightness(0.7)' }}>
            {cat?.icon} {tx.category}
          </p>
        </div>
        <span className={`text-sm font-black shrink-0 ${isInc ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-red-600')}`}>
          {isInc ? '+' : '-'}{formatMoney(tx.amount)} ฿
        </span>
        <button
          onClick={() => handleDelete(tx.id)}
          className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 ${
            isConfirming
              ? 'bg-red-500 text-white'
              : (isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-500 hover:bg-red-50')
          }`}
        >
          {isConfirming ? 'ยืนยัน?' : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`${surface} rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in zoom-in-95 duration-200 border ${border}`} style={{ maxHeight: "calc(100vh - 48px)" }}>

        {/* Header */}
        <div className={`flex items-start justify-between px-5 py-4 border-b ${border} shrink-0`}>
          <div>
            <h2 className={`text-xl font-black ${textPrimary}`}>{displayDate}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-xs font-medium ${textMuted}`}>วัน{dayOfWeek}</span>
              {totalExp > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600'}`}>
                  ▼ {formatMoney(totalExp)} ฿
                </span>
              )}
              {totalInc > 0 && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                  ▲ {formatMoney(totalInc)} ฿
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className={`p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {dayTx.length === 0 && (
            <p className={`text-sm text-center py-6 ${textMuted}`}>ยังไม่มีรายการ — เพิ่มได้ด้านล่างเลยครับ</p>
          )}
          {expenses.length > 0 && (
            <div>
              <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                <Wallet className="w-3.5 h-3.5" /> รายจ่าย
              </p>
              <div className="space-y-1.5">{expenses.map(tx => <TxRow key={tx.id} tx={tx} />)}</div>
            </div>
          )}
          {income.length > 0 && (
            <div>
              <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                <Coins className="w-3.5 h-3.5" /> รายรับ
              </p>
              <div className="space-y-1.5">{income.map(tx => <TxRow key={tx.id} tx={tx} />)}</div>
            </div>
          )}
        </div>

        {/* Inline Add Form */}
        <div className={`border-t ${border} px-4 pt-4 pb-5 space-y-2.5 shrink-0 rounded-b-2xl ${surfaceAlt}`}>

          {/* Type toggle */}
          <div className={`flex p-1 rounded-xl ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200/60'}`}>
            <button
              onClick={() => switchType('expense')}
              className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${formType === 'expense' ? (isDarkMode ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : textMuted}`}
            >
              รายจ่าย
            </button>
            <button
              onClick={() => switchType('income')}
              className={`flex-1 py-1.5 text-sm font-bold rounded-lg transition-all ${formType === 'income' ? (isDarkMode ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : textMuted}`}
            >
              รายรับ
            </button>
          </div>

          {/* Category */}
          <select
            value={formCat}
            onChange={e => setFormCat(e.target.value)}
            className={`${inputClass} w-full`}
          >
            {categories.filter(c => c.type === formType).map(c => (
              <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
            ))}
          </select>

          {/* Description + Amount on same row */}
          <div className="flex gap-2">
            <input
              type="text"
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="รายละเอียด..."
              className={`${inputClass} flex-1`}
            />
            <input
              type="number"
              value={formAmt}
              onChange={e => setFormAmt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0"
              className={`${inputClass} w-28 text-right font-black`}
            />
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!formAmt || parseFloat(formAmt) <= 0 || isSaving}
            className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-white shadow-sm ${
              formType === 'expense'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-emerald-500 hover:bg-emerald-600'
            }`}
          >
            {isSaving
              ? <><Zap className="w-4 h-4 animate-pulse" /> กำลังบันทึก...</>
              : <><CheckCircle className="w-4 h-4" /> บันทึก (Enter)</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}