import React, { useState, useEffect, useRef } from 'react';

export interface EditableInputProps {
  initialValue?: string;
  onSave: (val: string) => void;
  className?: string;
  placeholder?: string;
}

/** Text cell that saves on blur / Enter; Esc puts the old text back without saving. */
export default function EditableInput({ initialValue, onSave, className, placeholder }: EditableInputProps) {
  const [val, setVal] = useState(initialValue ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  // blur() runs before the Esc reset re-renders, so the blur handler still sees the typed text
  const cancelled = useRef(false);

  useEffect(() => { setVal(initialValue ?? ''); }, [initialValue]);

  const handleSave = () => {
    if (cancelled.current) { cancelled.current = false; return; }
    if (val !== (initialValue ?? '')) onSave(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') inputRef.current?.blur();
    if (e.key === 'Escape') {
      cancelled.current = true;
      setVal(initialValue ?? '');
      inputRef.current?.blur();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleSave}
      onKeyDown={handleKeyDown}
      className={className}
      placeholder={placeholder}
    />
  );
}
