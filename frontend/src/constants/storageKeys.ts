export const STORAGE_KEYS = {
  EXCLUDE_FUTURE: 'excludeFuture',
  ACTIVE_TAB: 'activeTab',
  INSIGHTS_MODE: 'shark_insights_mode',
  CALENDAR_LEGEND_SORT: 'shark_calendar_legend_sort',
  CALENDAR_LEGEND_LAYOUT: 'shark_calendar_legend_layout',
  ITEMS_WISHLIST_SORT: 'shark_items_wishlist_sort',
  ITEMS_INVENTORY_SORT: 'shark_items_inventory_sort',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
