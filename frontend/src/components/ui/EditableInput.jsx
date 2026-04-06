// src/components/ui/EditableInput.jsx
import { useState, useEffect, useRef } from 'react';

export default function EditableInput({
  initialValue, type = 'text', onSave, className, placeholder
}) {
  const [val, setVal] = useState(initialValue ?? '');
  const inputRef = useRef(null);

  useEffect(() => { setVal(initialValue ?? ''); }, [initialValue]);

  const handleSave = () => {
    let finalVal = val;
    if (type === 'number') { 
      finalVal = val === '' ? 0 : parseFloat(val) || 0; 
      setVal(finalVal); 
    }
    if (finalVal !== initialValue) onSave(finalVal);
  };

  const handleKeyDown = (e) => {
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