// frontend/src/components/modals/ExportModal/ExportSidebar.tsx
import { ClipboardList, FileSpreadsheet, Layers, Database, ShieldCheck } from 'lucide-react';
import PeriodPicker from '../../layout/PeriodPicker';
import { ExportFormatKey, ExportSidebarProps } from './types';
import { CsvDocOptions, FormatCard, OptionLabel, SidebarHeading } from '../csvModalParts';

const FORMATS: { key: ExportFormatKey; icon: typeof ClipboardList; title: string; subtitle: string; description: string; badge?: string }[] = [
  { key: 'long', icon: ClipboardList, title: 'รายงานแยกรายการ', subtitle: 'Long Ledger CSV', description: 'เรียงตามวัน เหมาะสำหรับตรวจรายการ ย้อนหลัง และนำเข้าซ้ำ', badge: 'แนะนำ' },
  { key: 'wide', icon: FileSpreadsheet, title: 'สเปรดชีตวิเคราะห์', subtitle: 'Wide Matrix CSV', description: 'ตารางหมวดหมู่รายวัน สำหรับทำ Pivot ใน Excel' },
  { key: 'full_csv', icon: Layers, title: 'รายงานละเอียด', subtitle: 'Full Detail Extended CSV', description: 'มีทุกคอลัมน์ รวมถึงรหัสรายการ กลุ่ม และประเภทการจัดสรร' },
  { key: 'backup_json', icon: Database, title: 'สำรองข้อมูลทั้งระบบ', subtitle: 'Full Database JSON Backup', description: 'ไฟล์ JSON สำรองรายการ หมวดหมู่ และปฏิทินทั้งหมด', badge: 'JSON' },
];

const TYPE_FILTERS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'expense', label: 'รายจ่าย' },
  { key: 'income', label: 'รายรับ' },
  { key: 'savings', label: 'เงินออม' },
] as const;

export default function ExportSidebar({
  exportPeriod,
  setExportPeriod,
  groupedOptions,
  exportFormat,
  setExportFormat,
  delimiter,
  setDelimiter,
  headerLang,
  setHeaderLang,
  typeFilter,
  setTypeFilter,
  stats,
}: ExportSidebarProps) {
  return (
    <div className="w-[330px] xl:w-[350px] shrink-0 border-r border-line flex flex-col bg-canvas p-5 overflow-y-auto custom-scrollbar space-y-5">
      <section className="space-y-2">
        <SidebarHeading n="01" th="ขอบเขตช่วงเวลา" en="PERIOD" />
        <div className="bg-surface p-2.5 rounded-none border border-line">
          <PeriodPicker
            filterPeriod={exportPeriod}
            setFilterPeriod={setExportPeriod}
            groupedOptions={groupedOptions || { yearsMap: {}, sortedYears: [] }}
            floating
          />
        </div>
      </section>

      <section className="space-y-2">
        <SidebarHeading n="02" th="รูปแบบรายงาน" en="FORMAT" />
        <div className="space-y-2">
          {FORMATS.map(({ key, ...card }) => (
            <FormatCard key={key} active={exportFormat === key} onClick={() => setExportFormat(key)} {...card} />
          ))}
        </div>
      </section>

      {/* CSV options (a JSON backup has none) */}
      {exportFormat !== 'backup_json' && (
        <section className="space-y-3 bg-surface p-3.5 rounded-none border border-line">
          <SidebarHeading n="03" th="ตัวเลือกเอกสาร" en="OPTIONS" />
          <CsvDocOptions delimiter={delimiter} setDelimiter={setDelimiter} headerLang={headerLang} setHeaderLang={setHeaderLang} />

          <div className="space-y-1.5">
            <OptionLabel>ประเภทรายการ</OptionLabel>
            <div className="grid grid-cols-2 gap-1">
              {TYPE_FILTERS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTypeFilter(opt.key)}
                  className={`py-1.5 px-2 text-[11px] font-bold text-left border transition-colors ${
                    typeFilter === opt.key
                      ? 'border-accent-ink bg-accent/20 text-white'
                      : 'border-line bg-canvas text-neutral-400 hover:text-neutral-200 hover:border-line-strong'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* File summary */}
      <div className="mt-auto p-3.5 border border-line bg-surface rounded-none text-[11px] font-mono space-y-2 select-none">
        <div className="flex justify-between items-center">
          <span className="text-neutral-500 font-bold uppercase text-[11px]">จำนวนข้อมูลเป้าหมาย:</span>
          <span className="text-neutral-200 font-bold tabular-nums">
            {stats.rowCount.toLocaleString()} {exportFormat === 'wide' ? 'วัน' : 'รายการ'}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-neutral-500 font-bold uppercase text-[11px]">ขนาดไฟล์โดยประมาณ:</span>
          <span className="text-neutral-200 font-bold tabular-nums">{stats.estKB} KB</span>
        </div>
        <div className="h-px bg-surface-elevated w-full" />
        <div className="flex justify-between items-center">
          <span className="text-neutral-500 font-bold uppercase text-[11px]">ENCODING:</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" /> UTF-8 BOM
          </span>
        </div>
      </div>
    </div>
  );
}
