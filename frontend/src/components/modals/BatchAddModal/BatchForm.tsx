import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { PlusCircle, Check, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForm, UseFormSetValue, UseFormSetFocus, UseFormWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from '../../ui/DatePicker';
import { stepDate, toValueStr } from '@/utils/datePickerHelpers';
import { Category, CashflowGroup, DayType, AllocationType } from '../../../types';
import { PendingBatchItem } from './index';
import CategorySelect from '@/components/shared/CategorySelect';

const getLocalDateString = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const batchAddSchema = z.object({
  type: z.enum(['income', 'expense']),
  date: z.string().min(1, "กรุณาเลือกวันที่"),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  description: z.string().optional(),
  amount: z.number({ message: "กรุณาระบุจำนวนเงิน" }).positive("จำนวนเงินต้องมากกว่า 0"),
  allocation_type: z.enum(['need', 'want', 'savings']).nullable().optional(),
});

export interface BatchFormValues {
  type: 'income' | 'expense';
  date: string;
  categoryId: string;
  description?: string;
  amount: number;
  allocation_type?: AllocationType | null;
}

export interface ExternalFormControls {
  setValue: UseFormSetValue<BatchFormValues>;
  setFocus: UseFormSetFocus<BatchFormValues>;
  watch: UseFormWatch<BatchFormValues>;
}

export interface BatchFormProps {
  onSubmitItem: (item: BatchFormValues) => void;
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  defaultType?: 'income' | 'expense' | string;
  defaultDate?: string;
  defaultCategoryId?: string;
  isProcessing?: boolean;
  externalFormSetter?: (controls: ExternalFormControls) => void;
  onTypeChange?: (type: string) => void;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
  editingItem?: PendingBatchItem | null;
  onCancelEdit?: () => void;
}

function BatchForm({
  onSubmitItem,
  categories = [],
  cashflowGroups = [],
  defaultType,
  defaultDate,
  defaultCategoryId,
  isProcessing,
  externalFormSetter,
  onTypeChange,
  dayTypes = {},
  dayTypeConfig = [],
  editingItem,
  onCancelEdit
}: BatchFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors }, setFocus } = useForm<BatchFormValues>({
    resolver: zodResolver(batchAddSchema),
    defaultValues: {
      type: (defaultType as 'income' | 'expense') || 'expense',
      date: defaultDate || getLocalDateString(),
      categoryId: defaultCategoryId || '',
      description: '',
      amount: '' as unknown as number,
      allocation_type: 'want'
    }
  });

  const formType = watch('type');
  const formDate = watch('date');
  const allocationType = watch('allocation_type');

  // Load editing item data into form
  useEffect(() => {
    if (editingItem) {
      setValue('type', editingItem._isInc ? 'income' : 'expense');
      setValue('date', editingItem.date);
      setValue('categoryId', editingItem.category_id || editingItem._catObj?.id || '');
      setValue('description', editingItem.description || '');
      setValue('amount', Number(editingItem.amount), { shouldValidate: true });
      setValue('allocation_type', editingItem.allocation_type || null);
      setTimeout(() => setFocus('amount'), 50);
    }
  }, [editingItem, setValue, setFocus]);

  const isApplyingSuggestionRef = useRef(false);

  const customSetValue: UseFormSetValue<BatchFormValues> = useCallback((name: any, value: any, options?: any) => {
    if (name === 'categoryId' && options?.skipAllocationDefault) {
      isApplyingSuggestionRef.current = true;
    }
    setValue(name, value, options);
  }, [setValue]);

  const selectedCatId = watch('categoryId');
  useEffect(() => {
    if (formType === 'income') {
      setValue('allocation_type', null);
      return;
    }
    if (isApplyingSuggestionRef.current) {
      isApplyingSuggestionRef.current = false;
      return;
    }
    if (editingItem) return; // Do not overwrite allocation when in edit mode
    const cat = categories.find(c => c.id === selectedCatId);
    if (cat?.allocation_type) {
      setValue('allocation_type', cat.allocation_type);
    }
  }, [formType, selectedCatId, setValue, categories, editingItem]);

  useEffect(() => {
    if (externalFormSetter) {
      externalFormSetter({ setValue: customSetValue, setFocus, watch });
    }
  }, [externalFormSetter, customSetValue, setFocus, watch]);

  useEffect(() => {
    if (onTypeChange) onTypeChange(formType);
  }, [formType, onTypeChange]);

  const onSubmit = (data: BatchFormValues) => {
    onSubmitItem(data);
    setValue('description', '');
    setValue('amount', '' as unknown as number, { shouldValidate: false });
    setTimeout(() => setFocus('amount'), 10);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { 
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      handleSubmit(onSubmit)(); 
    } 
  };

  const handleTypeChange = (newType: 'income' | 'expense') => {
    setValue('type', newType);
    const firstCat = categories.find(c => c.type === newType);
    setValue('categoryId', firstCat?.id || '');
  };

  const tokens = {
    input: "w-full h-9 px-3 text-xs border rounded-none outline-none focus:ring-1 transition-colors bg-[#181818] border-[#3e3e3e] text-white focus:border-[#da291c] focus:ring-[#da291c]/30",
    inputError: "w-full h-9 px-3 text-xs border rounded-none outline-none focus:ring-1 transition-colors bg-[#181818] border-red-500 text-red-200 focus:ring-red-500/30",
    label: "block text-[11px] font-bold uppercase mb-1.5 text-slate-400",
    errorText: "text-[10px] font-bold text-red-500 mt-1"
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full lg:w-[33%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col lg:overflow-y-auto bg-[#1c1c1c] border-[#303030]">
      
      {/* Type Toggle: Expense / Income */}
      <div className="grid grid-cols-2 p-0.5 mb-4 rounded-none border bg-[#181818] border-[#303030] h-9">
        <button 
          type="button" 
          onClick={() => handleTypeChange('expense')}
          className={`h-full font-bold text-xs rounded-none transition-all flex items-center justify-center ${
            formType === 'expense' 
              ? 'bg-[#303030] text-red-400 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          รายจ่าย
        </button>
        <button 
          type="button" 
          onClick={() => handleTypeChange('income')}
          className={`h-full font-bold text-xs rounded-none transition-all flex items-center justify-center ${
            formType === 'income' 
              ? 'bg-[#303030] text-emerald-400 shadow-sm' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          รายรับ
        </button>
      </div>

      {/* Date & Amount Row */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className={tokens.label} style={{ marginBottom: 0 }}>วันที่</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setValue('date', stepDate(formDate, -1), { shouldValidate: true })}
                className="p-0.5 rounded-none text-slate-400 hover:text-white hover:bg-[#303030] transition-colors"
                title="วันก่อนหน้า (-1 วัน)"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setValue('date', toValueStr(new Date()), { shouldValidate: true })}
                className="px-1 text-[9.5px] font-bold text-slate-400 hover:text-[#da291c] hover:bg-[#303030] transition-colors"
                title="เลือกวันนี้"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setValue('date', stepDate(formDate, 1), { shouldValidate: true })}
                className="p-0.5 rounded-none text-slate-400 hover:text-white hover:bg-[#303030] transition-colors"
                title="วันถัดไป (+1 วัน)"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <DatePicker 
            value={formDate} 
            onChange={(v) => setValue('date', v, { shouldValidate: true })} 
            required 
            dayTypes={dayTypes}
            dayTypeConfig={dayTypeConfig}
            className="w-full h-9 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-bold transition-colors outline-none bg-[#181818] border-[#3e3e3e] text-white hover:border-[#da291c] focus:border-[#da291c]"
          />
          {errors.date && <p className={tokens.errorText}>{errors.date.message}</p>}
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="batch-amount" className={tokens.label}>จำนวนเงิน ฿</label>
          <div className="relative flex items-center h-9">
            <span className="absolute left-2.5 text-xs font-bold select-none opacity-50 text-slate-400">
              ฿
            </span>
            <input 
              id="batch-amount"
              type="number" 
              step="any" 
              {...register('amount', { valueAsNumber: true })} 
              onKeyDown={handleKeyDown} 
              placeholder="0.00" 
              className={`${errors.amount ? tokens.inputError : tokens.input} pl-6 text-right font-bold tabular-nums tracking-tight`} 
            />
          </div>
          {errors.amount && <p className={tokens.errorText}>{errors.amount.message}</p>}
        </div>
      </div>

      {/* Category & Allocation Row */}
      <div className="mb-4">
        <label htmlFor="batch-category" className={tokens.label}>หมวดหมู่</label>
        <div className="flex gap-2 h-9">
          <div className="flex-1 min-w-0">
            <CategorySelect 
              id="batch-category" 
              value={selectedCatId} 
              onChange={(val) => setValue('categoryId', val, { shouldValidate: true })} 
              categories={categories} 
              cashflowGroups={cashflowGroups} 
              type={formType} 
              error={!!errors.categoryId} 
              size="md"
            />
          </div>
          
          {formType === 'expense' && (
            <div className="h-9 flex p-0.5 rounded-none border shrink-0 bg-[#181818] border-[#303030]">
              {[
                { val: 'need', label: 'NEED', color: 'text-rose-400' },
                { val: 'want', label: 'WANT', color: 'text-sky-400' },
                { val: 'savings', label: 'SAVE', color: 'text-emerald-400' }
              ].map(opt => {
                const isSelected = allocationType === opt.val;
                return (
                  <button 
                    key={opt.val} 
                    type="button" 
                    onClick={() => setValue('allocation_type', opt.val as AllocationType)}
                    className={`h-full px-2.5 text-[10px] font-black rounded-none transition-all flex items-center justify-center ${
                      isSelected ? `bg-[#303030] ${opt.color}` : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {errors.categoryId && <p className={tokens.errorText}>{errors.categoryId.message}</p>}
      </div>

      {/* Description Input */}
      <div className="mb-4">
        <label htmlFor="batch-description" className={tokens.label}>รายละเอียด</label>
        <input 
          id="batch-description" 
          type="text" 
          {...register('description')}
          onKeyDown={handleKeyDown}
          placeholder="เช่น ค่าข้าวเที่ยง" 
          className={tokens.input} 
        />
      </div>

      {/* Action Buttons: Normal vs Edit Mode */}
      <div className="mt-auto flex gap-2 h-10">
        {editingItem ? (
          <>
            <button 
              type="button" 
              onClick={onCancelEdit} 
              disabled={isProcessing}
              className="h-full px-3 border rounded-none font-bold text-xs flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 bg-[#303030]/60 hover:bg-[#303030] text-slate-300 border-[#303030]"
              title="ยกเลิกการแก้ไข"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="h-full flex-1 px-4 border rounded-none font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-amber-600 hover:bg-amber-500 text-white border-amber-600 shadow-sm"
            >
              <Check className="w-4 h-4" /> บันทึกแก้ไข (Enter)
            </button>
          </>
        ) : (
          <>
            <button 
              type="button" 
              onClick={() => { 
                setValue('description', ''); 
                setValue('amount', '' as unknown as number, { shouldValidate: false }); 
                setTimeout(() => setFocus('amount'), 10); 
              }} 
              disabled={isProcessing}
              className="h-full px-3 border rounded-none font-bold text-xs flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 bg-[#303030]/60 hover:bg-[#303030] text-slate-300 border-[#303030]"
              title="ล้างข้อมูลที่กำลังพิมพ์ (Clear Form)"
            >
              <RotateCcw className="w-4 h-4 mr-1 text-slate-400" /> ล้าง
            </button>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="h-full flex-1 px-4 border rounded-none font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-[#da291c] hover:bg-[#b01e0a] text-white border-[#da291c]"
            >
              <PlusCircle className="w-4 h-4" /> เพิ่มลงตะกร้า (Enter)
            </button>
          </>
        )}
      </div>
    </form>
  );
}

export default React.memo(BatchForm);