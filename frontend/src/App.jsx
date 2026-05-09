// src/App.jsx  (fixed initialization and context)
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES,
} from './constants';
import { settingsService, calendarService, categoryService, groupService, dayTypeService } from './services/api';
import { getFilterLabel } from './utils/formatters';
import { toISODate, getPeriodDateRange } from './utils/dateHelpers';
import { defaults } from 'chart.js';

import useCategories from './hooks/useCategories';
import useAnalytics from './hooks/useAnalytics';
import useTransactionData from './hooks/useTransactionData';
import useImportCSV from './hooks/useImportCSV';
import useFilters from './hooks/useFilters';
import AppHeader from './components/AppHeader';
import AppToast from './components/AppToast';
import './styles/darkMode.css';
import { useTheme } from './context/ThemeContext';
import { useToast } from './context/ToastContext';
import SettingsView from './views/Settings';
import CalendarView from './views/Calendar';
import LedgerView from './views/Ledger/index';
import DashboardView from './views/Dashboard/index';
import BatchAddModal from './components/BatchAddModal/index';
import ExportModal from './components/ExportModal';
import ImportGuideModal from './components/ImportGuideModal';
import ImportPreviewModal from './components/ImportPreviewModal';

import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, ArcElement,
  Filler, LineController, BarController,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  LineController, BarController, Title, Tooltip, Legend, ArcElement, Filler,
);

export default function App() {
  const { isDarkMode, setIsDarkMode } = useTheme();
  const { showToast: triggerToast, toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');
  const [dbStatus, setDbStatus] = useState('กำลังตรวจสอบ...');

  const [dayTypes, setDayTypes] = useState({});
  const [dayTypeConfig, setDayTypeConfig] = useState(DEFAULT_DAY_TYPES);
  const [cashflowGroups, setCashflowGroups] = useState([]);
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

  const [hideFixedExpenses, setHideFixedExpenses] = useState(false);
  const [dashboardCategory, setDashboardCategory] = useState(['ALL']);
  const [chartGroupBy, setChartGroupBy] = useState('monthly');
  const [topXLimit, setTopXLimit] = useState(7);
  const [enableSmartInsights, setEnableSmartInsights] = useState(() => {
    const saved = localStorage.getItem('enableSmartInsights');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [isFetchingData, setIsFetchingData] = useState(true);

  useEffect(() => {
    localStorage.setItem('enableSmartInsights', JSON.stringify(enableSmartInsights));
  }, [enableSmartInsights]);

  // 1. Hooks (ประกาศก่อนใช้)
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

  // ── Dynamic Document Title (🚀 FIXED) ──
  useEffect(() => {
    const periodLabel = getFilterLabel(filterPeriod);
    const tabLabels = { dashboard: 'Analysis', calendar: 'Calendar', ledger: 'Database', settings: 'Settings' };
    const tabLabel = tabLabels[activeTab] || 'Home';
    document.title = `${periodLabel} | ${tabLabel} - Cashflow Analytics`;
  }, [filterPeriod, activeTab]);

  useEffect(() => {
    defaults.color = isDarkMode ? '#94a3b8' : '#475569';
    defaults.scale.grid.color = isDarkMode ? '#334155' : '#e2e8f0';
    defaults.font.family = "'Inter', 'IBM Plex Sans Thai Looped', sans-serif";
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

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
    setDayTypeConfig(newConfig); // Optimistic UI update
    
    try {
      await dayTypeService.save(updatedDt);
    } catch (err) {
      triggerToast('อัปเดตชนิดวันไม่สำเร็จ: ' + err.message, 'error');
    }
  };

  const handleAddDayType = async () => {
    const newDt = { 
      id: crypto.randomUUID(), 
      label: 'ชนิดวันใหม่', 
      color: '#64748B', 
      name: '',
      order_index: dayTypeConfig.length + 1
    };
    try {
      await dayTypeService.save(newDt);
      setDayTypeConfig([...dayTypeConfig, newDt]);
      triggerToast('เพิ่มชนิดวันสำเร็จ', 'success');
    } catch (err) {
      triggerToast('ไม่สามารถเพิ่มชนิดวันได้: ' + err.message, 'error');
    }
  };

  const handleDeleteDayType = async (id) => {
    if (!window.confirm('ยืนยันการลบชนิดวันนี้?')) return;
    try {
      await dayTypeService.deleteById(id);
      setDayTypeConfig(dayTypeConfig.filter(d => d.id !== id));
      triggerToast('ลบชนิดวันสำเร็จ', 'success');
    } catch (err) {
      triggerToast('ไม่สามารถลบชนิดวันได้: ' + err.message, 'error');
    }
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
      
      try {
        for (const dt of updatedConfig) {
          await dayTypeService.save(dt);
        }
      } catch (err) {
        triggerToast('ไม่สามารถบันทึกลำดับได้: ' + err.message, 'error');
      }
    }
  };

  const handleCategoryChange = (catId, field, value) =>
    _handleCategoryChange(catId, field, value, transactions);
  const handleDeleteCategory = (id) =>
    _handleDeleteCategory(id, transactions);

  const handleUpdateCashflowGroup = async (group) => {
    try {
      await groupService.save(group);
      await loadGroups();
      triggerToast('อัปเดตกลุ่มสำเร็จ', 'success');
    } catch (err) {
      triggerToast('ไม่สามารถอัปเดตกลุ่มได้: ' + err.message, 'error');
    }
  };

  const handleAddCashflowGroup = async () => {
    const g = {
      id: crypto.randomUUID(),
      name: 'คอลัมน์ใหม่',
      type: 'expense',
      order_index: cashflowGroups.length + 1,
      color: '#6366F1',
      icon: '✨',
      highlightBg: false
    };
    try {
      await groupService.save(g);
      await loadGroups();
      triggerToast('เพิ่มกลุ่มสำเร็จ', 'success');
    } catch (err) {
      triggerToast('ไม่สามารถเพิ่มกลุ่มได้: ' + err.message, 'error');
    }
  };

  const handleDeleteCashflowGroup = async (id) => {
    if (categories.some(c => c.cashflowGroup === id)) {
      triggerToast('ไม่สามารถลบได้ มีหมวดหมู่กำลังใช้งานกลุ่มนี้อยู่', 'error');
      return;
    }
    if (!window.confirm('ยืนยันการลบกลุ่มนี้?')) return;
    try {
      await groupService.deleteById(id);
      await loadGroups();
      triggerToast('ลบกลุ่มสำเร็จ', 'success');
    } catch (err) {
      triggerToast('ไม่สามารถลบกลุ่มได้: ' + err.message, 'error');
    }
  };

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

  const isProcessing = isTxProcessing || isCsvProcessing || isFetchingData;

  // 3. Load Data based on period (High Performance Dual-Loading)
  useEffect(() => {
    const triggerLoads = async () => {
      setIsFetchingData(true);
      // 1. Always bootstrap master data once
      await bootstrap();

      // 2. Resolve date range from current filter
      const { startDate, endDate } = getPeriodDateRange(filterPeriod);

      // 3. Parallel load: 
      // - Summary (Aggregated) for charts
      // - Transactions (Windowed) for Ledger
      await Promise.all([
        loadAnalytics(startDate, endDate),
        loadData(startDate, endDate)
      ]);
      setIsFetchingData(false);
    };
    triggerLoads();
  }, [filterPeriod, bootstrap, loadData, loadAnalytics]);

  const showSuccess = () => { triggerToast('ทำรายการสำเร็จ!', 'success'); };

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

  const handleOpenAddModal = (dateStr, type) => {
    const formattedDate = dateStr ? toISODate(dateStr) : new Date().toISOString().split('T')[0];
    setAddForm(prev => ({
      ...prev, date: formattedDate, type,
      category: categories.find(c => c.type === type)?.name || '',
    }));
    setShowAddModal(true);
  };

  const handleSaveBatch = async (finalItems) => {
    setTxProcessing(true);
    try {
      await saveToDb(finalItems);
      showSuccess();
    } catch (err) {
      console.error(err);
      triggerToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message, 'error');
    } finally {
      setTxProcessing(false);
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 }
  };

  const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.3 };

  return (
    <div
      className={`min-h-screen flex flex-col ${isDarkMode ? 'dark-mode' : ''}`}
      style={{ fontFamily: "'Inter', 'IBM Plex Sans Thai Looped', sans-serif" }}
    >
      <div className={`max-w-[98%] xl:max-w-[1400px] 2xl:max-w-[1600px] w-full mx-auto my-4 border-t-4 border-[#00509E] shadow-xl rounded-xl flex-grow flex flex-col overflow-y-auto custom-scrollbar relative transition-colors duration-300 scroll-smooth ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ scrollbarGutter: 'stable' }}>

        <AppHeader
          dbStatus={dbStatus} transactionCount={transactions.length}
          activeTab={activeTab} setActiveTab={setActiveTab}
          filterPeriod={filterPeriod} setFilterPeriod={setFilterPeriod}
          groupedOptions={groupedOptions} categories={categories}
          isProcessing={isProcessing}
          onClickAddQuick={() => {
            setAddForm(prev => ({
              ...prev,
              date: new Date().toISOString().split('T')[0],
              category: categories.find(c => c.type === 'expense')?.name || '',
            }));
            setShowAddModal(true);
          }}
          onClickExport={() => setShowExportModal(true)}
          onFileUpload={handleFileUpload}
          onClickImportGuide={() => setShowImportGuide(true)}
          fileInputRef={fileInputRef}
        />

        <div className={`p-6 relative z-0 flex-grow transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <DashboardView
                  analytics={analytics} transactions={transactions}
                  cashflowGroups={cashflowGroups}
                  filterPeriod={filterPeriod} getFilterLabel={getFilterLabel}
                  hideFixedExpenses={hideFixedExpenses} setHideFixedExpenses={setHideFixedExpenses}
                  dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
                  chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy}
                  topXLimit={topXLimit} setTopXLimit={setTopXLimit}
                  categories={categories} dayTypeConfig={dayTypeConfig}
                  dayTypes={dayTypes}
                  enableSmartInsights={enableSmartInsights}
                />
              </motion.div>
            )}
            {activeTab === 'calendar' && (
              <motion.div key="calendar" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <CalendarView
                  transactions={transactions} filterPeriod={filterPeriod}
                  setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths}
                  handleOpenAddModal={handleOpenAddModal} categories={categories}
                  dayTypes={dayTypes}
                  handleDayTypeChange={handleDayTypeChange} dayTypeConfig={dayTypeConfig}
                  getFilterLabel={getFilterLabel} isReadOnlyView={isReadOnlyView}
                  onSaveTransaction={handleSaveTransaction}
                  handleDeleteTransaction={handleDeleteTransaction}
                  isLoading={isProcessing}
                  frequentItems={frequentItems}
                />
              </motion.div>
            )}
            {activeTab === 'ledger' && (
              <motion.div key="ledger" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <LedgerView
                  displayTransactions={displayTransactions} isReadOnlyView={isReadOnlyView}
                  setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths}
                  getFilterLabel={getFilterLabel} filterPeriod={filterPeriod}
                  searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                  handleOpenAddModal={handleOpenAddModal}
                  handleUpdateTransaction={handleUpdateTransaction}
                  handleDeleteTransaction={handleDeleteTransaction}
                  handleDeleteMonth={async (period) => {
                    const ok = await handleDeleteMonth(period);
                    if (ok) showSuccess();
                  }}
                  cashflowGroups={cashflowGroups}
                  categories={categories}
                  advancedFilterCategory={advancedFilterCategory} setAdvancedFilterCategory={setAdvancedFilterCategory}
                  advancedFilterGroup={advancedFilterGroup} setAdvancedFilterGroup={setAdvancedFilterGroup}
                  advancedFilterDate={advancedFilterDate} setAdvancedFilterDate={setAdvancedFilterDate}
                  typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                  minAmount={minAmount} setMinAmount={setMinAmount}
                  maxAmount={maxAmount} setMaxAmount={setMaxAmount}
                  dayTypeFilter={dayTypeFilter} setDayTypeFilter={setDayTypeFilter}
                  availableDatesInPeriod={availableDatesInPeriod}
                  allDatesInPeriod={allDatesInPeriod}
                  activeCashflowGroupIds={activeCashflowGroupIds}
                  isFilterActive={isFilterActive}
                  clearFilters={clearFilters}
                  dayTypes={dayTypes}
                  dayTypeConfig={dayTypeConfig}
                  isLoading={isProcessing}
                />
              </motion.div>
            )}
            {activeTab === 'settings' && (
              <motion.div key="settings" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <SettingsView
                  categories={categories}
                  cashflowGroups={cashflowGroups}
                  setCashflowGroups={setCashflowGroups}
                  handleAddCategory={handleAddCategory}
                  handleCategoryChange={handleCategoryChange}
                  handleDeleteCategory={handleDeleteCategory}
                  handleMoveCategory={handleMoveCategory}
                  handleAddCashflowGroup={handleAddCashflowGroup}
                  handleUpdateCashflowGroup={handleUpdateCashflowGroup}
                  handleDeleteCashflowGroup={handleDeleteCashflowGroup}
                  dayTypeConfig={dayTypeConfig}
                  handleDayTypeConfigChange={handleDayTypeConfigChange}
                  handleAddDayType={handleAddDayType}
                  handleDeleteDayType={handleDeleteDayType}
                  handleMoveDayType={handleMoveDayType}
                  handleDeleteAllData={() => handleDeleteAllData({ setShowToast: triggerToast })}
                  transactions={transactions}
                  enableSmartInsights={enableSmartInsights}
                  setEnableSmartInsights={setEnableSmartInsights}
                  triggerToast={triggerToast}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BatchAddModal
        isOpen={showAddModal} onClose={() => setShowAddModal(false)}
        onSaveBatch={handleSaveBatch} categories={categories}
        transactions={transactions} frequentItems={frequentItems}
        defaultDate={addForm.date} defaultType={addForm.type}
        defaultCategory={addForm.category}
      />
      <ImportPreviewModal
        importPreview={importPreview} setImportPreview={setImportPreview}
        confirmImport={() => confirmImport({ onSuccess: () => { showSuccess(); setActiveTab('ledger'); } })}
        isProcessing={isCsvProcessing} categories={categories}
      />
      <ImportGuideModal isOpen={showImportGuide} onClose={() => setShowImportGuide(false)} />
      <ExportModal
        isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        transactions={transactions} categories={categories}
        dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
        groupedOptions={groupedOptions}
        getFilterLabel={getFilterLabel} initialPeriod={filterPeriod}
      />

      <AppToast toast={toast} />
    </div>
  );
}