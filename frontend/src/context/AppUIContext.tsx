import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AppUIContextValue, QuickAddFormData } from '../types';

const AppUIContext = createContext<AppUIContextValue | undefined>(undefined);

export interface AppUIProviderProps {
  children: ReactNode;
}

export const AppUIProvider: React.FC<AppUIProviderProps> = ({ children }) => {
  // Navigation
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('activeTab') || 'dashboard');

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showImportGuide, setShowImportGuide] = useState<boolean>(false);
  const [addForm, setAddForm] = useState<QuickAddFormData>({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
  });

  // View Preferences
  const [hideFixedExpenses, setHideFixedExpenses] = useState<boolean>(false);
  const [hideWantExpenses, setHideWantExpenses] = useState<boolean>(false);
  const [dashboardCategory, setDashboardCategory] = useState<string[]>(['ALL']);
  const [chartGroupBy, setChartGroupBy] = useState<string>('monthly');
  const [topXLimit, setTopXLimit] = useState<number>(7);

  // Sync activeTab to localStorage
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const handleOpenAddModal = useCallback((dateStr?: string, type: string = 'expense') => {
    const formattedDate = dateStr || new Date().toISOString().split('T')[0];
    setAddForm(prev => ({
      ...prev,
      date: formattedDate,
      type,
      category: '',
      description: '',
      amount: ''
    }));
    setShowAddModal(true);
  }, []);

  const value: AppUIContextValue = {
    activeTab,
    setActiveTab,
    hideFixedExpenses,
    setHideFixedExpenses,
    hideWantExpenses,
    setHideWantExpenses,
    dashboardCategory,
    setDashboardCategory,
    chartGroupBy,
    setChartGroupBy,
    topXLimit,
    setTopXLimit,
    showAddModal,
    setShowAddModal,
    showExportModal,
    setShowExportModal,
    showImportGuide,
    setShowImportGuide,
    addForm,
    setAddForm,
    handleOpenAddModal,
  };

  return (
    <AppUIContext.Provider value={value}>
      {children}
    </AppUIContext.Provider>
  );
};

export const useAppUI = (): AppUIContextValue => {
  const context = useContext(AppUIContext);
  if (!context) {
    throw new Error('useAppUI must be used within an AppUIProvider');
  }
  return context;
};
