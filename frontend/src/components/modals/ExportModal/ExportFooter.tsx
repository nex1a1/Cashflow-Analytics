// frontend/src/components/modals/ExportModal/ExportFooter.tsx
import { Download, Loader2 } from 'lucide-react';
import { ExportFooterProps, ExportFormatKey } from './types';
import FieldError from '../../shared/FieldError';
import { CANCEL_BTN, FOOTER_BAR, PRIMARY_BTN, SummaryChip } from '../csvModalParts';

const FORMAT_LABELS: Record<ExportFormatKey, string> = {
  long: 'Long Ledger CSV',
  wide: 'Wide Matrix CSV',
  full_csv: 'Full Detail CSV',
  backup_json: 'Full Backup JSON',
};

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
  error,
}: ExportFooterProps) {
  const isBackupJson = exportFormat === 'backup_json';
  const periodLabel = getFilterLabel ? getFilterLabel(exportPeriod) : exportPeriod;

  return (
    <div className={FOOTER_BAR}>
      <div className="flex items-center gap-4 text-xs font-mono select-none flex-wrap">
        <SummaryChip label="รูปแบบ" pill>{FORMAT_LABELS[exportFormat]}</SummaryChip>
        <SummaryChip label="ช่วงเวลา" pill className="max-w-[160px] truncate" title={periodLabel}>{periodLabel}</SummaryChip>
        {!isBackupJson && (
          <>
            <SummaryChip label="คั่น">{delimiter === ',' ? 'Comma (,)' : 'Semicolon (;)'}</SummaryChip>
            <SummaryChip label="หัวตาราง">{headerLang === 'th' ? 'ไทย' : 'English (EN)'}</SummaryChip>
          </>
        )}
      </div>

      <FieldError id="export-err" message={error} />

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        <button type="button" onClick={onClose} disabled={isExporting} className={CANCEL_BTN}>
          ยกเลิก
        </button>

        <button type="button" onClick={executeExport} disabled={(!stats.hasData && !isBackupJson) || isExporting} className={PRIMARY_BTN}>
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
