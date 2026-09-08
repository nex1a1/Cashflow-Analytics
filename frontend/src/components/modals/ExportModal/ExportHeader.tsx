// frontend/src/components/modals/ExportModal/ExportHeader.tsx
import React from 'react';
import { FileDown, X } from 'lucide-react';
import { ExportHeaderProps } from './types';

export default function ExportHeader({ onClose, isExporting }: ExportHeaderProps) {
  return (
    <div className="px-6 py-4 border-b border-[#303030] bg-[#121212] flex justify-between items-center shrink-0">
      <div className="flex items-center gap-3">
        <div className="p-2 border border-[#da291c]/30 bg-[#da291c]/10 rounded-none shrink-0">
          <FileDown className="w-5 h-5 text-[#da291c]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-100 uppercase tracking-widest leading-none">
              ส่งออกรายงานและสำรองข้อมูล
            </h3>
            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider hidden sm:inline">
              / Statement Export & Backup
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-1">
            เลือกรูปแบบเอกสาร ขอบเขตช่วงเวลา และดาวน์โหลดไฟล์นำไปใช้งานต่อใน Excel หรือ Google Sheets
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        disabled={isExporting}
        className="p-1.5 text-neutral-400 hover:text-white hover:bg-[#252525] border border-transparent hover:border-[#383838] transition-colors disabled:opacity-30 rounded-none"
        title="ปิดหน้าต่าง (Esc)"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
