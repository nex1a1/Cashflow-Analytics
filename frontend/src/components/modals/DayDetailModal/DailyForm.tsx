import { useState } from 'react';
import { CheckCircle, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Category, CashflowGroup, AllocationType } from '../../../types';
import CategorySelect from '@/components/shared/CategorySelect';
import FieldError from '../../shared/FieldError';
import InvestFields from '@/components/shared/InvestFields';
import { AmountInput, EMPTY_ENTRY, EntryTypeToggle, NeedWantToggle, entrySchema, submitOnEnter, useEntryForm } from '@/components/shared/entryForm';

const dailyAddSchema = entrySchema({ required: 'ระบุจำนวนเงิน', positive: 'ต้องมากกว่า 0' });

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

const INPUT = 'px-3 py-2 rounded-sm border outline-hidden focus:ring-1 text-sm font-medium transition-colors w-full bg-canvas border-line-strong text-white focus:border-accent-ink focus:ring-accent/30';
const INPUT_ERROR = 'px-3 py-2 rounded-sm border outline-hidden focus:ring-1 text-sm font-medium transition-colors w-full bg-canvas tint-danger text-ink-display focus:ring-danger/30';

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
  const form = useForm<DailyFormValues>({
    resolver: zodResolver(dailyAddSchema) as any,
    defaultValues: {
      ...EMPTY_ENTRY,
      type: (defaultType as DailyFormValues['type']) || 'expense',
      categoryId: defaultCategoryId || '',
    }
  });
  const { register, handleSubmit, formState: { errors } } = form;
  const { formType, allocationType, selectedCatId, setValue, setFocus, clearEntry, handleTypeChange, investProps } =
    useEntryForm({ form, categories, externalFormSetter, onTypeChange });

  const [submitError, setSubmitError] = useState<string | null>(null);
  const onSubmit = async (data: DailyFormValues) => {
    setSubmitError(null);
    const ok = await onSubmitItem(data);
    if (ok === false) {
      setSubmitError('บันทึกไม่สำเร็จ ข้อมูลที่กรอกยังอยู่ กดบันทึกอีกครั้งได้เลย');
      return;
    }
    clearEntry();
  };
  const submit = () => handleSubmit(onSubmit)();
  const handleKeyDown = submitOnEnter(submit);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="border-t border-line px-4 pt-4 pb-5 space-y-2.5 shrink-0 bg-surface-hover">
      <EntryTypeToggle
        value={formType}
        onChange={handleTypeChange}
        className="relative flex p-0.5 rounded-none border bg-canvas border-line"
        btnClass="relative flex-1 py-1.5 text-xs font-bold rounded-none transition-all"
        idleClass="text-slate-400"
      />

      <div className="flex gap-2">
        <div className="flex-3">
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
          <NeedWantToggle
            value={allocationType}
            onChange={v => setValue('allocation_type', v)}
            className="relative grid grid-cols-2 p-0.5 rounded-none border shrink-0 bg-canvas border-line"
            btnClass="relative px-2 py-1 text-[11px] font-black rounded-none transition-all"
            idleClass="text-slate-400"
          />
        )}
      </div>

      {formType === 'savings' && <InvestFields idPrefix="daily" {...investProps} onEnter={submit} />}

      <div className="flex gap-2 items-start">
        <div className="flex-2">
          <input type="text" {...register('description')} onKeyDown={handleKeyDown} placeholder="รายละเอียด..." className={INPUT} />
        </div>
        <div className="flex-1 min-w-[110px]">
          <AmountInput
            {...register('amount', { valueAsNumber: true })}
            errorId="daily-amount-err"
            hasError={!!errors.amount}
            onKeyDown={handleKeyDown}
            inputClass={errors.amount ? INPUT_ERROR : INPUT}
            wrapperClass="relative flex items-center"
          />
          <FieldError id="daily-amount-err" message={errors.amount?.message} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={clearEntry} disabled={isProcessing}
          className="px-3 py-2.5 rounded-none font-bold text-xs flex items-center justify-center transition-colors disabled:opacity-50 border bg-surface-elevated/60 hover:bg-gray-750 text-slate-300 border-line-strong"
          title="ล้างข้อมูลที่กำลังพิมพ์"
        >
          ล้าง
        </button>
        <button type="submit" disabled={isProcessing}
          className={`flex-1 py-2.5 rounded-none font-bold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs border ${
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
