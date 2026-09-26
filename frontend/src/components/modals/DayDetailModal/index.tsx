import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar, ChevronDown, Tag, ArrowDownWideNarrow } from 'lucide-react';
import { formatMoney, hexToRgb, THAI_MONTHS, getThaiDayInfo } from '../../../utils/formatters';
import DailyForm from './DailyForm';
import QuickSuggest from './QuickSuggest';
import TransactionList from './TransactionList';
import DatePicker from '../../ui/DatePicker';
import { Category, CashflowGroup, DayType, FrequentItem, TransactionDisplay } from '../../../types';
import { resolveDefaultDayTypeId } from '@/views/Calendar/utils/calendarPeriodHelpers';
import { stepDate } from '@/utils/datePickerHelpers';
import DayTypeSelect from '@/components/shared/DayTypeSelect';

import { tc, readable } from '@/constants/theme';
import { useFocusTrap } from '@/hooks/useFocusTrap';
export interface DayDetailModalProps {
  dateStr: string;
  transactions?: TransactionDisplay[];
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  onClose: () => void;
  onSave: (tx: any) => Promise<any> | void;
  onDelete: (id: string) => void;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  frequentItems?: FrequentItem[];
  onDateChange?: (newDateStr: string) => void;
  handleDayTypeChange?: (dateStr: string, val: string) => void;
}

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
  frequentItems = [],
  onDateChange,
  handleDayTypeChange
}: DayDetailModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>();
  
  const [activeDateStr, setActiveDateStr] = useState(dateStr);

  useEffect(() => {
    setActiveDateStr(dateStr);
  }, [dateStr]);

  const handleDateChange = (newDateStr: string) => {
    if (!newDateStr || newDateStr === activeDateStr) return;
    setActiveDateStr(newDateStr);
    onDateChange?.(newDateStr);
  };

  const handleStepDay = (step: -1 | 1) => {
    const nextDateStr = stepDate(activeDateStr, step);
    handleDateChange(nextDateStr);
  };

  const [yyyyStr, mmStr, ddStr] = (activeDateStr || '').split('-');
  const d = Number.parseInt(ddStr, 10);
  const m = Number.parseInt(mmStr, 10);
  const y = Number.parseInt(yyyyStr, 10);
  const dateObj = new Date(y, m - 1, d);
  const dayOfWeek = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'][dateObj.getDay()];
  const displayDate = `${d} ${THAI_MONTHS[m - 1] || ''} ${y}`;
  const thaiDay = getThaiDayInfo(activeDateStr);

  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
  const defaultTypeId = resolveDefaultDayTypeId(dayTypeConfig, isWeekend);
  const dayTypeId = dayTypes[activeDateStr] || defaultTypeId;
  const currentDayType = dayTypeId ? dayTypeConfig.find(dt => dt.id === dayTypeId) : null;

  const defaultExpenseCatId = categories.find(c => c.type === 'expense')?.id || '';

  const [localItems, setLocalItems]           = useState<any[]>([]);
  const [isSaving, setIsSaving]               = useState(false);
  const [suggCatFilter, setSuggCatFilter]     = useState('ALL');
  const [currentFormType, setCurrentFormType] = useState('expense');
  const [sortBy, setSortBy] = useState<'category' | 'amount'>('category');

  const formMethodsRef = useRef<any>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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

  const dayTx = useMemo(() => {
    const txIds = new Set(transactions.map(t => t.id));
    const pendingItems = localItems.filter(i => !txIds.has(i.id));
    const combined = [...transactions.filter(t => t.date === activeDateStr), ...pendingItems];
    
    // Sankey-Style Logic Sorting
    return combined.sort((a, b) => {
      const catA = (a.category_id && catMap[a.category_id]) || (a.category && catMap[a.category]);
      const catB = (b.category_id && catMap[b.category_id]) || (b.category && catMap[b.category]);

      // 1. Sort by Type (Income -> Expense -> Savings)
      const typeOrder: Record<string, number> = { income: 0, expense: 1, savings: 2 };
      const typeA = (catA?.type && typeOrder[catA.type]) ?? 9;
      const typeB = (catB?.type && typeOrder[catB.type]) ?? 9;
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
      const amtA = Number.parseFloat(String(a.amount)) || 0;
      const amtB = Number.parseFloat(String(b.amount)) || 0;
      if (amtB !== amtA) return amtB - amtA;

      // 5. Fallback to ID for stability
      return String(a.id).localeCompare(String(b.id));
    });
  }, [transactions, localItems, activeDateStr, catMap]);

  const expenses   = dayTx.filter(t => {
    const cat = (t.category_id && catMap[t.category_id]) || (t.category && catMap[t.category]);
    return cat?.type === 'expense';
  });
  const income     = dayTx.filter(t => {
    const cat = (t.category_id && catMap[t.category_id]) || (t.category && catMap[t.category]);
    return cat?.type === 'income';
  });
  const totalExp   = expenses.reduce((s, t) => s + (Number.parseFloat(String(t.amount)) || 0), 0);
  const totalInc   = income.reduce((s, t) => s + (Number.parseFloat(String(t.amount)) || 0), 0);
  const net        = totalInc - totalExp;

  const applySuggestion = (s: any) => {
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

  const handleSave = async (data: any) => {
    setIsSaving(true);

    const catObj = catMap[data.categoryId];
    const targetCatName = catObj?.name || 'อื่นๆ';
    const newItem = {
      id: crypto.randomUUID(),
      date: activeDateStr, 
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
      return true;
    } catch (err: any) {
      // The form keeps its values and shows the error inline (DailyForm); the global toast comes from saveToDb
      console.error('Save failed:', err);
      setLocalItems(prev => prev.filter(i => i.id !== newItem.id));
      return false;
    } finally { 
      setIsSaving(false); 
    }
  };

  // Confirmation happens in the row's ConfirmDeleteButton
  const handleDelete = (id: string) => {
    if (localItems.some(i => i.id === id)) setLocalItems(prev => prev.filter(i => i.id !== id));
    else onDelete(id);
  };

  const tokens = {
    surface: 'bg-canvas',
    border: 'border-line',
    textPri: 'text-slate-100',
    textMuted: 'text-slate-400',
    closeBtn: `p-1.5 rounded-none transition-colors absolute top-4 right-4 z-10 hover:bg-surface-elevated text-slate-400`,
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="รายละเอียดรายวัน" tabIndex={-1} 
        className={`${tokens.surface} shadow-[0_16px_48px_rgba(0,0,0,0.6)] w-full max-w-6xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200 border-x border-b border-line-strong overflow-hidden relative md:h-[750px] md:min-h-[615px] md:max-h-[calc(100vh-2rem)] h-[90vh]`}
        style={{ borderTop: `4px solid ${tc('accent')}`, borderRadius: 0 }}
      >

        <button onClick={onClose} className={tokens.closeBtn} title="ปิด">
          <X className="w-4 h-4" />
        </button>

        <div className={`flex flex-col w-full md:w-[62%] border-b md:border-b-0 md:border-r ${tokens.border} h-[55vh] md:h-full min-h-0 bg-surface-hover`}>
          <div className={`flex items-start justify-between gap-3 px-5 py-3.5 border-b ${tokens.border} shrink-0 pr-12 md:pr-5`}>
            <div className="min-w-0">
              {/* Header Date Navigation Bar */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Previous Day Button */}
                <button
                  type="button"
                  onClick={() => handleStepDay(-1)}
                  className="p-1 rounded-none border border-line-strong bg-surface hover:bg-surface-elevated hover:border-accent text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="วันก่อนหน้า ( -1 วัน )"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Thai Day Color Badge */}
                {thaiDay && (
                  <span 
                    className="w-6 h-6 flex items-center justify-center text-[11px] font-black rounded-none border shrink-0 select-none shadow-sm"
                    style={{ 
                      backgroundColor: thaiDay.bg, 
                      borderColor: thaiDay.border, 
                      color: readable(thaiDay.color) 
                    }}
                    title={thaiDay.fullName}
                  >
                    {thaiDay.label}
                  </span>
                )}

                {/* Interactive Date Picker Trigger */}
                <div className="relative inline-block">
                  <DatePicker
                    value={activeDateStr}
                    onChange={handleDateChange}
                    dayTypes={dayTypes}
                    dayTypeConfig={dayTypeConfig}
                    customTrigger={({ setOpen, open }) => (
                      <button
                        type="button"
                        onClick={() => setOpen(!open)}
                        className="group flex items-center gap-1.5 px-2 py-0.5 rounded-none border border-transparent hover:border-line-strong hover:bg-surface transition-all cursor-pointer text-left"
                        title="คลิกเพื่อเลือกวัน/เดือน/ปี"
                      >
                        <h2 className={`text-base font-black tracking-tight ${tokens.textPri} group-hover:text-accent transition-colors`}>
                          {displayDate}
                        </h2>
                        <Calendar className="w-3.5 h-3.5 text-slate-400 group-hover:text-accent transition-colors" />
                        <span className={`text-xs font-bold ${tokens.textMuted}`}>
                          วัน{dayOfWeek}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-500 group-hover:text-white transition-colors" />
                      </button>
                    )}
                  />
                </div>

                {/* Next Day Button */}
                <button
                  type="button"
                  onClick={() => handleStepDay(1)}
                  className="p-1 rounded-none border border-line-strong bg-surface hover:bg-surface-elevated hover:border-accent text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="วันถัดไป ( +1 วัน )"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {handleDayTypeChange ? (
                  <DayTypeSelect
                    value={dayTypeId}
                    onChange={(newVal) => handleDayTypeChange(activeDateStr, newVal)}
                    dayTypeConfig={dayTypeConfig}
                    dateStr={activeDateStr}
                    size="xs"
                    topOffset={44}
                  />
                ) : currentDayType && (
                  <span
                    className="px-2 py-0.5 text-[11px] font-black tracking-wider uppercase rounded-none border shrink-0"
                    style={{
                      backgroundColor: `rgba(${hexToRgb(currentDayType.color || tc('ink-body'))}, 0.12)`,
                      borderColor: `rgba(${hexToRgb(currentDayType.color || tc('ink-body'))}, 0.35)`,
                      color: readable(currentDayType.color || tc('gray-300'))
                    }}
                  >
                    {currentDayType.label}
                  </span>
                )}
              </div>

              {/* Day Financial HUD Summary */}
              <div className="flex items-center gap-2 mt-2 flex-wrap tabular-nums tracking-tight">
                {totalInc > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-none bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 flex items-center gap-1">
                    <span className="text-[11px] font-medium opacity-80">รับ</span> +฿{formatMoney(totalInc)}
                  </span>
                )}
                {totalExp > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-none bg-expense/10 text-expense border border-expense/40 flex items-center gap-1">
                    <span className="text-[11px] font-medium opacity-80">จ่าย</span> -฿{formatMoney(totalExp)}
                  </span>
                )}
                {dayTx.length > 0 && (
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-none border flex items-center gap-1 ${
                    net >= 0 
                      ? 'bg-amber-950/30 text-amber-300 border-amber-800/40' 
                      : 'bg-danger/10 text-danger border-danger/30'
                  }`}>
                    <span className="text-[11px] font-medium opacity-80">สุทธิ</span> 
                    {net >= 0 ? `+฿${formatMoney(net)}` : `-฿${formatMoney(Math.abs(net))}`}
                  </span>
                )}
              </div>
            </div>

            {/* Sort Controls */}
            {dayTx.length > 0 && (
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-0.5 select-none">เรียงตาม</span>
                <button
                  type="button"
                  onClick={() => setSortBy('category')}
                  title="เรียงตามหมวดหมู่"
                  aria-label="เรียงตามหมวดหมู่"
                  aria-pressed={sortBy === 'category'}
                  className={`flex items-center gap-1 px-1.5 py-1 rounded-none border text-[11px] font-medium transition-colors cursor-pointer ${
                    sortBy === 'category'
                      ? 'bg-accent/15 border-accent/40 text-expense'
                      : 'border-line-strong bg-surface text-slate-400 hover:text-slate-200 hover:border-accent'
                  }`}
                >
                  <Tag className="w-3 h-3 shrink-0" />
                  <span>หมวดหมู่</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('amount')}
                  title="เรียงตามจำนวนเงิน"
                  aria-label="เรียงตามจำนวนเงิน"
                  aria-pressed={sortBy === 'amount'}
                  className={`flex items-center gap-1 px-1.5 py-1 rounded-none border text-[11px] font-medium transition-colors cursor-pointer ${
                    sortBy === 'amount'
                      ? 'bg-accent/15 border-accent/40 text-expense'
                      : 'border-line-strong bg-surface text-slate-400 hover:text-slate-200 hover:border-accent'
                  }`}
                >
                  <ArrowDownWideNarrow className="w-3 h-3 shrink-0" />
                  <span>จำนวนเงิน</span>
                </button>
              </div>
            )}
          </div>

          <TransactionList
            dayTx={dayTx}
            catMap={catMap}
            handleDelete={handleDelete}
            sortBy={sortBy}
          />

          <DailyForm
            key={activeDateStr}
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