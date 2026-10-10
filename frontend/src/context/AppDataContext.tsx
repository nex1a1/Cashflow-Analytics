import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { AppDataContextValue, Category, CashflowGroup, DayNote, DayType, FrequentItem, TransactionDisplay } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES } from '../constants';
import { calendarService, groupService, dayTypeService } from '../services/api';
import { getPeriodDateRange, parseDateStrToObj } from '../utils/dateHelpers';
import { latestOnly } from '../utils/latestOnly';
import { resolveDefaultDayTypeId } from '../views/Calendar/utils/calendarPeriodHelpers';
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
  const [dayNotes, setDayNotes] = useState<Record<string, DayNote>>({});
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
    totalCount,
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
    setDayNotes,
    setDayTypeConfig,
    setDbStatus,
    setCashflowGroups,
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
    cashflowGroups,
    dayTypes,
    setDayTypes,
    dayTypeConfig,
    setDayTypeConfig,
    setCategories,
    saveToDb,
  });

  // 4. Data Loading for Period
  const [isFetchingPeriod, setIsFetchingPeriod] = useState<boolean>(false);
  const beginPeriodLoad = useMemo(() => latestOnly(), []);
  const loadPeriodData = useCallback(async (period: string) => {
    const isCurrent = beginPeriodLoad();
    setIsFetchingPeriod(true);
    const { startDate, endDate, fetchStartDate } = getPeriodDateRange(period);
    try {
      // both loaders handle their own errors (offline status / no summary), so this never rejects
      await Promise.all([
        loadAnalytics(startDate, endDate),
        loadData(fetchStartDate || startDate, endDate)
      ]);
    } finally {
      // an older request finishing must not switch the spinner off while the newer one is still loading
      if (isCurrent()) setIsFetchingPeriod(false);
    }
  }, [loadAnalytics, loadData, beginPeriodLoad]);

  // Bootstrap once on mount
  const hasBootstrapped = useRef(false);
  useEffect(() => {
    if (!hasBootstrapped.current) {
      hasBootstrapped.current = true;
      bootstrap();
    }
  }, [bootstrap]);

  // Handlers
  const dayTypesRef = useRef(dayTypes);
  useEffect(() => {
    dayTypesRef.current = dayTypes;
  }, [dayTypes]);

  const handleDayTypeChange = useCallback(async (dateStr: string, type: string) => {
    const before = dayTypesRef.current[dateStr]; // undefined = the day had no explicit type
    setDayTypes(prev => ({ ...prev, [dateStr]: type }));
    try {
      await calendarService.save(dateStr, type);
    } catch (err: any) {
      console.error('Failed to save day type to DB:', err);
      setDayTypes(prev => {
        if (prev[dateStr] !== type) return prev; // a newer change owns this day now
        const next = { ...prev };
        if (before === undefined) delete next[dateStr];
        else next[dateStr] = before;
        return next;
      });
      triggerToast('บันทึกประเภทวันไม่สำเร็จ: ' + err.message, 'error');
    }
  }, [triggerToast]);

  // โน้ตต้องผูกกับแถว calendar_days (day_type_id NOT NULL) จึงส่งประเภทวันที่หน้าจอแสดงอยู่ไปด้วยเสมอ
  const handleDayNoteChange = useCallback(async (dateStr: string, text: string, icon: string): Promise<boolean> => {
    const next: DayNote = { text: text.trim(), icon: text.trim() ? icon : '' }; // ไอคอนอยู่ได้เฉพาะโน้ตที่มีข้อความ
    const before: DayNote = dayNotes[dateStr] ?? { text: '', icon: '' };
    if (next.text === before.text && next.icon === before.icon) return true;

    const dow = parseDateStrToObj(dateStr).getDay();
    const typeId = dayTypes[dateStr] || resolveDefaultDayTypeId(dayTypeConfig, dow === 0 || dow === 6);
    if (!typeId) return false;

    const apply = (value: DayNote, onlyIf?: DayNote) => setDayNotes(prev => {
      const cur = prev[dateStr] ?? { text: '', icon: '' };
      if (onlyIf && (cur.text !== onlyIf.text || cur.icon !== onlyIf.icon)) return prev; // a newer note owns this day now
      const map = { ...prev };
      if (value.text) map[dateStr] = value;
      else delete map[dateStr];
      return map;
    });

    apply(next);
    try {
      await calendarService.save(dateStr, typeId, next.text, next.icon);
      return true;
    } catch (err) {
      console.error('Failed to save day note to DB:', err);
      apply(before, next);
      return false;
    }
  }, [dayNotes, dayTypes, dayTypeConfig]);

  const handleDayTypeConfigChange = useCallback(async (id: string, field: string, value: any) => {
    const dt = dayTypeConfig.find(d => d.id === id);
    if (!dt) return false;
    const updatedDt = { ...dt, [field]: value };
    setDayTypeConfig(prev => prev.map(d => (d.id === id ? updatedDt : d)));
    try {
      await dayTypeService.save(updatedDt);
      return true;
    } catch (err: any) {
      // roll back only this field, and only while it still holds this edit
      setDayTypeConfig(prev => prev.map(d =>
        (d.id === id && (d as any)[field] === value ? { ...d, [field]: (dt as any)[field] } : d)));
      triggerToast('อัปเดตประเภทวันไม่สำเร็จ: ' + err.message, 'error');
      return false;
    }
  }, [dayTypeConfig, triggerToast]);

  const handleAddDayType = useCallback(async () => {
    const newDt: DayType = {
      id: crypto.randomUUID(),
      label: 'ประเภทวันใหม่',
      color: '#64748B',
      name: '',
      order_index: dayTypeConfig.length + 1
    };
    try {
      await dayTypeService.save(newDt);
      setDayTypeConfig(prev => [...prev, newDt]);
      triggerToast('เพิ่มประเภทวันสำเร็จ', 'success');
    } catch (err: any) {
      triggerToast('ไม่สามารถเพิ่มประเภทวันได้: ' + err.message, 'error');
    }
  }, [dayTypeConfig.length, triggerToast]);

  const handleDeleteDayType = useCallback(async (id: string) => {
    try {
      await dayTypeService.deleteById(id);
      setDayTypeConfig(prev => prev.filter(d => d.id !== id));
      triggerToast('ลบประเภทวันสำเร็จ', 'success');
    } catch (err: any) {
      triggerToast('ไม่สามารถลบประเภทวันได้: ' + err.message, 'error');
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
        // rows are saved one by one: the ones before the failure are already stored, so show the server's order
        const fresh = await dayTypeService.getAll().catch(() => null);
        setDayTypeConfig(fresh?.length ? fresh : dayTypeConfig);
      }
    }
  }, [dayTypeConfig, triggerToast]);

  const handleUpdateCashflowGroup = useCallback(async (group: any, options?: { silent?: boolean }) => {
    try {
      await groupService.save(group);
      await loadGroups();
      if (!options?.silent) {
        triggerToast('อัปเดตกลุ่มสำเร็จ', 'success');
      }
    } catch (err: any) {
      triggerToast('ไม่สามารถอัปเดตกลุ่มได้: ' + err.message, 'error');
      throw err;
    }
  }, [loadGroups, triggerToast]);

  const handleAddCashflowGroup = useCallback(async () => {
    const g = {
      id: crypto.randomUUID(),
      name: 'กลุ่มใหม่',
      type: 'expense' as const,
      order_index: cashflowGroups.length + 1,
      color: '#6366F1',
      icon: 'sparkles',
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
      // saveToDb already toasted; rethrow so BatchAddModal keeps the cart and shows the error inline
      console.error(err);
      throw err;
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
    totalCount,
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
    dayNotes,
    handleDayNoteChange,
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
