import React, { useEffect } from 'react';
import AppHeader from './AppHeader';
import AppToast from '../shared/AppToast';

// Context Hooks
import { useToast } from '../../context/ToastContext';
import { useAppUI } from '../../context/AppUIContext';
import { useAppData } from '../../context/AppDataContext';
import { useAppFilter } from '../../context/AppFilterContext';
import { localTodayIso } from '../../utils/payCycle';
import useJsonSetting from '../../hooks/useJsonSetting';

// View Components
import DashboardView from '../../views/Dashboard/index';
import CalendarView from '../../views/Calendar';
import LedgerView from '../../views/Ledger/index';
import SettingsView from '../../views/Settings';
import PortfolioView from '../../views/Portfolio';
import TaxView from '../../views/Tax';

// Modals
import BatchAddModal from '../modals/BatchAddModal/index';
import ExportModal from '../modals/ExportModal';
import ImportGuideModal from '../modals/ImportGuideModal';
import ImportPreviewModal from '../modals/ImportPreviewModal';

// ค่าเริ่มต้น = เปิด (ผู้ใช้เดิมไม่เสียแท็บ); ปิดเมื่อบันทึกเป็น false เท่านั้น
const parseEnabled = (raw: unknown) => raw !== false && raw !== 'false';

export default function MainLayout() {
  const { toast, showToast: triggerToast } = useToast();
  const [taxEnabled, updateTaxEnabled] = useJsonSetting('tax_enabled', parseEnabled);
  const [portfolioEnabled, updatePortfolioEnabled] = useJsonSetting('portfolio_enabled', parseEnabled);

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
    transactions, totalCount, categories, cashflowGroups, setCashflowGroups,
    dayTypes, dayTypeConfig, frequentItems,
    dbStatus, isProcessing, isCsvProcessing,
    importPreview, setImportPreview, fileInputRef,
    refreshData, handleSaveTransaction, handleUpdateTransaction,
    handleDeleteTransaction, handleDeleteAllData,
    handleSaveBatch, handleFileUpload, confirmImport,
    handleCategoryChange, handleDeleteCategory, handleAddCategory, handleMoveCategory,
    handleDayTypeChange, dayNotes, handleDayNoteChange, handleDayTypeConfigChange, handleAddDayType,
    handleDeleteDayType, handleMoveDayType,
    handleUpdateCashflowGroup, handleAddCashflowGroup,
    handleDeleteCashflowGroup, handleMoveCashflowGroup
  } = useAppData();

  const {
    filterPeriod, setFilterPeriod,
    groupedOptions, rawAvailableMonths, isReadOnlyView,
    searchQuery, setSearchQuery,
    isFilterActive, clearFilters,
    displayTransactions,
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

  // ปิดโหมดภาษีขณะเปิดแท็บภาษีค้างอยู่ (เช่น เปิดแอปใหม่) → กลับไปหน้าภาพรวม
  useEffect(() => {
    if ((!taxEnabled && activeTab === 'tax') || (!portfolioEnabled && activeTab === 'portfolio')) setActiveTab('insights');
  }, [taxEnabled, portfolioEnabled, activeTab, setActiveTab]);

  const showSuccess =() => { triggerToast('ทำรายการสำเร็จ!', 'success'); };

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300 dark-mode bg-canvas"
      style={{ fontFamily: "'Inter', 'Bai Jamjuree', sans-serif" }}
    >
      <div
        className="max-w-[98%] xl:max-w-[1400px] 2xl:max-w-[1600px] w-full mx-auto my-4 border-t-4 border-accent-ink shadow-xl rounded-none flex-grow flex flex-col overflow-y-auto no-scrollbar relative transition-colors duration-300 scroll-smooth bg-surface"
      >
        <AppHeader
          dbStatus={dbStatus}
          transactionCount={totalCount}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          taxEnabled={taxEnabled}
          portfolioEnabled={portfolioEnabled}
          filterPeriod={filterPeriod}
          setFilterPeriod={setFilterPeriod}
          groupedOptions={groupedOptions}
          categories={categories}
          isProcessing={isProcessing}
          onClickAddQuick={() => {
            setAddForm(prev => ({
              ...prev,
              type: 'expense',
              date: localTodayIso(),
              category: categories.find(c => c.type === 'expense')?.name || '',
              assetId: undefined,
              side: undefined,
            }));
            setShowAddModal(true);
          }}
          onClickExport={() => setShowExportModal(true)}
          onFileUpload={handleFileUpload}
          onClickImportGuide={() => setShowImportGuide(true)}
          fileInputRef={fileInputRef}
        />

        {/* No z-index here: it would make this wrapper a stacking context and trap the fixed modals rendered inside views (DayDetailModal, AssetsModal) beneath the z-60 header */}
        <div className="p-6 relative flex-grow bg-canvas">
          {activeTab === 'insights' && (
            <div key="insights">
              <DashboardView
                analytics={analytics}
                transactions={transactions}
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
                showPortfolio={portfolioEnabled}
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
                handleOpenAddModal={handleOpenAddModal}
                categories={categories}
                cashflowGroups={cashflowGroups}
                dayTypes={dayTypes}
                handleDayTypeChange={handleDayTypeChange}
                dayNotes={dayNotes}
                handleDayNoteChange={handleDayNoteChange}
                dayTypeConfig={dayTypeConfig}
                getFilterLabel={getFilterLabel}
                isReadOnlyView={isReadOnlyView}
                onSaveTransaction={handleSaveTransaction}
                handleDeleteTransaction={handleDeleteTransaction}
                isLoading={isProcessing}
                frequentItems={frequentItems}
                onSwitchToAnalysisMode={() => setActiveTab('insights')}
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

          {activeTab === 'portfolio' && portfolioEnabled && (
            <div key="portfolio">
              <PortfolioView />
            </div>
          )}

          {activeTab === 'tax' && taxEnabled && (
            <div key="tax">
              <TaxView />
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
                handleDeleteAllData={handleDeleteAllData}
                transactions={transactions}
                triggerToast={triggerToast}
                taxEnabled={taxEnabled}
                onTaxEnabledChange={(on) => { void updateTaxEnabled(() => on); }}
                portfolioEnabled={portfolioEnabled}
                onPortfolioEnabledChange={(on) => { void updatePortfolioEnabled(() => on); }}
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
        defaultAssetId={addForm.assetId}
        defaultSide={addForm.side}
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
        cashflowGroups={cashflowGroups}
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