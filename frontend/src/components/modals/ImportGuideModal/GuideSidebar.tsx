// frontend/src/components/modals/ImportGuideModal/GuideSidebar.tsx
import { memo } from 'react';
import { ClipboardList, FileSpreadsheet } from 'lucide-react';
import { GuideSidebarProps } from './types';
import { LongVariation } from './guideUtils';
import { CsvDocOptions, FormatCard, OptionLabel, SegChoice, SidebarHeading } from '../csvModalParts';

const VARIATIONS: readonly (readonly [LongVariation, string])[] = [['full', '6 คอลัมน์'], ['standard', '5 คอลัมน์'], ['minimal', '4 คอลัมน์']];
const VARIATION_NOTE: Record<LongVariation, string> = {
  full: 'แบบเต็ม: มีคอลัมน์ชนิดวัน (อัปเดตปฏิทินให้) และประเภท รายรับ/รายจ่าย/เงินออม',
  standard: 'มาตรฐาน: มีประเภท รายรับ/รายจ่าย (ประเภทวันใช้ตามปฏิทินปกติ)',
  minimal: 'แบบย่อ: บันทึกเป็นรายจ่ายทั้งหมดอัตโนมัติ เหมาะกับสลิปค่าใช้จ่าย',
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
      <section className="space-y-2">
        <SidebarHeading n="01" th="รูปแบบโครงสร้างไฟล์" en="FORMAT" />
        <div className="space-y-2">
          <FormatCard
            active={isLong}
            onClick={() => onSelectFormat('long')}
            icon={ClipboardList}
            title="รายงานแยกรายการ"
            subtitle="Long Ledger CSV"
            description="เรียงตามวัน เหมาะสำหรับตรวจรายการ ย้อนหลัง และนำเข้าข้อมูลย้อนหลัง"
            badge="แนะนำ"
          />
          <FormatCard
            active={!isLong}
            onClick={() => onSelectFormat('wide')}
            icon={FileSpreadsheet}
            title="สเปรดชีตวิเคราะห์รายวัน"
            subtitle="Wide Matrix CSV"
            description="ตารางเปรียบเทียบหมวดหมู่รายวัน สำหรับย้ายข้อมูลตรงจาก Excel"
          />
        </div>
      </section>

      <section className="space-y-2">
        <SidebarHeading n="02" th="ตัวเลือกเทมเพลต" en="TEMPLATE OPTIONS" />
        <div className="bg-surface p-2.5 rounded-none border border-line space-y-2">
          {isLong ? (
            <>
              <OptionLabel>โครงสร้างคอลัมน์</OptionLabel>
              <SegChoice cols={3} options={VARIATIONS} value={longVariation} onChange={onSelectLongVariation} />
              <p className="text-[11px] text-neutral-500 font-sans leading-tight">{VARIATION_NOTE[longVariation]}</p>
            </>
          ) : (
            <>
              <OptionLabel>หมวดหมู่หัวตาราง</OptionLabel>
              <SegChoice
                options={[['system', `หมวดหมู่ในระบบ (${systemExpenseCount})`], ['standard', 'หมวดหมู่มาตรฐาน (5)']]}
                value={categorySource}
                onChange={onToggleCategorySource}
              />
              <p className="text-[11px] text-neutral-500 font-sans leading-tight">
                {categorySource === 'system'
                  ? 'ดึงชื่อหมวดหมู่จริงของคุณในระบบมาเป็นหัวคอลัมน์ให้อัตโนมัติ'
                  : 'ใช้หมวดหมู่ตัวอย่างทั่วไปสำหรับการทดสอบนำเข้า'}
              </p>
            </>
          )}
        </div>
      </section>

      <section className="space-y-3 bg-surface p-3.5 rounded-none border border-line">
        <SidebarHeading n="03" th="ตัวเลือกเอกสาร" en="OPTIONS" />
        <CsvDocOptions delimiter={delimiter} setDelimiter={setDelimiter} headerLang={headerLang} setHeaderLang={setHeaderLang} />
      </section>
    </div>
  );
});

export default GuideSidebar;
