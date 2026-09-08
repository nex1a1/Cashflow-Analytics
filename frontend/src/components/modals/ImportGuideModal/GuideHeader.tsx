// frontend/src/components/modals/ImportGuideModal/GuideHeader.tsx
import React, { memo } from 'react';
import { FileSpreadsheet, X } from 'lucide-react';
import { GuideHeaderProps } from './types';

const GuideHeader = memo(function GuideHeader({ onClose }: GuideHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-[#303030] bg-[#121212] flex justify-between items-center shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 border border-[#da291c]/30 bg-[#da291c]/10 rounded-none shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-[#da291c]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest leading-none">
              คู่มือนำเข้าข้อมูลและเทมเพลต
            </h3>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider hidden sm:inline">
              / CSV Import Specification & Templates
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            ศึกษาข้อกำหนดโครงสร้างตาราง กฎเกณฑ์การถอดรหัส และดาวน์โหลดไฟล์เทมเพลตนำเข้า
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#252525] border border-transparent hover:border-[#383838] transition-colors rounded-none cursor-pointer"
        title="ปิดหน้าต่าง (Esc)"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
});

export default GuideHeader;
