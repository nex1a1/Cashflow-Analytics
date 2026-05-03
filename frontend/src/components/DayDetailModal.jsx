// src/components/DayDetailModal.jsx
import { useState, useMemo, useEffect, memo } from 'react';
import { X, Trash2, Coins, Wallet, CheckCircle, Zap, Star } from 'lucide-react';
import { formatMoney, hexToRgb } from '../utils/formatters';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

const TxRow = memo(({ tx, catObj, confirmDeleteId, onDeleteClick }) => {
  const { isDarkMode: dm } = useTheme();
  const isInc = catObj?.type === 'income';
  const color = catObj?.color || '#94a3b8';
  const isConfirming = confirmDeleteId === tx.id;
  
  const rowBg = `rgba(${hexToRgb(color)}, ${dm ? 0.06 : 0.04})`;
  const borderCls = dm ? 'border-slate-700/60' : 'border-slate-100';
  const textPriCls = dm ? 'text-slate-100' : 'text-slate-800';
  
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-sm border transition-all ${borderCls}`}
      style={{ backgroundColor: rowBg }}>
      <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold truncate ${textPriCls}`}>{tx.description || tx.category}</p>
        <p className="text-[10px] font-medium flex items-center gap-1 mt-0.5" style={{ color, filter: dm ? 'brightness(1.3)' : 'brightness(0.7)' }}>
          {catObj?.icon} {tx.category}
        </p>
      </div>
      <span className={`text-sm font-black shrink-0 ${isInc ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-red-400' : 'text-red-600')}`}>
        {isInc ? '+' : '-'}{formatMoney(tx.amount)} ฿
      </span>
      <button onClick={() => onDeleteClick(tx.id)}
        className={`shrink-0 px-2 py-1 rounded-sm text-xs font-bold transition-all active:scale-95 ${isConfirming ? 'bg-red-500 text-white' : (dm ? 'text-slate-500 hover:text-red-400 hover:bg-red-900/30' : 'text-slate-400 hover:text-red-500 hover:bg-red-50')}`}>
        {isConfirming ? 'ยืนยัน?' : <Trash2 className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}, (prev, next) => {
  return prev.tx.id === next.tx.id && 
         prev.tx.amount === next.tx.amount &&
         prev.confirmDeleteId === next.confirmDeleteId;
});

export default function DayDetailModal({ dateStr, transactions = [], categories = [], onClose, onSave, onDelete }) {
  const { isDarkMode: dm } = useTheme();
  const { showToast } = useToast();
  
  const [ddStr, mmStr, yyyyStr] = dateStr.split('/');
  const d = parseInt(ddStr, 10);
  const m = parseInt(mmStr, 10);
  const y = parseInt(yyyyStr, 10);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][dateObj.getDay()];
  const displayDate = `${d} ${THAI_MONTHS[m - 1]} ${y}`;

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

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const txIds      = new Set(transactions.map(t => t.id));
  const pendingItems = localItems.filter(i => !txIds.has(i.id));
  const dayTx      = [...transactions.filter(t => t.date === dateStr), ...pendingItems];
  
  const catMap = useMemo(() => {
    return categories.reduce((acc, c) => { acc[c.name] = c; return acc; }, {});
  }, [categories]);

  const expenses   = dayTx.filter(t => catMap[t.category]?.type === 'expense');
  const income     = dayTx.filter(t => catMap[t.category]?.type === 'income');
  const totalExp   = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalInc   = income.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const quickSuggestions = useMemo(() => {
    const typeTx = transactions.filter(t => {
      const c = catMap[t.category];
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
  }, [transactions, catMap, formType, suggCatFilter]);

  const applySuggestion = (s) => { setFormCat(s.category); setFormDesc(s.description || ''); setFormAmt(s.amount); };
  const switchType = (type) => { setFormType(type); setFormCat(type === 'expense' ? defaultExpenseCat : defaultIncomeCat); setSuggCatFilter('ALL'); };

  const handleSave = async () => {
    const amt = parseFloat(formAmt);
    if (!amt || amt <= 0 || !formCat) return;
    setIsSaving(true);
    
    const newItem = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: dateStr, category: formCat,
      description: formDesc || formCat, amount: amt, dayNote: ''
    };
    const catObj = catMap[formCat];
    
    setLocalItems(prev => [...prev, { ...newItem, _catObj: catObj }]);
    
    try {
      await onSave(newItem);
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      setFormDesc(''); setFormAmt('');
    } catch (err) {
      console.error('Save failed:', err);
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      showToast('⚠️ ไม่สามารถบันทึกข้อมูลได้: ' + (err.message || 'Unknown error'), 'error');
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

  const renderList = (items) => items.map(tx => (
    <TxRow 
      key={tx.id} 
      tx={tx} 
      catObj={catMap[tx.category]} 
      confirmDeleteId={confirmDeleteId} 
      onDeleteClick={handleDelete} 
    />
  ));

  const tokens = {
    surface: dm ? 'bg-slate-900' : 'bg-white',
    surfaceAlt: dm ? 'bg-slate-800' : 'bg-slate-50',
    border: dm ? 'border-slate-700' : 'border-slate-200',
    textPri: dm ? 'text-slate-100' : 'text-slate-800',
    textMuted: dm ? 'text-slate-400' : 'text-slate-500',
    input: `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors w-full ${dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`,
    closeBtn: `p-1.5 rounded-sm transition-colors ${dm ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`,
    suggBtn: `w-full flex items-center justify-between p-3 rounded-sm border transition-all active:scale-95 text-left ${dm ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`${tokens.surface} rounded-sm shadow-2xl w-full max-w-4xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200 border ${tokens.border} overflow-hidden`}
        style={{ maxHeight: 'calc(100vh - 48px)' }}>

        <div className={`flex flex-col w-full md:w-3/5 border-b md:border-b-0 md:border-r ${tokens.border} h-[50vh] md:h-auto`}>
          <div className={`flex items-start justify-between px-5 py-4 border-b ${tokens.border} shrink-0`}>
            <div>
              <h2 className={`text-lg font-black ${tokens.textPri}`}>{displayDate}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-medium ${tokens.textMuted}`}>วัน{dayOfWeek}</span>
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
            <button onClick={onClose} className={`md:hidden ${tokens.closeBtn}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5" style={{ scrollbarWidth: 'thin' }}>
            {dayTx.length === 0 && (
              <p className={`text-sm text-center py-8 ${tokens.textMuted}`}>ยังไม่มีรายการ — เพิ่มข้อมูลด้านล่างเลยครับ</p>
            )}
            {expenses.length > 0 && (
              <div>
                <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${dm ? 'text-red-400' : 'text-red-600'}`}>
                  <Wallet className="w-3.5 h-3.5" /> รายจ่าย
                </p>
                <div className="space-y-1.5">
                  {renderList(expenses)}
                </div>
              </div>
            )}
            {income.length > 0 && (
              <div>
                <p className={`text-xs font-bold mb-2 flex items-center gap-1.5 ${dm ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <Coins className="w-3.5 h-3.5" /> รายรับ
                </p>
                <div className="space-y-1.5">
                  {renderList(income)}
                </div>
              </div>
            )}
          </div>

          <div className={`border-t ${tokens.border} px-4 pt-4 pb-5 space-y-2.5 shrink-0 ${tokens.surfaceAlt}`}>
            <div className={`flex p-0.5 rounded-sm border ${dm ? 'bg-slate-900 border-slate-700' : 'bg-slate-200/60 border-slate-200'}`}>
              <button onClick={() => switchType('expense')} className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${formType === 'expense' ? (dm ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : tokens.textMuted}`}>รายจ่าย</button>
              <button onClick={() => switchType('income')} className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${formType === 'income' ? (dm ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : tokens.textMuted}`}>รายรับ</button>
            </div>
            <select value={formCat} onChange={e => setFormCat(e.target.value)} className={tokens.input}>
              {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
            <div className="flex gap-2">
              <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} onKeyDown={handleKeyDown} placeholder="รายละเอียด..." className={`${tokens.input} flex-1`} />
              <input type="number" value={formAmt} onChange={e => setFormAmt(e.target.value)} onKeyDown={handleKeyDown} placeholder="0" className={`${tokens.input} !w-24 md:!w-28 text-right font-black`} />
            </div>
            <button onClick={handleSave} disabled={!formAmt || parseFloat(formAmt) <= 0 || isSaving}
              className={`w-full py-2.5 rounded-sm font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-white shadow-sm border ${formType === 'expense' ? 'bg-red-500 hover:bg-red-600 border-red-600' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600'}`}>
              {isSaving ? <><Zap className="w-4 h-4 animate-pulse" /> กำลังบันทึก...</> : <><CheckCircle className="w-4 h-4" /> บันทึก (Enter)</>}
            </button>
          </div>
        </div>

        <div className={`flex flex-col w-full md:w-2/5 ${tokens.surfaceAlt} h-[40vh] md:h-auto`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${tokens.border} shrink-0`}>
            <div>
              <h3 className={`font-bold text-sm flex items-center gap-2 ${tokens.textPri}`}>
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Quick Suggestions
              </h3>
              <p className={`text-[10px] mt-0.5 ${tokens.textMuted}`}>คลิกเพื่อเติมฟอร์มอัตโนมัติ</p>
            </div>
            <button onClick={onClose} className={`hidden md:block ${tokens.closeBtn}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={`px-4 py-2.5 border-b shrink-0 ${tokens.border}`}>
            <select value={suggCatFilter} onChange={e => setSuggCatFilter(e.target.value)}
              className={`w-full px-3 py-2 text-xs border rounded-sm outline-none font-medium transition-colors ${dm ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-white border-slate-300 text-slate-700 focus:border-[#00509E]'}`}>
              <option value="ALL">📊 ทุกหมวดหมู่</option>
              {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: 'thin' }}>
            {quickSuggestions.length === 0 ? (
              <p className={`text-sm text-center py-8 ${tokens.textMuted}`}>ยังไม่มีข้อมูลในหมวดนี้</p>
            ) : quickSuggestions.map((s, idx) => {
              const catObj = catMap[s.category];
              return (
                <button key={idx} onClick={() => applySuggestion(s)} className={tokens.suggBtn}>
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