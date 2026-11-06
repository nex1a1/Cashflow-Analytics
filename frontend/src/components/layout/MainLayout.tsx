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

// View Components: every tab and modal is its own chunk, so the first paint only parses what it shows. The chunks are
// fetched in the background once the app is idle — except views that are off (the Dashboard in Lite mode, Kakeibo in full
// mode, the Portfolio when switched off), so Lite never pulls in Chart.js.
const loaders = {
  dashboard: () => import('../../views/Dashboard/DashboardTab'),
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
const DashboardTab = lazy(loaders.dashboard);
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
/** หน้าภาพรวม: 'full' (Dashboard, ค่าเริ่มต้น) หรือ 'lite' (Kakeibo เป็นหน้าภาพรวม — Kakeibo มีเฉพาะโหมดนี้) */
const parseOverviewMode = (raw: unknown): 'full' | 'lite' => (raw === 'lite' ? 'lite' : 'full');

/** True from the first time `open` is true: a lazy modal loads on first use, then stays mounted (it keeps its state while closed, as before). */
function useOpenedOnce(open: boolean) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return opened || open;
}

export default function MainLayout() {
  const { toast, showToast: triggerToast } = useToast();
  const [portfolioEnabled, updatePortfolioEnabled] = useJsonSetting('portfolio_enabled', parseEnabled);
  const [overviewMode, updateOverviewMode, overviewModeReady] = useJsonSetting('overview_mode', parseOverviewMode);
  const lite = overviewMode === 'lite';

  const {
    activeTab, setActiveTab,
    showAddModal, setShowAddModal,
    showExportModal, setShowExportModal,
    showImportGuide, setShowImportGuide,
    addForm, setAddForm,
    handleOpenAddModal,
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
    handleDeleteCashflowGroup, handleMoveCashflowGroup,
    categoryShadeStrength, previewCategoryShade, saveCategoryShade,
  } = useAppData();

  const {
    filterPeriod, setFilterPeriod,
    groupedOptions, rawAvailableMonths, isReadOnlyView,
    searchQuery, setSearchQuery,
    isFilterActive, clearFilters,
    displayTransactions,
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

  // แท็บที่ไม่มีแล้วค้างใน storage (ภาษี, Kakeibo แยก — ตอนนี้ Kakeibo คือหน้าภาพรวมโหมด Lite) หรือปิดพอร์ตขณะเปิดอยู่ → กลับไปหน้าภาพรวม
  useEffect(() => {
    if (activeTab === 'tax' || activeTab === 'kakeibo' || (!portfolioEnabled && activeTab === 'portfolio')) setActiveTab('insights');
  }, [portfolioEnabled, activeTab, setActiveTab]);

  useEffect(() => {
    if (!overviewModeReady) return; // wait for the saved mode: Lite must not pull the Dashboard chunk
    const prefetch = () => Object.entries(loaders).forEach(([name, load]) => {
      if (name === (lite ? 'dashboard' : 'kakeibo') || (!portfolioEnabled && name === 'portfolio')) return; // views that are off
      void load().catch(() => {});
    });
    if (typeof requestIdleCallback === 'function') {
      const id = requestIdleCallback(prefetch, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 1000);
    return () => clearTimeout(id);
  }, [overviewModeReady, lite, portfolioEnabled]);

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
                {/* รอโหมดที่บันทึกไว้ก่อน: ไม่งั้นผู้ใช้ Lite เห็น (และโหลด) Dashboard แวบหนึ่ง */}
                {overviewModeReady && (lite
                  ? <KakeiboView isLoading={isProcessing} />
                  : <DashboardTab showPortfolio={portfolioEnabled} isLoading={isProcessing} />)}
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
                  liteOverview={lite}
                  onLiteOverviewChange={(on) => { void updateOverviewMode(() => (on ? 'lite' : 'full')); }}
                  shadeStrength={categoryShadeStrength}
                  onShadePreview={previewCategoryShade}
                  onShadeSave={saveCategoryShade}
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