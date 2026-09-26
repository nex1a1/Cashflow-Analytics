import React from 'react';
import { AlertCircle } from 'lucide-react';

/** Inline error under a field. Link it from the input with aria-describedby={id} + aria-invalid. */
export default function FieldError({ id, message }: { id: string; message?: string | null }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-[11px] font-bold text-danger">
      <AlertCircle className="w-3 h-3 mt-px shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
