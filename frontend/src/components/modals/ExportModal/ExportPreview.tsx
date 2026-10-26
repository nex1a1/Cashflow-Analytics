// frontend/src/components/modals/ExportModal/ExportPreview.tsx
import { useMemo } from 'react';
import { Loader2, AlertCircle, Info } from 'lucide-react';
import { ExportPreviewProps } from './types';
import ExportBackupView from './ExportBackupView';
import { calculateCategoryTotal } from './exportUtils';
import { fromISODate } from '../../../utils/dateHelpers';
import { tc } from '@/constants/theme';
import { LongTable, PreviewFrame, PreviewTopBar, WideTable, flowStyle } from '../csvPreview';

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

  const previewItems = useMemo(() => dataToExport.slice(0, PREVIEW_LIMIT), [dataToExport]);

  const renderContent = () => {
    if (isFetching) {
      return (
        <div className="h-full flex flex-col items-center justify-center space-y-3 font-mono text-xs text-neutral-400">
          <Loader2 className="w-7 h-7 text-accent-ink animate-spin" />
          <span className="uppercase tracking-widest text-neutral-400">กำลังดึงข้อมูลจากฐานข้อมูล...</span>
        </div>
      );
    }

    if (!stats.hasData && !isBackupJson) {
      return (
        <div className="h-full flex flex-col items-center justify-center space-y-2.5 font-mono text-xs text-neutral-400">
          <AlertCircle className="w-8 h-8 text-danger" />
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

    if (exportFormat === 'wide') {
      // only categories that appear in the preview rows get a column
      const cats = categories.filter((c) => previewItems.some((t) => t.category === c.name || t.category_id === c.id));
      const dates = Array.from(new Set(previewItems.map((t) => t.date))).sort((a, b) => a.localeCompare(b));
      return (
        <WideTable
          labels={{ date: 'วันที่', dayType: 'ประเภทวัน', total: 'รวมสุทธิ' }}
          columns={cats.map((c) => ({ key: c.id, name: c.name, color: c.color || tc('ink-body') }))}
          rows={dates.map((date) => {
            const values = cats.map((c) => calculateCategoryTotal(previewItems, date, c.name));
            return { key: date, date: fromISODate(date), dayType: getDayTypeInfo(date), values, total: values.reduce((s, v) => s + v, 0) };
          })}
        />
      );
    }

    const groupMap = new Map((cashflowGroups ?? []).map((g) => [g.id, g]));
    return (
      <LongTable
        cols={{ dayType: true, type: true, group: exportFormat === 'full_csv' }}
        labels={{ date: 'วันที่', dayType: 'ประเภทวัน', type: 'ประเภท', group: 'กลุ่มกระแสเงิน', category: 'หมวดหมู่', description: 'รายละเอียด', amount: 'จำนวนเงิน (฿)' }}
        rows={previewItems.map((t, idx) => {
          const cat = categories.find((c) => c.name === t.category || c.id === t.category_id);
          const type = cat?.type || t.group_type || 'expense';
          const groupId = cat?.cashflowGroup || cat?.cashflow_group_id;
          const color = cat?.color || tc('ink-body');
          return {
            key: t.id || String(idx),
            date: fromISODate(t.date),
            dayType: getDayTypeInfo(t.date),
            type,
            typeLabel: type.toUpperCase(),
            // a sell already carries its own minus sign
            sign: type === 'savings' && t.amount < 0 ? '' : flowStyle(type).sign,
            group: groupId ? groupMap.get(groupId)?.name : undefined,
            category: { name: t.category, color, textColor: color, icon: cat?.icon },
            description: t.description,
            amount: t.amount,
          };
        })}
      />
    );
  };

  return (
    <div className="flex-1 flex flex-col p-5 bg-surface overflow-hidden">
      <PreviewTopBar
        count={!isBackupJson && dataToExport.length > 0 ? (dataToExport.length > PREVIEW_LIMIT
          ? `แสดงตัวอย่าง ${PREVIEW_LIMIT} จาก ${dataToExport.length.toLocaleString()} รายการ`
          : `แสดงทั้งหมด ${dataToExport.length.toLocaleString()} รายการ`) : undefined}
        search={previewSearch}
        setSearch={isBackupJson ? undefined : setPreviewSearch}
      />

      <PreviewFrame>{renderContent()}</PreviewFrame>

      <div className="mt-3 flex items-start gap-2 text-[11px] text-neutral-400 shrink-0">
        <Info className="w-3.5 h-3.5 text-accent-ink shrink-0 mt-0.5" />
        <p className="leading-snug">
          ไฟล์ CSV ใส่ <strong className="text-neutral-300">UTF-8 BOM</strong> ไว้ให้แล้ว เปิดใน Microsoft Excel และ Google Sheets ได้โดยภาษาไทยไม่เพี้ยน
        </p>
      </div>
    </div>
  );
}
