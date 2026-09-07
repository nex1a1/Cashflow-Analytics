import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { AppDataContextValue, Category, CashflowGroup, DayType, FrequentItem, TransactionDisplay } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES } from '../constants';
import { calendarService, groupService, dayTypeService } from '../services/api';
import { getPeriodDateRange } from '../utils/dateHelpers';
import useCategories from '../hooks/useCategories';
import useTransactionData from '../hooks/useTransactionData';
import useImportCSV from '../hooks/useImportCSV';
import { useToast } from './ToastContext';

const AppDataContext = createContext<AppDataContextValue | undefined>(undefined);

export interface AppDataProviderProps {
  children: ReactNode;
}

export const AppDataProvider: React.FC<AppDataProviderProps> = ({ children }) => {
  const { showToast: triggerToast } = useToast();

  const [dbStatus, setDbStatus] = useState<string>('กำลังตรวจสอบ...');
  const [dayTypes, setDayTypes] = useState<Record<string, string>>({});
  const [dayTypeConfig, setDayTypeConfig] = useState<DayType[]>(DEFAULT_DAY_TYPES);
  const [cashflowGroups, setCashflowGroups] = useState<CashflowGroup[]>([]);

  // 1. Categories Hook
  const {
    categories,
    setCategories,
    handleCategoryChange: _handleCategoryChange,
    handleAddCategory,
    handleDeleteCategory: _handleDeleteCategory,
    handleMoveCategory,
    loadGroups,
  } = useCategories(DEFAULT_CATEGORIES, setCashflowGroups);

  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  // 2. Transaction Data Hook
  const {
    transactions,
    summaryData,
    masterPeriods,
    frequentItems,
    isProcessing: isTxProcessing,
    isBootstrapping,
    setIsProcessing: setTxProcessing,
    loadData,
    loadAnalytics,
    bootstrap,
    saveToDb,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
    refreshData,
  } = useTransactionData({
    categories,
    setCategories,
    setDayTypes,
    setDayTypeConfig,
    setDbStatus,
    setCashflowGroups,
    excludeFuture: false,
  });

  // 3. CSV Import Hook
  const {
    importPreview,
    setImportPreview,
    isProcessing: isCsvProcessing,
    fileInputRef,
    handleFileUpload,
    confirmImport,
  } = useImportCSV({
    categories,
    dayTypes,
    setDayTypes,
    dayTypeConfig,
    setDayTypeConfig,
    setCategories,
    saveToDb,
  });

  // 4. Data Loading for Period
  const [isFetchingPeriod, setIsFetchingPeriod] = useState<boolean>(false);
  const loadPeriodData = useCallback(async (period: string) => {
    setIsFetchingPeriod(true);
    const { startDate, endDate, fetchStartDate } = getPeriodDateRange(period);
    try {
      await Promise.all([
        loadAnalytics(startDate, endDate),
        loadData(fetchStartDate || startDate, endDate)
      ]);
    } catch (err) {
      console.error('Failed loading period data:', err);
    } finally {
      setIsFetchingPeriod(false);
    }
  }, [loadAnalytics, loadData]);

  // Bootstrap once on mount
  const hasBootstrapped = useRef(false);
  useEffect(() => {
    if (!hasBootstrapped.current) {
      hasBootstrapped.current = true;
      bootstrap();
    }
  }, [bootstrap]);

  // Handlers
  const handleDayTypeChange = useCallback(async (dateStr: string, type: string) => {
    setDayTypes(prev => ({ ...prev, [dateStr]: type }));
    try {
      await calendarService.save(dateStr, type);
    } catch (err) {
      console.error('Failed to save day type to DB:', err);
    }
  }, []);

  const handleDayTypeConfigChange = useCallback(async (id: string, field: string, value: any) => {
    const dt = dayTypeConfig.find(d => d.id === id);
    if (!dt) return;
    const updatedDt = { ...dt, [field]: value };
    const newConfig = dayTypeConfig.map(d => (d.id === id ? updatedDt : d));
    setDayTypeConfig(newConfig);
    try {
      await dayTypeService.save(updatedDt);
    } catch (err: any) {
      triggerToast('อัปเดตชนิดวันไม่สำเร็จ: ' + err.message, 'error');
    }
  }, [dayTypeConfig, triggerToast]);

  const handleAddDayType = useCallback(async () => {
    const newDt: DayType = {
      id: crypto.randomUUID(),
      label: 'ชนิดวันใหม่',
      color: '#64748B',
      name: '',
      order_index: dayTypeConfig.length + 1
    };
    try {
      await dayTypeService.save(newDt);
      setDayTypeConfig(prev => [...prev, newDt]);
      triggerToast('เพิ่มชนิดวันสำเร็จ', 'success');
    } catch (err: any) {
      triggerToast('ไม่สามารถเพิ่มชนิดวันได้: ' + err.message, 'error');
    }
  }, [dayTypeConfig.length, triggerToast]);

  const handleDeleteDayType = useCallback(async (id: string) => {
    if (!window.confirm('ยืนยันการลบชนิดวันนี้?')) return;
    try {
      await dayTypeService.deleteById(id);
      setDayTypeConfig(prev => prev.filter(d => d.id !== id));
      triggerToast('ลบชนิดวันสำเร็จ', 'success');
    } catch (err: any) {
      triggerToast('ไม่สามารถลบชนิดวันได้: ' + err.message, 'error');
    }
  }, [triggerToast]);

  const handleMoveDayType = useCallback(async (id: string, direction: 'UP' | 'DOWN') => {
    const idx = dayTypeConfig.findIndex(c => c.id === id);
    if (idx < 0) return;
    const ti = direction === 'UP' ? idx - 1 : idx + 1;
    if (ti >= 0 && ti < dayTypeConfig.length) {
      const cfg = [...dayTypeConfig];
      [cfg[idx], cfg[ti]] = [cfg[ti], cfg[idx]];
      const updatedConfig = cfg.map((dt, i) => ({ ...dt, order_index: i + 1 }));
      setDayTypeConfig(updatedConfig);
      try {
        for (const dt of updatedConfig) {
          await dayTypeService.save(dt);
        }
      } catch (err: any) {
        triggerToast('ไม่สามารถบันทึกลำดับได้: ' + err.message, 'error');
      }
    }
  }, [dayTypeConfig, triggerToast]);

  const handleUpdateCashflowGroup = useCallback(async (group: any) => {
    try {
      await groupService.save(group);
      await loadGroups();
      triggerToast('อัปเดตกลุ่มสำเร็จ', 'success');
    } catch (err: any) {
      triggerToast('ไม่สามารถอัปเดตกลุ่มได้: ' + err.message, 'error');
      throw err;
    }
  }, [loadGroups, triggerToast]);

  const handleAddCashflowGroup = useCallback(async () => {
    const g = {
      id: crypto.randomUUID(),
      name: 'คอลัมน์ใหม่',
      type: 'expense' as const,
      order_index: cashflowGroups.length + 1,
      color: '#6366F1',
      icon: '✨',
      highlight_bg: 0,
      highlightBg: false,
      allocation_type: 'want' as const
    };
    try {
      await groupService.save(g);
      await loadGroups();
      triggerToast('เพิ่มกลุ่มสำเร็จ', 'success');
    } catch (err: any) {
      triggerToast('ไม่สามารถเพิ่มกลุ่มได้: ' + err.message, 'error');
    }
  }, [cashflowGroups.length, loadGroups, triggerToast]);

  const handleDeleteCashflowGroup = useCallback(async (id: string) => {
    if (categoriesRef.current.some(c => (c.cashflowGroup || c.cashflow_group_id) === id)) {
      triggerToast('ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่', 'error');
      return;
    }
    if (!window.confirm('ยืนยันการลบกลุ่มนี้?')) return;
    try {
      await groupService.deleteById(id);
      await loadGroups();
      triggerToast('ลบกลุ่มสำเร็จ', 'success');
    } catch (err: any) {
      triggerToast('ไม่สามารถลบกลุ่มได้: ' + err.message, 'error');
    }
  }, [loadGroups, triggerToast]);

  const handleMoveCashflowGroup = useCallback(async (id: string, direction: 'UP' | 'DOWN') => {
    const sortedGroups = [...cashflowGroups].sort((a, b) => a.order_index - b.order_index);
    const idx = sortedGroups.findIndex(g => g.id === id);
    if (idx < 0) return;

    const ti = direction === 'UP' ? idx - 1 : idx + 1;
    if (ti >= 0 && ti < sortedGroups.length) {
      const updated = [...sortedGroups];
      [updated[idx], updated[ti]] = [updated[ti], updated[idx]];

      const finalUpdated = updated.map((g, i) => ({ ...g, order_index: i + 1 }));
      setCashflowGroups(finalUpdated);

      try {
        for (const group of finalUpdated) {
          await groupService.save(group);
        }
        await loadGroups();
        triggerToast('จัดเรียงลำดับกลุ่มสำเร็จ', 'success');
      } catch (err: any) {
        console.error('Failed to save groups order:', err);
        triggerToast('ไม่สามารถจัดเรียงลำดับกลุ่มได้: ' + err.message, 'error');
        await loadGroups();
      }
    }
  }, [cashflowGroups, loadGroups, triggerToast]);

  const handleSaveBatch = useCallback(async (finalItems: any[]) => {
    setTxProcessing(true);
    try {
      await saveToDb(finalItems);
      await refreshData();
      triggerToast('ทำรายการสำเร็จ!', 'success');
    } catch (err: any) {
      console.error(err);
      triggerToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message, 'error');
    } finally {
      setTxProcessing(false);
    }
  }, [saveToDb, refreshData, setTxProcessing, triggerToast]);

  const handleCategoryChange = useCallback(
    (catId: string, field: string, value: any) => _handleCategoryChange(catId, field, value),
    [_handleCategoryChange]
  );

  const handleDeleteCategory = useCallback(
    (id: string) => _handleDeleteCategory(id, transactions),
    [transactions, _handleDeleteCategory]
  );

  const isProcessing = isTxProcessing || isCsvProcessing || isFetchingPeriod || isBootstrapping;

  const value: AppDataContextValue = {
    transactions,
    categories,
    setCategories,
    cashflowGroups,
    setCashflowGroups,
    dayTypes,
    setDayTypes,
    dayTypeConfig,
    setDayTypeConfig,
    frequentItems,
    summaryData,
    dbStatus,
    isProcessing,
    isCsvProcessing,
    importPreview,
    setImportPreview,
    fileInputRef,
    masterPeriods,
    refreshData,
    loadPeriodData,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
    handleSaveBatch,
    handleFileUpload,
    confirmImport,
    handleCategoryChange,
    handleDeleteCategory,
    handleAddCategory,
    handleMoveCategory,
    handleDayTypeChange,
    handleDayTypeConfigChange,
    handleAddDayType,
    handleDeleteDayType,
    handleMoveDayType,
    handleUpdateCashflowGroup,
    handleAddCashflowGroup,
    handleDeleteCashflowGroup,
    handleMoveCashflowGroup,
  };

  return (
    <AppDataContext.Provider value={value}>
      {children}
    </AppDataContext.Provider>
  );
};

export const useAppData = (): AppDataContextValue => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};
