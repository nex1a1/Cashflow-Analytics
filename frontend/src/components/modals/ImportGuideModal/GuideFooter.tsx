// frontend/src/components/modals/ImportGuideModal/GuideFooter.tsx
import React, { memo } from 'react';
import { Download, Copy, CheckCircle } from 'lucide-react';
import { GuideFooterProps } from './types';
import { LONG_VARIATION_INFO } from './guideUtils';

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
    <div className="px-6 py-3.5 border-t border-[#303030] bg-[#121212] flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0 select-none">
      {/* Parameters Summary (Matching ExportFooter) */}
      <div className="flex items-center gap-4 text-xs font-mono select-none flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500 font-bold uppercase text-[10px]">รูปแบบ:</span>
          <span className="text-neutral-200 font-bold px-1.5 py-0.5 bg-[#1c1c1c] border border-[#333333]">
            {isLong ? 'Long Ledger CSV' : 'Wide Matrix CSV'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-neutral-500 font-bold uppercase text-[10px]">โครงสร้าง:</span>
          <span className="text-neutral-200 font-bold px-1.5 py-0.5 bg-[#1c1c1c] border border-[#333333]">
            {isLong ? `${LONG_VARIATION_INFO[longVariation].cols} คอลัมน์` : 'ตารางแนวนอน'}
          </span>
        </div>

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
      </div>

      {/* Buttons (Matching ExportFooter) */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={onCopy}
          className="px-3.5 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#222222] border border-[#383838] transition-colors rounded-none flex items-center gap-1.5 cursor-pointer"
          title="คัดลอกรายชื่อหัวคอลัมน์ลงคลิปบอร์ด"
        >
          {copied ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-neutral-400" />
          )}
          <span>{copied ? 'คัดลอกแล้ว' : 'คัดลอกหัวตาราง'}</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-xs font-bold text-neutral-300 hover:text-white hover:bg-[#222222] border border-transparent transition-colors rounded-none cursor-pointer"
        >
          ยกเลิก
        </button>

        <button
          type="button"
          onClick={onDownload}
          className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-[#da291c] hover:bg-[#b01e0a] text-white transition-colors flex items-center gap-2 rounded-none shadow-[0_0_12px_rgba(218,41,28,0.25)] cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>ดาวน์โหลดเทมเพลต CSV</span>
        </button>
      </div>
    </div>
  );
});

export default GuideFooter;
