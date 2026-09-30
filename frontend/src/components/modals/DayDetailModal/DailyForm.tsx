import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { CheckCircle, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Category, CashflowGroup, AllocationType } from '../../../types';
import CategorySelect from '@/components/shared/CategorySelect';
import FieldError from '../../shared/FieldError';
import InvestFields from '@/components/shared/InvestFields';

const dailyAddSchema = z.object({
  type: z.enum(['income', 'expense', 'savings']),
  categoryId: z.string().min(1, "กรุณาเลือกหมวดหมู่"),
  description: z.string().optional(),
  amount: z.number({ message: "ระบุจำนวนเงิน" }).positive("ต้องมากกว่า 0"),
  allocation_type: z.enum(['need', 'want', 'savings']).nullable().optional(),
  assetId: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  units: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.type === 'savings' && v.assetId && !(Number(v.units) > 0)) {
    ctx.addIssue({ code: 'custom', path: ['units'], message: 'ระบุจำนวนหน่วยที่มากกว่า 0' });
  }
});

export interface DailyFormValues {
  type: 'income' | 'expense' | 'savings';
  categoryId: string;
  description?: string;
  amount: number;
  allocation_type?: AllocationType | null;
  /** หมวดลงทุน/ออม: สินทรัพย์ที่ซื้อ/ขาย ('' = ออมทั่วไป), ทิศทาง, จำนวนหน่วย */
  assetId?: string;
  side?: 'buy' | 'sell';
  units?: string;
}

export interface DailyFormProps {
  /** resolve false when the save failed: the typed values stay and an inline error shows */
  onSubmitItem: (item: any) => Promise<boolean> | void;
  categories?: Category[];
  cashflowGroups?: CashflowGroup[];
  defaultType?: 'income' | 'expense' | string;
  defaultCategoryId?: string;
  isProcessing?: boolean;
  externalFormSetter?: (controls: { setValue: any; setFocus: any; watch: any }) => void;
  onTypeChange?: (type: string) => void;
}

export default function DailyForm({
  onSubmitItem,
  categories = [],
  cashflowGroups = [],
  defaultType,
  defaultCategoryId,
  isProcessing,
  externalFormSetter,
  onTypeChange
}: DailyFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors }, setFocus } = useForm<DailyFormValues>({
    resolver: zodResolver(dailyAddSchema) as any,
    defaultValues: {
      type: (defaultType as DailyFormValues['type']) || 'expense',
      categoryId: defaultCategoryId || '',
      description: '',
      amount: '' as unknown as number,
      allocation_type: 'want',
      assetId: '',
      side: 'buy',
      units: ''
    }
  });

  const formType = watch('type');
  const allocationType = watch('allocation_type');
  const assetId = watch('assetId') || '';
  const side = watch('side') || 'buy';
  const units = watch('units') || '';
  const amountValue = watch('amount');

  const isApplyingSuggestionRef = useRef(false);

  const customSetValue = useCallback((name: any, value: any, options: any) => {
    if (name === 'categoryId' && options?.skipAllocationDefault) {
      isApplyingSuggestionRef.current = true;
    }
    setValue(name, value, options);
  }, [setValue]);

  // 1. Expose form methods to parent (for hotkeys & QuickSuggest)
  useEffect(() => {
    if (externalFormSetter) {
      externalFormSetter({ setValue: customSetValue, setFocus, watch });
    }
  }, [externalFormSetter, customSetValue, setFocus, watch]);

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
    if (formType === 'savings') {
      setValue('allocation_type', 'savings');
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

  const [submitError, setSubmitError] = useState<string | null>(null);
  const onSubmit = async (data: DailyFormValues) => {
    setSubmitError(null);
    const ok = await onSubmitItem(data);
    if (ok === false) {
      setSubmitError('บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กดบันทึกอีกครั้งได้เลย');
      return;
    }
    setValue('description', '');
    setValue('units', '');
    setValue('amount', '' as unknown as number, { shouldValidate: false });
    setTimeout(() => setFocus('amount'), 10);
  };

  const handleTypeChange = (newType: DailyFormValues['type']) => {
    setValue('type', newType);
    setValue('assetId', '');
    setValue('units', '');
    const firstCat = categories.find(c => c.type === newType);
    setValue('categoryId', firstCat?.id || '');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { 
    if (e.key === 'Enter') { 
      e.preventDefault(); 
      handleSubmit(onSubmit)(); 
    } 
  };

  const tokens = {
    surfaceAlt: 'bg-surface-hover',
    border: 'border-line',
    textMuted: 'text-slate-400',
    input: `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors w-full ${'bg-canvas border-line-strong text-white focus:border-accent-ink focus:ring-accent/30'}`,
    inputError: `px-3 py-2 rounded-sm border outline-none focus:ring-1 text-sm font-medium transition-colors w-full ${'bg-canvas tint-danger text-ink-display focus:ring-danger/30'}`
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={`border-t ${tokens.border} px-4 pt-4 pb-5 space-y-2.5 shrink-0 ${tokens.surfaceAlt}`}>
      <div className={`flex p-0.5 rounded-none border bg-canvas border-line`}>
        <button type="button" onClick={() => handleTypeChange('expense')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-none transition-all ${formType === 'expense' ? 'bg-surface-elevated text-expense shadow-sm' : tokens.textMuted}`}>
          รายจ่าย
        </button>
        <button type="button" onClick={() => handleTypeChange('savings')}
          className={`flex-1 py-1.5 text-xs font-bold rounded-none transition-all ${formType === 'savings' ? 'bg-surface-elevated text-savings shadow-sm' : tokens.textMuted}`}>
          ลงทุน/ออม
        </button>
        <button type="button" onClick={() => handleTypeChange('income')} 
          className={`flex-1 py-1.5 text-xs font-bold rounded-none transition-all ${formType === 'income' ? 'bg-surface-elevated text-emerald-400 shadow-sm' : tokens.textMuted}`}>
          รายรับ
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-[3]">
          <CategorySelect
            value={selectedCatId}
            onChange={(val) => setValue('categoryId', val, { shouldValidate: true })}
            categories={categories}
            cashflowGroups={cashflowGroups}
            type={formType}
            error={!!errors.categoryId}
            onSelectNextFocus={() => setFocus('amount')}
          />
          <FieldError id="daily-categoryId-err" message={errors.categoryId?.message} />
        </div>

        {formType === 'expense' && (
          <div className="flex p-0.5 rounded-none border shrink-0 bg-canvas border-line">
            {[
              { val: 'need', label: 'NEED', color: 'text-rose-400' },
              { val: 'want', label: 'WANT', color: 'text-amber-400' },
              { val: 'savings', label: 'SAVE', color: 'text-savings' }
            ].map(opt => {
              const isSelected = allocationType === opt.val;
              const activeStyle = isSelected ? `bg-surface-elevated ${opt.color}` : tokens.textMuted;
              return (
                <button key={opt.val} type="button" onClick={() => setValue('allocation_type', opt.val as AllocationType)}
                  className={`px-2 py-1 text-[11px] font-black rounded-none transition-all ${activeStyle}`}>
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {formType === 'savings' && (
        <InvestFields
          idPrefix="daily"
          assetId={assetId}
          side={side}
          units={units}
          amount={Number.isFinite(amountValue) ? amountValue : undefined}
          onAssetChange={v => { setValue('assetId', v); if (!v) setValue('units', ''); }}
          onSideChange={v => setValue('side', v)}
          onUnitsChange={v => setValue('units', v, { shouldValidate: !!errors.units })}
          onEnter={() => handleSubmit(onSubmit)()}
          unitsError={errors.units?.message}
        />
      )}

      <div className="flex gap-2 items-start">
        <div className="flex-[2]">
          <input type="text" {...register('description')} onKeyDown={handleKeyDown} placeholder="รายละเอียด..." className={tokens.input} />
        </div>
        <div className="flex-1 min-w-[110px]">
          <div className="relative flex items-center">
            <span className="absolute left-2.5 text-xs font-bold select-none text-ink-muted" aria-hidden="true">
              ฿
            </span>
            <input 
              type="number" 
              step="any" 
              {...register('amount', { valueAsNumber: true })} 
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? 'daily-amount-err' : undefined}
              aria-label="จำนวนเงิน"
              onKeyDown={handleKeyDown} 
              placeholder="0.00" 
              className={`${errors.amount ? tokens.inputError : tokens.input} pl-6 text-right font-bold tabular-nums tracking-tight`} 
            />
          </div>
          <FieldError id="daily-amount-err" message={errors.amount?.message} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => { setValue('description', ''); setValue('units', ''); setValue('amount', '' as unknown as number, { shouldValidate: false }); setTimeout(() => setFocus('amount'), 10); }} disabled={isProcessing}
          className="px-3 py-2.5 rounded-none font-bold text-xs flex items-center justify-center transition-colors disabled:opacity-50 border bg-surface-elevated/60 hover:bg-gray-750 text-slate-300 border-line-strong"
          title="ล้างข้อมูลที่กำลังพิมพ์"
        >
          ล้าง
        </button>
        <button type="submit" disabled={isProcessing}
          className={`flex-1 py-2.5 rounded-none font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm border ${
            formType === 'expense' 
              ? 'bg-accent hover:bg-accent-active border-accent-ink text-on-accent' 
              : 'bg-emerald-500 hover:bg-emerald-400 border-emerald-600 text-canvas'
          }`}
        >
          {isProcessing ? <><Zap className="w-5 h-5 animate-pulse" /> กำลังบันทึก...</> : <><CheckCircle className="w-5 h-5" /> บันทึก (Enter)</>}
        </button>
      </div>
      <FieldError id="daily-submit-err" message={submitError} />
    </form>
  );
}