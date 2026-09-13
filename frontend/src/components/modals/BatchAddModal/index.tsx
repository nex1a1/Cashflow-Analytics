import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CalendarPlus, X, Zap, CheckCircle } from 'lucide-react';
import AnimatedNumber from '../../ui/AnimatedNumber';
import BatchForm, { BatchFormValues, ExternalFormControls } from './BatchForm';
import QuickSuggest from './QuickSuggest';
import CartList from './CartList';
import { Category, CashflowGroup, DayType, FrequentItem, AllocationType, TransactionPayload } from '../../../types';

export interface PendingBatchItem {
  id: string;
  date: string;
  category: string;
  category_id?: string;
  description: string;
  amount: number;
  allocation_type?: AllocationType | null;
  dayNote?: string;
  _catObj?: Category & { _group?: CashflowGroup };
  _isInc?: boolean;
}

export interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveBatch: (items: TransactionPayload[]) => Promise<any> | void;
  categories: Category[];
  defaultDate?: string;
  defaultType?: string;
  defaultCategory?: string;
  frequentItems?: FrequentItem[];
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  cashflowGroups?: CashflowGroup[];
}

export default function BatchAddModal({
  isOpen, onClose, onSaveBatch,
  categories = [],
  defaultDate, defaultType, defaultCategory,
  frequentItems = [],
  dayTypes = {},
  dayTypeConfig = [],
  cashflowGroups = []
}: BatchAddModalProps) {
  const [pendingItems, setPendingItems] = useState<PendingBatchItem[]>([]);
  const [editingItem, setEditingItem] = useState<PendingBatchItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suggCatFilter, setSuggCatFilter] = useState('ALL');
  const [currentFormType, setCurrentFormType] = useState(defaultType || 'expense');

  const formMethodsRef = useRef<ExternalFormControls | null>(null);
  const prevIsOpen = useRef(false);

  useEffect(() => {
    if (isOpen && !prevIsOpen.current) {
      setPendingItems([]);
      setEditingItem(null);
      setSuggCatFilter('ALL');
      setCurrentFormType(defaultType || 'expense');
      
      if (formMethodsRef.current) {
        const { setValue, setFocus } = formMethodsRef.current;
        setValue('type', (defaultType as 'income' | 'expense') || 'expense');
        
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

  // Safe Close Guard: Prompt before discard if items are pending
  const handleSafeClose = useCallback(() => {
    if (pendingItems.length > 0) {
      const confirmed = window.confirm(`คุณมี ${pendingItems.length} รายการในตะกร้าที่ยังไม่ได้บันทึก ต้องการทิ้งข้อมูลและปิดหน้าต่างใช่หรือไม่?`);
      if (!confirmed) return;
    }
    setPendingItems([]);
    setEditingItem(null);
    onClose();
  }, [pendingItems.length, onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSafeClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSafeClose]);

  const defaultExpenseCatId = categories.find(c => c.type === (defaultType || 'expense'))?.id || '';
  const resolvedDefaultCatId = defaultCategory
    ? (categories.find(c => c.id === defaultCategory || c.name === defaultCategory)?.id || defaultExpenseCatId)
    : defaultExpenseCatId;

  const groupMap = useMemo(() => {
    return cashflowGroups.reduce<Record<string, CashflowGroup>>((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});
  }, [cashflowGroups]);

  const catMap = useMemo(() => {
    return categories.reduce<Record<string, Category & { _group?: CashflowGroup }>>((acc, c) => { 
      const group = c.cashflowGroup || c.cashflow_group_id ? groupMap[c.cashflowGroup || c.cashflow_group_id || ''] : undefined;
      acc[c.id] = { ...c, _group: group }; 
      acc[c.name] = { ...c, _group: group }; // Fallback
      return acc; 
    }, {});
  }, [categories, groupMap]);

  const handleAddSubmit = useCallback((data: BatchFormValues) => {
    const catObj = catMap[data.categoryId];
    const targetCatName = catObj?.name || 'อื่นๆ';
    
    if (editingItem) {
      // Update existing item in place
      setPendingItems(prev => prev.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            date: data.date,
            category: targetCatName,
            category_id: data.categoryId,
            description: data.description || targetCatName,
            amount: Number(data.amount),
            allocation_type: data.allocation_type,
            _catObj: catObj,
            _isInc: data.type === 'income'
          };
        }
        return item;
      }));
      setEditingItem(null);
    } else {
      // Add new item to cart
      const newItem: PendingBatchItem = {
        id: `temp_${crypto.randomUUID()}`,
        date: data.date, 
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
    }
  }, [catMap, editingItem]);

  const handleRemovePending = useCallback((id: string) => {
    setPendingItems(prev => prev.filter(i => i.id !== id));
    setEditingItem(prev => (prev?.id === id ? null : prev));
  }, []);

  const handleEditPending = useCallback((item: PendingBatchItem) => {
    setEditingItem(item);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingItem(null);
  }, []);
  
  const applyAddFormSuggestion = useCallback((s: any) => {
    if (formMethodsRef.current) {
      const { setValue, setFocus } = formMethodsRef.current;
      setValue('categoryId', s.categoryId, { skipAllocationDefault: !!s.allocation_type } as any);
      setValue('description', s.description || '');
      setValue('amount', Number(s.amount), { shouldValidate: true });
      if (s.allocation_type) {
        setValue('allocation_type', s.allocation_type);
      }
      setTimeout(() => setFocus('amount'), 10);
    }
  }, []);

  const submitBatch = async () => {
    if (pendingItems.length === 0) return;
    setIsProcessing(true);
    try {
      const finalItems: TransactionPayload[] = pendingItems.map((item) => ({
        id: crypto.randomUUID(),
        date: item.date, 
        category: item.category,
        category_id: item._catObj?.id || item.category_id, 
        description: item.description, 
        amount: item.amount, 
        allocation_type: item.allocation_type || 'want',
        dayNote: item.dayNote || ''
      }));
      await onSaveBatch(finalItems);
      setPendingItems([]);
      setEditingItem(null);
      onClose();
    } catch (err) {
      console.error('Batch save error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Cart financial summary breakdowns
  const totalExpense = useMemo(() => 
    pendingItems.filter(i => !i._isInc).reduce((sum, i) => sum + i.amount, 0),
    [pendingItems]
  );
  const totalIncome = useMemo(() => 
    pendingItems.filter(i => i._isInc).reduce((sum, i) => sum + i.amount, 0),
    [pendingItems]
  );
  const netAmount = totalIncome - totalExpense;

  if (!isOpen) return null;

  const tokens = {
    surface: 'bg-[#181818] border-[#3e3e3e]',
    headerFooter: 'bg-[#1c1c1c] border-[#303030]',
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-3 sm:p-6">
      <div 
        className={`rounded-none shadow-2xl shadow-black/80 flex flex-col w-full max-w-[1460px] h-[82vh] min-h-[540px] max-h-[755px] overflow-hidden border ${tokens.surface}`}
        style={{ borderTop: '4px solid #da291c', borderRadius: 0 }}
      >

        {/* Modal Header */}
        <div className={`px-5 py-4 border-b flex justify-between items-center shrink-0 ${tokens.headerFooter}`}>
          <h3 className="text-base font-bold flex items-center gap-2 text-slate-100">
            <CalendarPlus className="w-5 h-5 text-[#da291c]" /> สรุปค่าใช้จ่ายประจำวัน (Batch Add)
          </h3>
          <button 
            type="button" 
            onClick={handleSafeClose} 
            className="p-1.5 rounded-none transition-colors text-slate-400 hover:bg-[#303030] hover:text-slate-200"
            title="ปิดหน้าต่าง (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3-Column Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden bg-[#181818]">

          <BatchForm
            onSubmitItem={handleAddSubmit}
            categories={categories}
            cashflowGroups={cashflowGroups}
            defaultType={defaultType}
            defaultDate={defaultDate}
            defaultCategoryId={resolvedDefaultCatId}
            isProcessing={isProcessing}
            externalFormSetter={(methods) => { formMethodsRef.current = methods; }}
            onTypeChange={setCurrentFormType}
            dayTypes={dayTypes}
            dayTypeConfig={dayTypeConfig}
            editingItem={editingItem}
            onCancelEdit={handleCancelEdit}
          />

          <QuickSuggest
            categories={categories}
            catMap={catMap}
            cashflowGroups={cashflowGroups}
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
            onEditItem={handleEditPending}
            editingItemId={editingItem?.id}
            isProcessing={isProcessing}
          />

        </div>

        {/* Modal Footer with Accurate Total Breakdown */}
        <div className={`px-5 py-4 border-t flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3 ${tokens.headerFooter}`}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-xs text-slate-400">ยอดรวมในตะกร้า:</span>
            {pendingItems.length === 0 ? (
              <span className="text-sm font-bold text-slate-500">0.00 ฿</span>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                {totalExpense > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-slate-400">รายจ่าย:</span>
                    <span className="text-base font-black text-[#da291c] tabular-nums">
                      <AnimatedNumber value={totalExpense} /> ฿
                    </span>
                  </div>
                )}
                {totalIncome > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-medium text-slate-400">รายรับ:</span>
                    <span className="text-base font-black text-emerald-400 tabular-nums">
                      +<AnimatedNumber value={totalIncome} /> ฿
                    </span>
                  </div>
                )}
                {totalExpense > 0 && totalIncome > 0 && (
                  <div className="flex items-center gap-1 pl-2 border-l border-[#3e3e3e]">
                    <span className="text-[11px] font-medium text-slate-400">สุทธิ:</span>
                    <span className={`text-base font-black tabular-nums ${netAmount >= 0 ? 'text-emerald-400' : 'text-[#da291c]'}`}>
                      {netAmount >= 0 ? '+' : ''}<AnimatedNumber value={netAmount} /> ฿
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              type="button" 
              onClick={handleSafeClose} 
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-4 py-2 border rounded-none font-bold text-xs transition-all active:scale-95 disabled:opacity-50 text-slate-300 bg-[#303030]/60 border-[#303030] hover:bg-[#303030]"
            >
              ทิ้งข้อมูล
            </button>
            <button 
              type="button" 
              onClick={submitBatch} 
              disabled={pendingItems.length === 0 || isProcessing}
              className="flex-1 sm:flex-none px-5 py-2 disabled:opacity-50 text-white rounded-none font-bold text-xs flex justify-center items-center gap-2 shadow-sm transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-700 border border-emerald-700"
            >
              {isProcessing ? <Zap className="w-4 h-4 animate-pulse" /> : <CheckCircle className="w-4 h-4" />}
              {isProcessing ? 'กำลังบันทึก...' : 'บันทึกทั้งหมดลง DB'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}