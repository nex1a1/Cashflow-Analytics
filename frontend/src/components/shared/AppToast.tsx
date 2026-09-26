// src/components/AppToast.tsx
import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { ToastInfo, useToast } from '../../context/ToastContext';

export interface AppToastProps {
  toast: ToastInfo;
}

export default function AppToast({ toast }: AppToastProps) {
  const { hideToast } = useToast();
  if (!toast.visible) return null;
  const isError = toast.type === 'error';
  const isInfo = toast.type === 'info';

  const tone = isError
    ? 'bg-danger-active border-danger-active text-white'
    : isInfo
      ? 'bg-surface-elevated border-line-strong text-ink-display'
      : 'bg-emerald-700/95 border-emerald-800 text-white';
  const Icon = isError ? AlertCircle : isInfo ? Info : CheckCircle;

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 shadow-[0_8px_24px_rgba(0,0,0,0.45)] border flex items-center gap-3 pl-5 pr-2 py-2.5 z-[9999] ${tone}`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${isInfo ? 'text-ink-muted' : 'opacity-90'}`} />
      <span className="font-bold text-sm mr-2">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => { toast.action!.onClick(); hideToast(); }}
          className="px-3 py-1.5 text-sm font-bold text-accent border border-accent/40 hover:bg-accent hover:text-on-accent"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={hideToast}
        className="p-1.5 opacity-80 hover:opacity-100 hover:bg-black/15"
        aria-label="ปิดการแจ้งเตือน"
        title="ปิดการแจ้งเตือน"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
