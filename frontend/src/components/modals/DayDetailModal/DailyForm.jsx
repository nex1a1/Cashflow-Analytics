import React, { useEffect } from 'react';
import { CheckCircle, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const dailyAddSchema = z.object({
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  description: z.string().optional(),
  amount: z.number({ invalid_type_error: "ระบุจำนวนเงิน" }).positive("ต้องมากกว่า 0"),
  allocation_type: z.enum(['need', 'want', 'savings']).nullable().optional(),
});

export default function DailyForm({
  onSubmitItem,
  categories,
  defaultType,
  defaultCategoryId,
  isProcessing,
  externalFormSetter,
  onTypeChange
}) {
  const dm = true;
  
  const { register, handleSubmit, watch, setValue, formState: { errors }, setFocus } = useForm({
    resolver: zodResolver(dailyAddSchema),
    defaultValues: {
      type: defaultType || 'expense',
      categoryId: defaultCategoryId || '',
      description: '',
      amount: '',
      allocation_type: 'want'
    }
  });

  const formType = watch('type');
  const allocationType = watch('allocation_type');

  // 1. Expose form methods to parent (for hotkeys & QuickSuggest)
  useEffect(() => {
    if (externalFormSetter) {
      externalFormSetter({ setValue, setFocus, watch });
    }
  }, [externalFormSetter, setValue, setFocus, watch]);

  // 2. Notify parent of type changes to filter suggestions
  useEffect(() => {
    if (onTypeChange) onTypeChange(formType);
  }, [formType, onTypeChange]);

  // Auto-default allocation type when category changes
  const selectedCatId = watch('categoryId');
  useEffect(() => {
    if (formType === 'income') {
      setValue('allocation_type', null);
      return;
    }
    const cat = categories.find(c => c.id === selectedCatId);
    if (cat && cat.allocation_type) {
      setValue('allocation_type', cat.allocation_type);
    }
  }, [formType, selectedCatId, setValue, categories]);

  const onSubmit = (data) => {
    onSubmitItem(data);
    setValue('description', '');
    setValue('amount', '', { shouldValidate: false });
    setTimeout(() => setFocus('amount'), 10);
  };

  const handleTypeChange = (newType) => {
    setValue('type', newType);
    const firstCat = categories.find(c => c.type === newType);
    setValue('categoryId', firstCat?.id || '');
  };

  const handleKeyDown = (e) => { 
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      handleSubmit(onSubmit)(); 
    } 
  };

  const tokens = {
    surfaceAlt: 'bg-[#1c1c1c]',
    border: 'border-[#303030]',
    textMuted: 'text-slate-400',
    input: `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors w-full ${'bg-[#181818] border-[#3e3e3e] text-white focus:border-[#da291c] focus:ring-[#da291c]/30'}`,
    inputError: `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors w-full ${'bg-[#181818] border-red-500 text-red-200 focus:ring-red-500/30'}`,
    errorText: `text-[10px] font-bold text-red-500 mt-1`
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`border-t ${tokens.border} px-4 pt-4 pb-5 space-y-2.5 shrink-0 ${tokens.surfaceAlt}`}>
      <div className={`flex p-0.5 rounded-none border ${'bg-[#181818] border-[#303030]'}`}>
        <button type="button" onClick={() => handleTypeChange('expense')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-none transition-all ${formType === 'expense' ? ('bg-[#303030] text-red-400 shadow-sm') : tokens.textMuted}`}>
          รายจ่าย (Alt+E)
        </button>
        <button type="button" onClick={() => handleTypeChange('income')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-none transition-all ${formType === 'income' ? ('bg-[#303030] text-emerald-400 shadow-sm') : tokens.textMuted}`}>
          รายรับ (Alt+I)
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-[3]">
          <select {...register('categoryId')} className={errors.categoryId ? tokens.inputError : tokens.input}>
            {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          {errors.categoryId && <p className={tokens.errorText}>{errors.categoryId.message}</p>}
        </div>

        {formType === 'expense' && (
          <div className={`flex p-0.5 rounded-none border shrink-0 ${'bg-[#181818] border-[#303030]'}`}>
            {[
              { val: 'need', label: 'NEED', color: 'text-rose-400' },
              { val: 'want', label: 'WANT', color: 'text-sky-400' },
              { val: 'savings', label: 'SAVE', color: 'text-emerald-400' }
            ].map(opt => (
              <button key={opt.val} type="button" onClick={() => setValue('allocation_type', opt.val)}
                className={`px-2 py-1 text-[10px] font-black rounded-none transition-all ${allocationType === opt.val ? (dm ? 'bg-[#303030] ' + opt.color : 'bg-white ' + opt.color + ' shadow-sm') : tokens.textMuted}`}>
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2 items-start">
        <div className="flex-[2]">
          <input type="text" {...register('description')} onKeyDown={handleKeyDown} placeholder="รายละเอียด..." className={tokens.input} />
        </div>
        <div className="flex-1 min-w-[100px]">
          <input type="number" step="any" {...register('amount', { valueAsNumber: true })} onKeyDown={handleKeyDown} placeholder="0.00" className={`${errors.amount ? tokens.inputError : tokens.input} text-right font-black`} />
          {errors.amount && <p className={tokens.errorText}>{errors.amount.message}</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setValue('description', ''); setValue('amount', '', { shouldValidate: false }); setTimeout(() => setFocus('amount'), 10); }} disabled={isProcessing}
          className="px-3 py-2.5 rounded-none font-bold text-xs flex items-center justify-center transition-colors disabled:opacity-50 border bg-[#303030]/60 hover:bg-[#383838] text-slate-300 border-[#3e3e3e]"
          title="ล้างข้อมูลที่กำลังพิมพ์ (Clear Form)"
        >
          ล้าง
        </button>
        <button type="submit" disabled={isProcessing}
          className={`flex-1 py-2.5 rounded-none font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 text-white shadow-sm border ${formType === 'expense' ? 'bg-red-600 hover:bg-red-500 border-red-700' : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-700'}`}>
          {isProcessing ? <><Zap className="w-4 h-4 animate-pulse" /> กำลังบันทึก...</> : <><CheckCircle className="w-4 h-4" /> บันทึก (Enter)</>}
        </button>
      </div>
    </form>
  );
}