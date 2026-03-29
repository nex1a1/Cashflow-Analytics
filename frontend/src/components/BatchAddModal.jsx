// src/components/BatchAddModal.jsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarPlus, X, PlusCircle, Star,
  ClipboardList, Inbox, Trash2, Zap, CheckCircle, CalendarDays
} from 'lucide-react';
import AnimatedNumber from './ui/AnimatedNumber';
import { formatMoney, hexToRgb } from '../utils/formatters';
import DatePicker from './ui/DatePicker';

export default function BatchAddModal({
  isOpen, onClose, onSaveBatch,
  categories, transactions, isDarkMode,
  defaultDate, defaultType, defaultCategory
}) {
  const dm = isDarkMode;
  const [pendingItems, setPendingItems]   = useState([]);
  const [isProcessing, setIsProcessing]  = useState(false);
  const [suggCatFilter, setSuggCatFilter] = useState('ALL');
  const [addForm, setAddForm] = useState({
    type: 'expense', date: new Date().toISOString().split('T')[0],
    category: '', description: '', amount: ''
  });

  useEffect(() => {
    if (isOpen) {
      setAddForm({
        type: defaultType || 'expense',
        date: defaultDate || new Date().toISOString().split('T')[0],
        category: defaultCategory || categories.find(c => c.type === (defaultType || 'expense'))?.name || '',
        description: '', amount: ''
      });
      setPendingItems([]);
      setSuggCatFilter('ALL');
    }
  }, [isOpen, defaultType, defaultDate, defaultCategory, categories]);

  const quickSuggestions = useMemo(() => {
    const typeTx = transactions.filter(t => {
      const c = categories.find(cat => cat.name === t.category);
      if (c?.type !== addForm.type) return false;
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
        return { type: 'normal', category, description, amount: String(amount), count };
      });
  }, [transactions, categories, addForm.type, suggCatFilter]);

  const handleAddPending = () => {
    if (!addForm.amount || isNaN(addForm.amount) || Number(addForm.amount) <= 0)
      return alert('กรุณาใส่จำนวนเงินให้ถูกต้อง (มากกว่า 0)');
    if (!addForm.date) return alert('กรุณาเลือกวันที่');
    const [y, m, d]   = addForm.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const targetCat   = addForm.category || categories.find(c => c.type === addForm.type)?.name || 'อื่นๆ';
    const catObj      = categories.find(c => c.name === targetCat);
    const newItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: formattedDate, category: targetCat,
      description: addForm.description || targetCat,
      amount: Number(addForm.amount), dayNote: '',
      _catObj: catObj, _isInc: addForm.type === 'income'
    };
    setPendingItems([...pendingItems, newItem]);
    setAddForm(prev => ({ ...prev, description: '', amount: '' }));
  };

  const handleRemovePending = (id) => setPendingItems(pendingItems.filter(i => i.id !== id));
  const handleAddFormKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPending(); } };
  const applyAddFormSuggestion = (s) => setAddForm(prev => ({ ...prev, category: s.category, description: s.description || '', amount: s.amount }));

  const submitBatch = async () => {
    if (pendingItems.length === 0) return;
    setIsProcessing(true);
    try {
      const batchTime = Date.now();
      const finalItems = pendingItems.map((item, idx) => ({
        id: `tx_${batchTime}_${idx}`,
        date: item.date, category: item.category,
        description: item.description, amount: item.amount, dayNote: item.dayNote
      }));
      await onSaveBatch(finalItems);
      setPendingItems([]);
      onClose();
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  /* ── shared tokens ── */
  const card    = `border shadow-sm ${dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`;
  const inputCls = `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${dm ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-3 sm:p-6">
      <div className={`rounded-sm shadow-2xl flex flex-col w-full max-w-[1350px] min-h-[520px] max-h-[95vh] lg:max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden border ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>

        {/* Header */}
        <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${dm ? 'text-slate-100' : 'text-slate-800'}`}>
            <CalendarPlus className="w-5 h-5 text-emerald-500" /> สรุปค่าใช้จ่ายประจำวัน (Batch Add)
          </h3>
          <button onClick={() => { onClose(); setPendingItems([]); }} className={`p-1.5 rounded-sm transition-colors ${dm ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden ${dm ? 'bg-slate-900' : 'bg-white'}`}>

          {/* Col 1: Form */}
          <div className={`w-full lg:w-[32%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col lg:overflow-y-auto ${dm ? 'border-slate-800' : 'border-slate-200'}`}>
            {/* Type toggle */}
            <div className={`flex p-0.5 mb-4 rounded-sm border ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
              <button onClick={() => setAddForm({ ...addForm, type: 'expense', category: categories.find(c => c.type === 'expense')?.name || '' })}
                className={`flex-1 py-1.5 font-bold text-xs rounded-sm transition-all ${addForm.type === 'expense' ? (dm ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                รายจ่าย
              </button>
              <button onClick={() => setAddForm({ ...addForm, type: 'income', category: categories.find(c => c.type === 'income')?.name || '' })}
                className={`flex-1 py-1.5 font-bold text-xs rounded-sm transition-all ${addForm.type === 'income' ? (dm ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
                รายรับ
              </button>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>วันที่</label>
                <DatePicker value={addForm.date} onChange={(v) => setAddForm({ ...addForm, date: v })} isDarkMode={dm} />
              </div>
              <div className="flex-1">
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>จำนวนเงิน ฿</label>
                <input type="number" value={addForm.amount} onChange={(e) => setAddForm({ ...addForm, amount: e.target.value })} onKeyDown={handleAddFormKeyDown} placeholder="0.00"
                  className={`${inputCls} font-black text-right ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} />
              </div>
            </div>

            <div className="mb-4">
              <label className={`block text-[11px] font-bold uppercase mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>หมวดหมู่</label>
              <select value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} className={inputCls}>
                {categories.filter(c => c.type === addForm.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>

            <div className="mb-4">
              <label className={`block text-[11px] font-bold uppercase mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>รายละเอียด</label>
              <input type="text" value={addForm.description} onChange={(e) => setAddForm({ ...addForm, description: e.target.value })} onKeyDown={handleAddFormKeyDown}
                placeholder="เช่น ค่าข้าวเที่ยง" className={inputCls} />
            </div>

            <button onClick={handleAddPending}
              className={`w-full mt-auto px-4 py-2.5 border rounded-sm font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 ${dm ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 text-[#00509E] border-slate-300'}`}>
              <PlusCircle className="w-4 h-4" /> เพิ่มลงตะกร้า (Enter)
            </button>
          </div>

          {/* Col 2: Quick Suggestions */}
          <div className={`w-full lg:w-[28%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0 ${dm ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
            <h4 className={`shrink-0 font-bold text-sm flex items-center gap-2 mb-3 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> Quick Suggestions
            </h4>
            <div className="mb-3 shrink-0">
              <select value={suggCatFilter} onChange={e => setSuggCatFilter(e.target.value)} className={inputCls}>
                <option value="ALL">📊 ทุกหมวดหมู่</option>
                {categories.filter(c => c.type === addForm.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5" style={{ scrollbarWidth: 'thin' }}>
              {quickSuggestions.length === 0 ? (
                <p className={`text-sm text-center py-8 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีข้อมูล</p>
              ) : quickSuggestions.map((s, idx) => {
                const catObj = categories.find(c => c.name === s.category);
                return (
                  <button key={idx} onClick={() => applyAddFormSuggestion(s)}
                    className={`w-full flex items-center justify-between p-3 rounded-sm border transition-all active:scale-95 text-left ${dm ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`}>
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-sm flex items-center justify-center shrink-0 text-sm" style={{ backgroundColor: `rgba(${hexToRgb(catObj?.color || '#94a3b8')}, ${dm ? 0.2 : 0.1})` }}>
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
                    <span className={`text-xs font-black shrink-0 ml-2 ${addForm.type === 'expense' ? (dm ? 'text-red-400' : 'text-[#D81A21]') : (dm ? 'text-emerald-400' : 'text-emerald-600')}`}>{s.amount}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Col 3: Cart */}
          <div className={`w-full lg:w-[40%] flex flex-col p-5 min-h-0 ${dm ? 'bg-slate-800/20' : 'bg-slate-50/30'}`}>
            <div className="shrink-0 flex justify-between items-center mb-3">
              <h4 className={`font-bold text-sm flex items-center gap-2 ${dm ? 'text-slate-300' : 'text-slate-700'}`}>
                <ClipboardList className={`w-4 h-4 ${dm ? 'text-slate-500' : 'text-slate-400'}`} /> ตะกร้า
              </h4>
              <span className={`text-white px-2 py-0.5 rounded-sm text-[10px] font-bold ${dm ? 'bg-blue-600' : 'bg-[#00509E]'}`}>{pendingItems.length} รายการ</span>
            </div>
            <div className={`flex-1 overflow-y-auto border rounded-sm ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`} style={{ scrollbarWidth: 'thin' }}>
              {pendingItems.length === 0 ? (
                <div className={`h-full min-h-[150px] flex flex-col items-center justify-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Inbox className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-xs font-medium">ยังไม่มีรายการในตะกร้า</p>
                </div>
              ) : (
                <div className={`divide-y ${dm ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {pendingItems.map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between p-3 transition-colors animate-in fade-in slide-in-from-right-4 duration-200 ${dm ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
                        <div className={`text-[10px] font-bold w-4 text-right shrink-0 ${dm ? 'text-slate-500' : 'text-slate-300'}`}>{idx + 1}.</div>
                        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                          <div className={`font-bold text-xs truncate ${dm ? 'text-slate-200' : 'text-slate-800'}`} title={item.description}>{item.description}</div>
                          <div className="flex flex-wrap items-center gap-1 mt-1 overflow-hidden w-full">
                            <span className={`text-[9px] font-black px-1 py-0.5 rounded-sm shrink-0 ${item._isInc ? (dm ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (dm ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')}`}>
                              {item._isInc ? 'รายรับ' : 'รายจ่าย'}
                            </span>
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded-sm border shrink min-w-0 flex items-center gap-0.5 ${dm ? 'text-slate-200' : 'text-slate-700'}`}
                              style={{ backgroundColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${dm ? 0.2 : 0.1})`, borderColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${dm ? 0.4 : 0.3})` }}>
                              <span className="shrink-0">{item._catObj?.icon}</span>
                              <span className="truncate">{item.category}</span>
                            </span>
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded-sm border flex items-center gap-0.5 shrink-0 ${dm ? 'text-slate-300 border-slate-700 bg-slate-800/80' : 'text-slate-500 border-slate-200 bg-slate-100'}`}>
                              <CalendarDays className="w-2.5 h-2.5" /> {item.date}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pl-2 shrink-0">
                        <span className={`font-black text-sm whitespace-nowrap ${item._isInc ? (dm ? 'text-emerald-400' : 'text-emerald-600') : (dm ? 'text-red-400' : 'text-[#D81A21]')}`}>{formatMoney(item.amount)}</span>
                        <button onClick={() => handleRemovePending(item.id)} className={`p-1.5 rounded-sm transition-colors ${dm ? 'text-slate-500 hover:text-white hover:bg-red-600/80' : 'text-slate-300 hover:text-white hover:bg-red-500'}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-5 py-4 border-t flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3 ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xs ${dm ? 'text-slate-400' : 'text-slate-500'}`}>ยอดรวมในตะกร้า:</span>
            <span className={`text-xl font-black ${dm ? 'text-blue-400' : 'text-[#00509E]'}`}>
              <AnimatedNumber value={pendingItems.reduce((acc, curr) => acc + (curr._isInc ? curr.amount : -curr.amount), 0)} /> ฿
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => { onClose(); setPendingItems([]); }}
              className={`flex-1 sm:flex-none px-4 py-2 border rounded-sm font-bold text-xs transition-all active:scale-95 ${dm ? 'text-slate-300 bg-slate-800 border-slate-600 hover:bg-slate-700' : 'text-slate-600 bg-white border-slate-300 hover:bg-slate-100'}`}>
              ทิ้งข้อมูล
            </button>
            <button onClick={submitBatch} disabled={pendingItems.length === 0 || isProcessing}
              className="flex-1 sm:flex-none px-5 py-2 disabled:opacity-50 text-white rounded-sm font-bold text-xs flex justify-center items-center gap-2 shadow-sm transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700">
              {isProcessing ? <Zap className="w-4 h-4 animate-pulse" /> : <CheckCircle className="w-4 h-4" />}
              {isProcessing ? 'กำลังบันทึก...' : 'บันทึกทั้งหมดลง DB'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}