import React, { useState, useEffect, useRef } from 'react';

export interface EditableInputProps {
  initialValue?: string | number;
  type?: string;
  onSave: (val: any) => void;
  className?: string;
  placeholder?: string;
}

export default function EditableInput({
  initialValue, type = 'text', onSave, className, placeholder
}: EditableInputProps) {
  const [val, setVal] = useState(initialValue ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { setVal(initialValue ?? ''); }, [initialValue]);

  const handleSave = () => {
    let finalVal = val;
    if (type === 'number') { 
      finalVal = val === '' ? 0 : Number.parseFloat(String(val)) || 0; 
      setVal(finalVal); 
    }
    if (finalVal !== initialValue) onSave(finalVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setVal(initialValue ?? '');
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type={type}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={className}
      step={type === 'number' ? 'any' : undefined}
      placeholder={placeholder}
    />
  );
}