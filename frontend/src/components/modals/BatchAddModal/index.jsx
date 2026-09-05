import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CalendarPlus, X, Zap, CheckCircle } from 'lucide-react';
import AnimatedNumber from '../../ui/AnimatedNumber';
import { useToast } from '../../../context/ToastContext';
import BatchForm from './BatchForm';
import QuickSuggest from './QuickSuggest';
import CartList from './CartList';

export default function BatchAddModal({
  isOpen, onClose, onSaveBatch,
  categories, transactions,
  defaultDate, defaultType, defaultCategory,
  frequentItems = [],
  dayTypes = {},
  dayTypeConfig = []
}) {
  const { showToast } = useToast();
  
  const [pendingItems, setPendingItems]   = useState([]);
  const [isProcessing, setIsProcessing]  = useState(false);
  const [suggCatFilter, setSuggCatFilter] = useState('ALL');
  const [currentFormType, setCurrentFormType] = useState(defaultType || 'expense');

  const formMethodsRef = useRef(null);
  const prevIsOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setPendingItems([]);
      setSuggCatFilter('ALL');
      setCurrentFormType(defaultType || 'expense');
      
      if (formMethodsRef.current) {
        const { setValue, setFocus } = formMethodsRef.current;
        setValue('type', defaultType || 'expense');
        
        let catId = defaultCategory || '';
        if (defaultCategory && !categories.some(c => c.id === defaultCategory)) {
          catId = categories.find(c => c.name === defaultCategory)?.id || '';
        }
        if (!catId) catId = categories.find(c => c.type === (defaultType || 'expense'))?.id || '';
        
        setValue('categoryId', catId);
        setTimeout(() => setFocus('amount'), 100);
      }
    }
    prevIsOpen.current = isOpen;
  }, [isOpen, defaultType, defaultCategory, categories]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const catMap = useMemo(() => {
    return categories.reduce((acc, c) => { 
      acc[c.id] = c; 
      acc[c.name] = c; 
      return acc; 
    }, {});
  }, [categories]);

  const handleAddSubmit = (data) => {
    const [y, m, d] = data.date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const catObj = catMap[data.categoryId];
    const targetCatName = catObj?.name || 'อื่นๆ';
    
    const newItem = {
      id: `temp_${crypto.randomUUID()}`,
      date: formattedDate, 
      category: targetCatName,
      category_id: data.categoryId,
      description: data.description || targetCatName,
      amount: Number(data.amount), 
      allocation_type: data.allocation_type,
      dayNote: '',
      _catObj: catObj, 
      _isInc: data.type === 'income'
    };
    
    setPendingItems(prev => [...prev, newItem]);
  };

  const handleRemovePending = (id) => setPendingItems(prev => prev.filter(i => i.id !== id));
  
  const applyAddFormSuggestion = (s) => {
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

  const submitBatch = async () => {
    if (pendingItems.length === 0) return;
    setIsProcessing(true);
    try {
      const finalItems = pendingItems.map((item) => ({
        id: crypto.randomUUID(),
        date: item.date, 
        category: item.category,
        category_id: item._catObj?.id, 
        description: item.description, 
        amount: item.amount, 
        allocation_type: item.allocation_type,
        dayNote: item.dayNote
      }));
      await onSaveBatch(finalItems);
      setPendingItems([]);
      onClose();
    } catch (err) {
      console.error(err);
      showToast('⚠️ เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  const tokens = {
    surface: 'bg-[#181818] border-[#3e3e3e]',
    headerFooter: 'bg-[#1c1c1c] border-[#303030]',
  };

  return (
    <div className="fixed inset-0 bg-black/75 z-[100] flex items-center justify-center backdrop-blur-sm p-3 sm:p-6">
      <div 
        className={`rounded-none shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col w-full max-w-[1460px] h-[85vh] min-h-[520px] max-h-[850px] overflow-hidden border ${tokens.surface}`}
        style={{ borderTop: '4px solid #da291c', borderRadius: 0 }}
      >

        <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${tokens.headerFooter}`}>
          <h3 className={`text-base font-bold flex items-center gap-2 ${'text-slate-100'}`}>
            <CalendarPlus className="w-5 h-5 text-emerald-500" /> สรุปค่าใช้จ่ายประจำวัน (Batch Add)
          </h3>
          <button type="button" onClick={() => { onClose(); setPendingItems([]); }} className={`p-1.5 rounded-none transition-colors ${'text-slate-400 hover:bg-[#303030] hover:text-slate-200'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className={`flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden ${'bg-[#181818]'}`}>

          <BatchForm
            onSubmitItem={handleAddSubmit}
            categories={categories}
            defaultType={defaultType}
            defaultDate={defaultDate}
            defaultCategoryId={defaultCategory}
            isProcessing={isProcessing}
            externalFormSetter={(methods) => { formMethodsRef.current = methods; }}
            onTypeChange={setCurrentFormType}
            dayTypes={dayTypes}
            dayTypeConfig={dayTypeConfig}
          />

          <QuickSuggest
            transactions={transactions}
            categories={categories}
            catMap={catMap}
            formType={currentFormType}
            suggCatFilter={suggCatFilter}
            setSuggCatFilter={setSuggCatFilter}
            onApplySuggestion={applyAddFormSuggestion}
            isProcessing={isProcessing}
            frequentItems={frequentItems}
          />

          <CartList
            pendingItems={pendingItems}
            onRemoveItem={handleRemovePending}
            isProcessing={isProcessing}
          />

        </div>

        <div className={`px-5 py-4 border-t flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3 ${tokens.headerFooter}`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-xs ${'text-slate-400'}`}>ยอดรวมในตะกร้า:</span>
            {(() => {
              const totalAmount = pendingItems.reduce((acc, curr) => acc + (curr._isInc ? curr.amount : -curr.amount), 0);
              return (
                <span className={`text-xl font-black ${totalAmount >= 0 ? 'text-emerald-400' : 'text-[#da291c]'}`}>
                  <AnimatedNumber value={totalAmount} /> ฿
                </span>
              );
            })()}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button type="button" onClick={() => { onClose(); setPendingItems([]); }} disabled={isProcessing}
              className={`flex-1 sm:flex-none px-4 py-2 border rounded-none font-bold text-xs transition-all active:scale-95 disabled:opacity-50 ${'text-slate-300 bg-[#303030]/60 border-[#303030] hover:bg-[#303030]'}`}>
              ทิ้งข้อมูล
            </button>
            <button type="button" onClick={submitBatch} disabled={pendingItems.length === 0 || isProcessing}
              className="flex-1 sm:flex-none px-5 py-2 disabled:opacity-50 text-white rounded-none font-bold text-xs flex justify-center items-center gap-2 shadow-sm transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700">
              {isProcessing ? <Zap className="w-4 h-4 animate-pulse" /> : <CheckCircle className="w-4 h-4" />}
              {isProcessing ? 'กำลังบันทึก...' : 'บันทึกทั้งหมดลง DB'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}