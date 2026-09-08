// src/components/AppToast.tsx
import React from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { ToastInfo, useToast } from '../../context/ToastContext';

export interface AppToastProps {
  toast: ToastInfo;
}

export default function AppToast({ toast }: AppToastProps) {
  const { hideToast } = useToast();
  if (!toast.visible) return null;
  const isError = toast.type === 'error';
  
  return (
    <div 
      role="alert"
      className={`
        fixed bottom-8 left-1/2 -translate-x-1/2
        text-white rounded-sm shadow-2xl border
        flex flex-col z-[9999] overflow-hidden
        ${isError 
          ? 'bg-red-600 border-red-700' 
          : 'bg-emerald-700/95 border-emerald-800'}
      `}
    >
      <div className="flex items-center gap-3 pl-5 pr-3 py-3">
        {isError
          ? <AlertCircle className="w-5 h-5 text-red-100 shrink-0" />
          : <CheckCircle className="w-5 h-5 text-emerald-100 shrink-0" />}
        <span className="font-bold text-sm tracking-wide mr-2">{toast.message}</span>
        <button 
          onClick={hideToast}
          className={`p-1 rounded-sm opacity-80 hover:opacity-100 ${isError ? 'hover:bg-red-700' : 'hover:bg-emerald-800/50'}`}
          title="ปิดการแจ้งเตือน"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className={`h-[3px] w-full ${isError ? 'bg-red-900/50' : 'bg-white/30'}`} />
    </div>
  );
}