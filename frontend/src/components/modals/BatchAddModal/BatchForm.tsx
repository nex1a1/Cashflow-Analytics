import React, { useEffect } from 'react';
import { PlusCircle, Check, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { useForm, UseFormSetValue, UseFormSetFocus, UseFormWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from '../../ui/DatePicker';
import { stepDate, toValueStr } from '@/utils/datePickerHelpers';
import { Category, CashflowGroup, DayType, AllocationType } from '../../../types';
import { PendingBatchItem } from './index';
import CategorySelect from '@/components/shared/CategorySelect';
import FieldError from '../../shared/FieldError';
import InvestFields from '@/components/shared/InvestFields';
import { AmountInput, EMPTY_ENTRY, EntryTypeToggle, NeedWantToggle, entrySchema, submitOnEnter, useEntryForm } from '@/components/shared/entryForm';

const getLocalDateString = (dateObj = new Date()) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const batchAddSchema = entrySchema(
  { required: 'กรุณาระบุจำนวนเงิน', positive: 'จำนวนเงินต้องมากกว่า 0' },
  { date: z.string().min(1, 'กรุณาเลือกวันที่') },
);

export interface BatchFormValues {
  type: 'income' | 'expense' | 'savings';
  date: string;
  categoryId: string;
  description?: string;
  amount: number;
  allocation_type?: AllocationType | null;
  /** หมวดลงทุน/ออม: สินทรัพย์ ('' = ออมทั่วไป), ซื้อ/ขาย, จำนวนหน่วย */
  assetId?: string;
  side?: 'buy' | 'sell';
  units?: string;
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
  onDateChange?: (date: string) => void;
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
  onDateChange,
  dayTypes = {},
  dayTypeConfig = [],
  editingItem,
  onCancelEdit
}: BatchFormProps) {
  const form = useForm<BatchFormValues>({
    resolver: zodResolver(batchAddSchema),
    defaultValues: {
      ...EMPTY_ENTRY,
      type: (defaultType as BatchFormValues['type']) || 'expense',
      date: defaultDate || getLocalDateString(),
      categoryId: defaultCategoryId || '',
    }
  });
  const { register, handleSubmit, watch, setValue, setFocus, formState: { errors } } = form;
  const formDate = watch('date');

  // Load editing item data into form (before the shared logic, so its allocation default sees the edit)
  useEffect(() => {
    if (editingItem) {
      setValue('type', editingItem._isInc ? 'income' : editingItem._isSavings ? 'savings' : 'expense');
      setValue('assetId', editingItem.asset_id || '');
      setValue('side', editingItem.side || 'buy');
      setValue('units', editingItem.units ? String(editingItem.units) : '');
      setValue('date', editingItem.date);
      setValue('categoryId', editingItem.category_id || editingItem._catObj?.id || '');
      setValue('description', editingItem.description || '');
      setValue('amount', Number(editingItem.amount), { shouldValidate: true });
      setValue('allocation_type', editingItem.allocation_type || null);
      setTimeout(() => setFocus('amount'), 50);
    }
  }, [editingItem, setValue, setFocus]);

  const { formType, allocationType, selectedCatId, clearEntry, handleTypeChange, investProps } =
    useEntryForm({ form, categories, externalFormSetter, onTypeChange, isEditing: !!editingItem });

  useEffect(() => {
    if (onDateChange) onDateChange(formDate);
  }, [formDate, onDateChange]);

  const onSubmit = (data: BatchFormValues) => {
    if (isProcessing) return; // the cart is being saved and then emptied: an item added now would vanish unseen
    onSubmitItem(data);
    clearEntry();
  };
  const submit = () => handleSubmit(onSubmit)();
  const handleKeyDown = submitOnEnter(submit);

  const tokens = {
    input: "w-full py-[5px] px-3 text-xs leading-6 border rounded-none outline-hidden focus:ring-1 transition-colors bg-canvas border-line-strong text-white focus:border-accent-ink focus:ring-accent/30",
    inputError: "w-full py-[5px] px-3 text-xs leading-6 border rounded-none outline-hidden focus:ring-1 transition-colors bg-canvas tint-danger text-ink-display focus:ring-danger/30",
    label: "block text-[11px] font-bold uppercase mb-1.5 text-slate-400"
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full lg:w-[33%] p-5 border-b lg:border-b-0 lg:border-r flex flex-col lg:overflow-y-auto bg-surface-hover border-line">
      
      <EntryTypeToggle
        value={formType}
        onChange={handleTypeChange}
        className="relative grid grid-cols-3 p-0.5 mb-4 rounded-none border bg-canvas border-line h-9"
        btnClass="relative h-full font-bold text-xs rounded-none transition-all flex items-center justify-center"
        idleClass="text-slate-400 hover:text-slate-200"
      />

      {/* Date & Amount Row */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className={tokens.label} style={{ marginBottom: 0 }}>วันที่</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setValue('date', stepDate(formDate, -1), { shouldValidate: true })}
                className="p-0.5 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
                title="วันก่อนหน้า (-1 วัน)"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setValue('date', toValueStr(new Date()), { shouldValidate: true })}
                className="px-1 text-[11px] font-bold text-slate-400 hover:text-accent-ink hover:bg-surface-elevated transition-colors"
                title="เลือกวันนี้"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => setValue('date', stepDate(formDate, 1), { shouldValidate: true })}
                className="p-0.5 rounded-none text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
                title="วันถัดไป (+1 วัน)"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
          <DatePicker 
            value={formDate} 
            onChange={(v) => setValue('date', v, { shouldValidate: true })} 
            dayTypes={dayTypes}
            dayTypeConfig={dayTypeConfig}
            className="w-full h-9 px-3 text-xs border rounded-none flex items-center justify-between gap-2 font-bold transition-colors outline-hidden bg-canvas border-line-strong text-white hover:border-accent-ink focus:border-accent-ink"
          />
          <FieldError id="batch-date-err" message={errors.date?.message} />
        </div>
        <div className="flex-1 min-w-0">
          <label htmlFor="batch-amount" className={tokens.label}>จำนวนเงิน ฿</label>
          <AmountInput
            id="batch-amount"
            {...register('amount', { valueAsNumber: true })}
            errorId="batch-amount-err"
            hasError={!!errors.amount}
            onKeyDown={handleKeyDown}
            inputClass={errors.amount ? tokens.inputError : tokens.input}
            wrapperClass="relative flex items-center h-9"
          />
          <FieldError id="batch-amount-err" message={errors.amount?.message} />
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
            <NeedWantToggle
              value={allocationType}
              onChange={v => setValue('allocation_type', v)}
              className="relative h-9 grid grid-cols-2 p-0.5 rounded-none border shrink-0 bg-canvas border-line"
              btnClass="relative h-full px-2.5 text-[11px] font-black rounded-none transition-all flex items-center justify-center"
              idleClass="text-slate-500 hover:text-slate-300"
            />
          )}
        </div>
        <FieldError id="batch-categoryId-err" message={errors.categoryId?.message} />
      </div>

      {formType === 'savings' && (
        <div className="mb-4">
          <InvestFields idPrefix="batch" {...investProps} onEnter={submit} />
        </div>
      )}

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
              className="h-full px-3 border rounded-none font-bold text-xs flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 bg-surface-elevated/60 hover:bg-surface-elevated text-slate-300 border-line"
              title="ยกเลิกการแก้ไข"
            >
              ยกเลิก
            </button>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="h-full flex-1 px-4 border rounded-none font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-amber-500 hover:bg-amber-400 text-canvas border-amber-600 shadow-xs"
            >
              <Check className="w-4 h-4" /> บันทึกแก้ไข (Enter)
            </button>
          </>
        ) : (
          <>
            <button 
              type="button" 
              onClick={clearEntry}
              disabled={isProcessing}
              className="h-full px-3 border rounded-none font-bold text-xs flex justify-center items-center transition-all active:scale-95 disabled:opacity-50 bg-surface-elevated/60 hover:bg-surface-elevated text-slate-300 border-line"
              title="ล้างข้อมูลที่กำลังพิมพ์"
            >
              <RotateCcw className="w-4 h-4 mr-1 text-slate-400" /> ล้าง
            </button>
            <button 
              type="submit" 
              disabled={isProcessing}
              className="h-full flex-1 px-4 border rounded-none font-bold text-sm flex justify-center items-center gap-2 transition-all active:scale-95 disabled:opacity-50 bg-accent hover:bg-accent-active text-on-accent border-accent-ink"
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