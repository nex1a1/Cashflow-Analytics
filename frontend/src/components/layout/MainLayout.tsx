import { lazy, Suspense, useEffect, useState } from 'react';
import AppHeader from './AppHeader';
import AppToast from '../shared/AppToast';

// Context Hooks
import { useToast } from '../../context/ToastContext';
import { useAppUI } from '../../context/AppUIContext';
import { useAppData } from '../../context/AppDataContext';
import { useAppFilter } from '../../context/AppFilterContext';
import { localTodayIso } from '../../utils/payCycle';
import { periodRowsLoaded } from '../../utils/dateHelpers';
import useJsonSetting from '../../hooks/useJsonSetting';

// View Components: the dashboard is the start tab and stays in the main bundle; every other tab and modal is its own
// chunk, so the first paint only parses what it shows. The chunks are fetched in the background once the app is idle.
import DashboardView from '../../views/Dashboard/index';
const loaders = {
  calendar: () => import('../../views/Calendar'),
  ledger: () => import('../../views/Ledger/index'),
  settings: () => import('../../views/Settings'),
  portfolio: () => import('../../views/Portfolio'),
  kakeibo: () => import('../../views/Kakeibo'),
  batchAdd: () => import('../modals/BatchAddModal/index'),
  export: () => import('../modals/ExportModal'),
  importGuide: () => import('../modals/ImportGuideModal'),
  importPreview: () => import('../modals/ImportPreviewModal'),
};
const CalendarView = lazy(loaders.calendar);
const LedgerView = lazy(loaders.ledger);
const SettingsView = lazy(loaders.settings);
const PortfolioView = lazy(loaders.portfolio);
const KakeiboView = lazy(loaders.kakeibo);
const BatchAddModal = lazy(loaders.batchAdd);
const ExportModal = lazy(loaders.export);
const ImportGuideModal = lazy(loaders.importGuide);
const ImportPreviewModal = lazy(loaders.importPreview);

// ค่าเริ่มต้น = เปิด (ผู้ใช้เดิมไม่เสียแท็บ); ปิดเมื่อบันทึกเป็น false เท่านั้น
const parseEnabled = (raw: unknown) => raw !== false && raw !== 'false';

/** True from the first time `open` is true: a lazy modal loads on first use, then stays mounted (it keeps its state while closed, as before). */
function useOpenedOnce(open: boolean) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

export default function MainLayout() {
  const { toast, showToast: triggerToast } = useToast();
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
    rowsRange, refreshData, handleSaveTransaction, handleUpdateTransaction,
    handleDeleteTransaction, handleMoveTransactions, handleDeleteAllData,
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

  // ปิดพอร์ตขณะเปิดแท็บพอร์ตค้างอยู่ (หรือแท็บภาษีที่ถูกตัดออกค้างใน storage) → กลับไปหน้าภาพรวม
  useEffect(() => {
    if (activeTab === 'tax' || (!portfolioEnabled && activeTab === 'portfolio')) setActiveTab('insights');
  }, [portfolioEnabled, activeTab, setActiveTab]);

  useEffect(() => {
    const prefetch = () => Object.values(loaders).forEach(load => { void load().catch(() => {}); });
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 1000);
    return () => clearTimeout(id);
  }, []);

  const addOpened = useOpenedOnce(showAddModal);
  const exportOpened = useOpenedOnce(showExportModal);
  const guideOpened = useOpenedOnce(showImportGuide);
  const previewOpened = useOpenedOnce(importPreview != null);

  // going forward the new month isn't loaded yet (only 3 back are): Calendar shows cell skeletons instead of empty days
  const calendarRowsPending = !periodRowsLoaded(rowsRange, filterPeriod);

  const showSuccess =() => { triggerToast('ทำรายการสำเร็จ!', 'success'); };

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-300 dark-mode bg-canvas"
      style={{ fontFamily: "'Inter', 'Bai Jamjuree', sans-serif" }}
    >
      <div
        className="max-w-[98%] xl:max-w-[1400px] 2xl:max-w-[1600px] w-full mx-auto my-4 border-t-4 border-accent-ink shadow-xl rounded-none grow flex flex-col overflow-y-auto no-scrollbar relative transition-colors duration-300 scroll-smooth bg-surface"
      >
        <AppHeader
          dbStatus={dbStatus}
          transactionCount={totalCount}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          portfolioEnabled={portfolioEnabled}
          filterPeriod={filterPeriod}
          setFilterPeriod={setFilterPeriod}
          groupedOptions={groupedOptions}
          categories={categories}
          isProcessing={isCsvProcessing}
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
        <div className="tab-stage p-6 relative grow bg-canvas">
          <Suspense fallback={null}>
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
                  rowsPending={calendarRowsPending}
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
                  handleMoveTransactions={handleMoveTransactions}
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

            {activeTab === 'kakeibo' && (
              <div key="kakeibo">
                <KakeiboView isLoading={isProcessing} />
              </div>
            )}

            {activeTab === 'portfolio' && portfolioEnabled && (
              <div key="portfolio">
                <PortfolioView />
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
                  portfolioEnabled={portfolioEnabled}
                  onPortfolioEnabledChange={(on) => { void updatePortfolioEnabled(() => on); }}
                />
              </div>
            )}
          </Suspense>
        </div>
      </div>

      {/* One boundary per modal: a modal that is still loading must not hide another one */}
      {addOpened && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      {previewOpened && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}
      {guideOpened && (
        <Suspense fallback={null}>
          <ImportGuideModal isOpen={showImportGuide} onClose={() => setShowImportGuide(false)} />
        </Suspense>
      )}
      {exportOpened && (
        <Suspense fallback={null}>
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
        </Suspense>
      )}

      <AppToast toast={toast} />
    </div>
  );
}