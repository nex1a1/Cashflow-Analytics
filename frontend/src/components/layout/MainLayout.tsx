import React from 'react';
import AppHeader from './AppHeader';
import AppToast from '../shared/AppToast';

// Context Hooks
import { useToast } from '../../context/ToastContext';
import { useAppUI } from '../../context/AppUIContext';
import { useAppData } from '../../context/AppDataContext';
import { useAppFilter } from '../../context/AppFilterContext';

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

export default function MainLayout() {
  const { toast, showToast: triggerToast } = useToast();

  const {
    activeTab, setActiveTab,
    showAddModal, setShowAddModal,
    showExportModal, setShowExportModal,
    showImportGuide, setShowImportGuide,
    addForm, setAddForm,
    handleOpenAddModal,
    hideFixedExpenses, setHideFixedExpenses,
    hideWantExpenses, setHideWantExpenses,
    dashboardCategory, setDashboardCategory,
    chartGroupBy, setChartGroupBy,
    topXLimit, setTopXLimit,
  } = useAppUI();

  const {
    transactions, categories, cashflowGroups, setCashflowGroups,
    dayTypes, dayTypeConfig, frequentItems,
    dbStatus, isProcessing, isCsvProcessing,
    importPreview, setImportPreview, fileInputRef,
    refreshData, handleSaveTransaction, handleUpdateTransaction,
    handleDeleteTransaction, handleDeleteMonth, handleDeleteAllData,
    handleSaveBatch, handleFileUpload, confirmImport,
    handleCategoryChange, handleDeleteCategory, handleAddCategory, handleMoveCategory,
    handleDayTypeChange, handleDayTypeConfigChange, handleAddDayType,
    handleDeleteDayType, handleMoveDayType,
    handleUpdateCashflowGroup, handleAddCashflowGroup,
    handleDeleteCashflowGroup, handleMoveCashflowGroup
  } = useAppData();

  const {
    filterPeriod, setFilterPeriod,
    excludeFuture, handleToggleExcludeFuture,
    groupedOptions, rawAvailableMonths, isReadOnlyView,
    searchQuery, setSearchQuery,
    isFilterActive, clearFilters,
    displayTransactions, dashboardTransactions,
    analytics,
    allDatesInPeriod, availableDatesInPeriod,
    advancedFilterCategory, setAdvancedFilterCategory,
    advancedFilterGroup, setAdvancedFilterGroup,
    advancedFilterDate, setAdvancedFilterDate,
    typeFilter, setTypeFilter,
    allocationFilter, setAllocationFilter,
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    dayTypeFilter, setDayTypeFilter,
    activeCashflowGroupIds, activeCategoryNames,
    getFilterLabel
  } = useAppFilter();

  const showSuccess = () => { triggerToast('ทำรายการสำเร็จ!', 'success'); };

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300 dark-mode bg-[#181818]"
      style={{ fontFamily: "'Inter', 'Bai Jamjuree', sans-serif" }}
    >
      <div
        className="max-w-[98%] xl:max-w-[1400px] 2xl:max-w-[1600px] w-full mx-auto my-4 border-t-4 border-[#da291c] shadow-xl rounded-none flex-grow flex flex-col overflow-y-auto custom-scrollbar relative transition-colors duration-300 scroll-smooth bg-[#121212]"
        style={{ scrollbarGutter: 'stable' }}
      >
        <AppHeader
          dbStatus={dbStatus}
          transactionCount={transactions.length}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          filterPeriod={filterPeriod}
          setFilterPeriod={setFilterPeriod}
          groupedOptions={groupedOptions}
          categories={categories}
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
          excludeFuture={excludeFuture}
          onToggleExcludeFuture={handleToggleExcludeFuture}
        />

        <div className="p-6 relative z-0 flex-grow bg-[#181818]">
          {activeTab === 'dashboard' && (
            <div key="dashboard">
              <DashboardView
                analytics={analytics}
                transactions={dashboardTransactions}
                cashflowGroups={cashflowGroups}
                filterPeriod={filterPeriod}
                getFilterLabel={getFilterLabel}
                hideFixedExpenses={hideFixedExpenses}
                setHideFixedExpenses={setHideFixedExpenses}
                hideWantExpenses={hideWantExpenses}
                setHideWantExpenses={setHideWantExpenses}
                dashboardCategory={dashboardCategory}
                setDashboardCategory={setDashboardCategory}
                chartGroupBy={chartGroupBy}
                setChartGroupBy={setChartGroupBy}
                topXLimit={topXLimit}
                setTopXLimit={setTopXLimit}
                categories={categories}
                dayTypeConfig={dayTypeConfig}
                dayTypes={dayTypes}
                isLoading={isProcessing}
              />
            </div>
          )}

          {activeTab === 'calendar' && (
            <div key="calendar">
              <CalendarView
                transactions={transactions}
                filterPeriod={filterPeriod}
                setFilterPeriod={setFilterPeriod}
                rawAvailableMonths={rawAvailableMonths}
                handleOpenAddModal={handleOpenAddModal}
                categories={categories}
                cashflowGroups={cashflowGroups}
                dayTypes={dayTypes}
                handleDayTypeChange={handleDayTypeChange}
                dayTypeConfig={dayTypeConfig}
                getFilterLabel={getFilterLabel}
                isReadOnlyView={isReadOnlyView}
                onSaveTransaction={handleSaveTransaction}
                handleDeleteTransaction={handleDeleteTransaction}
                isLoading={isProcessing}
                frequentItems={frequentItems}
              />
            </div>
          )}

          {activeTab === 'ledger' && (
            <div key="ledger">
              <LedgerView
                displayTransactions={displayTransactions}
                isReadOnlyView={isReadOnlyView}
                getFilterLabel={getFilterLabel}
                setFilterPeriod={setFilterPeriod}
                rawAvailableMonths={rawAvailableMonths}
                filterPeriod={filterPeriod}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                handleOpenAddModal={handleOpenAddModal}
                handleUpdateTransaction={handleUpdateTransaction}
                handleDeleteTransaction={handleDeleteTransaction}
                handleDeleteMonth={async (period: string) => {
                  const ok = await handleDeleteMonth(period);
                  if (ok) showSuccess();
                }}
                cashflowGroups={cashflowGroups}
                categories={categories}
                advancedFilterCategory={advancedFilterCategory}
                setAdvancedFilterCategory={setAdvancedFilterCategory}
                advancedFilterGroup={advancedFilterGroup}
                setAdvancedFilterGroup={setAdvancedFilterGroup}
                advancedFilterDate={advancedFilterDate}
                setAdvancedFilterDate={setAdvancedFilterDate}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                allocationFilter={allocationFilter}
                setAllocationFilter={setAllocationFilter}
                minAmount={minAmount}
                setMinAmount={setMinAmount}
                maxAmount={maxAmount}
                setMaxAmount={setMaxAmount}
                dayTypeFilter={dayTypeFilter}
                setDayTypeFilter={setDayTypeFilter}
                availableDatesInPeriod={availableDatesInPeriod}
                allDatesInPeriod={allDatesInPeriod}
                activeCashflowGroupIds={activeCashflowGroupIds}
                activeCategoryNames={activeCategoryNames}
                isFilterActive={isFilterActive}
                clearFilters={clearFilters}
                dayTypes={dayTypes}
                dayTypeConfig={dayTypeConfig}
                isLoading={isProcessing}
                transactions={transactions}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div key="settings">
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
                handleMoveCashflowGroup={handleMoveCashflowGroup}
                dayTypeConfig={dayTypeConfig}
                handleDayTypeConfigChange={handleDayTypeConfigChange}
                handleAddDayType={handleAddDayType}
                handleDeleteDayType={handleDeleteDayType}
                handleMoveDayType={handleMoveDayType}
                handleDeleteAllData={() => handleDeleteAllData({ setShowToast: triggerToast })}
                transactions={transactions}
                triggerToast={triggerToast}
              />
            </div>
          )}
        </div>
      </div>

      <BatchAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaveBatch={handleSaveBatch}
        categories={categories}
        frequentItems={frequentItems}
        defaultDate={addForm.date}
        defaultType={addForm.type}
        defaultCategory={addForm.category}
        dayTypes={dayTypes}
        dayTypeConfig={dayTypeConfig}
        cashflowGroups={cashflowGroups}
      />
      <ImportPreviewModal
        importPreview={importPreview}
        setImportPreview={setImportPreview}
        confirmImport={() =>
          confirmImport({
            onSuccess: () => {
              refreshData();
              showSuccess();
              setActiveTab('ledger');
            }
          })
        }
        isProcessing={isCsvProcessing}
        categories={categories}
      />
      <ImportGuideModal isOpen={showImportGuide} onClose={() => setShowImportGuide(false)} />
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        transactions={transactions}
        categories={categories}
        dayTypes={dayTypes}
        dayTypeConfig={dayTypeConfig}
        groupedOptions={groupedOptions}
        getFilterLabel={getFilterLabel}
        initialPeriod={filterPeriod}
      />

      <AppToast toast={toast} />
    </div>
  );
}