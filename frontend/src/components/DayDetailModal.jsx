// src/components/DayDetailModal.jsx
import { useState, useMemo } from 'react';
import { X, Trash2, Coins, Wallet, CheckCircle, Zap, Star } from 'lucide-react';
import { formatMoney, hexToRgb } from '../utils/formatters';

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export default function DayDetailModal({
  dateStr,
  transactions,
  categories,
  paymentMethods = [],
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
  const defaultPaymentMethodId = paymentMethods.length > 0 ? paymentMethods[0].id : '';
  const [formPaymentMethodId, setFormPaymentMethodId] = useState(defaultPaymentMethodId);

  const [localItems, setLocalItems]           = useState([]);
  const [formType, setFormType]               = useState('expense');
  const [formCat, setFormCat]                 = useState(defaultExpenseCat);
  const [formDesc, setFormDesc]               = useState('');
  const [formAmt, setFormAmt]                 = useState('');
  const [isSaving, setIsSaving]               = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const txIds = new Set(transactions.map(t => t.id));
  const pendingItems = localItems.filter(i => !txIds.has(i.id));
  const dayTx   = [...transactions.filter(t => t.date === dateStr), ...pendingItems];
  const expenses = dayTx.filter(t => categories.find(c => c.name === t.category)?.type !== 'income');
  const income   = dayTx.filter(t => categories.find(c => c.name === t.category)?.type === 'income');
  const totalExp = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalInc = income.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  // --- Logic สำหรับ Quick Suggestions ---
  const quickSuggestions = useMemo(() => {
    const typeTx = transactions.filter(t => {
      const c = categories.find(cat => cat.name === t.category);
      return c?.type === formType;
    });

    const frequency = {};
    typeTx.forEach(t => {
      const key = `${t.category}|${t.description || t.category}|${t.amount}`;
      frequency[key] = (frequency[key] || 0) + 1;
    });

    return Object.keys(frequency)
      .map(key => ({ key, count: frequency[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8) // ขยายโควต้าเป็น 8 รายการเพราะมีพื้นที่ด้านข้างแล้ว
      .map(item => {
        const [category, description, amount] = item.key.split('|');
        return { category, description, amount, count: item.count };
      });
  }, [transactions, categories, formType]);

  const applySuggestion = (sugg) => {
    setFormCat(sugg.category);
    setFormDesc(sugg.description === sugg.category ? '' : sugg.description);
    setFormAmt(sugg.amount);
  };
  // -------------------------------------

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
      paymentMethodId: formPaymentMethodId,
    };

    const catObj = categories.find(c => c.name === formCat);
    setLocalItems(prev => [...prev, { ...newItem, _catObj: catObj }]);
    setFormDesc('');
    setFormAmt('');

    setIsSaving(true);
    try {
      await onSave(newItem);
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
    } catch (err) {
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      console.error('Save failed:', err);
      alert('⚠️ ไม่สามารถบันทึกข้อมูลได้\n\nรายละเอียด: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
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
    // 🌟 1. เช็คว่ามีบรรทัดนี้อยู่ตรงนี้ไหม (ต้องอยู่ใน TxRow)
    const cat = categories.find(c => c.name === tx.category);
    const pmObj = paymentMethods.find(p => p.id === tx.paymentMethodId); 
    
    // โค้ดเดิมของคุณที่ดึงค่าสีและสถานะ
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
          
          {/* 🌟 2. ส่วนที่แสดงไอคอนและป้ายกระเป๋าเงิน */}
          <p className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5" style={{ color, filter: isDarkMode ? 'brightness(1.3)' : 'brightness(0.7)' }}>
            <span>{cat?.icon} {tx.category}</span>
            
            {/* โชว์ป้ายกระเป๋าเงิน ถ้าหาเจอ (ดึงสีจาก Settings มาใช้) */}
            {pmObj && (
              <span 
                className={`px-1.5 py-0.5 rounded border text-[9px] font-bold shrink-0 flex items-center gap-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}
                style={{ 
                  backgroundColor: `rgba(${hexToRgb(pmObj.color || '#3B82F6')}, ${isDarkMode ? 0.2 : 0.1})`, 
                  borderColor: `rgba(${hexToRgb(pmObj.color || '#3B82F6')}, ${isDarkMode ? 0.4 : 0.3})` 
                }}
              >
                {pmObj.type === 'credit' ? '💳' : (pmObj.type === 'cash' ? '💵' : '🏦')} {pmObj.name}
              </span>
            )}
          </p>
        </div>

        {/* ... (ส่วนจำนวนเงินและปุ่มลบ ยังเหมือนเดิม) ... */}
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
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ขยายขนาดตารางให้กว้างขึ้นและแบ่งคอลัมน์ (md:flex-row) */}
      <div className={`${surface} rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200 border ${border} overflow-hidden`} style={{ maxHeight: "calc(100vh - 48px)" }}>

        {/* --- ฝั่งซ้าย: ข้อมูลรายวันและฟอร์มเพิ่มข้อมูล (ความกว้าง 60%) --- */}
        <div className={`flex flex-col w-full md:w-3/5 border-b md:border-b-0 md:border-r ${border} h-[50vh] md:h-auto`}>
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
            {/* ซ่อนปุ่มกากบาทในจอมือถือ ให้ไปอยู่ฝั่งขวาแทน */}
            <button onClick={onClose} className={`md:hidden p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Transaction list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-3 space-y-3">
            {dayTx.length === 0 && (
              <p className={`text-sm text-center py-6 ${textMuted}`}>ยังไม่มีรายการ — เพิ่มข้อมูลด้านล่างเลยครับ</p>
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
          <div className={`border-t ${border} px-4 pt-4 pb-5 space-y-2.5 shrink-0 ${surfaceAlt}`}>
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

            <select
              value={formCat}
              onChange={e => setFormCat(e.target.value)}
              className={`${inputClass} w-full`}
            >
              {categories.filter(c => c.type === formType).map(c => (
                <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
              ))}
            </select>

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
                className={`${inputClass} w-24 md:w-28 text-right font-black`}
              />
            </div>
              {/* 🌟 [เพิ่มใหม่] ปุ่มให้กดเลือกกระเป๋า */}
            {paymentMethods.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {paymentMethods.map(pm => {
                  const isSelected = formPaymentMethodId === pm.id;
                  const pmColor = pm.color || '#3B82F6';
                  
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setFormPaymentMethodId(pm.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border flex items-center gap-1 ${
                        isSelected 
                          ? 'text-white shadow-sm scale-105' 
                          : (isDarkMode ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                      }`}
                      style={{
                        backgroundColor: isSelected ? pmColor : `rgba(${hexToRgb(pmColor)}, ${isDarkMode ? 0.15 : 0.05})`,
                        borderColor: isSelected ? pmColor : `rgba(${hexToRgb(pmColor)}, ${isDarkMode ? 0.4 : 0.2})`
                      }}
                    >
                      {pm.type === 'credit' ? '💳' : (pm.type === 'cash' ? '💵' : '🏦')} {pm.name}
                    </button>
                  );
                })}
              </div>
            )}
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

        {/* --- ฝั่งขวา: รายการที่ใช้บ่อย (ความกว้าง 40%) --- */}
        <div className={`flex flex-col w-full md:w-2/5 ${surfaceAlt} h-[40vh] md:h-auto`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${border} shrink-0`}>
            <div>
              <h3 className={`font-bold flex items-center gap-2 ${textPrimary}`}>
                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                Quick Suggestions
              </h3>
              <p className={`text-xs mt-0.5 ${textMuted}`}>คลิกเพื่อเติมฟอร์มอัตโนมัติ</p>
            </div>
            {/* ปุ่มกากบาทหลัก เอาไว้ฝั่งขวาบนของ Desktop */}
            <button onClick={onClose} className={`hidden md:block p-2 rounded-xl transition-colors ${isDarkMode ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'}`}>
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
            {quickSuggestions.length === 0 ? (
               <p className={`text-sm text-center py-6 ${textMuted}`}>ยังไม่มีข้อมูลการใช้จ่ายในหมวดนี้</p>
            ) : (
              quickSuggestions.map((s, idx) => {
                const catObj = categories.find(c => c.name === s.category);
                return (
                  <button
                    key={idx}
                    onClick={() => applySuggestion(s)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 text-left group ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-[#00509E]/30 shadow-sm hover:shadow'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110" 
                        style={{ backgroundColor: `rgba(${hexToRgb(catObj?.color || '#94a3b8')}, ${isDarkMode ? 0.2 : 0.1})` }}
                      >
                        {catObj?.icon}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                            {s.description}
                          </p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-[#00509E]'}`}>
                            {s.count} ครั้ง
                          </span>
                        </div>
                        <p className={`text-xs truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                          {s.category}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-black shrink-0 ${formType === 'expense' ? (isDarkMode ? 'text-red-400' : 'text-red-500') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-500')}`}>
                      {s.amount} ฿
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}