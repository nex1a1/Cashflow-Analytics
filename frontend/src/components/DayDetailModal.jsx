// src/components/DayDetailModal.jsx
import { useState, useMemo } from 'react';
import { X, Trash2, Coins, Wallet, CheckCircle, Zap, Star } from 'lucide-react';
import { formatMoney, hexToRgb } from '../utils/formatters';

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export default function DayDetailModal({ dateStr, transactions, categories, isDarkMode, onClose, onSave, onDelete }) {
  const dm = isDarkMode;
  const [dd, mm, yyyy]   = dateStr.split('/');
  const dateObj          = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  const dayOfWeek        = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][dateObj.getDay()];
  const displayDate      = `${parseInt(dd)} ${THAI_MONTHS[parseInt(mm) - 1]} ${yyyy}`;

  const defaultExpenseCat = categories.find(c => c.type === 'expense')?.name || '';
  const defaultIncomeCat  = categories.find(c => c.type === 'income')?.name  || '';

  const [localItems, setLocalItems]           = useState([]);
  const [formType, setFormType]               = useState('expense');
  const [formCat, setFormCat]                 = useState(defaultExpenseCat);
  const [formDesc, setFormDesc]               = useState('');
  const [formAmt, setFormAmt]                 = useState('');
  const [isSaving, setIsSaving]               = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [suggCatFilter, setSuggCatFilter]     = useState('ALL');

  const txIds      = new Set(transactions.map(t => t.id));
  const pendingItems = localItems.filter(i => !txIds.has(i.id));
  const dayTx      = [...transactions.filter(t => t.date === dateStr), ...pendingItems];
  const expenses   = dayTx.filter(t => categories.find(c => c.name === t.category)?.type === 'expense');
  const income     = dayTx.filter(t => categories.find(c => c.name === t.category)?.type === 'income');
  const totalExp   = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalInc   = income.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const quickSuggestions = useMemo(() => {
    const typeTx = transactions.filter(t => {
      const c = categories.find(cat => cat.name === t.category);
      if (c?.type !== formType) return false;
      if (suggCatFilter !== 'ALL' && t.category !== suggCatFilter) return false;
      return true;
    });
    const frequency = {};
    typeTx.forEach(t => {
      const desc = (t.description && t.description !== t.category) ? t.description : '';
      const amt  = parseFloat(t.amount) || 0;
      const key  = `${t.category}|${desc}|${amt}`;
      if (!frequency[key]) frequency[key] = { count: 0, amount: amt };
      frequency[key].count += 1;
    });
    return Object.entries(frequency)
      .sort(([, a], [, b]) => b.count - a.count || b.amount - a.amount)
      .slice(0, 8)
      .map(([key, { count, amount }]) => {
        const [category, description] = key.split('|');
        return { category, description, amount: String(amount), count };
      });
  }, [transactions, categories, formType, suggCatFilter]);

  const applySuggestion = (s) => { setFormCat(s.category); setFormDesc(s.description || ''); setFormAmt(s.amount); };
  const switchType = (type) => { setFormType(type); setFormCat(type === 'expense' ? defaultExpenseCat : defaultIncomeCat); setSuggCatFilter('ALL'); };

  const handleSave = async () => {
    const amt = parseFloat(formAmt);
    if (!amt || amt <= 0 || !formCat) return;
    setIsSaving(true);
    try {
      const newItem = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        date: dateStr, category: formCat,
        description: formDesc || formCat, amount: amt, dayNote: ''
      };
      const catObj = categories.find(c => c.name === formCat);
      setLocalItems(prev => [...prev, { ...newItem, _catObj: catObj }]);
      await onSave(newItem);
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      setFormDesc(''); setFormAmt('');
    } catch (err) {
      console.error('Save failed:', err);
      alert('⚠️ ไม่สามารถบันทึกข้อมูลได้\n\n' + (err.message || 'Unknown error'));
    } finally { setIsSaving(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      if (localItems.some(i => i.id === id)) setLocalItems(prev => prev.filter(i => i.id !== id));
      else onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
      setTimeout(() => setConfirmDeleteId(c => c === id ? null : c), 3000);
    }
  };

  /* ── shared tokens ── */
  const surface    = dm ? 'bg-slate-900' : 'bg-white';
  const surfaceAlt = dm ? 'bg-slate-800' : 'bg-slate-50';
  const border     = dm ? 'border-slate-700' : 'border-slate-200';
  const textPri    = dm ? 'text-slate-100' : 'text-slate-800';
  const textMuted  = dm ? 'text-slate-400' : 'text-slate-500';
  const inputCls   = `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors ${dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`;

  const TxRow = ({ tx }) => {
    const cat = categories.find(c => c.name === tx.category);
    const isInc = cat?.type === 'income';
    const color = cat?.color || '#94a3b8';
    const isConfirming = confirmDeleteId === tx.id;
    return (
      <div className={`flex items-center gap-3 px-3 py-2.5 rounded-sm border transition-all ${dm ? 'border-slate-700/60' : 'border-slate-100'}`}
        style={{ backgroundColor: `rgba(${hexToRgb(color)}, ${dm ? 0.06 : 0.04})` }}>
        <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate ${textPri}`}>{tx.description || tx.category}</p>
          <p className="text-[10px] font-medium flex items-center gap-1 mt-0.5" style={{ color, filter: dm ? 'brightness(1.3)' : 'brightness(0.7)' }}>
            {cat?.icon} {tx.category}
          </p>
        </div>
        <span className={`text-sm font-black shrink-0 ${isInc ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-red-400' : 'text-red-600')}`}>
          {isInc ? '+' : '-'}{formatMoney(tx.amount)} ฿
        </span>
        <button onClick={() => handleDelete(tx.id)}
          className={`shrink-0 px-2 py-1 rounded-sm text-xs font-bold transition-all active:scale-95 ${isConfirming ? 'bg-red-500 text-white' : (dm ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-500 hover:bg-red-50')}`}>
          {isConfirming ? 'ยืนยัน?' : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${surface} rounded-sm shadow-2xl w-full max-w-4xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200 border ${border} overflow-hidden`}
        style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Left: transaction list + add form */}
        <div className={`flex flex-col w-full md:w-3/5 border-b md:border-b-0 md:border-r ${border} h-[50vh] md:h-auto`}>
          {/* Date header */}
          <div className={`flex items-start justify-between px-5 py-4 border-b ${border} shrink-0`}>
            <div>
              <h2 className={`text-lg font-black ${textPri}`}>{displayDate}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-medium ${textMuted}`}>วัน{dayOfWeek}</span>
                {totalExp > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${dm ? 'bg-red-900/40 text-red-400' : 'bg-red-50 text-red-600'}`}>
                    ▼ {formatMoney(totalExp)} ฿
                  </span>
                )}
                {totalInc > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${dm ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                    ▲ {formatMoney(totalInc)} ฿
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className={`md:hidden p-1.5 rounded-sm transition-colors ${dm ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tx list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ scrollbarWidth: 'thin' }}>
            {dayTx.length === 0 && (
              <p className={`text-sm text-center py-8 ${textMuted}`}>ยังไม่มีรายการ — เพิ่มข้อมูลด้านล่างเลยครับ</p>
            )}
            {expenses.length > 0 && (
              <div>
                <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${dm ? 'text-red-400' : 'text-red-600'}`}>
                  <Wallet className="w-3.5 h-3.5" /> รายจ่าย
                </p>
                <div className="space-y-1.5">{expenses.map(tx => <TxRow key={tx.id} tx={tx} />)}</div>
              </div>
            )}
            {income.length > 0 && (
              <div>
                <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Coins className="w-3.5 h-3.5" /> รายรับ
                </p>
                <div className="space-y-1.5">{income.map(tx => <TxRow key={tx.id} tx={tx} />)}</div>
              </div>
            )}
          </div>

          {/* Add form */}
          <div className={`border-t ${border} px-4 pt-4 pb-5 space-y-2.5 shrink-0 ${surfaceAlt}`}>
            <div className={`flex p-0.5 rounded-sm border ${dm ? 'bg-slate-900 border-slate-700' : 'bg-slate-200/60 border-slate-200'}`}>
              <button onClick={() => switchType('expense')} className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${formType === 'expense' ? (dm ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : textMuted}`}>รายจ่าย</button>
              <button onClick={() => switchType('income')} className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${formType === 'income' ? (dm ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : textMuted}`}>รายรับ</button>
            </div>
            <select value={formCat} onChange={e => setFormCat(e.target.value)} className={`${inputCls} w-full`}>
              {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} onKeyDown={handleKeyDown} placeholder="รายละเอียด..." className={`${inputCls} flex-1`} />
              <input type="number" value={formAmt} onChange={e => setFormAmt(e.target.value)} onKeyDown={handleKeyDown} placeholder="0" className={`${inputCls} w-24 md:w-28 text-right font-black`} />
            </div>
            <button onClick={handleSave} disabled={!formAmt || parseFloat(formAmt) <= 0 || isSaving}
              className={`w-full py-2.5 rounded-sm font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-white shadow-sm border ${formType === 'expense' ? 'bg-red-500 hover:bg-red-600 border-red-600' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600'}`}>
              {isSaving ? <><Zap className="w-4 h-4 animate-pulse" /> กำลังบันทึก...</> : <><CheckCircle className="w-4 h-4" /> บันทึก (Enter)</>}
            </button>
          </div>
        </div>

        {/* Right: Quick Suggestions */}
        <div className={`flex flex-col w-full md:w-2/5 ${surfaceAlt} h-[40vh] md:h-auto`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${border} shrink-0`}>
            <div>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${textPri}`}>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Quick Suggestions
              </h3>
              <p className={`text-[10px] mt-0.5 ${textMuted}`}>คลิกเพื่อเติมฟอร์มอัตโนมัติ</p>
            </div>
            <button onClick={onClose} className={`hidden md:block p-1.5 rounded-sm transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`px-4 py-2.5 border-b shrink-0 ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            <select value={suggCatFilter} onChange={e => setSuggCatFilter(e.target.value)}
              className={`w-full px-3 py-2 text-xs border rounded-sm outline-none font-medium transition-colors ${dm ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-700 focus:border-[#00509E]'}`}>
              <option value="ALL">📊 ทุกหมวดหมู่</option>
              {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin' }}>
            {quickSuggestions.length === 0 ? (
              <p className={`text-sm text-center py-8 ${textMuted}`}>ยังไม่มีข้อมูลในหมวดนี้</p>
            ) : quickSuggestions.map((s, idx) => {
              const catObj = categories.find(c => c.name === s.category);
              return (
                <button key={idx} onClick={() => applySuggestion(s)}
                  className={`w-full flex items-center justify-between p-3 rounded-sm border transition-all active:scale-95 text-left ${dm ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`}>
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 text-sm"
                      style={{ backgroundColor: `rgba(${hexToRgb(catObj?.color || '#94a3b8')}, ${dm ? 0.2 : 0.1})` }}>
                      {catObj?.icon}
                    </div>
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold truncate ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{s.description || s.category}</p>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-sm whitespace-nowrap shrink-0 ${dm ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-[#00509E]'}`}>{s.count}x</span>
                      </div>
                      <p className={`text-[10px] truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{s.category}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-black shrink-0 ml-2 ${formType === 'expense' ? (dm ? 'text-red-400' : 'text-red-500') : (dm ? 'text-emerald-400' : 'text-emerald-500')}`}>
                    {s.amount} ฿
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}