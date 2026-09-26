import React, { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastInfo {
  visible: boolean;
  message: string;
  type: string;
  action?: ToastAction;
}

export interface ToastContextValue {
  /** `action` adds a button (e.g. เลิกทำ) and keeps the toast up longer so it can be reached. */
  showToast: (message: string, type?: string, action?: ToastAction) => void;
  hideToast: () => void;
  toast: ToastInfo;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export interface ToastProviderProps {
  children?: ReactNode;
}

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<ToastInfo>({
    visible: false,
    message: '',
    type: 'success',
  });
  // One timer at a time — a stale timer from the previous toast must not hide the next one early
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setToast(prev => ({ ...prev, visible: false, action: undefined }));
  }, []);

  const showToast = useCallback((message: string, type: string = 'success', action?: ToastAction) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ visible: true, message, type, action });
    timer.current = setTimeout(hideToast, action ? 8000 : 3000);
  }, [hideToast]);

  const contextValue = useMemo(() => ({
    showToast,
    hideToast,
    toast,
  }), [showToast, hideToast, toast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
};
