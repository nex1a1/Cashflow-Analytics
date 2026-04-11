// src/App.jsx  (refactored)
// ─────────────────────────────────────────────────────────────
// App.jsx ทำหน้าที่เป็น "orchestrator" เท่านั้น:
//   - เชื่อม hooks เข้าหากัน
//   - render layout หลัก + views
//   - ไม่มี business logic / API call อยู่ในนี้โดยตรง
// ─────────────────────────────────────────────────────────────
import React, { useState, useEffect, useMemo } from 'react';
import {
  CATEGORIES_KEY, DAY_TYPE_CONFIG_KEY,
  DEFAULT_CATEGORIES, DEFAULT_DAY_TYPES,
} from './constants';
import { settingsService, calendarService } from './services/api';
import { getFilterLabel } from './utils/formatters';
import { defaults } from 'chart.js';

import useCategories from './hooks/useCategories';
import useAnalytics from './hooks/useAnalytics';
import useTransactionData from './hooks/useTransactionData';
import useImportCSV from './hooks/useImportCSV';
import useFilters from './hooks/useFilters';
import AppHeader from './components/AppHeader';
import AppToast from './components/AppToast';
import './styles/darkMode.css';
import SettingsView from './views/SettingsView';
import CalendarView from './views/CalendarView';
import LedgerView from './views/LedgerView';
import DashboardView from './views/Dashboard/index';
import BatchAddModal from './components/BatchAddModal';
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
defaults.font.family = 'Tahoma, sans-serif';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('expense_dark_mode') === 'true');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showToast, setShowToast] = useState(false);
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

  useEffect(() => {
    localStorage.setItem('expense_dark_mode', isDarkMode);
    
    if (isDarkMode) {
      document.body.style.backgroundColor = '#020617'; // bg-slate-950
      document.body.style.color = '#f1f5f9';
      document.documentElement.classList.add('dark');
    } else {
      document.body.style.backgroundColor = '#f1f5f9'; // bg-slate-100
      document.body.style.color = '#1e293b';
      document.documentElement.classList.remove('dark');
    }

    defaults.color = isDarkMode ? '#94a3b8' : '#475569';
    defaults.scale.grid.color = isDarkMode ? '#334155' : '#e2e8f0';
  }, [isDarkMode]);

  const saveSettingToDb = async (key, value) => {
    try { await settingsService.save(key, value); }
    catch (err) { console.error(`Failed to save ${key} to DB:`, err); }
  };

  const handleDayTypeChange = async (dateStr, type) => {
    setDayTypes(prev => ({ ...prev, [dateStr]: type }));
    try { await calendarService.save(dateStr, type); }
    catch (err) { console.error('Failed to save day type to DB:', err); }
  };

  const handleUpdateDayTypeConfig = (newConfig) => {
    setDayTypeConfig(newConfig);
    saveSettingToDb(DAY_TYPE_CONFIG_KEY, newConfig);
  };

  const {
    categories, setCategories,
    handleCategoryChange: _handleCategoryChange,
    handleAddCategory,
    handleDeleteCategory: _handleDeleteCategory,
    handleMoveCategory,
  } = useCategories(DEFAULT_CATEGORIES, saveSettingToDb);

  const handleCategoryChange = (catId, field, value) =>
    _handleCategoryChange(catId, field, value, transactions);
  const handleDeleteCategory = (id) =>
    _handleDeleteCategory(id, transactions);

  const {
    transactions, isProcessing: isTxProcessing,
    setIsProcessing: setTxProcessing,
    loadData, saveToDb,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
  } = useTransactionData({ setCategories, setDayTypes, setDayTypeConfig, setDbStatus, setCashflowGroups });

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

  const isProcessing = isTxProcessing || isCsvProcessing;

  useEffect(() => { loadData(); }, []);

  const showSuccess = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  // ── useFilters: filter state + all computed values ───────────
  const {
    filterPeriod, setFilterPeriod,
    groupedOptions, rawAvailableMonths, isReadOnlyView,
    searchQuery,            setSearchQuery,
    advancedFilterCategory, setAdvancedFilterCategory,
    advancedFilterGroup,    setAdvancedFilterGroup,
    advancedFilterDate,     setAdvancedFilterDate,
    availableDatesInPeriod,
    displayTransactions,
  } = useFilters({ transactions, categories });

  // ── analytics (exclude debt category) ───────────────────────
  const validAnalyticsTxs = useMemo(() =>
    transactions.filter(t => categories.find(c => c.name === t.category)?.cashflowGroup !== 'debt'),
  [transactions, categories]);

  const analytics = useAnalytics({
    transactions: validAnalyticsTxs, categories, filterPeriod,
    cashflowGroups, 
    hideFixedExpenses, dashboardCategory, chartGroupBy,
    topXLimit, dayTypes, dayTypeConfig, isDarkMode,
  });

  const handleOpenAddModal = (dateStr, type) => {
    const parts = dateStr.split('/');
    let formattedDate = new Date().toISOString().split('T')[0];
    if (parts.length === 3) formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
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
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + err.message);
    } finally {
      setTxProcessing(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${isDarkMode ? 'dark-mode' : ''}`}
      style={{ fontFamily: 'Tahoma, sans-serif' }}
    >
      <div className={`max-w-[98%] 2xl:max-w-screen-2xl w-full mx-auto my-4 border-t-4 border-[#00509E] shadow-xl rounded-xl pb-6 flex-grow flex flex-col overflow-hidden relative transition-colors duration-300 ${isDarkMode ? 'bg-slate-900' : 'bg-white'}`}>

        <AppHeader
          isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}
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

        <div className={`p-6 relative flex-grow overflow-y-auto custom-scrollbar transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50/50'}`}>
          {activeTab === 'dashboard' && (
            <DashboardView
              analytics={analytics} transactions={transactions}
              cashflowGroups={cashflowGroups}
              filterPeriod={filterPeriod} getFilterLabel={getFilterLabel}
              hideFixedExpenses={hideFixedExpenses} setHideFixedExpenses={setHideFixedExpenses}
              dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
              chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy}
              topXLimit={topXLimit} setTopXLimit={setTopXLimit}
              categories={categories} dayTypeConfig={dayTypeConfig}
              isDarkMode={isDarkMode} dayTypes={dayTypes}
            />
          )}
          {activeTab === 'calendar' && (
            <CalendarView
              transactions={transactions} filterPeriod={filterPeriod}
              setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths}
              handleOpenAddModal={handleOpenAddModal} categories={categories}
              isDarkMode={isDarkMode} dayTypes={dayTypes}
              handleDayTypeChange={handleDayTypeChange} dayTypeConfig={dayTypeConfig}
              getFilterLabel={getFilterLabel} isReadOnlyView={isReadOnlyView}
              onSaveTransaction={handleSaveTransaction}
              handleDeleteTransaction={handleDeleteTransaction}
            />
          )}
          {activeTab === 'ledger' && (
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
              categories={categories}
              advancedFilterCategory={advancedFilterCategory} setAdvancedFilterCategory={setAdvancedFilterCategory}
              advancedFilterGroup={advancedFilterGroup} setAdvancedFilterGroup={setAdvancedFilterGroup}
              advancedFilterDate={advancedFilterDate} setAdvancedFilterDate={setAdvancedFilterDate}
              availableDatesInPeriod={availableDatesInPeriod} isDarkMode={isDarkMode}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsView
              categories={categories}
              cashflowGroups={cashflowGroups}
              setCashflowGroups={setCashflowGroups}
              handleAddCategory={handleAddCategory}
              handleCategoryChange={handleCategoryChange}
              handleDeleteCategory={handleDeleteCategory}
              handleMoveCategory={handleMoveCategory}
              dayTypeConfig={dayTypeConfig}
              setDayTypeConfig={handleUpdateDayTypeConfig}
              isDarkMode={isDarkMode}
              handleDeleteAllData={() => handleDeleteAllData({ setShowToast })}
              saveSettingToDb={saveSettingToDb}
              transactions={transactions}
            />
          )}
        </div>
      </div>

      <BatchAddModal
        isOpen={showAddModal} onClose={() => setShowAddModal(false)}
        onSaveBatch={handleSaveBatch} categories={categories}
        transactions={transactions} isDarkMode={isDarkMode}
        defaultDate={addForm.date} defaultType={addForm.type}
        defaultCategory={addForm.category}
      />
      <ImportPreviewModal
        importPreview={importPreview} setImportPreview={setImportPreview}
        confirmImport={() => confirmImport({ onSuccess: () => { showSuccess(); setActiveTab('ledger'); } })}
        isProcessing={isCsvProcessing} isDarkMode={isDarkMode} categories={categories}
      />
      <ImportGuideModal isOpen={showImportGuide} onClose={() => setShowImportGuide(false)} isDarkMode={isDarkMode} />
      <ExportModal
        isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        transactions={transactions} categories={categories}
        dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
        isDarkMode={isDarkMode} groupedOptions={groupedOptions}
        getFilterLabel={getFilterLabel} initialPeriod={filterPeriod}
      />

      {/* ⭐️ เปลี่ยนมาใช้ AppToast ของแท้ที่เราแก้มากับมือ */}
      <AppToast 
        toast={{ visible: showToast, message: 'ทำรายการสำเร็จ!', type: 'success' }} 
        isDarkMode={isDarkMode} 
      />
    </div>
  );
}