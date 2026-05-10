import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

export function useAppController() {
  const { isDarkMode } = useTheme();
  const { showToast: triggerToast, toast } = useToast();
  
  // 1. Navigation & App State
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [dbStatus, setDbStatus] = useState('กำลังตรวจสอบ...');
  const [isFetchingData, setIsFetchingData] = useState(true);

  // 2. Data State
  const [dayTypes, setDayTypes] = useState({});
  const [dayTypeConfig, setDayTypeConfig] = useState(DEFAULT_DAY_TYPES);
  const [cashflowGroups, setCashflowGroups] = useState([]);
  const [enableSmartInsights, setEnableSmartInsights] = useState(() => {
    const saved = localStorage.getItem('enableSmartInsights');
    return saved !== null ? JSON.parse(saved) : true;
  });

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
  const [dashboardCategory, setDashboardCategory] = useState(['ALL']);
  const [chartGroupBy, setChartGroupBy] = useState('monthly');
  const [topXLimit, setTopXLimit] = useState(7);

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

  const {
    transactions, summaryData, masterPeriods, frequentItems, isProcessing: isTxProcessing,
    setIsProcessing: setTxProcessing,
    loadData, loadAnalytics, bootstrap, saveToDb,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
  } = useTransactionData({ setCategories, setDayTypes, setDayTypeConfig, setDbStatus, setCashflowGroups });

  const {
    filterPeriod, setFilterPeriod,
    groupedOptions, rawAvailableMonths, isReadOnlyView,
    searchQuery,            setSearchQuery,
    advancedFilterCategory, setAdvancedFilterCategory,
    advancedFilterGroup,    setAdvancedFilterGroup,
    advancedFilterDate,     setAdvancedFilterDate,
    typeFilter,             setTypeFilter,
    minAmount,              setMinAmount,
    maxAmount,              setMaxAmount,
    dayTypeFilter,          setDayTypeFilter,
    availableDatesInPeriod,
    allDatesInPeriod,
    displayTransactions,
    activeCashflowGroupIds,
    isFilterActive,
    clearFilters,
  } = useFilters({ transactions, categories, masterPeriods });

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

  const validAnalyticsTxs = useMemo(() =>
    transactions.filter(t => categories.find(c => c.name === t.category)?.cashflowGroup !== 'debt'),
  [transactions, categories]);

  const analytics = useAnalytics({
    transactions: validAnalyticsTxs, categories, filterPeriod,
    cashflowGroups, 
    hideFixedExpenses, dashboardCategory, chartGroupBy,
    topXLimit, dayTypes, dayTypeConfig, isDarkMode,
    summaryData
  });

  // ─── EFFECTS & PERSISTENCE (Safe now that all variables are initialized) ───
  useEffect(() => {
    localStorage.setItem('enableSmartInsights', JSON.stringify(enableSmartInsights));
  }, [enableSmartInsights]);

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
    document.title = `🦈 CS | ${tabLabel} [${periodLabel}]`;
  }, [activeTab, filterPeriod]);

  // ─── HANDLERS ───
  const handleDayTypeChange = async (dateStr, type) => {
    setDayTypes(prev => ({ ...prev, [dateStr]: type }));
    try { await calendarService.save(dateStr, type); }
    catch (err) { console.error('Failed to save day type to DB:', err); }
  };

  const handleDayTypeConfigChange = async (id, field, value) => {
    const dt = dayTypeConfig.find(d => d.id === id);
    if (!dt) return;
    const updatedDt = { ...dt, [field]: value };
    const newConfig = dayTypeConfig.map(d => d.id === id ? updatedDt : d);
    setDayTypeConfig(newConfig); 
    try { await dayTypeService.save(updatedDt); } 
    catch (err) { triggerToast('อัปเดตชนิดวันไม่สำเร็จ: ' + err.message, 'error'); }
  };

  const handleAddDayType = async () => {
    const newDt = { id: crypto.randomUUID(), label: 'ชนิดวันใหม่', color: '#64748B', name: '', order_index: dayTypeConfig.length + 1 };
    try {
      await dayTypeService.save(newDt);
      setDayTypeConfig([...dayTypeConfig, newDt]);
      triggerToast('เพิ่มชนิดวันสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถเพิ่มชนิดวันได้: ' + err.message, 'error'); }
  };

  const handleDeleteDayType = async (id) => {
    if (!window.confirm('ยืนยันการลบชนิดวันนี้?')) return;
    try {
      await dayTypeService.deleteById(id);
      setDayTypeConfig(dayTypeConfig.filter(d => d.id !== id));
      triggerToast('ลบชนิดวันสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถลบชนิดวันได้: ' + err.message, 'error'); }
  };

  const handleMoveDayType = async (id, direction) => {
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
  };

  const handleUpdateCashflowGroup = async (group) => {
    try {
      await groupService.save(group);
      await loadGroups();
      triggerToast('อัปเดตกลุ่มสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถอัปเดตกลุ่มได้: ' + err.message, 'error'); }
  };

  const handleAddCashflowGroup = async () => {
    const g = { id: crypto.randomUUID(), name: 'คอลัมน์ใหม่', type: 'expense', order_index: cashflowGroups.length + 1, color: '#6366F1', icon: '✨', highlightBg: false };
    try {
      await groupService.save(g);
      await loadGroups();
      triggerToast('เพิ่มกลุ่มสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถเพิ่มกลุ่มได้: ' + err.message, 'error'); }
  };

  const handleDeleteCashflowGroup = async (id) => {
    if (categories.some(c => c.cashflowGroup === id)) { triggerToast('ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่', 'error'); return; }
    if (!window.confirm('ยืนยันการลบกลุ่มนี้?')) return;
    try {
      await groupService.deleteById(id);
      await loadGroups();
      triggerToast('ลบกลุ่มสำเร็จ', 'success');
    } catch (err) { triggerToast('ไม่สามารถลบกลุ่มได้: ' + err.message, 'error'); }
  };

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
      triggerToast('ทำรายการสำเร็จ!', 'success');
    } catch (err) {
      console.error(err);
      triggerToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message, 'error');
    } finally {
      setTxProcessing(false);
    }
  };

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
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    dayTypeFilter, setDayTypeFilter,
    activeCashflowGroupIds,
    summaryData,
    analytics,
    enableSmartInsights, setEnableSmartInsights,
    hideFixedExpenses, setHideFixedExpenses,
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
    
    // Handlers
    getFilterLabel,
    handleDayTypeChange,
    handleDayTypeConfigChange,
    handleAddDayType,
    handleDeleteDayType,
    handleMoveDayType,
    handleCategoryChange: (catId, field, value) => _handleCategoryChange(catId, field, value, transactions),
    handleDeleteCategory: (id) => _handleDeleteCategory(id, transactions),
    handleAddCategory,
    handleMoveCategory,
    handleUpdateCashflowGroup,
    handleAddCashflowGroup,
    handleDeleteCashflowGroup,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
    handleOpenAddModal,
    handleSaveBatch,
    handleFileUpload,
    confirmImport,
    triggerToast,
    toast
  };
}