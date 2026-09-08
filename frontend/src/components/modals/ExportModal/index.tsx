// frontend/src/components/modals/ExportModal/index.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [exportPeriod, setExportPeriod] = useState<string>(initialPeriod);
  const [exportFormat, setExportFormat] = useState<ExportFormatKey>('long');
  const [delimiter, setDelimiter] = useState<DelimiterChar>(',');
  const [headerLang, setHeaderLang] = useState<HeaderLanguage>('th');
  const [typeFilter, setTypeFilter] = useState<ExportTypeFilter>('all');
  const [previewSearch, setPreviewSearch] = useState<string>('');

  const [localTransactions, setLocalTransactions] = useState<TransactionDisplay[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Sync initial period when modal opens
  useEffect(() => {
    if (isOpen) {
      setExportPeriod(initialPeriod || 'ALL');
      setPreviewSearch('');
      setIsExporting(false);

      const fetchAllData = async () => {
        setIsFetching(true);
        try {
          const all = await transactionService.getAll();
          setLocalTransactions(all);
        } catch (err) {
          console.error('Export fetch failed, falling back to props:', err);
          setLocalTransactions(filteredTransactions);
        } finally {
          setIsFetching(false);
        }
      };

      fetchAllData();
    }
  }, [isOpen, initialPeriod, filteredTransactions]);

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

    setTimeout(() => {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
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
      } catch (err) {
        console.error('Export generation error:', err);
      } finally {
        setTimeout(() => {
          setIsExporting(false);
          onClose();
        }, 500);
      }
    }, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-3 sm:p-6 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative shadow-2xl flex flex-col w-full max-w-[1400px] h-[86vh] min-h-[540px] max-h-[880px] border border-[#3e3e3e] bg-[#181818] overflow-hidden"
        style={{ borderTop: '4px solid #da291c', borderRadius: 0 }}
      >
        {/* Header */}
        <ExportHeader onClose={onClose} isExporting={isExporting} />

        {/* 2-Column Body */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-[#181818]">
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
        />
      </div>
    </div>
  );
}
