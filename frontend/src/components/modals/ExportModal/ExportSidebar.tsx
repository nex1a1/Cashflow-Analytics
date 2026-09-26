// frontend/src/components/modals/ExportModal/ExportSidebar.tsx
import React from 'react';
import {
  ClipboardList,
  FileSpreadsheet,
  Layers,
  Database,
  ShieldCheck,
  Check,
} from 'lucide-react';
import PeriodPicker from '../../layout/PeriodPicker';
import { ExportFormatCardProps, ExportFormatKey, ExportSidebarProps, ExportTypeFilter } from './types';

const ExportFormatCard = ({
  formatKey,
  activeFormat,
  onClick,
  icon: Icon,
  title,
  subtitle,
  description,
  badge,
}: ExportFormatCardProps) => {
  const isActive = activeFormat === formatKey;

  return (
    <button
      type="button"
      onClick={() => onClick(formatKey)}
      className={`w-full flex items-start gap-3 p-3 rounded-none border text-left transition-colors relative ${
        isActive
          ? 'border-accent bg-accent/10 text-white'
          : 'border-line bg-surface hover:border-accent/40 text-neutral-400 hover:text-neutral-200'
      }`}
    >
      <div
        className={`p-1.5 rounded-none border mt-0.5 shrink-0 ${
          isActive
            ? 'border-accent bg-accent/20 text-accent'
            : 'border-line-strong bg-canvas text-neutral-500'
        }`}
      >
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h5 className="text-xs font-black uppercase tracking-wide truncate">{title}</h5>
          {badge && (
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-none bg-accent/20 text-accent border border-accent/30 uppercase font-bold shrink-0">
              {badge}
            </span>
          )}
        </div>
        <p className="text-[11px] font-mono text-neutral-500 mt-0.5">{subtitle}</p>
        <p className="text-[11px] text-neutral-400 mt-1 leading-snug">{description}</p>
      </div>

      {isActive && (
        <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-accent" />
      )}
    </button>
  );
};

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
  const isCsvFormat = exportFormat !== 'backup_json';

  return (
    <div className="w-[330px] xl:w-[350px] shrink-0 border-r border-line flex flex-col bg-canvas p-5 overflow-y-auto custom-scrollbar space-y-5">
      {/* 01. Date Period */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-300">
            01. ขอบเขตช่วงเวลา <span className="text-neutral-500 font-mono font-normal">/ PERIOD</span>
          </h4>
        </div>
        <div className="bg-surface p-2.5 rounded-none border border-line">
          <PeriodPicker
            filterPeriod={exportPeriod}
            setFilterPeriod={setExportPeriod}
            groupedOptions={groupedOptions || { yearsMap: {}, sortedYears: [] }}
            align="left"
          />
        </div>
      </section>

      {/* 02. Document Format */}
      <section className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-300">
          02. รูปแบบรายงาน <span className="text-neutral-500 font-mono font-normal">/ FORMAT</span>
        </h4>
        <div className="space-y-2">
          <ExportFormatCard
            formatKey="long"
            activeFormat={exportFormat}
            onClick={setExportFormat}
            icon={ClipboardList}
            title="รายงานแยกรายการ"
            subtitle="Long Ledger CSV"
            description="เรียงตามวัน เหมาะสำหรับตรวจรายการ ย้อนหลัง และ Import ซ้ำ"
            badge="แนะนำ"
          />

          <ExportFormatCard
            formatKey="wide"
            activeFormat={exportFormat}
            onClick={setExportFormat}
            icon={FileSpreadsheet}
            title="สเปรดชีตวิเคราะห์"
            subtitle="Wide Matrix CSV"
            description="ตารางเปรียบเทียบหมวดหมู่รายวัน สำหรับรัน Pivot Excel"
          />

          <ExportFormatCard
            formatKey="full_csv"
            activeFormat={exportFormat}
            onClick={setExportFormat}
            icon={Layers}
            title="รายงานข้อมูลละเอียดครบ"
            subtitle="Full Detail Extended CSV"
            description="มีครบทุกฟิลด์การเงิน รหัส กลุ่ม และประเภทการจัดสรร"
          />

          <ExportFormatCard
            formatKey="backup_json"
            activeFormat={exportFormat}
            onClick={setExportFormat}
            icon={Database}
            title="สำเนาฐานข้อมูลระบบ"
            subtitle="Full Database JSON Backup"
            description="สำเนา JSON สำหรับแบ็กอัปประวัติ หมวดหมู่ และปฏิทิน 100%"
            badge="JSON"
          />
        </div>
      </section>

      {/* 03. Format Options (Only for CSV) */}
      {isCsvFormat && (
        <section className="space-y-3 bg-surface p-3.5 rounded-none border border-line">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-300">
            03. ตัวเลือกเอกสาร <span className="text-neutral-500 font-mono font-normal">/ OPTIONS</span>
          </h4>

          {/* Delimiter */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-neutral-400 font-bold uppercase block tracking-wider">
              เครื่องหมายคั่น (CSV Delimiter)
            </span>
            <div className="grid grid-cols-2 gap-1 bg-canvas p-1 border border-line-strong">
              <button
                type="button"
                onClick={() => setDelimiter(',')}
                className={`py-1 text-[11px] font-bold transition-colors ${
                  delimiter === ','
                    ? 'bg-accent text-on-accent'
                    : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Comma ( , )
              </button>
              <button
                type="button"
                onClick={() => setDelimiter(';')}
                className={`py-1 text-[11px] font-bold transition-colors ${
                  delimiter === ';'
                    ? 'bg-accent text-on-accent'
                    : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                Semicolon ( ; )
              </button>
            </div>
          </div>

          {/* Header Language */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-neutral-400 font-bold uppercase block tracking-wider">
              ภาษาของหัวตาราง (Header Language)
            </span>
            <div className="grid grid-cols-2 gap-1 bg-canvas p-1 border border-line-strong">
              <button
                type="button"
                onClick={() => setHeaderLang('th')}
                className={`py-1 text-[11px] font-bold transition-colors ${
                  headerLang === 'th'
                    ? 'bg-accent text-on-accent'
                    : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                ภาษาไทย (TH)
              </button>
              <button
                type="button"
                onClick={() => setHeaderLang('en')}
                className={`py-1 text-[11px] font-bold transition-colors ${
                  headerLang === 'en'
                    ? 'bg-accent text-on-accent'
                    : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                English (EN)
              </button>
            </div>
          </div>

          {/* Type Filter */}
          <div className="space-y-1.5">
            <span className="text-[11px] text-neutral-400 font-bold uppercase block tracking-wider">
              ประเภทรายการ (Transaction Type)
            </span>
            <div className="grid grid-cols-2 gap-1">
              {(
                [
                  { key: 'all', label: 'ทั้งหมด' },
                  { key: 'expense', label: 'รายจ่าย' },
                  { key: 'income', label: 'รายรับ' },
                  { key: 'savings', label: 'เงินออม' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTypeFilter(opt.key)}
                  className={`py-1.5 px-2 text-[11px] font-bold text-left border transition-colors ${
                    typeFilter === opt.key
                      ? 'border-accent bg-accent/20 text-white'
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

      {/* HUD Telemetry Card */}
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
        <div className="h-[1px] bg-surface-elevated w-full" />
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
