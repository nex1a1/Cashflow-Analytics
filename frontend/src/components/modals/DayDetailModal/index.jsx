import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatMoney } from '../../../utils/formatters';
import { useToast } from '../../../context/ToastContext';
import DailyForm from './DailyForm';
import QuickSuggest from './QuickSuggest';
import TransactionList from './TransactionList';

const THAI_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];

export default function DayDetailModal({ dateStr, transactions = [], categories = [], cashflowGroups = [], onClose, onSave, onDelete, frequentItems = [] }) {
  const dm = true;
  const { showToast } = useToast();
  
  const [yyyyStr, mmStr, ddStr] = dateStr.split('-');
  const d = parseInt(ddStr, 10);
  const m = parseInt(mmStr, 10);
  const y = parseInt(yyyyStr, 10);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][dateObj.getDay()];
  const displayDate = `${d} ${THAI_MONTHS[m - 1]} ${y}`;

  const defaultExpenseCatId = categories.find(c => c.type === 'expense')?.id || '';

  const [localItems, setLocalItems]           = useState([]);
  const [isSaving, setIsSaving]               = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [suggCatFilter, setSuggCatFilter]     = useState('ALL');
  const [currentFormType, setCurrentFormType] = useState('expense');

  const formMethodsRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.altKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        formMethodsRef.current?.setValue('type', 'expense');
        const firstCat = categories.find(c => c.type === 'expense');
        formMethodsRef.current?.setValue('categoryId', firstCat?.id || '');
      }
      if (e.altKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        formMethodsRef.current?.setValue('type', 'income');
        const firstCat = categories.find(c => c.type === 'income');
        formMethodsRef.current?.setValue('categoryId', firstCat?.id || '');
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, categories]);

  const groupMap = useMemo(() => {
    return cashflowGroups.reduce((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});
  }, [cashflowGroups]);

  const catMap = useMemo(() => {
    return categories.reduce((acc, c) => { 
      const group = groupMap[c.cashflowGroup];
      acc[c.id] = { ...c, _group: group }; 
      acc[c.name] = { ...c, _group: group }; // Fallback
      return acc; 
    }, {});
  }, [categories, groupMap]);

  const dayTx = useMemo(() => {
    const txIds = new Set(transactions.map(t => t.id));
    const pendingItems = localItems.filter(i => !txIds.has(i.id));
    const combined = [...transactions.filter(t => t.date === dateStr), ...pendingItems];
    
    // Sankey-Style Logic Sorting
    return combined.sort((a, b) => {
      const catA = catMap[a.category_id] || catMap[a.category];
      const catB = catMap[b.category_id] || catMap[b.category];

      // 1. Sort by Type (Income -> Expense -> Savings)
      const typeOrder = { income: 0, expense: 1, savings: 2 };
      const typeA = typeOrder[catA?.type] ?? 9;
      const typeB = typeOrder[catB?.type] ?? 9;
      if (typeA !== typeB) return typeA - typeB;

      // 2. Sort by Group order_index
      const groupIdxA = catA?._group?.order_index ?? 999;
      const groupIdxB = catB?._group?.order_index ?? 999;
      if (groupIdxA !== groupIdxB) return groupIdxA - groupIdxB;

      // 3. Sort by Category order_index
      const catIdxA = catA?.order_index ?? 999;
      const catIdxB = catB?.order_index ?? 999;
      if (catIdxA !== catIdxB) return catIdxA - catIdxB;

      // 4. Sort by Amount (Descending)
      const amtA = parseFloat(a.amount) || 0;
      const amtB = parseFloat(b.amount) || 0;
      if (amtB !== amtA) return amtB - amtA;

      // 5. Fallback to ID for stability
      return String(a.id).localeCompare(String(b.id));
    });
  }, [transactions, localItems, dateStr, catMap]);

  const expenses   = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'expense');
  const income     = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'income');
  const totalExp   = expenses.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);
  const totalInc   = income.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const applySuggestion = (s) => {
    if (formMethodsRef.current) {
      const { setValue, setFocus } = formMethodsRef.current;
      setValue('categoryId', s.categoryId);
      setValue('description', s.description || '');
      setValue('amount', Number(s.amount), { shouldValidate: true });
      if (s.allocation_type) {
        setValue('allocation_type', s.allocation_type);
      }
      setTimeout(() => setFocus('amount'), 10);
    }
  };

  const handleSave = async (data) => {
    setIsSaving(true);

    const catObj = catMap[data.categoryId];
    const targetCatName = catObj?.name || 'อื่นๆ';
    const newItem = {
      id: crypto.randomUUID(),
      date: dateStr, 
      category: targetCatName,
      category_id: data.categoryId, 
      description: data.description || targetCatName, 
      amount: data.amount, 
      allocation_type: data.allocation_type,
      dayNote: '',
      created_at: new Date().toISOString()
    };

    setLocalItems(prev => [...prev, { ...newItem, _catObj: catObj }]);

    try {
      await onSave(newItem);
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
    } catch (err) {
      console.error('Save failed:', err);
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      showToast('⚠️ ไม่สามารถบันทึกข้อมูลได้: ' + (err.message || 'Unknown error'), 'error');
    } finally { 
      setIsSaving(false); 
    }
  };

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

  const tokens = {
    surface: 'bg-[#181818]',
    border: 'border-[#303030]',
    textPri: 'text-slate-100',
    textMuted: 'text-slate-400',
    closeBtn: `p-1.5 rounded-none transition-colors absolute top-4 right-4 z-10 hover:bg-[#303030] text-slate-400`,
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        className={`${tokens.surface} shadow-[0_0_60px_rgba(0,0,0,0.95)] w-full max-w-6xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200 border-x border-b border-[#3e3e3e] overflow-hidden relative md:h-[80vh] md:min-h-[550px] md:max-h-[800px] h-[90vh]`}
        style={{ borderTop: '4px solid #da291c', borderRadius: 0 }}
      >

        <button onClick={onClose} className={tokens.closeBtn}>
          <X className="w-5 h-5" />
        </button>

        <div className={`flex flex-col w-full md:w-[62%] border-b md:border-b-0 md:border-r ${tokens.border} h-[55vh] md:h-full min-h-0 bg-[#1c1c1c]`}>
          <div className={`flex items-start justify-between px-5 py-4 border-b ${tokens.border} shrink-0 pr-12`}>
            <div>
              <h2 className={`text-lg font-black ${tokens.textPri}`}>{displayDate}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-xs font-medium ${tokens.textMuted}`}>วัน{dayOfWeek}</span>
                {totalExp > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-red-900/40 text-red-400 border border-red-800/30">
                    ▼ {formatMoney(totalExp)} ฿
                  </span>
                )}
                {totalInc > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-none bg-emerald-900/40 text-emerald-400 border border-emerald-800/30">
                    ▲ {formatMoney(totalInc)} ฿
                  </span>
                )}
              </div>
            </div>
          </div>

          <TransactionList 
            dayTx={dayTx}
            catMap={catMap}
            confirmDeleteId={confirmDeleteId}
            handleDelete={handleDelete}
          />

          <DailyForm 
            onSubmitItem={handleSave}
            categories={categories}
            defaultType="expense"
            defaultCategoryId={defaultExpenseCatId}
            isProcessing={isSaving}
            externalFormSetter={(methods) => { formMethodsRef.current = methods; }}
            onTypeChange={setCurrentFormType}
          />
        </div>

        <QuickSuggest 
          transactions={transactions}
          categories={categories}
          catMap={catMap}
          formType={currentFormType}
          suggCatFilter={suggCatFilter}
          setSuggCatFilter={setSuggCatFilter}
          onApplySuggestion={applySuggestion}
          isProcessing={isSaving}
          frequentItems={frequentItems}
        />

      </div>
    </div>
  );
}