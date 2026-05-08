import React, { useEffect } from 'react';
import { CheckCircle, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../context/ThemeContext';

const dailyAddSchema = z.object({
  type: z.enum(['income', 'expense']),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  description: z.string().optional(),
  amount: z.number({ invalid_type_error: "ระบุจำนวนเงิน" }).positive("ต้องมากกว่า 0"),
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
  const { isDarkMode: dm } = useTheme();
  
  const { register, handleSubmit, watch, setValue, formState: { errors }, setFocus } = useForm({
    resolver: zodResolver(dailyAddSchema),
    defaultValues: {
      type: defaultType || 'expense',
      categoryId: defaultCategoryId || '',
      description: '',
      amount: ''
    }
  });

  const formType = watch('type');

  useEffect(() => {
    if (externalFormSetter) {
      externalFormSetter({ setValue, setFocus });
    }
  }, [externalFormSetter, setValue, setFocus]);

  useEffect(() => {
    if (onTypeChange) onTypeChange(formType);
  }, [formType, onTypeChange]);

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
    surfaceAlt: dm ? 'bg-slate-800' : 'bg-slate-50',
    border: dm ? 'border-slate-700' : 'border-slate-200',
    textMuted: dm ? 'text-slate-400' : 'text-slate-500',
    input: `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors w-full ${dm ? 'bg-slate-900 border-slate-600 text-slate-200 focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`,
    inputError: `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors w-full ${dm ? 'bg-slate-900 border-red-500 text-red-200 focus:ring-red-500/30' : 'bg-red-50 border-red-400 text-red-800 focus:ring-red-400/20'}`,
    errorText: `text-[10px] font-bold text-red-500 mt-1`
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`border-t ${tokens.border} px-4 pt-4 pb-5 space-y-2.5 shrink-0 ${tokens.surfaceAlt}`}>
      <div className={`flex p-0.5 rounded-sm border ${dm ? 'bg-slate-900 border-slate-700' : 'bg-slate-200/60 border-slate-200'}`}>
        <button type="button" onClick={() => handleTypeChange('expense')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${formType === 'expense' ? (dm ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : tokens.textMuted}`}>
          รายจ่าย (Alt+E)
        </button>
        <button type="button" onClick={() => handleTypeChange('income')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-sm transition-all ${formType === 'income' ? (dm ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : tokens.textMuted}`}>
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
          className={`px-3 py-2.5 rounded-sm font-bold text-xs flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 border ${dm ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-300'}`}
          title="ล้างข้อมูลที่กำลังพิมพ์ (Clear Form)"
        >
          ล้าง
        </button>
        <button type="submit" disabled={isProcessing}
          className={`flex-1 py-2.5 rounded-sm font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 text-white shadow-sm border ${formType === 'expense' ? 'bg-red-500 hover:bg-red-600 border-red-600' : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-600'}`}>
          {isProcessing ? <><Zap className="w-4 h-4 animate-pulse" /> กำลังบันทึก...</> : <><CheckCircle className="w-4 h-4" /> บันทึก (Enter)</>}
        </button>
      </div>
    </form>
  );
}