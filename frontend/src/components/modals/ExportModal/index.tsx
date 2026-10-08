// frontend/src/components/modals/ExportModal/index.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { transactionService } from '../../../services/api';
import { TransactionDisplay } from '../../../types';
import ExportHeader from './ExportHeader';
import ExportSidebar from './ExportSidebar';
import ExportPreview from './ExportPreview';
import ExportFooter from './ExportFooter';
import {
  buildFullExtendedCsv,
  buildLongCsv,
  buildSystemBackupJson,
  buildWideCsv,
  calculateExportStats,
  downloadFileBlob,
  filterExportTransactions,
  resolveDayTypeInfo,
} from './exportUtils';
import {
  DelimiterChar,
  ExportFormatKey,
  ExportModalProps,
  ExportTypeFilter,
  HeaderLanguage,
} from './types';
import { convertPeriodMode, localTodayIso } from '../../../utils/payCycle';
import { tc } from '@/constants/theme';
import { useFocusTrap } from '@/hooks/useFocusTrap';

export default function ExportModal({
  isOpen,
  onClose,
  transactions: filteredTransactions = [],
  categories = [],
  dayTypes = {},
  dayTypeConfig = [],
  cashflowGroups = [],
  groupedOptions,
  getFilterLabel,
  initialPeriod = 'ALL',
}: ExportModalProps) {
  const trapRef = useFocusTrap<HTMLDivElement>();
  // Export นับตามเดือนปฏิทินเสมอ — period รอบเงินเดือนถูกแปลงเป็นเดือนที่ทับกันมากที่สุด
  const [exportPeriod, setExportPeriod] = useState<string>(() => convertPeriodMode(initialPeriod, false));
  const [exportFormat, setExportFormat] = useState<ExportFormatKey>('long');
  const [delimiter, setDelimiter] = useState<DelimiterChar>(',');
  const [headerLang, setHeaderLang] = useState<HeaderLanguage>('th');
  const [typeFilter, setTypeFilter] = useState<ExportTypeFilter>('all');
  const [previewSearch, setPreviewSearch] = useState<string>('');

  const [localTransactions, setLocalTransactions] = useState<TransactionDisplay[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // The page's rows are only the fallback when the fetch fails. Read through a ref, not a dependency: a parent that passes a new
  // array on every render (or none at all, which defaults to a new [] each time) would otherwise refetch in a loop and reset the user's choices.
  const fallbackRef = useRef(filteredTransactions);
  fallbackRef.current = filteredTransactions;

  // Sync initial period when modal opens
  useEffect(() => {
    if (!isOpen) return;
    let current = true; // an answer that arrives after the modal was closed or reopened is stale
    setExportPeriod(convertPeriodMode(initialPeriod || 'ALL', false));
    setPreviewSearch('');
    setIsExporting(false);
    setExportError(null);

    const fetchAllData = async () => {
      setIsFetching(true);
      try {
        const all = await transactionService.getAll();
        if (current) setLocalTransactions(all);
      } catch (err) {
        console.error('Export fetch failed, falling back to props:', err);
        if (current) setLocalTransactions(fallbackRef.current);
      } finally {
        if (current) setIsFetching(false);
      }
    };

    fetchAllData();
    return () => { current = false; };
  }, [isOpen, initialPeriod]);

  // ESC key guard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isExporting]);

  const getDayTypeInfo = useCallback(
    (date: string) => resolveDayTypeInfo(date, dayTypes, dayTypeConfig),
    [dayTypes, dayTypeConfig]
  );

  // Filtered transactions for export
  const dataToExport = useMemo(() => {
    return filterExportTransactions(
      localTransactions,
      exportPeriod,
      typeFilter,
      previewSearch,
      categories
    );
  }, [localTransactions, exportPeriod, typeFilter, previewSearch, categories]);

  // Telemetry stats
  const stats = useMemo(() => {
    return calculateExportStats(
      exportFormat,
      dataToExport,
      localTransactions,
      categories,
      dayTypeConfig,
      dayTypes
    );
  }, [exportFormat, dataToExport, localTransactions, categories, dayTypeConfig, dayTypes]);

  // Execute download
  const executeExport = () => {
    if ((!dataToExport.length && exportFormat !== 'backup_json') || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    setTimeout(() => {
      try {
        const todayStr = localTodayIso();
        const periodSuffix = exportPeriod.replace(/[^a-zA-Z0-9_-]/g, '_');

        if (exportFormat === 'backup_json') {
          const jsonContent = buildSystemBackupJson({
            transactions: localTransactions,
            categories,
            cashflowGroups,
            dayTypes,
            dayTypeConfig,
          });
          const filename = `CashflowShark_Backup_${todayStr}.json`;
          downloadFileBlob(jsonContent, filename, true);
        } else if (exportFormat === 'wide') {
          const csvContent = buildWideCsv({
            data: dataToExport,
            categories,
            getDayTypeInfo,
            delimiter,
            headerLang,
          });
          const filename = `CashflowShark_WideMatrix_${periodSuffix}_${todayStr}.csv`;
          downloadFileBlob(csvContent, filename);
        } else if (exportFormat === 'full_csv') {
          const csvContent = buildFullExtendedCsv({
            data: dataToExport,
            categories,
            cashflowGroups,
            getDayTypeInfo,
            delimiter,
            headerLang,
          });
          const filename = `CashflowShark_FullDetail_${periodSuffix}_${todayStr}.csv`;
          downloadFileBlob(csvContent, filename);
        } else {
          const csvContent = buildLongCsv({
            data: dataToExport,
            categories,
            getDayTypeInfo,
            delimiter,
            headerLang,
          });
          const filename = `CashflowShark_Ledger_${periodSuffix}_${todayStr}.csv`;
          downloadFileBlob(csvContent, filename);
        }
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
      } catch (err) {
        // stay open: closing as if it worked would leave the user waiting for a file that never came
        console.error('Export generation error:', err);
        setExportError('สร้างไฟล์ไม่สำเร็จ ลองอีกครั้ง หรือเลือกรูปแบบอื่น');
        setIsExporting(false);
      }
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-label="ส่งออกข้อมูล" tabIndex={-1}
        className="relative shadow-2xl flex flex-col w-full max-w-[1400px] h-[86vh] min-h-[540px] max-h-[880px] border border-line-strong bg-canvas overflow-hidden"
        style={{ borderTop: `4px solid ${tc('accent')}`, borderRadius: 0 }}
      >
        {/* Header */}
        <ExportHeader onClose={onClose} isExporting={isExporting} />

        {/* 2-Column Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-canvas">
          <ExportSidebar
            exportPeriod={exportPeriod}
            setExportPeriod={setExportPeriod}
            groupedOptions={groupedOptions}
            exportFormat={exportFormat}
            setExportFormat={setExportFormat}
            delimiter={delimiter}
            setDelimiter={setDelimiter}
            headerLang={headerLang}
            setHeaderLang={setHeaderLang}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            stats={stats}
          />

          <ExportPreview
            exportFormat={exportFormat}
            previewSearch={previewSearch}
            setPreviewSearch={setPreviewSearch}
            dataToExport={dataToExport}
            isFetching={isFetching}
            stats={stats}
            categories={categories}
            cashflowGroups={cashflowGroups}
            getDayTypeInfo={getDayTypeInfo}
            localTransactions={localTransactions}
            dayTypes={dayTypes}
            dayTypeConfig={dayTypeConfig}
          />
        </div>

        {/* Footer */}
        <ExportFooter
          exportFormat={exportFormat}
          delimiter={delimiter}
          headerLang={headerLang}
          exportPeriod={exportPeriod}
          getFilterLabel={getFilterLabel}
          onClose={onClose}
          executeExport={executeExport}
          stats={stats}
          isExporting={isExporting}
          error={exportError}
        />
      </div>
    </div>
  );
}
