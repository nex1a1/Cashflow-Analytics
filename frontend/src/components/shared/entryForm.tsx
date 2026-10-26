// What the two "add a transaction" forms share (DailyForm in the day modal, BatchForm in the batch modal):
// the schema, the form logic around type / category / allocation, and the type, NEED/WANT and amount controls.
import React, { useCallback, useEffect, useRef } from 'react';
import { FieldValues, UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { AllocationType, Category } from '@/types';

export type EntryType = 'income' | 'expense' | 'savings';

/** Fields every entry form has. */
export interface EntryValues extends FieldValues {
  type: EntryType;
  categoryId: string;
  description?: string;
  amount: number;
  allocation_type?: AllocationType | null;
  /** savings categories: asset bought/sold ('' = general savings), side, units */
  assetId?: string;
  side?: 'buy' | 'sell';
  units?: string;
}

const entryShape = (amountMsg: { required: string; positive: string }) => ({
  type: z.enum(['income', 'expense', 'savings']),
  categoryId: z.string().min(1, 'กรุณาเลือกหมวดหมู่'),
  description: z.string().optional(),
  amount: z.number({ message: amountMsg.required }).positive(amountMsg.positive),
  allocation_type: z.enum(['need', 'want', 'savings']).nullable().optional(),
  assetId: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  units: z.string().optional(),
});

/** A trade on a picked asset needs units > 0; general savings needs none. */
const unitsRule = (v: { type: string; assetId?: string; units?: string }, ctx: z.RefinementCtx) => {
  if (v.type === 'savings' && v.assetId && !(Number(v.units) > 0)) {
    ctx.addIssue({ code: 'custom', path: ['units'], message: 'ระบุจำนวนหน่วยที่มากกว่า 0' });
  }
};

/** Entry schema; `extra` adds form-specific fields (BatchForm's date). */
export const entrySchema = <E extends z.ZodRawShape>(amountMsg: { required: string; positive: string }, extra?: E) =>
  z.object({ ...entryShape(amountMsg), ...(extra ?? {}) as E })
    .superRefine((v, ctx) => unitsRule(v as { type: string; assetId?: string; units?: string }, ctx as z.RefinementCtx));

export const EMPTY_ENTRY = {
  description: '',
  amount: '' as unknown as number,
  allocation_type: 'want' as AllocationType,
  assetId: '',
  side: 'buy' as const,
  units: '',
};

/**
 * The logic both forms run: watched values, the allocation default when the category changes,
 * exposing the form to its parent (hotkeys, QuickSuggest), type switching and clearing what was typed.
 * `isEditing` keeps an edited row's allocation as loaded. Submitting stays in the form (see `submitOnEnter`).
 */
export function useEntryForm<T extends EntryValues>({ form, categories, externalFormSetter, onTypeChange, isEditing = false }: {
  form: UseFormReturn<T>;
  categories: Category[];
  externalFormSetter?: (controls: { setValue: any; setFocus: any; watch: any }) => void;
  onTypeChange?: (type: string) => void;
  isEditing?: boolean;
}) {
  // react-hook-form's watch() reads live form state; the compiler would cache it as a pure call and freeze the values
  'use no memo';
  // the forms share field names; the generic T only adds fields, so plain names are safe here
  const { watch, setValue, getValues, setFocus } = form as unknown as UseFormReturn<EntryValues>;
  const formType = watch('type');
  const allocationType = watch('allocation_type');
  const selectedCatId = watch('categoryId');
  const amountValue = watch('amount');

  const isApplyingSuggestionRef = useRef(false);

  const customSetValue = useCallback((name: any, value: any, options?: any) => {
    // only when the category really changes: the same category never re-runs the effect, so the flag would stick
    // and swallow the default of the next category the user picks by hand
    if (name === 'categoryId' && options?.skipAllocationDefault && value !== getValues('categoryId')) {
      isApplyingSuggestionRef.current = true;
    }
    setValue(name, value, options);
  }, [setValue, getValues]);

  // Allocation follows the type, and for expenses the picked category's own NEED/WANT
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
    if (isEditing) return;
    const cat = categories.find(c => c.id === selectedCatId);
    if (cat?.allocation_type) setValue('allocation_type', cat.allocation_type);
  }, [formType, selectedCatId, setValue, categories, isEditing]);

  useEffect(() => {
    externalFormSetter?.({ setValue: customSetValue, setFocus, watch });
  }, [externalFormSetter, customSetValue, setFocus, watch]);

  useEffect(() => {
    onTypeChange?.(formType);
  }, [formType, onTypeChange]);

  /** Empty description, units and amount, and put the cursor back in the amount. */
  const clearEntry = () => {
    setValue('description', '');
    setValue('units', '');
    setValue('amount', '' as unknown as number, { shouldValidate: false });
    setTimeout(() => setFocus('amount'), 10);
  };

  const handleTypeChange = (newType: EntryType) => {
    setValue('type', newType);
    setValue('assetId', '');
    setValue('units', '');
    setValue('categoryId', categories.find(c => c.type === newType)?.id || '');
  };

  const errors = form.formState.errors as Record<string, { message?: string } | undefined>;
  /** Props for InvestFields (savings rows); the form adds `onEnter`. */
  const investProps = {
    assetId: watch('assetId') || '',
    side: watch('side') || 'buy',
    units: watch('units') || '',
    amount: Number.isFinite(amountValue) ? amountValue : undefined,
    onAssetChange: (v: string) => { setValue('assetId', v); if (!v) setValue('units', ''); },
    onSideChange: (v: 'buy' | 'sell') => setValue('side', v),
    onUnitsChange: (v: string) => setValue('units', v, { shouldValidate: !!errors.units }),
    unitsError: errors.units?.message,
  };

  return { formType, allocationType, selectedCatId, setValue, setFocus, clearEntry, handleTypeChange, investProps };
}

/** Enter in a text/amount field submits the form (instead of the browser's implicit submit). */
export const submitOnEnter = (submit: () => void) => (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submit();
  }
};

const TYPES: [EntryType, string, string][] = [['expense', 'รายจ่าย', 'text-expense'], ['savings', 'ลงทุน/ออม', 'text-savings'], ['income', 'รายรับ', 'text-emerald-400']];

/** รายจ่าย · ลงทุน/ออม · รายรับ with a sliding highlight. Each form passes its own frame/button sizing. */
export const EntryTypeToggle = ({ value, onChange, className, btnClass, idleClass }: {
  value: EntryType;
  onChange: (t: EntryType) => void;
  className: string;
  btnClass: string;
  idleClass: string;
}) => (
  <div className={className}>
    <span aria-hidden className="m-slide absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/3)] bg-surface-elevated shadow-xs"
      style={{ translate: `${['expense', 'savings', 'income'].indexOf(value) * 100}% 0` }} />
    {TYPES.map(([t, label, color]) => (
      <button key={t} type="button" onClick={() => onChange(t)} className={`${btnClass} ${value === t ? color : idleClass}`}>
        {label}
      </button>
    ))}
  </div>
);

/** NEED / WANT for expense rows (SAVE is a savings category, never an expense allocation). */
export const NeedWantToggle = ({ value, onChange, className, btnClass, idleClass }: {
  value: AllocationType | null | undefined;
  onChange: (v: AllocationType) => void;
  className: string;
  btnClass: string;
  idleClass: string;
}) => (
  <div className={className}>
    <span aria-hidden className="m-slide absolute inset-y-0.5 left-0.5 w-[calc((100%-4px)/2)] bg-surface-elevated"
      style={{ translate: value === 'want' ? '100% 0' : '0 0' }} />
    {([['need', 'NEED', 'text-rose-400'], ['want', 'WANT', 'text-amber-400']] as const).map(([v, label, color]) => (
      <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)} className={`${btnClass} ${value === v ? color : idleClass}`}>
        {label}
      </button>
    ))}
  </div>
);

/** Amount input with a ฿ prefix, right-aligned digits and an error state. */
export const AmountInput = ({ id, errorId, hasError, inputClass, wrapperClass, ...rest }: {
  id?: string;
  ref?: React.Ref<HTMLInputElement>;
  errorId: string;
  hasError: boolean;
  inputClass: string;
  wrapperClass: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => (
  <div className={wrapperClass}>
    <span className="absolute left-2.5 text-xs font-bold select-none text-ink-muted" aria-hidden="true">฿</span>
    <input
      id={id}
      type="number"
      step="any"
      {...rest}
      aria-invalid={hasError}
      aria-describedby={hasError ? errorId : undefined}
      aria-label="จำนวนเงิน"
      placeholder="0.00"
      className={`${inputClass} pl-6 text-right font-bold tabular-nums tracking-tight`}
    />
  </div>
);
