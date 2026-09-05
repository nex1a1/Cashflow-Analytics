import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { formatMoney, hexToRgb, THAI_MONTHS, getThaiDayInfo } from '../../../utils/formatters';
import { useToast } from '../../../context/ToastContext';
import DailyForm from './DailyForm';
import QuickSuggest from './QuickSuggest';
import TransactionList from './TransactionList';

export default function DayDetailModal({ 
  dateStr, 
  transactions = [], 
  categories = [], 
  cashflowGroups = [], 
  onClose, 
  onSave, 
  onDelete, 
  dayTypes = {},
  dayTypeConfig = [],
  frequentItems = [] 
}) {
  const { showToast } = useToast();
  
  const [yyyyStr, mmStr, ddStr] = (dateStr || '').split('-');
  const d = Number.parseInt(ddStr, 10);
  const m = Number.parseInt(mmStr, 10);
  const y = Number.parseInt(yyyyStr, 10);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'][dateObj.getDay()];
  const displayDate = `${d} ${THAI_MONTHS[m - 1] || ''} ${y}`;
  const thaiDay = getThaiDayInfo(dateStr);

  const dayTypeId = dayTypes[dateStr];
  const currentDayType = dayTypeId ? dayTypeConfig.find(dt => dt.id === dayTypeId) : null;

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
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
      const amtA = Number.parseFloat(a.amount) || 0;
      const amtB = Number.parseFloat(b.amount) || 0;
      if (amtB !== amtA) return amtB - amtA;

      // 5. Fallback to ID for stability
      return String(a.id).localeCompare(String(b.id));
    });
  }, [transactions, localItems, dateStr, catMap]);

  const expenses   = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'expense');
  const income     = dayTx.filter(t => (catMap[t.category_id] || catMap[t.category])?.type === 'income');
  const totalExp   = expenses.reduce((s, t) => s + (Number.parseFloat(t.amount) || 0), 0);
  const totalInc   = income.reduce((s, t) => s + (Number.parseFloat(t.amount) || 0), 0);
  const net        = totalInc - totalExp;

  const applySuggestion = (s) => {
    if (formMethodsRef.current) {
      const { setValue, setFocus } = formMethodsRef.current;
      setValue('categoryId', s.categoryId, { skipAllocationDefault: !!s.allocation_type });
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
          <div className={`flex items-start justify-between px-5 py-3.5 border-b ${tokens.border} shrink-0 pr-12`}>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {thaiDay && (
                  <span 
                    className="w-5 h-5 flex items-center justify-center text-[10px] font-black rounded-none border shrink-0 select-none shadow-sm"
                    style={{ 
                      backgroundColor: thaiDay.bg, 
                      borderColor: thaiDay.border, 
                      color: thaiDay.color 
                    }}
                    title={thaiDay.fullName}
                  >
                    {thaiDay.label}
                  </span>
                )}
                <h2 className={`text-base font-black tracking-tight ${tokens.textPri}`}>
                  {displayDate}
                </h2>
                <span className={`text-xs font-bold ${tokens.textMuted}`}>
                  วัน{dayOfWeek}
                </span>

                {currentDayType && (
                  <span
                    className="px-2 py-0.5 text-[10px] font-black tracking-wider uppercase rounded-none border shrink-0"
                    style={{
                      backgroundColor: `rgba(${hexToRgb(currentDayType.color || '#94a3b8')}, 0.12)`,
                      borderColor: `rgba(${hexToRgb(currentDayType.color || '#94a3b8')}, 0.35)`,
                      color: currentDayType.color || '#cbd5e1'
                    }}
                  >
                    {currentDayType.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap tabular-nums tracking-tight">
                {totalInc > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-emerald-950/40 text-[#34d399] border border-emerald-800/40 flex items-center gap-1">
                    <span className="text-[9px] font-medium opacity-80">รับ</span> +฿{formatMoney(totalInc)}
                  </span>
                )}
                {totalExp > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-none bg-rose-950/40 text-[#f87171] border border-rose-800/40 flex items-center gap-1">
                    <span className="text-[9px] font-medium opacity-80">จ่าย</span> -฿{formatMoney(totalExp)}
                  </span>
                )}
                {dayTx.length > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-none border flex items-center gap-1 ${
                    net >= 0 
                      ? 'bg-amber-950/30 text-amber-300 border-amber-800/40' 
                      : 'bg-red-950/40 text-[#da291c] border-[#da291c]/30'
                  }`}>
                    <span className="text-[9px] font-medium opacity-80">สุทธิ</span> 
                    {net >= 0 ? `+฿${formatMoney(net)}` : `-฿${formatMoney(Math.abs(net))}`}
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
            cashflowGroups={cashflowGroups}
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
          cashflowGroups={cashflowGroups}
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