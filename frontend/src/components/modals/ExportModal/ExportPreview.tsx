// frontend/src/components/modals/ExportModal/ExportPreview.tsx
import React, { useMemo } from 'react';
import { Search, X, Loader2, AlertCircle, Info } from 'lucide-react';
import { ExportPreviewProps } from './types';
import ExportLongTable from './ExportLongTable';
import ExportWideTable from './ExportWideTable';
import ExportBackupView from './ExportBackupView';

const PREVIEW_LIMIT = 25;

export default function ExportPreview({
  exportFormat,
  previewSearch,
  setPreviewSearch,
  dataToExport,
  isFetching,
  stats,
  categories,
  cashflowGroups,
  getDayTypeInfo,
  localTransactions,
  dayTypes,
  dayTypeConfig,
}: ExportPreviewProps) {
  const isBackupJson = exportFormat === 'backup_json';
  const isWide = exportFormat === 'wide';

  const previewItems = useMemo(() => {
    return dataToExport.slice(0, PREVIEW_LIMIT);
  }, [dataToExport]);

  const renderContent = () => {
    if (isFetching) {
      return (
        <div className="h-full flex flex-col items-center justify-center space-y-3 font-mono text-xs text-neutral-400">
          <Loader2 className="w-7 h-7 text-[#da291c] animate-spin" />
          <span className="uppercase tracking-widest text-neutral-400">
            กำลังดึงข้อมูลจากฐานข้อมูล...
          </span>
        </div>
      );
    }

    if (!stats.hasData && !isBackupJson) {
      return (
        <div className="h-full flex flex-col items-center justify-center space-y-2.5 font-mono text-xs text-neutral-400">
          <AlertCircle className="w-8 h-8 text-[#da291c]" />
          <span className="font-bold text-neutral-300">ไม่พบรายการข้อมูลตามเงื่อนไขที่เลือก</span>
          <p className="text-[11px] text-neutral-500">โปรดลองเปลี่ยนช่วงเวลา หรือเลือกประเภทรายการอื่น</p>
        </div>
      );
    }

    if (isBackupJson) {
      return (
        <ExportBackupView
          localTransactions={localTransactions}
          categories={categories}
          cashflowGroups={cashflowGroups}
          dayTypes={dayTypes}
          dayTypeConfig={dayTypeConfig}
        />
      );
    }

    if (isWide) {
      return (
        <ExportWideTable
          data={previewItems}
          categories={categories}
          getDayTypeInfo={getDayTypeInfo}
        />
      );
    }

    return (
      <ExportLongTable
        data={previewItems}
        categories={categories}
        cashflowGroups={cashflowGroups}
        getDayTypeInfo={getDayTypeInfo}
        exportFormat={exportFormat}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col p-5 bg-[#141414] overflow-hidden">
      {/* Preview Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-300">
            ตัวอย่างเอกสาร <span className="text-neutral-500 font-mono font-normal">/ PREVIEW</span>
          </span>
          {!isBackupJson && dataToExport.length > 0 && (
            <span className="text-[10px] font-mono px-2 py-0.5 bg-[#202020] border border-[#333333] text-neutral-400">
              {dataToExport.length > PREVIEW_LIMIT
                ? `แสดงตัวอย่าง ${PREVIEW_LIMIT} จาก ${dataToExport.length.toLocaleString()} รายการ`
                : `แสดงทั้งหมด ${dataToExport.length.toLocaleString()} รายการ`}
            </span>
          )}
        </div>

        {/* Search in preview */}
        {!isBackupJson && (
          <div className="relative w-full sm:w-[260px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="ค้นหาในตัวอย่าง..."
              value={previewSearch}
              onChange={(e) => setPreviewSearch(e.target.value)}
              className="w-full bg-[#121212] border border-[#383838] pl-8 pr-7 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#da291c] rounded-none transition-colors"
            />
            {previewSearch && (
              <button
                type="button"
                onClick={() => setPreviewSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Preview Container */}
      <div className="flex-1 border border-[#2e2e2e] bg-[#121212] flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {renderContent()}
        </div>
      </div>

      {/* Bottom Hint */}
      <div className="mt-3 flex items-start gap-2 text-[11px] text-neutral-400 shrink-0">
        <Info className="w-3.5 h-3.5 text-[#da291c] shrink-0 mt-0.5" />
        <p className="leading-snug">
          ระบบฝังรหัส <strong className="text-neutral-300">UTF-8 BOM</strong> ในไฟล์ CSV อัตโนมัติ เพื่อให้เปิดใน Microsoft Excel และ Google Sheets ได้โดยภาษาไทยไม่เพี้ยน
        </p>
      </div>
    </div>
  );
}
