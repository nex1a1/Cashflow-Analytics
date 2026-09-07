import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from '../../ui/DatePicker';
import { Category, CashflowGroup, DayType, AllocationType } from '../../../types';

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

export interface BatchFormProps {
  onSubmitItem: (item: any) => void;
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  defaultType?: 'income' | 'expense' | string;
  defaultDate?: string;
  defaultCategoryId?: string;
  isProcessing?: boolean;
  externalFormSetter?: (controls: { setValue: any; setFocus: any; watch: any }) => void;
  onTypeChange?: (type: string) => void;
  dayTypes?: Record<string, string>;
  dayTypeConfig?: DayType[];
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
  dayTypeConfig = []
}: BatchFormProps) {
  const dm = true;
  
  const { register, handleSubmit, watch, setValue, formState: { errors }, setFocus } = useForm<BatchFormValues>({
    resolver: zodResolver(batchAddSchema) as any,
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

  const groupedCategories = useMemo(() => {
    const relevantCats = categories.filter(c => c.type === formType);
    const groupLookup = cashflowGroups.reduce<Record<string, CashflowGroup>>((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});

    const groups: Record<string, { id: string; name: string; order: number; categories: Category[] }> = {};
    relevantCats.forEach(c => {
      const gId = c.cashflowGroup || c.cashflow_group_id || 'other';
      const gObj = groupLookup[gId];
      const gName = gObj?.name || 'ทั่วไป / อื่นๆ';
      const gOrder = gObj?.order_index ?? 999;

      if (!groups[gId]) {
        groups[gId] = {
          id: gId,
          name: gName,
          order: gOrder,
          categories: []
        };
      }
      groups[gId].categories.push(c);
    });

    return Object.values(groups)
      .sort((a, b) => a.order - b.order)
      .map(g => ({
        ...g,
        categories: [...g.categories].sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
      }));
  }, [categories, cashflowGroups, formType]);

  const isApplyingSuggestionRef = useRef(false);

  const customSetValue = useCallback((name: any, value: any, options: any) => {
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
    const cat = categories.find(c => c.id === selectedCatId);
    if (cat?.allocation_type) {
      setValue('allocation_type', cat.allocation_type);
    }
  }, [formType, selectedCatId, setValue, categories]);

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
    input: `w-full px-3 py-2 text-xs border rounded-none outline-none focus:ring-1 transition-colors ${'bg-[#181818] border-[#3e3e3e] text-white focus:border-[#da291c] focus:ring-[#da291c]/30'}`,
    inputError: `w-full px-3 py-2 text-xs border rounded-none outline-none focus:ring-1 transition-colors ${'bg-[#181818] border-red-500 text-red-200 focus:ring-red-500/30'}`,
    label: `block text-[11px] font-bold uppercase mb-1.5 ${'text-slate-400'}`,
    errorText: `text-[10px] font-bold text-red-500 mt-1`
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full lg:w-[33%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col lg:overflow-y-auto bg-[#1c1c1c] border-[#303030]">
      
      <div className={`flex p-0.5 mb-4 rounded-none border ${'bg-[#181818] border-[#303030]'}`}>
        <button type="button" onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-1.5 font-bold text-xs rounded-none transition-all ${formType === 'expense' ? ('bg-[#303030] text-red-400 shadow-sm') : ('text-slate-400 hover:text-slate-200')}`}>
          รายจ่าย
        </button>
        <button type="button" onClick={() => handleTypeChange('income')}
          className={`flex-1 py-1.5 font-bold text-xs rounded-none transition-all ${formType === 'income' ? ('bg-[#303030] text-emerald-400 shadow-sm') : ('text-slate-400 hover:text-slate-200')}`}>
          รายรับ
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <span className={tokens.label}>วันที่</span>
          <DatePicker 
            value={formDate} 
            onChange={(v) => setValue('date', v, { shouldValidate: true })} 
            required 
            dayTypes={dayTypes}
            dayTypeConfig={dayTypeConfig}
          />
          {errors.date && <p className={tokens.errorText}>{errors.date.message}</p>}
        </div>
        <div className="flex-1">
          <label htmlFor="batch-amount" className={tokens.label}>จำนวนเงิน ฿</label>
          <div className="relative flex items-center">
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

      <div className="mb-4">
        <label htmlFor="batch-category" className={tokens.label}>หมวดหมู่</label>
        <div className="flex gap-2">
          <select id="batch-category" {...register('categoryId')} className={errors.categoryId ? tokens.inputError : tokens.input}>
            {groupedCategories.map(g => (
              <optgroup key={g.id} label={g.name} className="bg-[#181818] text-slate-400 font-bold">
                {g.categories.map(c => (
                  <option key={c.id} value={c.id} className="bg-[#121212] text-slate-100 font-medium">
                    {c.icon} {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          
          {formType === 'expense' && (
            <div className={`flex p-0.5 rounded-none border shrink-0 ${'bg-[#181818] border-[#303030]'}`}>
              {[
                { val: 'need', label: 'NEED', color: 'text-rose-400' },
                { val: 'want', label: 'WANT', color: 'text-sky-400' },
                { val: 'savings', label: 'SAVE', color: 'text-emerald-400' }
              ].map(opt => {
                const isSelected = allocationType === opt.val;
                let activeStyle = 'text-slate-500';
                if (isSelected) {
                  activeStyle = dm ? `bg-[#303030] ${opt.color}` : `bg-white ${opt.color} shadow-sm`;
                }
                return (
                  <button key={opt.val} type="button" onClick={() => setValue('allocation_type', opt.val as AllocationType)}
                    className={`px-2 py-1 text-[10px] font-black rounded-none transition-all ${activeStyle}`}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {errors.categoryId && <p className={tokens.errorText}>{errors.categoryId.message}</p>}
      </div>

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

      <div className="mt-auto flex gap-2">
        <button type="button" onClick={() => { setValue('description', ''); setValue('amount', '' as unknown as number, { shouldValidate: false }); setTimeout(() => setFocus('amount'), 10); }} disabled={isProcessing}
          className={`px-3 py-2.5 border rounded-none font-bold text-xs flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 ${'bg-[#303030]/60 hover:bg-[#303030] text-slate-300 border-[#303030]'}`}
          title="ล้างข้อมูลที่กำลังพิมพ์ (Clear Form)"
        >
          ล้าง
        </button>
        <button type="submit" disabled={isProcessing}
          className={`flex-1 px-4 py-2.5 border rounded-none font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${'bg-[#da291c] hover:bg-[#b01e0a] text-white border-[#da291c]'}`}>
          <PlusCircle className="w-4 h-4" /> เพิ่มลงตะกร้า (Enter)
        </button>
      </div>
    </form>
  );
}

export default React.memo(BatchForm);