// frontend/src/components/modals/ExportModal/ExportFooter.tsx
import React from 'react';
import { Download, Loader2 } from 'lucide-react';
import { ExportFooterProps } from './types';

export default function ExportFooter({
  exportFormat,
  delimiter,
  headerLang,
  exportPeriod,
  getFilterLabel,
  onClose,
  executeExport,
  stats,
  isExporting,
}: ExportFooterProps) {
  const isBackupJson = exportFormat === 'backup_json';
  const periodLabel = getFilterLabel ? getFilterLabel(exportPeriod) : exportPeriod;

  const getFormatLabel = () => {
    switch (exportFormat) {
      case 'long':
        return 'Long Ledger CSV';
      case 'wide':
        return 'Wide Matrix CSV';
      case 'full_csv':
        return 'Full Detail CSV';
      case 'backup_json':
        return 'Full Backup JSON';
      default:
        return exportFormat;
    }
  };

  const isDownloadDisabled = (!stats.hasData && !isBackupJson) || isExporting;

  return (
    <div className="px-6 py-3.5 border-t border-[#303030] bg-[#121212] flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
      {/* Parameters Summary */}
      <div className="flex items-center gap-4 text-xs font-mono select-none flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500 font-bold uppercase text-[10px]">รูปแบบ:</span>
          <span className="text-neutral-200 font-bold px-1.5 py-0.5 bg-[#1c1c1c] border border-[#333333]">
            {getFormatLabel()}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500 font-bold uppercase text-[10px]">ช่วงเวลา:</span>
          <span className="text-neutral-200 font-bold px-1.5 py-0.5 bg-[#1c1c1c] border border-[#333333] max-w-[160px] truncate" title={periodLabel}>
            {periodLabel}
          </span>
        </div>

        {!isBackupJson && (
          <>
            <div className="flex items-center gap-1.5 hidden md:flex">
              <span className="text-neutral-500 font-bold uppercase text-[10px]">คั่น:</span>
              <span className="text-neutral-300 font-bold">
                {delimiter === ',' ? 'Comma (,)' : 'Semicolon (;)'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 hidden md:flex">
              <span className="text-neutral-500 font-bold uppercase text-[10px]">หัวตาราง:</span>
              <span className="text-neutral-300 font-bold">
                {headerLang === 'th' ? 'ไทย (TH)' : 'English (EN)'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={isExporting}
          className="px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#222222] border border-transparent transition-colors rounded-none disabled:opacity-30"
        >
          ยกเลิก
        </button>

        <button
          type="button"
          onClick={executeExport}
          disabled={isDownloadDisabled}
          className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#da291c] hover:bg-[#b01e0a] text-white transition-colors flex items-center gap-2 rounded-none disabled:opacity-30 disabled:hover:bg-[#da291c] shadow-[0_0_12px_rgba(218,41,28,0.25)]"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังสร้างไฟล์...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>
                ดาวน์โหลด{isBackupJson ? ' JSON' : ' CSV'} ({stats.rowCount.toLocaleString()} {exportFormat === 'wide' ? 'วัน' : 'รายการ'})
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
