import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES,
} from '../../constants';
import { 
  settingsService, calendarService, categoryService, groupService, dayTypeService 
} from '../../services/api';
import { getPeriodDateRange, toISODate } from '../../utils/dateHelpers';
import { getFilterLabel } from '../../utils/formatters';

import useCategories from '../useCategories';
import useTransactionData from '../useTransactionData';
import useFilters from '../useFilters';
import useImportCSV from '../useImportCSV';
import useAnalytics from '../useAnalytics';
import { useToast } from '../../context/ToastContext';

export function useAppController() {
  const isDarkMode = true;
  const { showToast: triggerToast, toast } = useToast();
  
  // 1. Navigation & App State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [dbStatus, setDbStatus] = useState('กำลังตรวจสอบ...');
  const [isFetchingData, setIsFetchingData] = useState(true);

  // 2. Data State
  const [dayTypes, setDayTypes] = useState({});
  const [dayTypeConfig, setDayTypeConfig] = useState(DEFAULT_DAY_TYPES);
  const [cashflowGroups, setCashflowGroups] = useState([]);

  // 3. UI Control State (Modals, etc.)
  const [showAddModal, setShowAddModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [addForm, setAddForm] = useState({
    type: 'expense',
    date: new Date().toISOString().split('T')[0],
    category: '',
    description: '',
    amount: '',
  });

  // 4. View Preferences
  const [hideFixedExpenses, setHideFixedExpenses] = useState(false);
  const [hideWantExpenses, setHideWantExpenses] = useState(false);
  const [dashboardCategory, setDashboardCategory] = useState(['ALL']);
  const [chartGroupBy, setChartGroupBy] = useState('monthly');
  const [topXLimit, setTopXLimit] = useState(7);
  const [excludeFuture, setExcludeFuture] = useState(() => {
    return localStorage.getItem('excludeFuture') !== 'false';
  });

  // ─── CORE HOOKS (Definitions must come before derived effects) ───
  const {
    categories, setCategories,
    handleCategoryChange: _handleCategoryChange,
    handleAddCategory,
    handleDeleteCategory: _handleDeleteCategory,
    handleMoveCategory,
    loadCategories,
    loadGroups,
  } = useCategories(DEFAULT_CATEGORIES, setCashflowGroups);

  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const {
    transactions, summaryData, masterPeriods, frequentItems, isProcessing: isTxProcessing,
    setIsProcessing: setTxProcessing,
    loadData, loadAnalytics, bootstrap, saveToDb,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
    refreshData,
  } = useTransactionData({ categories, setCategories, setDayTypes, setDayTypeConfig, setDbStatus, setCashflowGroups, excludeFuture });

  const {
    filterPeriod, setFilterPeriod,
    groupedOptions, rawAvailableMonths, isReadOnlyView,
    searchQuery,            setSearchQuery,
    advancedFilterCategory, setAdvancedFilterCategory,
    advancedFilterGroup,    setAdvancedFilterGroup,
    advancedFilterDate,     setAdvancedFilterDate,
    typeFilter,             setTypeFilter,
    allocationFilter,       setAllocationFilter,
    minAmount,              setMinAmount,
    maxAmount,              setMaxAmount,
    dayTypeFilter,          setDayTypeFilter,
    availableDatesInPeriod,
    allDatesInPeriod,
    displayTransactions,
    activeCashflowGroupIds,
    activeCategoryNames,
    isFilterActive,
    clearFilters,
  } = useFilters({ transactions, categories, masterPeriods, excludeFuture });

  const {
    importPreview, setImportPreview,
    isProcessing: isCsvProcessing,
    fileInputRef,
    handleFileUpload,
    confirmImport,
  } = useImportCSV({
    categories, dayTypes, setDayTypes,
    dayTypeConfig, setDayTypeConfig,
    setCategories, saveToDb,
  });

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
  }, []);

  const currentMonthStr = useMemo(() => todayStr.substring(0, 7), [todayStr]);

  const dashboardTransactions = useMemo(() => {
    if (excludeFuture) {
      return transactions.filter(t => {
        const isoDate = toISODate(t.date);
        if (isoDate <= todayStr) return true;
        
        // Include future income and rent/accommodation in the current month
        if (isoDate.substring(0, 7) === currentMonthStr) {
          const cat = categories.find(c => c.id === t.category_id || c.name === t.category);
          if (cat) {
            const group = cashflowGroups.find(g => g.id === cat.cashflowGroup);
            const type = group?.type || cat.type;
            if (type === 'income') return true;

            const groupName = (group?.name || '').toLowerCase();
            const catName = (cat.name || '').toLowerCase();
            const isRent = groupName.includes('หอ') || 
                           groupName.includes('ที่พัก') || 
                           groupName.includes('rent') || 
                           groupName.includes('เช่า') || 
                           catName.includes('ค่าเช่า') || 
                           catName.includes('ค่าหอพัก');
            if (isRent) return true;
          }
        }
        return false;
      });
    }
    return transactions;
  }, [transactions, excludeFuture, todayStr, currentMonthStr, categories, cashflowGroups]);

  const validAnalyticsTxs = useMemo(() =>
    dashboardTransactions.filter(t => categories.find(c => c.name === t.category)?.cashflowGroup !== 'debt'),
  [dashboardTransactions, categories]);

  const analytics = useAnalytics({
    transactions: validAnalyticsTxs, categories, filterPeriod,
    cashflowGroups, 
    hideFixedExpenses, hideWantExpenses, dashboardCategory, chartGroupBy,
    topXLimit, dayTypes, dayTypeConfig, isDarkMode,
    summaryData, excludeFuture
  });

  // ─── EFFECTS & PERSISTENCE (Safe now that all variables are initialized) ───
  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    const tabLabels = {
      dashboard: 'Dashboard',
      calendar: 'Calendar',
      ledger: 'Ledger',
      settings: 'Settings'
    };
    const tabLabel = tabLabels[activeTab] || 'Home';
    const periodLabel = getFilterLabel(filterPeriod);
    document.title = `CS | ${tabLabel} [${periodLabel}]`;
  }, [activeTab, filterPeriod]);

  // ─── HANDLERS ───
  const handleDayTypeChange = useCallback(async (dateStr, type) => {
    setDayTypes(prev => ({ ...prev, [dateStr]: type }));
    try { await calendarService.save(dateStr, type); }
    catch (err) { console.error('Failed to save day type to DB:', err); }
  }, []);

  const handleDayTypeConfigChange = useCallback(async (id, field, value) => {
    const dt = dayTypeConfig.find(d => d.id === id);
    if (!dt) return;
    const updatedDt = { ...dt, [field]: value };
    const newConfig = dayTypeConfig.map(d => d.id === id ? updatedDt : d);
    setDayTypeConfig(newConfig); 
    try { await dayTypeService.save(updatedDt); } 
    catch (err) { triggerToast('อัปเดตชนิดวันไม่สำเร็จ: ' + err.message, 'error'); }
  }, [dayTypeConfig, triggerToast]);

  const handleAddDayType = useCallback(async () => {
    const newDt = { id: crypto.randomUUID(), label: 'ชนิดวันใหม่', color: '#64748B', name: '', order_index: dayTypeConfig.length + 1 };
    try {
      await dayTypeService.save(newDt);
      setDayTypeConfig(prev => [...prev, newDt]);
      triggerToast('เพิ่มชนิดวันสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถเพิ่มชนิดวันได้: ' + err.message, 'error'); }
  }, [dayTypeConfig.length, triggerToast]);

  const handleDeleteDayType = useCallback(async (id) => {
    if (!window.confirm('ยืนยันการลบชนิดวันนี้?')) return;
    try {
      await dayTypeService.deleteById(id);
      setDayTypeConfig(prev => prev.filter(d => d.id !== id));
      triggerToast('ลบชนิดวันสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถลบชนิดวันได้: ' + err.message, 'error'); }
  }, [triggerToast]);

  const handleMoveDayType = useCallback(async (id, direction) => {
    const idx = dayTypeConfig.findIndex(c => c.id === id);
    if (idx < 0) return;
    const ti = direction === 'UP' ? idx - 1 : idx + 1;
    if (ti >= 0 && ti < dayTypeConfig.length) {
      const cfg = [...dayTypeConfig];
      [cfg[idx], cfg[ti]] = [cfg[ti], cfg[idx]];
      const updatedConfig = cfg.map((dt, i) => ({ ...dt, order_index: i + 1 }));
      setDayTypeConfig(updatedConfig);
      try { for (const dt of updatedConfig) { await dayTypeService.save(dt); } } 
      catch (err) { triggerToast('ไม่สามารถบันทึกลำดับได้: ' + err.message, 'error'); }
    }
  }, [dayTypeConfig, triggerToast]);

  const handleUpdateCashflowGroup = useCallback(async (group) => {
    try {
      await groupService.save(group);
      await loadGroups();
      triggerToast('อัปเดตกลุ่มสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถอัปเดตกลุ่มได้: ' + err.message, 'error'); }
  }, [loadGroups, triggerToast]);

  const handleAddCashflowGroup = useCallback(async () => {
    const g = { id: crypto.randomUUID(), name: 'คอลัมน์ใหม่', type: 'expense', order_index: cashflowGroups.length + 1, color: '#6366F1', icon: '✨', highlightBg: false };
    try {
      await groupService.save(g);
      await loadGroups();
      triggerToast('เพิ่มกลุ่มสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถเพิ่มกลุ่มได้: ' + err.message, 'error'); }
  }, [cashflowGroups.length, loadGroups, triggerToast]);

  const handleDeleteCashflowGroup = useCallback(async (id) => {
    if (categoriesRef.current.some(c => c.cashflowGroup === id)) { triggerToast('ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่', 'error'); return; }
    if (!window.confirm('ยืนยันการลบกลุ่มนี้?')) return;
    try {
      await groupService.deleteById(id);
      await loadGroups();
      triggerToast('ลบกลุ่มสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถลบกลุ่มได้: ' + err.message, 'error'); }
  }, [loadGroups, triggerToast]);

  const handleMoveCashflowGroup = useCallback(async (id, direction) => {
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
      } catch (err) {
        console.error('Failed to save groups order:', err);
        triggerToast('ไม่สามารถจัดเรียงลำดับกลุ่มได้: ' + err.message, 'error');
        await loadGroups();
      }
    }
  }, [cashflowGroups, loadGroups, triggerToast]);

  const handleOpenAddModal = useCallback((dateStr, type) => {
    const formattedDate = dateStr ? toISODate(dateStr) : new Date().toISOString().split('T')[0];
    setAddForm(prev => ({
      ...prev, date: formattedDate, type,
      category: categories.find(c => c.type === type)?.name || '',
    }));
    setShowAddModal(true);
  }, [categories]);

  const handleSaveBatch = async (finalItems) => {
    setTxProcessing(true);
    try {
      await saveToDb(finalItems);
      await refreshData();
      triggerToast('ทำรายการสำเร็จ!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message, 'error');
    } finally {
      setTxProcessing(false);
    }
  };

  const handleToggleExcludeFuture = useCallback(() => {
    setExcludeFuture(prev => {
      const newVal = !prev;
      localStorage.setItem('excludeFuture', String(newVal));
      if (newVal) {
        const d = new Date();
        const curMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (filterPeriod.match(/^\d{4}-\d{2}$/) && filterPeriod > curMonth) {
          setFilterPeriod(curMonth);
        } else if (filterPeriod.match(/^\d{4}$/) && parseInt(filterPeriod) > d.getFullYear()) {
          setFilterPeriod(curMonth);
        } else if (filterPeriod.includes('-Q') || filterPeriod.includes('-H')) {
          const [y] = filterPeriod.split('-');
          if (parseInt(y) > d.getFullYear()) {
            setFilterPeriod(curMonth);
          }
        }
      }
      return newVal;
    });
  }, [filterPeriod, setFilterPeriod]);

  // ─── DATA LOADING ───
  useEffect(() => {
    const triggerLoads = async () => {
      setIsFetchingData(true);
      await bootstrap();
      const { startDate, endDate } = getPeriodDateRange(filterPeriod);
      await Promise.all([
        loadAnalytics(startDate, endDate),
        loadData(startDate, endDate)
      ]);
      setIsFetchingData(false);
    };
    triggerLoads();
  }, [filterPeriod, bootstrap, loadData, loadAnalytics]);

  const isProcessing = isTxProcessing || isCsvProcessing || isFetchingData;

  return {
    // State
    activeTab, setActiveTab,
    dbStatus, isProcessing,
    transactions, categories, cashflowGroups,
    setCashflowGroups,
    dayTypes, dayTypeConfig,
    filterPeriod, setFilterPeriod, masterPeriods,
    groupedOptions, rawAvailableMonths, isReadOnlyView,
    searchQuery, setSearchQuery,
    isFilterActive, clearFilters,
    displayTransactions, allDatesInPeriod, availableDatesInPeriod,
    advancedFilterCategory, setAdvancedFilterCategory,
    advancedFilterGroup, setAdvancedFilterGroup,
    advancedFilterDate, setAdvancedFilterDate,
    typeFilter, setTypeFilter,
    allocationFilter, setAllocationFilter,
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    dayTypeFilter, setDayTypeFilter,
    activeCashflowGroupIds,
    activeCategoryNames,
    summaryData,
    analytics,
    hideFixedExpenses, setHideFixedExpenses,
    hideWantExpenses, setHideWantExpenses,
    dashboardCategory, setDashboardCategory,
    chartGroupBy, setChartGroupBy,
    topXLimit, setTopXLimit,
    showAddModal, setShowAddModal,
    showExportModal, setShowExportModal,
    showImportGuide, setShowImportGuide,
    addForm, setAddForm,
    importPreview, setImportPreview,
    fileInputRef,
    frequentItems,
    isCsvProcessing,
    excludeFuture,
    dashboardTransactions,
    
    // Handlers
    getFilterLabel,
    handleDayTypeChange,
    handleDayTypeConfigChange,
    handleAddDayType,
    handleDeleteDayType,
    handleMoveDayType,
    handleCategoryChange: useCallback((catId, field, value) => _handleCategoryChange(catId, field, value, transactions), [transactions, _handleCategoryChange]),
    handleDeleteCategory: useCallback((id) => _handleDeleteCategory(id, transactions), [transactions, _handleDeleteCategory]),
    handleAddCategory,
    handleMoveCategory,
    handleUpdateCashflowGroup,
    handleAddCashflowGroup,
    handleDeleteCashflowGroup,
    handleMoveCashflowGroup,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
    handleOpenAddModal,
    handleSaveBatch,
    handleFileUpload,
    confirmImport,
    refreshData,
    triggerToast,
    toast,
    handleToggleExcludeFuture
  };
}