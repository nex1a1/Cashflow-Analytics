// frontend/src/components/modals/ImportGuideModal/GuidePreviewArea.tsx
import { useState, useMemo, memo } from 'react';
import { Info, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Category } from '../../../types';
import { GuidePreviewAreaProps } from './types';
import {
  getLongHeaders,
  getLongSampleRows,
  getWideHeaders,
  getWideSampleRows,
  resolveDayTypeVisual,
} from './guideUtils';
import { LongTable, PreviewFrame, PreviewTopBar, WideTable, flowStyle } from '../csvPreview';

import { tc, readable } from '@/constants/theme';
const CATEGORY_COLORS: Record<string, { color: string; icon: string }> = {
  'เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง': { color: '#818cf8', icon: '🎮' },
  'อาหาร': { color: tc('expense'), icon: '🍔' },
  'อาหารและเครื่องดื่ม': { color: tc('expense'), icon: '🍔' },
  'ซอฟต์แวร์ & AI': { color: '#38bdf8', icon: '🤖' },
  'ช้อปปิ้งออนไลน์': { color: '#fbbf24', icon: '🛍️' },
  'เงินเดือน': { color: tc('income'), icon: '💰' },
  'การลงทุนและออมเงิน': { color: '#2dd4bf', icon: '📈' },
  'สมาชิกช้อปปิ้ง': { color: '#f472b6', icon: '👑' },
  'การเดินทาง': { color: '#a78bfa', icon: '🚗' },
  'ของใช้ในบ้าน': { color: tc('ink-body'), icon: '🏠' },
  'อื่นๆ': { color: tc('ink-muted'), icon: '📦' },
};

function resolveCategoryVisual(catName: string, categories: Category[]) {
  const found = categories.find(c => c.name === catName);
  if (found) {
    return {
      color: readable(found.color || tc('ink-body')),
      icon: found.icon || '📌',
    };
  }
  const fallback = CATEGORY_COLORS[catName];
  if (fallback) return fallback;
  return { color: tc('ink-body'), icon: '📌' };
}

// The file-reading rules shown under "ดูกติกาการอ่านไฟล์": [title, explanation]
const NEW_CATEGORY_SPEC = ['สร้างหมวดหมู่ใหม่ให้', 'ถ้าเจอชื่อหมวดหมู่ที่ยังไม่มีในระบบ จะสร้างหมวดหมู่ใหม่ให้เอง'] as const;
const LONG_SPECS = [
  ['อัปเดตปฏิทินตามชนิดวัน', 'ค่าในคอลัมน์ "ชนิดวัน" จะถูกบันทึกเป็นประเภทวันในหน้าปฏิทินให้เลย'],
  ['รองรับรายรับ รายจ่าย และเงินออม', 'คอลัมน์ "ประเภท" ใส่ได้ทั้ง รายรับ รายจ่าย และเงินออม ในไฟล์เดียว'],
  NEW_CATEGORY_SPEC,
  ['เก็บยอดเป็นสตางค์', 'ยอดเงินถูกคูณ 100 เก็บเป็นสตางค์แบบจำนวนเต็ม ทศนิยมจึงไม่คลาดเคลื่อน'],
] as const;
const WIDE_SPECS = [
  ['จับคู่หัวคอลัมน์แนวนอนอัตโนมัติ', 'ชื่อคอลัมน์จะถูกจับคู่กับชื่อหมวดหมู่ที่คุณตั้งไว้'],
  ['ข้ามคอลัมน์ผลรวม', 'คอลัมน์ "รวม (Total)", "Date", "Notes" จะไม่ถูกนำไปคิดเป็นยอดเงิน ยอดจึงไม่นับซ้ำ'],
  NEW_CATEGORY_SPEC,
  ['ช่องว่างนับเป็น 0', 'ช่องว่าง หรือสัญลักษณ์ "฿ -" จะนับเป็น 0 และนำเข้าต่อได้ตามปกติ'],
] as const;

const GuidePreviewArea = memo(function GuidePreviewArea({
  selectedFormat,
  longVariation,
  effectiveCategories,
  categories,
  dayTypeConfig,
  headerLang,
  previewSearch,
  setPreviewSearch,
}: GuidePreviewAreaProps) {
  const isLong = selectedFormat === 'long';
  const [showSpecs, setShowSpecs] = useState(false);

  // Filter Long sample rows
  const allLongRows = useMemo(() => getLongSampleRows(), []);
  const filteredLongRows = useMemo(() => {
    if (!previewSearch.trim()) return allLongRows;
    const q = previewSearch.toLowerCase();
    return allLongRows.filter(
      r =>
        r.date.includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        (r.dayType && r.dayType.toLowerCase().includes(q))
    );
  }, [allLongRows, previewSearch]);

  // Filter Wide sample rows
  const allWideRows = useMemo(() => getWideSampleRows(effectiveCategories), [effectiveCategories]);
  const filteredWideRows = useMemo(() => {
    if (!previewSearch.trim()) return allWideRows;
    const q = previewSearch.toLowerCase();
    return allWideRows.filter(
      r => r.date.includes(q) || (r.note && r.note.toLowerCase().includes(q))
    );
  }, [allWideRows, previewSearch]);

  const longHeaders = getLongHeaders(longVariation, headerLang);
  const wideHeaders = getWideHeaders(effectiveCategories, headerLang);
  const wideDataCats = wideHeaders.slice(1, wideHeaders.length - 2);
  const en = headerLang === 'en';

  return (
    <div className="flex-1 flex flex-col p-5 bg-surface overflow-hidden select-none">
      <PreviewTopBar
        count={isLong
          ? `แสดงตัวอย่าง ${filteredLongRows.length} จาก ${allLongRows.length} รายการ (${longHeaders.length} คอลัมน์)`
          : `แสดงตัวอย่าง ${filteredWideRows.length} วัน (${effectiveCategories.length} หมวดหมู่)`}
        search={previewSearch}
        setSearch={setPreviewSearch}
      />

      <PreviewFrame>
        {isLong ? (
          <LongTable
            cols={{ dayType: longVariation === 'full', type: longVariation !== 'minimal', group: false }}
            labels={en
              ? { date: 'Date', dayType: 'DayType', type: 'Type', category: 'Category', description: 'Description', amount: 'Amount (฿)' }
              : { date: 'วันที่', dayType: 'ประเภทวัน', type: 'ประเภท', category: 'หมวดหมู่', description: 'รายละเอียด', amount: 'จำนวนเงิน (฿)' }}
            rows={filteredLongRows.map((t, idx) => {
              const dt = resolveDayTypeVisual(t.date, dayTypeConfig);
              const type = t.type === 'income' || t.type === 'savings' ? t.type : 'expense';
              const vis = resolveCategoryVisual(t.category, categories);
              return {
                key: t.id || String(idx),
                date: t.date,
                dayType: { label: t.dayType || dt.label, color: dt.color },
                type,
                typeLabel: type.toUpperCase(),
                sign: flowStyle(type).sign,
                category: { name: t.category, color: vis.color, textColor: readable(vis.color), icon: vis.icon },
                description: t.description,
                amount: t.amount,
              };
            })}
          />
        ) : (
          <WideTable
            labels={en
              ? { date: 'Date', dayType: 'DayType', total: 'Total', notes: 'Notes' }
              : { date: 'วันที่ (Date)', dayType: 'ประเภทวัน', total: 'รวมสุทธิ (Total)', notes: 'Notes' }}
            columns={wideDataCats.map(cat => ({ key: cat, name: cat, color: resolveCategoryVisual(cat, categories).color }))}
            rows={filteredWideRows.map(row => ({
              key: row.id,
              date: row.date,
              dayType: resolveDayTypeVisual(row.date, dayTypeConfig),
              values: wideDataCats.map(cat => row.categoryAmounts[cat]),
              total: row.total,
              note: row.note,
            }))}
          />
        )}
      </PreviewFrame>

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-neutral-400 shrink-0">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-accent-ink shrink-0 mt-0.5" />
          <p className="leading-snug">
            ระบบฝังรหัส <strong className="text-neutral-300">UTF-8 BOM</strong> ในไฟล์ CSV อัตโนมัติ เพื่อให้เปิดใน Microsoft Excel และ Google Sheets ได้โดยภาษาไทยไม่เพี้ยน
          </p>
        </div>

        {/* Collapsible Specs Button */}
        <button
          type="button"
          onClick={() => setShowSpecs(!showSpecs)}
          className="flex items-center gap-1 text-[11px] font-mono uppercase text-neutral-400 hover:text-neutral-200 cursor-pointer shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-accent-ink" />
          <span>{showSpecs ? 'ซ่อนกติกา' : 'ดูกติกาการอ่านไฟล์ (4 ข้อ)'}</span>
          {showSpecs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {showSpecs && (
        <div className="mt-2.5 border border-line p-3.5 rounded-none bg-surface shrink-0 space-y-2 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(isLong ? LONG_SPECS : WIDE_SPECS).map(([title, text]) => (
              <div key={title} className="flex gap-2.5 items-start">
                <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                <div>
                  <span className="font-bold text-neutral-200 text-[11px]">{title}</span>
                  <p className="text-[11px] text-neutral-400 leading-snug">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default GuidePreviewArea;
