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
  isOpen,
  onClose,
  onSaveBatch,
  categories,
  transactions,
  isDarkMode,
  defaultDate,
  defaultType,
  defaultCategory
}) {
  const [pendingItems, setPendingItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggCatFilter, setSuggCatFilter] = useState('ALL');
  const [addForm, setAddForm] = useState({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: ''
  });

  // 🌟 เพิ่ม useEffect เพื่อรีเซ็ตค่าต่างๆ ให้ใหม่เอี่ยมทุกครั้งที่เปิด Modal
  useEffect(() => {
    if (isOpen) {
      setAddForm({
        type: defaultType || 'expense',
        date: defaultDate || new Date().toISOString().split('T')[0],
        category: defaultCategory || categories.find(c => c.type === (defaultType || 'expense'))?.name || '',
        description: '',
        amount: ''
      });
      setPendingItems([]);
      setSuggCatFilter('ALL');
    }
  }, [isOpen, defaultType, defaultDate, defaultCategory, categories]);

  // ─── LOGIC FUNCTIONS (ต้องประกาศให้เสร็จก่อนที่จะมีการ return) ────────────────
const quickSuggestions = useMemo(() => {
    const typeTx = transactions.filter(t => {
      const c = categories.find(cat => cat.name === t.category);
      if (c?.type !== addForm.type) return false;
      if (suggCatFilter !== 'ALL' && t.category !== suggCatFilter) return false;
      return true;
    });

    // เปลี่ยน Key ให้รวมราคาเข้าไปด้วย
    const frequency = {};
    typeTx.forEach(t => {
      const desc = (t.description && t.description !== t.category) ? t.description : '';
      const amt = parseFloat(t.amount) || 0;
      
      // แยก key ด้วย category | description | amount
      const key = `${t.category}|${desc}|${amt}`;
      
      if (!frequency[key]) frequency[key] = { count: 0, amount: amt };
      frequency[key].count += 1;
    });

    return Object.entries(frequency)
      // เรียงตามจำนวนครั้งที่เกิด (มากไปน้อย) -> ถ้าเท่ากัน เรียงตามราคา (มากไปน้อย)
      .sort(([, a], [, b]) => b.count - a.count || b.amount - a.amount)
      .slice(0, 8)
      .map(([key, { count, amount }]) => {
        const [category, description] = key.split('|');
        return { type: 'normal', category, description, amount: String(amount), count };
      });
  }, [transactions, categories, addForm.type, suggCatFilter]);

  const handleAddPending = () => {
    if (!addForm.amount || isNaN(addForm.amount) || Number(addForm.amount) <= 0) {
      return alert('กรุณาใส่จำนวนเงินให้ถูกต้อง (มากกว่า 0)');
    }
    if (!addForm.date) return alert('กรุณาเลือกวันที่');

    const [y, m, d] = addForm.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;

    const targetCat = addForm.category || categories.find(c => c.type === addForm.type)?.name || 'อื่นๆ';
    const catObj = categories.find(c => c.name === targetCat);

    const newItem = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      date: formattedDate,
      category: targetCat,
      description: addForm.description || targetCat,
      amount: Number(addForm.amount),
      dayNote: '',
      _catObj: catObj,
      _isInc: addForm.type === 'income'
    };

    setPendingItems([...pendingItems, newItem]);
    setAddForm(prev => ({ ...prev, description: '', amount: '' }));
  };

  const handleRemovePending = (tempId) => {
    setPendingItems(pendingItems.filter(item => item.id !== tempId));
  };

  const handleAddFormKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPending();
    }
  };

  const applyAddFormSuggestion = (sugg) => {
    setAddForm(prev => ({
      ...prev,
      category: sugg.category,
      description: sugg.description || '',
      amount: sugg.amount
    }));
  };

  const submitBatch = async () => {
    if (pendingItems.length === 0) return;
    setIsProcessing(true);
    try {
      const batchTime = Date.now();
      const finalItems = pendingItems.map((item, idx) => ({
        id: `tx_${batchTime}_${idx}`,
        date: item.date,
        category: item.category,
        description: item.description,
        amount: item.amount,
        dayNote: item.dayNote
      }));

      await onSaveBatch(finalItems);
      setPendingItems([]);
      onClose();
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 🚨 เช็คเงื่อนไข Render (ต้องอยู่ด้านล่างสุด "หลัง" ประกาศตัวแปร Hooks เสร็จหมดแล้วเท่านั้น)
  if (!isOpen) return null;

  // ─── UI RENDERING ───────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center backdrop-blur-sm p-3 sm:p-6 md:p-8 transition-all">
      <div className={`rounded-2xl shadow-2xl flex flex-col w-full max-w-[1350px] min-h-[520px] max-h-[95vh] lg:max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
        
        {/* Header */}
        <div className={`p-5 md:p-6 border-b flex justify-between items-center shrink-0 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <h3 className={`text-lg md:text-xl font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-100' : 'text-slate-800'}`}>
            <CalendarPlus className="w-5 h-5 md:w-6 md:h-6 text-emerald-600"/> สรุปค่าใช้จ่ายประจำวัน (Batch Add)
          </h3>
          <button onClick={() => { onClose(); setPendingItems([]); }} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-200 hover:text-slate-800'}`}>
            <X className="w-6 h-6"/>
          </button>
        </div>

        <div className={`flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>
          
          {/* คอลัมน์ 1: ฟอร์มกรอกข้อมูล */}
          <div className={`w-full lg:w-[32%] p-6 border-b lg:border-b-0 lg:border-r flex flex-col lg:overflow-y-auto custom-scrollbar ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`flex p-1 mb-4 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <button onClick={() => setAddForm({...addForm, type: 'expense', category: categories.find(c=>c.type==='expense')?.name || ''})} className={`flex-1 py-2 font-bold text-sm rounded-md transition-all ${addForm.type === 'expense' ? (isDarkMode ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายจ่าย</button>
              <button onClick={() => setAddForm({...addForm, type: 'income', category: categories.find(c=>c.type==='income')?.name || ''})} className={`flex-1 py-2 font-bold text-sm rounded-md transition-all ${addForm.type === 'income' ? (isDarkMode ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : (isDarkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>รายรับ</button>
            </div>
            
            <div className="flex gap-3 mb-4">
              <div className="flex-1">
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>วันที่</label>
                <DatePicker
                value={addForm.date}
                onChange={(v) => setAddForm({...addForm, date: v})}
                isDarkMode={isDarkMode}
              />
              </div>
              <div className="flex-1">
                <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>จำนวนเงิน ฿</label>
                <input type="number" value={addForm.amount} onChange={(e) => setAddForm({...addForm, amount: e.target.value})} onKeyDown={handleAddFormKeyDown} placeholder="0.00" className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-1 font-black text-right transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-blue-400 focus:border-blue-500' : 'border-slate-300 focus:border-[#00509E] text-[#00509E]'}`} />
              </div>
            </div>
            
            <div className="mb-4">
              <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>หมวดหมู่</label>
              <select value={addForm.category} onChange={(e) => setAddForm({...addForm, category: e.target.value})} className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-1 font-bold transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-[#00509E]'}`}>
                {categories.filter(c => c.type === addForm.type).map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            
            <div className="mb-4">
              <label className={`block text-[11px] font-bold uppercase mb-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>รายละเอียด</label>
              <input type="text" value={addForm.description} onChange={(e) => setAddForm({...addForm, description: e.target.value})} onKeyDown={handleAddFormKeyDown} placeholder='เช่น ค่าข้าวเที่ยง' className={`w-full px-3 py-2.5 text-sm border rounded-lg outline-none focus:ring-1 transition-colors ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'border-slate-300 focus:border-[#00509E]'}`} />
            </div>

            <button onClick={handleAddPending} className={`w-full mt-6 px-4 py-3 border rounded-xl font-bold flex justify-center items-center gap-2 transition-all active:scale-95 ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-[#00509E] border-slate-300'}`}>
              <PlusCircle className="w-5 h-5"/> เพิ่มลงตะกร้า (Enter)
            </button>
          </div>

          {/* คอลัมน์ 2: Quick Suggestions */}
          <div className={`w-full lg:w-[28%] p-6 border-b lg:border-b-0 lg:border-r flex flex-col min-h-0 ${isDarkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-200 bg-slate-50/50'}`}>
            <h4 className={`shrink-0 font-bold flex items-center gap-2 mb-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Quick Suggestions
            </h4>

            {/* Category filter dropdown */}
            <div className="mb-3 shrink-0">
              <select
                value={suggCatFilter}
                onChange={e => setSuggCatFilter(e.target.value)}
                className={`w-full px-3 py-2 text-sm border rounded-lg outline-none font-medium transition-colors ${
                  isDarkMode
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-blue-500'
                    : 'bg-white border-slate-300 text-slate-700 focus:border-[#00509E]'
                }`}
              >
                <option value="ALL">📊 ทุกหมวดหมู่</option>
                {categories.filter(c => c.type === addForm.type).map(c => (
                  <option key={c.id} value={c.name}>{c.icon} {c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
              {quickSuggestions.length === 0 ? (
                <p className={`text-sm text-center py-6 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>ยังไม่มีข้อมูล</p>
              ) : (
                quickSuggestions.map((s, idx) => {
                  const catObj = categories.find(c => c.name === s.category);
                  return (
                    <button key={idx} onClick={() => applyAddFormSuggestion(s)} className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 text-left group ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-sm hover:shadow'}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `rgba(${hexToRgb(catObj?.color || '#94a3b8')}, ${isDarkMode ? 0.2 : 0.1})` }}>{catObj?.icon}</div>
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{s.description || s.category}</p>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-100 text-[#00509E]'}`}>
                              {s.count} ครั้ง
                            </span>
                          </div>
                          <p className={`text-xs truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{s.category}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-black shrink-0 ${addForm.type === 'expense' ? (isDarkMode ? 'text-red-400' : 'text-[#D81A21]') : (isDarkMode ? 'text-emerald-400' : 'text-emerald-600')}`}>{s.amount}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* คอลัมน์ 3: ตะกร้า */}
          <div className={`w-full lg:w-[40%] flex flex-col p-6 min-h-0 ${isDarkMode ? 'bg-slate-800/30' : 'bg-slate-50/30'}`}>
            <div className="shrink-0 flex justify-between items-center mb-4">
              <h4 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}><ClipboardList className={`w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}/> ตะกร้า</h4>
              <span className={`text-white px-2.5 py-0.5 rounded-full text-[11px] font-bold ${isDarkMode ? 'bg-blue-600' : 'bg-[#00509E]'}`}>{pendingItems.length} รายการ</span>
            </div>
            <div className={`flex-1 overflow-y-auto custom-scrollbar border rounded-xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
              {pendingItems.length === 0 ? (
                <div className={`h-full min-h-[150px] flex flex-col items-center justify-center ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <Inbox className={`w-12 h-12 mb-3 ${isDarkMode ? 'opacity-20' : 'opacity-30'}`} />
                  <p className="text-sm font-medium">ยังไม่มีรายการในตะกร้า</p>
                </div>
              ) : (
                <div className={`divide-y ${isDarkMode ? 'divide-slate-800' : 'divide-slate-100'}`}>
                  {pendingItems.map((item, idx) => (
                    <div key={item.id} className={`flex items-center justify-between p-3.5 transition-colors group animate-in fade-in slide-in-from-right-4 duration-300 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                        <div className={`text-xs font-bold w-5 text-right shrink-0 ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`}>{idx+1}.</div>
                        <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                          <div className={`font-bold text-sm truncate ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} title={item.description}>{item.description}</div>
                          {/* 🌟 เปลี่ยนเป็น flex-wrap เพื่อไม่ให้ป้ายวันที่โดนเบียดจนหายไป */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5 overflow-hidden w-full">
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded flex items-center shrink-0 ${item._isInc ? (isDarkMode ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700') : (isDarkMode ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700')}`}>
                              {item._isInc ? 'รายรับ' : 'รายจ่าย'}
                            </span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 shrink min-w-0 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`} style={{ backgroundColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${isDarkMode ? 0.2 : 0.1})`, borderColor: `rgba(${hexToRgb(item._catObj?.color || '#94a3b8')}, ${isDarkMode ? 0.4 : 0.3})` }}>
                              <span className="shrink-0">{item._catObj?.icon}</span>
                              <span className="truncate">{item.category}</span>
                            </span>
                            {/* 🌟 เพิ่มป้ายวันที่ตรงนี้ */}
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 shrink-0 ${isDarkMode ? 'text-slate-300 border-slate-700 bg-slate-800/80' : 'text-slate-500 border-slate-200 bg-slate-100'}`}>
                              <CalendarDays className="w-3 h-3" /> {item.date}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 pl-2 shrink-0">
                        <span className={`font-black text-base whitespace-nowrap ${item._isInc ? (isDarkMode ? 'text-emerald-400' : 'text-emerald-600') : (isDarkMode ? 'text-red-400' : 'text-[#D81A21]')}`}>{formatMoney(item.amount)} ฿</span>
                        <button onClick={() => handleRemovePending(item.id)} className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'text-slate-500 hover:text-white hover:bg-red-600/80' : 'text-slate-300 hover:text-white hover:bg-red-500'}`} title="ลบออกจากตะกร้า"><Trash2 className="w-4 h-4"/></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`p-5 md:p-6 border-t flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <span className={`font-bold text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>ยอดรวมในตะกร้า:</span>
            <span className={`text-2xl font-black ${isDarkMode ? 'text-blue-400' : 'text-[#00509E]'}`}>
              <AnimatedNumber value={pendingItems.reduce((acc, curr) => acc + (curr._isInc ? curr.amount : -curr.amount), 0)} /> ฿
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button onClick={() => { onClose(); setPendingItems([]); }} className={`flex-1 sm:flex-none px-5 py-3 border rounded-xl font-bold text-sm transition-all active:scale-95 ${isDarkMode ? 'text-slate-300 bg-slate-800 border-slate-600 hover:bg-slate-700' : 'text-slate-600 bg-white border-slate-300 hover:bg-slate-100'}`}>ทิ้งข้อมูล</button>
            <button onClick={submitBatch} disabled={pendingItems.length === 0 || isProcessing} className={`flex-1 sm:flex-none px-6 py-3 disabled:opacity-50 text-white rounded-xl font-bold text-sm flex justify-center items-center gap-2 shadow-md transition-all active:scale-95 ${isDarkMode ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
              {isProcessing ? <Zap className="w-5 h-5 animate-pulse"/> : <CheckCircle className="w-5 h-5"/>} 
              {isProcessing ? 'กำลังบันทึก...' : 'บันทึกทั้งหมดลง DB'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}