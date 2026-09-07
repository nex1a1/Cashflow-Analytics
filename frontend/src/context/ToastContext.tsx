import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export interface ToastInfo {
  visible: boolean;
  message: string;
  type: string;
}

export interface ToastContextValue {
  showToast: (message: string, type?: string) => void;
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

  const showToast = useCallback((message: string, type: string = 'success') => {
    setToast({
      visible: true,
      message,
      type,
    });

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

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