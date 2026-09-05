import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    type: 'success', // 'success' | 'error'
  });

  const showToast = useCallback((message, type = 'success') => {
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