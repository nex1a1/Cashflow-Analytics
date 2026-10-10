// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import MainLayout from '../MainLayout';
import '@/test-utils/dom'; // enables React's act() environment

// MainLayout is the one place that connects the contexts to the views and modals, so this checks the wiring only:
// every child is a stub that records the props it was given, and the three contexts are plain holders.
const h = vi.hoisted(() => {
  const state = {
    props: {} as Record<string, any>,
    ui: {} as Record<string, any>,
    data: {} as Record<string, any>,
    filter: {} as Record<string, any>,
    toast: { toast: null as unknown, showToast: null as unknown as (...a: unknown[]) => void },
    /** the two on/off settings (tax_enabled, portfolio_enabled): current values, the parsers MainLayout gave, and every update it asked for */
    flags: {} as Record<string, boolean>,
    parsers: {} as Record<string, (raw: unknown) => unknown>,
    updates: [] as [string, unknown][],
  };
  /** Factory for a module whose default export is a component that records its props and renders a marker. */
  const stub = (name: string) => async () => {
    const React = await import('react');
    return { default: (p: Record<string, unknown>) => { state.props[name] = p; return React.createElement('div', { 'data-stub': name }); } };
  };
  return Object.assign(state, { stub });
});

vi.mock('@/context/ToastContext', () => ({ useToast: () => h.toast }));
vi.mock('@/context/AppUIContext', () => ({ useAppUI: () => h.ui }));
vi.mock('@/context/AppDataContext', () => ({ useAppData: () => h.data }));
vi.mock('@/context/AppFilterContext', () => ({ useAppFilter: () => h.filter }));

vi.mock('@/hooks/useJsonSetting', () => ({
  default: (key: string, parse: (raw: unknown) => unknown) => {
    h.parsers[key] = parse;
    return [key in h.flags ? h.flags[key] : parse(undefined), (change: (cur: unknown) => unknown) => { h.updates.push([key, change(key in h.flags ? h.flags[key] : true)]); return Promise.resolve(true); }];
  },
}));
vi.mock('@/components/layout/AppHeader', h.stub('AppHeader'));
vi.mock('@/components/shared/AppToast', h.stub('AppToast'));
vi.mock('@/views/Dashboard/index', h.stub('Dashboard'));
vi.mock('@/views/Calendar', h.stub('Calendar'));
vi.mock('@/views/Ledger/index', h.stub('Ledger'));
vi.mock('@/views/Settings', h.stub('Settings'));
vi.mock('@/views/Portfolio', h.stub('Portfolio'));
vi.mock('@/views/Tax', h.stub('Tax'));
vi.mock('@/components/modals/BatchAddModal/index', h.stub('BatchAddModal'));
vi.mock('@/components/modals/ExportModal', h.stub('ExportModal'));
vi.mock('@/components/modals/ImportGuideModal', h.stub('ImportGuideModal'));
vi.mock('@/components/modals/ImportPreviewModal', h.stub('ImportPreviewModal'));

const groups = [{ id: 'g1', name: 'กลุ่มทดสอบ', type: 'expense' }];
const categories = [
  { id: 'c-inc', name: 'เงินเดือน', type: 'income' },
  { id: 'c-food', name: 'ค่ากิน', type: 'expense' },
];
const dayTypes = { '2026-10-07': 'dt-hol' };
const dayTypeConfig = [{ id: 'dt-work', name: 'workday', label: 'วันทำงาน', color: '#10B981' }];
const transactions = [{ id: 't1', date: '2026-10-07', category: 'ค่ากิน', amount: 50 }];
const groupedOptions = { yearsMap: { 2026: ['2026-10'] }, sortedYears: [2026] };
const getFilterLabel = () => 'ต.ค. 2026';

/** Every data function the layout forwards is a distinct spy, so a swapped pair is detectable. */
const fn = () => vi.fn();
const dataFns = [
  'setCashflowGroups', 'refreshData', 'setImportPreview', 'handleSaveTransaction', 'handleUpdateTransaction', 'handleDeleteTransaction',
  'handleDeleteAllData', 'handleSaveBatch', 'handleFileUpload', 'confirmImport', 'handleCategoryChange', 'handleDeleteCategory',
  'handleAddCategory', 'handleMoveCategory', 'handleDayTypeChange', 'handleDayNoteChange', 'handleDayTypeConfigChange', 'handleAddDayType',
  'handleDeleteDayType', 'handleMoveDayType', 'handleUpdateCashflowGroup', 'handleAddCashflowGroup', 'handleDeleteCashflowGroup', 'handleMoveCashflowGroup',
];
const uiFns = [
  'setActiveTab', 'setShowAddModal', 'setShowExportModal', 'setShowImportGuide', 'setAddForm', 'handleOpenAddModal', 'setHideFixedExpenses',
  'setHideWantExpenses', 'setDashboardCategory', 'setChartGroupBy', 'setTopXLimit',
];
const filterFns = [
  'setFilterPeriod', 'setSearchQuery', 'clearFilters', 'setAdvancedFilterCategory', 'setAdvancedFilterGroup', 'setAdvancedFilterDate', 'setTypeFilter',
  'setAllocationFilter', 'setMinAmount', 'setMaxAmount', 'setDayTypeFilter',
];

function reset(tab = 'insights') {
  h.props = {};
  h.flags = {};
  h.updates = [];
  h.toast = { toast: { show: true, message: 'x' }, showToast: vi.fn() };
  h.ui = {
    activeTab: tab, showAddModal: false, showExportModal: false, showImportGuide: false,
    addForm: { type: 'savings', date: '2026-10-09', category: 'c-food', assetId: 'a1', side: 'sell' },
    hideFixedExpenses: true, hideWantExpenses: false, dashboardCategory: 'c-food', chartGroupBy: 'week', topXLimit: 7,
    ...Object.fromEntries(uiFns.map(k => [k, fn()])),
  };
  h.data = {
    transactions, totalCount: 321, categories, cashflowGroups: groups, dayTypes, dayTypeConfig, frequentItems: [{ categoryId: 'c-food' }],
    dbStatus: 'online', isProcessing: true, isCsvProcessing: true, importPreview: { rows: [1] }, fileInputRef: { current: null }, dayNotes: { '2026-10-07': { text: 'n', icon: '' } },
    ...Object.fromEntries(dataFns.map(k => [k, fn()])),
  };
  h.filter = {
    filterPeriod: '2026-10', groupedOptions, rawAvailableMonths: ['2026-10'], isReadOnlyView: true, searchQuery: 'กาแฟ', isFilterActive: true,
    displayTransactions: [{ id: 'd1' }], analytics: { total: 1 }, allDatesInPeriod: ['2026-10-07'], availableDatesInPeriod: ['2026-10-07'],
    advancedFilterCategory: 'ALL', advancedFilterGroup: 'g1', advancedFilterDate: 'ALL', typeFilter: 'expense', allocationFilter: 'need',
    minAmount: '1', maxAmount: '9', dayTypeFilter: 'WEEKEND', activeCashflowGroupIds: ['g1'], activeCategoryNames: ['ค่ากิน'], getFilterLabel,
    ...Object.fromEntries(filterFns.map(k => [k, fn()])),
  };
}

let root: Root | null = null;
let container: HTMLElement | null = null;
const mount = () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<MainLayout />));
};
const shown = () => [...document.querySelectorAll('[data-stub]')].map(e => e.getAttribute('data-stub'));

beforeEach(() => reset());
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
});

describe('MainLayout — which view is shown', () => {
  it.each([
    ['insights', 'Dashboard'], ['calendar', 'Calendar'], ['ledger', 'Ledger'], ['portfolio', 'Portfolio'], ['tax', 'Tax'], ['settings', 'Settings'],
  ])('tab "%s" shows only %s (plus the header, the modals and the toast)', (tab, view) => {
    reset(tab);
    mount();
    const views = ['Dashboard', 'Calendar', 'Ledger', 'Portfolio', 'Tax', 'Settings'];
    expect(shown().filter(s => views.includes(s!))).toEqual([view]);
    expect(shown()).toEqual(expect.arrayContaining(['AppHeader', 'AppToast', 'BatchAddModal', 'ImportPreviewModal', 'ImportGuideModal', 'ExportModal']));
  });

  it('an unknown tab shows no view at all', () => {
    reset('nonsense');
    mount();
    expect(shown().filter(s => ['Dashboard', 'Calendar', 'Ledger', 'Portfolio', 'Tax', 'Settings'].includes(s!))).toEqual([]);
  });
});

describe('MainLayout — header', () => {
  it('is given the connection, count, tab, period, categories and the saving flag', () => {
    mount();
    expect(h.props.AppHeader).toMatchObject({
      dbStatus: 'online', transactionCount: 321, activeTab: 'insights', filterPeriod: '2026-10', groupedOptions, categories, isProcessing: true,
      setActiveTab: h.ui.setActiveTab, setFilterPeriod: h.filter.setFilterPeriod, onFileUpload: h.data.handleFileUpload, fileInputRef: h.data.fileInputRef,
    });
  });

  it('"export", "import guide" open their own modal', () => {
    mount();
    act(() => h.props.AppHeader.onClickExport());
    expect(h.ui.setShowExportModal).toHaveBeenCalledWith(true);
    act(() => h.props.AppHeader.onClickImportGuide());
    expect(h.ui.setShowImportGuide).toHaveBeenCalledWith(true);
    expect(h.ui.setShowAddModal).not.toHaveBeenCalled();
  });

  it('the quick-add button opens the add modal on an expense dated today, with the first expense category and no asset', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0));
    mount();
    act(() => h.props.AppHeader.onClickAddQuick());
    expect(h.ui.setShowAddModal).toHaveBeenCalledWith(true);
    const updater = h.ui.setAddForm.mock.calls[0][0] as (p: Record<string, unknown>) => Record<string, unknown>;
    expect(updater({ type: 'savings', date: '1999-01-01', category: 'x', assetId: 'a1', side: 'sell', keep: 'me' })).toEqual({
      type: 'expense', date: '2026-03-04', category: 'ค่ากิน', assetId: undefined, side: undefined, keep: 'me',
    });
    vi.useRealTimers();
  });

  it('quick-add with no expense category leaves the category empty', () => {
    h.data.categories = [categories[0]];
    mount();
    act(() => h.props.AppHeader.onClickAddQuick());
    const updater = h.ui.setAddForm.mock.calls[0][0] as (p: Record<string, unknown>) => Record<string, unknown>;
    expect(updater({}).category).toBe('');
  });
});

describe('MainLayout — what each view is given', () => {
  it('the dashboard gets the analytics, the period data and its own toggles', () => {
    mount();
    expect(h.props.Dashboard).toMatchObject({
      analytics: h.filter.analytics, transactions, cashflowGroups: groups, filterPeriod: '2026-10', getFilterLabel, categories, dayTypeConfig, dayTypes, isLoading: true,
      hideFixedExpenses: true, hideWantExpenses: false, dashboardCategory: 'c-food', chartGroupBy: 'week', topXLimit: 7,
      setHideFixedExpenses: h.ui.setHideFixedExpenses, setHideWantExpenses: h.ui.setHideWantExpenses, setDashboardCategory: h.ui.setDashboardCategory,
      setChartGroupBy: h.ui.setChartGroupBy, setTopXLimit: h.ui.setTopXLimit,
    });
  });

  it('the calendar gets the day data, the handlers, and can switch back to the dashboard', () => {
    reset('calendar');
    mount();
    expect(h.props.Calendar).toMatchObject({
      transactions, filterPeriod: '2026-10', setFilterPeriod: h.filter.setFilterPeriod, handleOpenAddModal: h.ui.handleOpenAddModal, categories, cashflowGroups: groups,
      dayTypes, handleDayTypeChange: h.data.handleDayTypeChange, dayNotes: h.data.dayNotes, handleDayNoteChange: h.data.handleDayNoteChange, dayTypeConfig, getFilterLabel,
      isReadOnlyView: true, onSaveTransaction: h.data.handleSaveTransaction, handleDeleteTransaction: h.data.handleDeleteTransaction, isLoading: true,
      frequentItems: h.data.frequentItems,
    });
    act(() => h.props.Calendar.onSwitchToAnalysisMode());
    expect(h.ui.setActiveTab).toHaveBeenCalledWith('insights');
  });

  it('the ledger gets the filtered rows, every filter with its setter, and the whole period', () => {
    reset('ledger');
    mount();
    expect(h.props.Ledger).toMatchObject({
      displayTransactions: h.filter.displayTransactions, isReadOnlyView: true, getFilterLabel, setFilterPeriod: h.filter.setFilterPeriod, rawAvailableMonths: ['2026-10'],
      filterPeriod: '2026-10', searchQuery: 'กาแฟ', setSearchQuery: h.filter.setSearchQuery, handleOpenAddModal: h.ui.handleOpenAddModal,
      handleUpdateTransaction: h.data.handleUpdateTransaction, handleDeleteTransaction: h.data.handleDeleteTransaction, cashflowGroups: groups, categories,
      advancedFilterCategory: 'ALL', setAdvancedFilterCategory: h.filter.setAdvancedFilterCategory, advancedFilterGroup: 'g1', setAdvancedFilterGroup: h.filter.setAdvancedFilterGroup,
      advancedFilterDate: 'ALL', setAdvancedFilterDate: h.filter.setAdvancedFilterDate, typeFilter: 'expense', setTypeFilter: h.filter.setTypeFilter,
      allocationFilter: 'need', setAllocationFilter: h.filter.setAllocationFilter, minAmount: '1', setMinAmount: h.filter.setMinAmount, maxAmount: '9', setMaxAmount: h.filter.setMaxAmount,
      dayTypeFilter: 'WEEKEND', setDayTypeFilter: h.filter.setDayTypeFilter, availableDatesInPeriod: ['2026-10-07'], allDatesInPeriod: ['2026-10-07'],
      activeCashflowGroupIds: ['g1'], activeCategoryNames: ['ค่ากิน'], isFilterActive: true, clearFilters: h.filter.clearFilters, dayTypes, dayTypeConfig, isLoading: true, transactions,
    });
  });

  it('settings gets every category, group and day-type handler, and "delete all" goes straight to the data handler', () => {
    reset('settings');
    mount();
    expect(h.props.Settings).toMatchObject({
      categories, cashflowGroups: groups, setCashflowGroups: h.data.setCashflowGroups, handleAddCategory: h.data.handleAddCategory, handleCategoryChange: h.data.handleCategoryChange,
      handleDeleteCategory: h.data.handleDeleteCategory, handleMoveCategory: h.data.handleMoveCategory, handleAddCashflowGroup: h.data.handleAddCashflowGroup,
      handleUpdateCashflowGroup: h.data.handleUpdateCashflowGroup, handleDeleteCashflowGroup: h.data.handleDeleteCashflowGroup, handleMoveCashflowGroup: h.data.handleMoveCashflowGroup,
      dayTypeConfig, handleDayTypeConfigChange: h.data.handleDayTypeConfigChange, handleAddDayType: h.data.handleAddDayType, handleDeleteDayType: h.data.handleDeleteDayType,
      handleMoveDayType: h.data.handleMoveDayType, transactions, triggerToast: h.toast.showToast,
    });
    expect(h.props.Settings.handleDeleteAllData).toBe(h.data.handleDeleteAllData);
  });

  it('the toast is the one from the toast context', () => {
    mount();
    expect(h.props.AppToast).toEqual({ toast: h.toast.toast });
  });
});

describe('MainLayout — modals', () => {
  it('the add modal opens on the form the UI context prepared, and closes through the context', () => {
    h.ui.showAddModal = true;
    mount();
    expect(h.props.BatchAddModal).toMatchObject({
      isOpen: true, onSaveBatch: h.data.handleSaveBatch, categories, frequentItems: h.data.frequentItems, defaultDate: '2026-10-09', defaultType: 'savings',
      defaultCategory: 'c-food', defaultAssetId: 'a1', defaultSide: 'sell', dayTypes, dayTypeConfig, cashflowGroups: groups,
    });
    h.props.BatchAddModal.onClose();
    expect(h.ui.setShowAddModal).toHaveBeenCalledWith(false);
  });

  it('the export modal gets the data it writes into the file — including the groups — and the period it starts on', () => {
    h.ui.showExportModal = true;
    mount();
    expect(h.props.ExportModal).toMatchObject({
      isOpen: true, transactions, categories, cashflowGroups: groups, dayTypes, dayTypeConfig, groupedOptions, getFilterLabel, initialPeriod: '2026-10',
    });
    h.props.ExportModal.onClose();
    expect(h.ui.setShowExportModal).toHaveBeenCalledWith(false);
  });

  it('the import guide opens from its flag and closes through the context', () => {
    h.ui.showImportGuide = true;
    mount();
    expect(h.props.ImportGuideModal.isOpen).toBe(true);
    h.props.ImportGuideModal.onClose();
    expect(h.ui.setShowImportGuide).toHaveBeenCalledWith(false);
  });

  it('every modal is closed while its flag is off', () => {
    mount();
    expect(h.props.BatchAddModal.isOpen).toBe(false);
    expect(h.props.ExportModal.isOpen).toBe(false);
    expect(h.props.ImportGuideModal.isOpen).toBe(false);
  });

  it('the import preview gets the pending file and the CSV saving flag', () => {
    mount();
    expect(h.props.ImportPreviewModal).toMatchObject({ importPreview: h.data.importPreview, setImportPreview: h.data.setImportPreview, isProcessing: true, categories });
  });

  it('confirming an import refreshes, announces success and jumps to the ledger — only once the import succeeded', () => {
    mount();
    h.props.ImportPreviewModal.confirmImport();
    expect(h.data.confirmImport).toHaveBeenCalledTimes(1);
    expect(h.data.refreshData).not.toHaveBeenCalled(); // nothing yet: the import has not reported success
    expect(h.ui.setActiveTab).not.toHaveBeenCalled();

    const { onSuccess } = h.data.confirmImport.mock.calls[0][0];
    onSuccess();
    expect(h.data.refreshData).toHaveBeenCalledTimes(1);
    expect(h.toast.showToast).toHaveBeenCalledWith('ทำรายการสำเร็จ!', 'success');
    expect(h.ui.setActiveTab).toHaveBeenCalledWith('ledger');
  });
});

describe('MainLayout — one source of groups', () => {
  it('everything that draws or writes groups is given the same list', () => {
    const withGroups: Array<[string, string]> = [['insights', 'Dashboard'], ['calendar', 'Calendar'], ['ledger', 'Ledger'], ['settings', 'Settings']];
    for (const [tab, view] of withGroups) {
      reset(tab);
      mount();
      expect(h.props[view].cashflowGroups, view).toBe(groups);
      act(() => root!.unmount()); container!.remove(); root = null;
    }
    reset();
    h.ui.showAddModal = true; h.ui.showExportModal = true;
    mount();
    expect(h.props.BatchAddModal.cashflowGroups).toBe(groups);
    expect(h.props.ExportModal.cashflowGroups).toBe(groups);
  });
});

describe('MainLayout — tabs that can be switched off', () => {
  const views = ['Dashboard', 'Calendar', 'Ledger', 'Portfolio', 'Tax', 'Settings'];
  const visibleViews = () => shown().filter(x => views.includes(x!));

  it('both are on by default and the header, dashboard and settings are told so', () => {
    mount();
    expect(h.props.AppHeader).toMatchObject({ taxEnabled: true, portfolioEnabled: true });
    expect(h.props.Dashboard.showPortfolio).toBe(true);
  });

  it('settings gets the current state and a way to change each', () => {
    reset('settings');
    h.flags = { tax_enabled: false, portfolio_enabled: true };
    mount();
    expect(h.props.Settings).toMatchObject({ taxEnabled: false, portfolioEnabled: true });
    expect(typeof h.props.Settings.onTaxEnabledChange).toBe('function');
    expect(typeof h.props.Settings.onPortfolioEnabledChange).toBe('function');
  });

  it('switching tax off or on stores tax_enabled, and only that', () => {
    reset('settings');
    mount();
    act(() => { h.props.Settings.onTaxEnabledChange(false); });
    act(() => { h.props.Settings.onTaxEnabledChange(true); });
    expect(h.updates).toEqual([['tax_enabled', false], ['tax_enabled', true]]);
  });

  it('switching the portfolio off or on stores portfolio_enabled, and only that', () => {
    reset('settings');
    mount();
    act(() => { h.props.Settings.onPortfolioEnabledChange(false); });
    act(() => { h.props.Settings.onPortfolioEnabledChange(true); });
    expect(h.updates).toEqual([['portfolio_enabled', false], ['portfolio_enabled', true]]);
  });

  it('a saved false (or the text false) means off; anything else, including nothing, means on', () => {
    mount();
    const parse = h.parsers.tax_enabled;
    expect([false, 'false'].map(parse)).toEqual([false, false]);
    expect([undefined, null, true, 'true', 0, '', {}].map(parse)).toEqual([true, true, true, true, true, true, true]);
    expect(h.parsers.portfolio_enabled).toBe(h.parsers.tax_enabled);
  });

  it('portfolio off: the dashboard is told to hide its portfolio summary', () => {
    h.flags = { portfolio_enabled: false };
    mount();
    expect(h.props.Dashboard.showPortfolio).toBe(false);
    expect(h.props.AppHeader).toMatchObject({ taxEnabled: true, portfolioEnabled: false });
  });

  it('opening the tax tab while tax mode is off goes back to the overview and shows no tax page', () => {
    reset('tax');
    h.flags = { tax_enabled: false };
    mount();
    expect(visibleViews()).toEqual([]);
    expect(h.ui.setActiveTab).toHaveBeenCalledWith('insights');
  });

  it('the same for the portfolio tab', () => {
    reset('portfolio');
    h.flags = { portfolio_enabled: false };
    mount();
    expect(visibleViews()).toEqual([]);
    expect(h.ui.setActiveTab).toHaveBeenCalledWith('insights');
  });

  it('a tab that is on is never redirected', () => {
    reset('tax');
    mount();
    expect(visibleViews()).toEqual(['Tax']);
    expect(h.ui.setActiveTab).not.toHaveBeenCalled();
    act(() => root!.unmount()); container!.remove(); root = null;
    reset('portfolio');
    mount();
    expect(visibleViews()).toEqual(['Portfolio']);
    expect(h.ui.setActiveTab).not.toHaveBeenCalled();
  });

  it('switching tax off does not move you while you are on another tab', () => {
    for (const tab of ['insights', 'calendar', 'ledger', 'portfolio', 'settings']) {
      reset(tab);
      h.flags = { tax_enabled: false };
      mount();
      expect(h.ui.setActiveTab, tab).not.toHaveBeenCalled();
      act(() => root!.unmount()); container!.remove(); root = null;
    }
  });

  it('switching the portfolio off does not move you while you are on another tab', () => {
    for (const tab of ['insights', 'calendar', 'ledger', 'tax', 'settings']) {
      reset(tab);
      h.flags = { portfolio_enabled: false };
      mount();
      expect(h.ui.setActiveTab, tab).not.toHaveBeenCalled();
      act(() => root!.unmount()); container!.remove(); root = null;
    }
  });
});
