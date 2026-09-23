export const STORAGE_KEYS = {
  EXCLUDE_FUTURE: 'excludeFuture',
  ACTIVE_TAB: 'activeTab',
  INSIGHTS_MODE: 'shark_insights_mode',
  CALENDAR_LEGEND_SORT: 'shark_calendar_legend_sort',
  CALENDAR_LEGEND_LAYOUT: 'shark_calendar_legend_layout',
  CASHFLOW_TABLE_CYCLE_MODE: 'shark_cashflow_cycle_mode',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
