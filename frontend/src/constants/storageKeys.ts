export const STORAGE_KEYS = {
  ACTIVE_TAB: 'activeTab',
  INSIGHTS_MODE: 'shark_insights_mode', // legacy, read once for migration
  CALENDAR_LEGEND_SORT: 'shark_calendar_legend_sort',
  CALENDAR_LEGEND_LAYOUT: 'shark_calendar_legend_layout',
  PERIOD_MODE: 'shark_period_mode',
  RANGE_ORDER: 'shark_range_order', // ตารางหลายเดือน: 'newest' (ล่าสุดบน) | 'oldest' (ล่าสุดล่าง)
} as const;
