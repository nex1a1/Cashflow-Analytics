import React, { useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from '../ui/DatePicker';
import { useTheme } from '../../context/ThemeContext';

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
  amount: z.number({ invalid_type_error: "กรุณาระบุจำนวนเงิน" }).positive("จำนวนเงินต้องมากกว่า 0"),
});

export default function BatchForm({
  onSubmitItem,
  categories,
  defaultType,
  defaultDate,
  defaultCategoryId,
  isProcessing,
  externalFormSetter,
  onTypeChange
}) {
  const { isDarkMode: dm } = useTheme();
  
  const { register, handleSubmit, watch, setValue, formState: { errors }, setFocus } = useForm({
    resolver: zodResolver(batchAddSchema),
    defaultValues: {
      type: defaultType || 'expense',
      date: defaultDate || getLocalDateString(),
      categoryId: defaultCategoryId || '',
      description: '',
      amount: ''
    }
  });

  const formType = watch('type');
  const formDate = watch('date');

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

  const tokens = {
    input: `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${dm ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/30' : 'bg-white border-slate-300 text-slate-800 focus:border-[#00509E] focus:ring-[#00509E]/20'}`,
    inputError: `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${dm ? 'bg-slate-900 border-red-500 text-red-200 focus:ring-red-500/30' : 'bg-red-50 border-red-400 text-red-800 focus:ring-red-400/20'}`,
    label: `block text-[11px] font-bold uppercase mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-500'}`,
    errorText: `text-[10px] font-bold text-red-500 mt-1`
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`w-full lg:w-[32%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col lg:overflow-y-auto ${dm ? 'border-slate-800' : 'border-slate-200'}`}>
      
      <div className={`flex p-0.5 mb-4 rounded-sm border ${dm ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
        <button type="button" onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-1.5 font-bold text-xs rounded-sm transition-all ${formType === 'expense' ? (dm ? 'bg-slate-700 text-red-400 shadow-sm' : 'bg-white text-red-600 shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
          รายจ่าย (Alt+E)
        </button>
        <button type="button" onClick={() => handleTypeChange('income')}
          className={`flex-1 py-1.5 font-bold text-xs rounded-sm transition-all ${formType === 'income' ? (dm ? 'bg-slate-700 text-emerald-400 shadow-sm' : 'bg-white text-emerald-600 shadow-sm') : (dm ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700')}`}>
          รายรับ (Alt+I)
        </button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="flex-1">
          <label className={tokens.label}>วันที่</label>
          <DatePicker value={formDate} onChange={(v) => setValue('date', v, { shouldValidate: true })} required />
          {errors.date && <p className={tokens.errorText}>{errors.date.message}</p>}
        </div>
        <div className="flex-1">
          <label className={tokens.label}>จำนวนเงิน ฿</label>
          <input 
            type="number" 
            step="any"
            {...register('amount', { valueAsNumber: true })}
            placeholder="0.00"
            className={`${errors.amount ? tokens.inputError : tokens.input} font-black text-right ${dm ? 'text-blue-400' : 'text-[#00509E]'}`} 
          />
          {errors.amount && <p className={tokens.errorText}>{errors.amount.message}</p>}
        </div>
      </div>

      <div className="mb-4">
        <label className={tokens.label}>หมวดหมู่</label>
        <select {...register('categoryId')} className={errors.categoryId ? tokens.inputError : tokens.input}>
          {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        {errors.categoryId && <p className={tokens.errorText}>{errors.categoryId.message}</p>}
      </div>

      <div className="mb-4">
        <label className={tokens.label}>รายละเอียด</label>
        <input type="text" {...register('description')}
          placeholder="เช่น ค่าข้าวเที่ยง" className={tokens.input} />
      </div>

      <div className="mt-auto flex gap-2">
        <button type="button" onClick={() => { setValue('description', ''); setValue('amount', '', { shouldValidate: false }); setTimeout(() => setFocus('amount'), 10); }} disabled={isProcessing}
          className={`px-3 py-2.5 border rounded-sm font-bold text-xs flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 ${dm ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-300'}`}
          title="ล้างข้อมูลที่กำลังพิมพ์ (Clear Form)"
        >
          ล้าง
        </button>
        <button type="submit" disabled={isProcessing}
          className={`flex-1 px-4 py-2.5 border rounded-sm font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${dm ? 'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700' : 'bg-slate-50 hover:bg-slate-100 text-[#00509E] border-slate-300'}`}>
          <PlusCircle className="w-4 h-4" /> เพิ่มลงตะกร้า (Enter)
        </button>
      </div>
    </form>
  );
}