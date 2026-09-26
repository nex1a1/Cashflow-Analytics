import React, { useState, useEffect, useRef, useId } from 'react';
import FieldError from '@/components/shared/FieldError';

export interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onDebouncedChange: (value: string) => void;
  debounceMs?: number;
  isNew?: boolean;
  /** blank values are not saved; this message shows under the field instead, and blur restores the saved value */
  requiredMessage?: string;
}

export default function DebouncedInput({
  value: initialValue,
  onDebouncedChange,
  debounceMs = 400,
  isNew = false,
  requiredMessage,
  className,
  placeholder,
  ...rest
}: DebouncedInputProps) {
  const [value, setValue] = useState<string>(initialValue);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValueRef = useRef<string>(initialValue);
  latestValueRef.current = value;
  const errorId = useId();
  const isBlank = (v: string) => !!requiredMessage && v.trim() === '';
  const error = isBlank(value) ? requiredMessage : null;

  // Sync external value changes
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // Focus and select if newly created
  useEffect(() => {
    if (isNew && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isNew]);

  const flush = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isBlank(latestValueRef.current)) return;
    if (latestValueRef.current !== initialValue) {
      onDebouncedChange(latestValueRef.current);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setValue(newVal);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    if (isBlank(newVal)) return;
    timerRef.current = setTimeout(() => {
      onDebouncedChange(newVal);
      timerRef.current = null;
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    flush();
    if (isBlank(latestValueRef.current)) setValue(initialValue);
    rest.onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      flush();
      inputRef.current?.blur();
    }
    rest.onKeyDown?.(e);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const input = (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      className={`${className ?? ''} ${requiredMessage ? 'w-full' : ''} ${error ? 'tint-danger' : ''}`}
      placeholder={placeholder}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      {...rest}
    />
  );

  if (!requiredMessage) return input;
  return (
    <div className="flex-1 min-w-0">
      {input}
      <FieldError id={errorId} message={error} />
    </div>
  );
}
