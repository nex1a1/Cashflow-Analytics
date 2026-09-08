// frontend/src/components/modals/ExportModal/types.ts
import { Category, CashflowGroup, DayType, GroupedOptions, TransactionDisplay } from '../../../types';

export type ExportFormatKey = 'long' | 'wide' | 'backup_json' | 'full_csv';

export type HeaderLanguage = 'th' | 'en';

export type DelimiterChar = ',' | ';';

export type ExportTypeFilter = 'all' | 'income' | 'expense' | 'savings';

export interface DayTypeInfo {
  label: string;
  color: string;
}

export interface ExportStats {
  rowCount: number;
  estKB: string;
  hasData: boolean;
}

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions?: TransactionDisplay[];
  categories: Category[];
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
  cashflowGroups?: CashflowGroup[];
  groupedOptions?: GroupedOptions;
  getFilterLabel?: (period?: string) => string;
  initialPeriod?: string;
}

export interface ExportHeaderProps {
  onClose: () => void;
  isExporting: boolean;
}

export interface ExportFormatCardProps {
  formatKey: ExportFormatKey;
  activeFormat: ExportFormatKey;
  onClick: (key: ExportFormatKey) => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

export interface ExportSidebarProps {
  exportPeriod: string;
  setExportPeriod: (period: string) => void;
  groupedOptions?: GroupedOptions;
  exportFormat: ExportFormatKey;
  setExportFormat: (format: ExportFormatKey) => void;
  delimiter: DelimiterChar;
  setDelimiter: (dlm: DelimiterChar) => void;
  headerLang: HeaderLanguage;
  setHeaderLang: (lang: HeaderLanguage) => void;
  typeFilter: ExportTypeFilter;
  setTypeFilter: (filter: ExportTypeFilter) => void;
  stats: ExportStats;
}

export interface ExportPreviewProps {
  exportFormat: ExportFormatKey;
  previewSearch: string;
  setPreviewSearch: (val: string) => void;
  dataToExport: TransactionDisplay[];
  isFetching: boolean;
  stats: ExportStats;
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  getDayTypeInfo: (date: string) => DayTypeInfo;
  localTransactions: TransactionDisplay[];
  dayTypes: Record<string, string>;
  dayTypeConfig: DayType[];
}

export interface ExportFooterProps {
  exportFormat: ExportFormatKey;
  delimiter: DelimiterChar;
  headerLang: HeaderLanguage;
  exportPeriod: string;
  getFilterLabel?: (period?: string) => string;
  onClose: () => void;
  executeExport: () => void;
  stats: ExportStats;
  isExporting: boolean;
}
