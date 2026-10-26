// frontend/src/components/modals/ImportGuideModal/GuideFooter.tsx
import { memo } from 'react';
import { Download, Copy, CheckCircle } from 'lucide-react';
import { GuideFooterProps } from './types';
import { LONG_VARIATION_INFO } from './guideUtils';
import { CANCEL_BTN, FOOTER_BAR, PRIMARY_BTN, SummaryChip } from '../csvModalParts';

const GuideFooter = memo(function GuideFooter({
  selectedFormat,
  longVariation,
  delimiter,
  headerLang,
  onClose,
  onCopy,
  onDownload,
  copied,
}: GuideFooterProps) {
  const isLong = selectedFormat === 'long';

  return (
    <div className={`${FOOTER_BAR} select-none`}>
      <div className="flex items-center gap-4 text-xs font-mono select-none flex-wrap">
        <SummaryChip label="รูปแบบ" pill>{isLong ? 'Long Ledger CSV' : 'Wide Matrix CSV'}</SummaryChip>
        <SummaryChip label="โครงสร้าง" pill>{isLong ? `${LONG_VARIATION_INFO[longVariation].cols} คอลัมน์` : 'ตารางแนวนอน'}</SummaryChip>
        <SummaryChip label="คั่น">{delimiter === ',' ? 'Comma (,)' : 'Semicolon (;)'}</SummaryChip>
        <SummaryChip label="หัวตาราง">{headerLang === 'th' ? 'ไทย (TH)' : 'English (EN)'}</SummaryChip>
      </div>

      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onCopy}
          className="px-3.5 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-surface-hover border border-line-strong transition-colors rounded-none flex items-center gap-1.5 cursor-pointer"
          title="คัดลอกรายชื่อหัวคอลัมน์ลงคลิปบอร์ด"
        >
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
          <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกหัวตาราง'}</span>
        </button>

        <button type="button" onClick={onClose} className={CANCEL_BTN}>
          ยกเลิก
        </button>

        <button type="button" onClick={onDownload} className={PRIMARY_BTN}>
          <Download className="w-4 h-4" />
          <span>ดาวน์โหลดเทมเพลต CSV</span>
        </button>
      </div>
    </div>
  );
});

export default GuideFooter;
