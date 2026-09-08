// frontend/src/components/modals/ExportModal/exportUtils.ts
import { Category, CashflowGroup, DayType, TransactionDisplay } from '../../../types';
import { isDateInFilter } from '../../../utils/dateHelpers';
import { DayTypeInfo, DelimiterChar, ExportFormatKey, ExportStats, ExportTypeFilter, HeaderLanguage } from './types';

/**
 * Resolves day type label and color for a given date
 */
export function resolveDayTypeInfo(
  date: string,
  dayTypes: Record<string, string>,
  dayTypeConfig: DayType[]
): DayTypeInfo {
  const dtId = dayTypes[date];
  if (dtId) {
    const config = dayTypeConfig.find((d) => d.id === dtId || d.name === dtId);
    if (config) {
      return {
        label: config.label || config.name || dtId,
        color: config.color || '#3b82f6',
      };
    }
  }

  // Weekend fallback calculation
  const dayIdx = new Date(date).getDay();
  const isWeekend = dayIdx === 0 || dayIdx === 6;
  const config = isWeekend ? dayTypeConfig[1] : dayTypeConfig[0];

  return {
    label: config?.label || (isWeekend ? 'วันหยุด' : 'ทำงาน'),
    color: config?.color || (isWeekend ? '#ef4444' : '#3b82f6'),
  };
}

/**
 * Filter transactions based on date period, transaction type, and search query.
 * Note: Rogue exclusions like 'หักวงเงิน' have been purged for data integrity.
 */
export function filterExportTransactions(
  transactions: TransactionDisplay[],
  period: string,
  typeFilter: ExportTypeFilter,
  search: string,
  categories: Category[]
): TransactionDisplay[] {
  const query = search.trim().toLowerCase();

  return transactions.filter((t) => {
    // 1. Period filter
    if (!isDateInFilter(t.date, period)) return false;

    // 2. Type filter
    if (typeFilter !== 'all') {
      const cat = categories.find((c) => c.name === t.category || c.id === t.category_id);
      const groupType = cat?.type || t.group_type || 'expense';
      if (groupType !== typeFilter) return false;
    }

    // 3. Search query
    if (query) {
      const descMatch = (t.description || '').toLowerCase().includes(query);
      const catMatch = (t.category || '').toLowerCase().includes(query);
      if (!descMatch && !catMatch) return false;
    }

    return true;
  });
}

/**
 * Calculates sum of a specific category for a date with floating point precision safety
 */
export function calculateCategoryTotal(
  transactions: TransactionDisplay[],
  date: string,
  categoryName: string
): number {
  const total = transactions
    .filter((t) => t.date === date && t.category === categoryName)
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  return Math.round(total * 100) / 100;
}

/**
 * Escapes a cell string for standard CSV syntax
 */
export function escapeCsvCell(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replaceAll('"', '""')}"`;
  }
  return str;
}

/**
 * Builds standard Long CSV format.
 * When headerLang is 'th', headers align seamlessly with useImportCSV parser.
 */
export function buildLongCsv(params: {
  data: TransactionDisplay[];
  categories: Category[];
  getDayTypeInfo: (d: string) => DayTypeInfo;
  delimiter: DelimiterChar;
  headerLang: HeaderLanguage;
}): string {
  const { data, categories, getDayTypeInfo, delimiter, headerLang } = params;

  const headers =
    headerLang === 'th'
      ? ['วันที่', 'ชนิดวัน', 'ประเภท', 'หมวดหมู่', 'รายละเอียด', 'จำนวนเงิน']
      : ['Date', 'DayType', 'Type', 'Category', 'Description', 'Amount'];

  let content = headers.join(delimiter) + '\n';

  data.forEach((t) => {
    const cat = categories.find((c) => c.name === t.category || c.id === t.category_id);
    const dt = getDayTypeInfo(t.date);
    const rawType = cat?.type || t.group_type || 'expense';

    let displayType: string = rawType;
    if (headerLang === 'th') {
      if (rawType === 'income') displayType = 'รายรับ';
      else if (rawType === 'savings') displayType = 'เงินออม';
      else displayType = 'รายจ่าย';
    }

    const row = [
      escapeCsvCell(t.date),
      escapeCsvCell(dt.label),
      escapeCsvCell(displayType),
      escapeCsvCell(t.category),
      escapeCsvCell(t.description || ''),
      t.amount.toFixed(2),
    ];
    content += row.join(delimiter) + '\n';
  });

  return content;
}

/**
 * Builds Wide Matrix CSV (Date x Categories comparison matrix)
 */
export function buildWideCsv(params: {
  data: TransactionDisplay[];
  categories: Category[];
  getDayTypeInfo: (d: string) => DayTypeInfo;
  delimiter: DelimiterChar;
  headerLang: HeaderLanguage;
}): string {
  const { data, categories, getDayTypeInfo, delimiter, headerLang } = params;

  const dates = Array.from(new Set(data.map((t) => t.date))).sort((a, b) => a.localeCompare(b));
  const activeCats = categories.filter((c) => data.some((t) => t.category === c.name || t.category_id === c.id));

  const totalLabel = headerLang === 'th' ? 'รวมสุทธิ' : 'Total';
  const headers = [
    headerLang === 'th' ? 'วันที่' : 'Date',
    headerLang === 'th' ? 'ชนิดวัน' : 'DayType',
    ...activeCats.map((c) => escapeCsvCell(c.name)),
    totalLabel,
  ];

  let content = headers.join(delimiter) + '\n';

  dates.forEach((date) => {
    const dt = getDayTypeInfo(date);
    let dailySum = 0;

    const row: string[] = [escapeCsvCell(date), escapeCsvCell(dt.label)];

    activeCats.forEach((cat) => {
      const amount = calculateCategoryTotal(data, date, cat.name);
      dailySum += amount;
      row.push(amount > 0 ? amount.toFixed(2) : '0.00');
    });

    row.push((Math.round(dailySum * 100) / 100).toFixed(2));
    content += row.join(delimiter) + '\n';
  });

  return content;
}

/**
 * Builds Full Extended CSV containing complete normalized relationship fields
 */
export function buildFullExtendedCsv(params: {
  data: TransactionDisplay[];
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  getDayTypeInfo: (d: string) => DayTypeInfo;
  delimiter: DelimiterChar;
  headerLang: HeaderLanguage;
}): string {
  const { data, categories, cashflowGroups = [], getDayTypeInfo, delimiter, headerLang } = params;

  const groupMap = new Map(cashflowGroups.map((g) => [g.id, g]));

  const headers =
    headerLang === 'th'
      ? ['รหัสธุรกรรม', 'วันที่', 'ชนิดวัน', 'ประเภทกระแสเงิน', 'กลุ่มกระแสเงิน', 'หมวดหมู่', 'ประเภทการจัดสรร', 'รายละเอียด', 'จำนวนเงิน']
      : ['TransactionID', 'Date', 'DayType', 'GroupType', 'GroupName', 'Category', 'AllocationType', 'Description', 'Amount'];

  let content = headers.join(delimiter) + '\n';

  data.forEach((t) => {
    const cat = categories.find((c) => c.name === t.category || c.id === t.category_id);
    const dt = getDayTypeInfo(t.date);
    const groupId = cat?.cashflowGroup || cat?.cashflow_group_id;
    const group = groupId ? groupMap.get(groupId) : undefined;

    const row = [
      escapeCsvCell(t.id),
      escapeCsvCell(t.date),
      escapeCsvCell(dt.label),
      escapeCsvCell(cat?.type || t.group_type || 'expense'),
      escapeCsvCell(group?.name || '—'),
      escapeCsvCell(t.category),
      escapeCsvCell(t.allocation_type || cat?.allocation_type || 'want'),
      escapeCsvCell(t.description || ''),
      t.amount.toFixed(2),
    ];
    content += row.join(delimiter) + '\n';
  });

  return content;
}

/**
 * Builds standard clean System Backup JSON structure
 */
export function buildSystemBackupJson(params: {
  transactions: TransactionDisplay[];
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
}): string {
  const { transactions, categories, cashflowGroups, dayTypes, dayTypeConfig } = params;

  const backupPayload = {
    app: 'CashflowShark',
    schemaVersion: '2.0.0',
    exportedAt: new Date().toISOString(),
    currency: 'THB',
    stats: {
      transactionsCount: transactions.length,
      categoriesCount: categories.length,
      cashflowGroupsCount: cashflowGroups.length,
      calendarDaysCount: Object.keys(dayTypes).length,
      dayTypeConfigCount: dayTypeConfig.length,
    },
    data: {
      transactions,
      categories,
      cashflowGroups,
      dayTypes,
      dayTypeConfig,
    },
  };

  return JSON.stringify(backupPayload, null, 2);
}

/**
 * Calculates row counts and estimated file size
 */
export function calculateExportStats(
  exportFormat: ExportFormatKey,
  dataToExport: TransactionDisplay[],
  localTransactions: TransactionDisplay[],
  categories: Category[],
  dayTypeConfig: DayType[],
  dayTypes: Record<string, string>
): ExportStats {
  let rowCount = dataToExport.length;

  if (exportFormat === 'wide') {
    rowCount = new Set(dataToExport.map((t) => t.date)).size;
  } else if (exportFormat === 'backup_json') {
    rowCount = localTransactions.length;
  }

  const multiplier = exportFormat === 'wide' ? 0.38 : exportFormat === 'backup_json' ? 0.45 : 0.16;
  const estKB = (rowCount * multiplier).toFixed(1);

  return {
    rowCount,
    estKB,
    hasData: rowCount > 0 || exportFormat === 'backup_json',
  };
}

/**
 * Triggers safe browser file download with BOM for Excel UTF-8 support
 */
export function downloadFileBlob(content: string, filename: string, isJson: boolean = false): void {
  const mimeType = isJson ? 'application/json;charset=utf-8;' : 'text/csv;charset=utf-8;';
  const fileContent = isJson ? content : '\uFEFF' + content; // UTF-8 BOM for CSV

  const blob = new Blob([fileContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
