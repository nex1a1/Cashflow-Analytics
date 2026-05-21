import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppHeader from './AppHeader';
import AppToast from '../shared/AppToast';

// View Components
import DashboardView from '../../views/Dashboard/index';
import CalendarView from '../../views/Calendar';
import LedgerView from '../../views/Ledger/index';
import SettingsView from '../../views/Settings';

// Modals
import BatchAddModal from '../modals/BatchAddModal/index';
import ExportModal from '../modals/ExportModal';
import ImportGuideModal from '../modals/ImportGuideModal';
import ImportPreviewModal from '../modals/ImportPreviewModal';

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -10 }
};

const pageTransition = { type: 'tween', ease: 'anticipate', duration: 0.3 };

export default function MainLayout({ controller }) {
  const isDarkMode = true;
  const {
    activeTab, setActiveTab,
    dbStatus, isProcessing,
    transactions, categories, cashflowGroups,
    dayTypes, dayTypeConfig,
    filterPeriod, setFilterPeriod,
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
    analytics,
    summaryData,
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
    
    // Handlers
    getFilterLabel,
    handleDayTypeChange,
    handleDayTypeConfigChange,
    handleAddDayType,
    handleDeleteDayType,
    handleMoveDayType,
    handleCategoryChange,
    handleDeleteCategory,
    handleAddCategory,
    handleMoveCategory,
    handleUpdateCashflowGroup,
    handleAddCashflowGroup,
    handleDeleteCashflowGroup,
    handleSaveTransaction,
    handleUpdateTransaction,
    handleDeleteTransaction,
    handleDeleteMonth,
    handleDeleteAllData,
    handleOpenAddModal,
    handleSaveBatch,
    handleFileUpload,
    confirmImport,
    toast,
    triggerToast
  } = controller;

  const showSuccess = () => { triggerToast('ทำรายการสำเร็จ!', 'success'); };

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-300 ${isDarkMode ? 'dark-mode bg-slate-950' : 'bg-slate-100'}`}
      style={{ fontFamily: "'Inter', 'IBM Plex Sans Thai Looped', sans-serif" }}
    >
      <div className={`max-w-[98%] xl:max-w-[1400px] 2xl:max-w-[1600px] w-full mx-auto my-4 border-t-4 border-[#00509E] shadow-xl rounded-xl flex-grow flex flex-col overflow-y-auto custom-scrollbar relative transition-colors duration-300 scroll-smooth ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`} style={{ scrollbarGutter: 'stable' }}>

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

        <div className={`p-6 relative z-0 flex-grow transition-colors duration-300 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100/60'}`}>
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div key="dashboard" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <DashboardView
                  analytics={analytics} transactions={transactions}
                  cashflowGroups={cashflowGroups}
                  filterPeriod={filterPeriod}
                  getFilterLabel={getFilterLabel}
                  hideFixedExpenses={hideFixedExpenses} setHideFixedExpenses={setHideFixedExpenses}
                  dashboardCategory={dashboardCategory} setDashboardCategory={setDashboardCategory}
                  chartGroupBy={chartGroupBy} setChartGroupBy={setChartGroupBy}
                  topXLimit={topXLimit} setTopXLimit={setTopXLimit}
                  categories={categories} dayTypeConfig={dayTypeConfig}
                  dayTypes={dayTypes}
                  enableSmartInsights={enableSmartInsights}
                  isLoading={isProcessing}
                />
              </motion.div>
            )}
            {activeTab === 'calendar' && (
              <motion.div key="calendar" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <CalendarView
                  transactions={transactions} filterPeriod={filterPeriod}
                  setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths}
                  handleOpenAddModal={handleOpenAddModal} categories={categories}
                  cashflowGroups={cashflowGroups}
                  dayTypes={dayTypes}
                  handleDayTypeChange={handleDayTypeChange} dayTypeConfig={dayTypeConfig}
                  getFilterLabel={getFilterLabel}
                  isReadOnlyView={isReadOnlyView}
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
                  getFilterLabel={getFilterLabel}
                  setFilterPeriod={setFilterPeriod} rawAvailableMonths={rawAvailableMonths}
                  filterPeriod={filterPeriod}
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
                  allocationFilter={allocationFilter} setAllocationFilter={setAllocationFilter}
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
                  setCashflowGroups={controller.setCashflowGroups}
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
        confirmImport={() => confirmImport({ 
          onSuccess: () => { 
            refreshData();
            showSuccess(); 
            setActiveTab('ledger'); 
          } 
        })}
        isProcessing={controller.isCsvProcessing} categories={categories}
      />
      <ImportGuideModal isOpen={showImportGuide} onClose={() => setShowImportGuide(false)} />
      <ExportModal
        isOpen={showExportModal} onClose={() => setShowExportModal(false)}
        transactions={transactions} categories={categories}
        dayTypes={dayTypes} dayTypeConfig={dayTypeConfig}
        groupedOptions={groupedOptions}
        getFilterLabel={getFilterLabel}
        initialPeriod={filterPeriod}
      />

      <AppToast toast={toast} />
    </div>
  );
}