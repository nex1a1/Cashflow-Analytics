import React, { useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from '../../ui/DatePicker';

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
  allocation_type: z.enum(['need', 'want', 'savings']).nullable().optional(),
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
  const dm = true;
  
  const { register, handleSubmit, watch, setValue, formState: { errors }, setFocus } = useForm({
    resolver: zodResolver(batchAddSchema),
    defaultValues: {
      type: defaultType || 'expense',
      date: defaultDate || getLocalDateString(),
      categoryId: defaultCategoryId || '',
      description: '',
      amount: '',
      allocation_type: 'want'
    }
  });

  const formType = watch('type');
  const formDate = watch('date');
  const allocationType = watch('allocation_type');

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
    input: `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${'bg-slate-900 border-slate-700 text-white focus:border-blue-500 focus:ring-blue-500/30'}`,
    inputError: `w-full px-3 py-2.5 text-sm border rounded-sm outline-none focus:ring-1 transition-colors ${'bg-slate-900 border-red-500 text-red-200 focus:ring-red-500/30'}`,
    label: `block text-[11px] font-bold uppercase mb-1.5 ${'text-slate-400'}`,
    errorText: `text-[10px] font-bold text-red-500 mt-1`
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`w-full lg:w-[32%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col lg:overflow-y-auto ${'border-slate-800'}`}>
      
      <div className={`flex p-0.5 mb-4 rounded-sm border ${'bg-slate-800 border-slate-700'}`}>
        <button type="button" onClick={() => handleTypeChange('expense')}
          className={`flex-1 py-1.5 font-bold text-xs rounded-sm transition-all ${formType === 'expense' ? ('bg-slate-700 text-red-400 shadow-sm') : ('text-slate-400 hover:text-slate-200')}`}>
          รายจ่าย (Alt+E)
        </button>
        <button type="button" onClick={() => handleTypeChange('income')}
          className={`flex-1 py-1.5 font-bold text-xs rounded-sm transition-all ${formType === 'income' ? ('bg-slate-700 text-emerald-400 shadow-sm') : ('text-slate-400 hover:text-slate-200')}`}>
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
            className={`${errors.amount ? tokens.inputError : tokens.input} font-black text-right ${'text-blue-400'}`} 
          />
          {errors.amount && <p className={tokens.errorText}>{errors.amount.message}</p>}
        </div>
      </div>

      <div className="mb-4">
        <label className={tokens.label}>หมวดหมู่</label>
        <div className="flex gap-2">
          <select {...register('categoryId')} className={errors.categoryId ? tokens.inputError : tokens.input}>
            {categories.filter(c => c.type === formType).map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
          
          {formType === 'expense' && (
            <div className={`flex p-0.5 rounded-sm border shrink-0 ${'bg-slate-900 border-slate-700'}`}>
              {[
                { val: 'need', label: 'NEED', color: 'text-rose-400' },
                { val: 'want', label: 'WANT', color: 'text-sky-400' },
                { val: 'savings', label: 'SAVE', color: 'text-emerald-400' }
              ].map(opt => (
                <button key={opt.val} type="button" onClick={() => setValue('allocation_type', opt.val)}
                  className={`px-2 py-1 text-[10px] font-black rounded-sm transition-all ${allocationType === opt.val ? (dm ? 'bg-slate-700 ' + opt.color : 'bg-white ' + opt.color + ' shadow-sm') : ('text-slate-500')}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {errors.categoryId && <p className={tokens.errorText}>{errors.categoryId.message}</p>}
      </div>

      <div className="mb-4">
        <label className={tokens.label}>รายละเอียด</label>
        <input type="text" {...register('description')}
          placeholder="เช่น ค่าข้าวเที่ยง" className={tokens.input} />
      </div>

      <div className="mt-auto flex gap-2">
        <button type="button" onClick={() => { setValue('description', ''); setValue('amount', '', { shouldValidate: false }); setTimeout(() => setFocus('amount'), 10); }} disabled={isProcessing}
          className={`px-3 py-2.5 border rounded-sm font-bold text-xs flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 ${'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'}`}
          title="ล้างข้อมูลที่กำลังพิมพ์ (Clear Form)"
        >
          ล้าง
        </button>
        <button type="submit" disabled={isProcessing}
          className={`flex-1 px-4 py-2.5 border rounded-sm font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 ${'bg-slate-800 hover:bg-slate-700 text-blue-400 border-slate-700'}`}>
          <PlusCircle className="w-4 h-4" /> เพิ่มลงตะกร้า (Enter)
        </button>
      </div>
    </form>
  );
}