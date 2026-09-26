// frontend/src/components/modals/ImportGuideModal/GuideSidebar.tsx
import React, { memo } from 'react';
import {
  ClipboardList,
  FileSpreadsheet,
} from 'lucide-react';
import { GuideFormat, GuideSidebarProps } from './types';
import { LongVariation } from './guideUtils';

interface FormatCardProps {
  formatKey: GuideFormat;
  activeFormat: GuideFormat;
  onClick: (fmt: GuideFormat) => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
}

const FormatCard = ({
  formatKey,
  activeFormat,
  onClick,
  icon: Icon,
  title,
  subtitle,
  description,
  badge,
}: FormatCardProps) => {
  const isActive = activeFormat === formatKey;

  return (
    <button
      type="button"
      onClick={() => onClick(formatKey)}
      className={`w-full flex items-start gap-3 p-3 rounded-none border text-left transition-colors relative cursor-pointer ${
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

const GuideSidebar = memo(function GuideSidebar({
  selectedFormat,
  onSelectFormat,
  longVariation,
  onSelectLongVariation,
  categorySource,
  onToggleCategorySource,
  systemExpenseCount,
  delimiter,
  setDelimiter,
  headerLang,
  setHeaderLang,
}: GuideSidebarProps) {
  const isLong = selectedFormat === 'long';

  return (
    <div className="w-[330px] xl:w-[350px] shrink-0 border-r border-line flex flex-col bg-canvas p-5 overflow-y-auto custom-scrollbar space-y-5 select-none">
      {/* 01. Format Type */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-300">
            01. รูปแบบโครงสร้างไฟล์ <span className="text-neutral-500 font-mono font-normal">/ FORMAT</span>
          </h4>
        </div>
        <div className="space-y-2">
          <FormatCard
            formatKey="long"
            activeFormat={selectedFormat}
            onClick={onSelectFormat}
            icon={ClipboardList}
            title="รายงานแยกรายการ"
            subtitle="Long Ledger CSV"
            description="เรียงตามวัน เหมาะสำหรับตรวจรายการ ย้อนหลัง และ Import ประวัติ"
            badge="แนะนำ"
          />

          <FormatCard
            formatKey="wide"
            activeFormat={selectedFormat}
            onClick={onSelectFormat}
            icon={FileSpreadsheet}
            title="สเปรดชีตวิเคราะห์รายวัน"
            subtitle="Wide Matrix CSV"
            description="ตารางเปรียบเทียบหมวดหมู่รายวัน สำหรับย้ายข้อมูลตรงจาก Excel"
          />
        </div>
      </section>

      {/* 02. Template Options */}
      <section className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-widest text-neutral-300">
          02. ตัวเลือกเทมเพลต <span className="text-neutral-500 font-mono font-normal">/ TEMPLATE OPTIONS</span>
        </h4>

        {isLong ? (
          <div className="bg-surface p-2.5 rounded-none border border-line space-y-2">
            <span className="text-[11px] text-neutral-400 font-bold uppercase block tracking-wider">
              โครงสร้างคอลัมน์ (Column Structure)
            </span>
            <div className="grid grid-cols-3 gap-1 bg-canvas p-1 border border-line-strong">
              {(['full', 'standard', 'minimal'] as LongVariation[]).map((v) => {
                const isAct = longVariation === v;
                const label = v === 'full' ? '6 คอลัมน์' : v === 'standard' ? '5 คอลัมน์' : '4 คอลัมน์';
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onSelectLongVariation(v)}
                    className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                      isAct
                        ? 'bg-accent text-on-accent'
                        : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-neutral-500 font-sans leading-tight">
              {longVariation === 'full' && 'ครบวงจร: มีชนิดวัน (ซิงค์ปฏิทิน) และประเภท รายรับ/รายจ่าย/เงินออม'}
              {longVariation === 'standard' && 'มาตรฐาน: มีประเภท รายรับ/รายจ่าย (ชนิดวันอิงตามปฏิทินปกติ)'}
              {longVariation === 'minimal' && 'แบบย่อ: บันทึกเป็นรายจ่ายทั้งหมดอัตโนมัติ เหมาะกับสลิปค่าใช้จ่าย'}
            </p>
          </div>
        ) : (
          <div className="bg-surface p-2.5 rounded-none border border-line space-y-2">
            <span className="text-[11px] text-neutral-400 font-bold uppercase block tracking-wider">
              หมวดหมู่หัวตาราง (Categories Source)
            </span>
            <div className="grid grid-cols-2 gap-1 bg-canvas p-1 border border-line-strong">
              <button
                type="button"
                onClick={() => onToggleCategorySource('system')}
                className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  categorySource === 'system'
                    ? 'bg-accent text-on-accent'
                    : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                หมวดหมู่ในระบบ ({systemExpenseCount})
              </button>
              <button
                type="button"
                onClick={() => onToggleCategorySource('standard')}
                className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                  categorySource === 'standard'
                    ? 'bg-accent text-on-accent'
                    : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
                }`}
              >
                หมวดหมู่มาตรฐาน (5)
              </button>
            </div>
            <p className="text-[11px] text-neutral-500 font-sans leading-tight">
              {categorySource === 'system'
                ? 'ดึงชื่อหมวดหมู่จริงของคุณในระบบมาเป็นหัวคอลัมน์ให้อัตโนมัติ'
                : 'ใช้หมวดหมู่ตัวอย่างทั่วไปสำหรับการทดสอบนำเข้า'}
            </p>
          </div>
        )}
      </section>

      {/* 03. Format Options (Delimiter & Language) */}
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
              className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
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
              className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
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
              className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
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
              className={`py-1 text-[11px] font-bold transition-colors cursor-pointer ${
                headerLang === 'en'
                  ? 'bg-accent text-on-accent'
                  : 'text-neutral-400 hover:text-white hover:bg-surface-elevated'
              }`}
            >
              English (EN)
            </button>
          </div>
        </div>
      </section>
    </div>
  );
});

export default GuideSidebar;
