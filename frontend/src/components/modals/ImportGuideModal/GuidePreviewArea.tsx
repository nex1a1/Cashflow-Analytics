// frontend/src/components/modals/ImportGuideModal/GuidePreviewArea.tsx
import React, { useState, useMemo, memo } from 'react';
import { Search, X, Info, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { Category, DayType } from '../../../types';
import { formatMoney } from '../../../utils/formatters';
import { GuidePreviewAreaProps } from './types';
import {
  getLongHeaders,
  getLongSampleRows,
  getWideHeaders,
  getWideSampleRows,
  resolveDayTypeVisual,
  LongVariation,
  HeaderLanguage,
} from './guideUtils';

const CATEGORY_COLORS: Record<string, { color: string; icon: string }> = {
  'เกมมิ่งเกียร์ & อุปกรณ์ต่อพ่วง': { color: '#818cf8', icon: '🎮' },
  'อาหาร': { color: '#f87171', icon: '🍔' },
  'อาหารและเครื่องดื่ม': { color: '#f87171', icon: '🍔' },
  'ซอฟต์แวร์ & AI': { color: '#38bdf8', icon: '🤖' },
  'ช้อปปิ้งออนไลน์': { color: '#fbbf24', icon: '🛍️' },
  'เงินเดือน': { color: '#34d399', icon: '💰' },
  'การลงทุนและออมเงิน': { color: '#2dd4bf', icon: '📈' },
  'สมาชิกช้อปปิ้ง': { color: '#f472b6', icon: '👑' },
  'การเดินทาง': { color: '#a78bfa', icon: '🚗' },
  'ของใช้ในบ้าน': { color: '#94a3b8', icon: '🏠' },
  'อื่นๆ': { color: '#71717a', icon: '📦' },
};

function resolveCategoryVisual(catName: string, categories: Category[]) {
  const found = categories.find(c => c.name === catName);
  if (found) {
    return {
      color: found.color || '#a3a3a3',
      icon: found.icon || '📌',
    };
  }
  const fallback = CATEGORY_COLORS[catName];
  if (fallback) return fallback;
  return { color: '#a3a3a3', icon: '📌' };
}

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

  return (
    <div className="flex-1 flex flex-col p-5 bg-[#141414] overflow-hidden select-none">
      {/* Top Preview Controls (Matching ExportPreview) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-neutral-300">
            ตัวอย่างเอกสาร <span className="text-neutral-500 font-mono font-normal">/ PREVIEW</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#202020] border border-[#333333] text-neutral-400">
            {isLong
              ? `แสดงตัวอย่าง ${filteredLongRows.length} จาก ${allLongRows.length} รายการ (${longHeaders.length} คอลัมน์)`
              : `แสดงตัวอย่าง ${filteredWideRows.length} วัน (${effectiveCategories.length} หมวดหมู่)`}
          </span>
        </div>

        {/* Search in preview */}
        <div className="relative w-full sm:w-[260px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
          <input
            type="text"
            placeholder="ค้นหาในตัวอย่าง..."
            value={previewSearch}
            onChange={e => setPreviewSearch(e.target.value)}
            className="w-full bg-[#121212] border border-[#383838] pl-8 pr-7 py-1.5 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-[#da291c] rounded-none transition-colors"
          />
          {previewSearch && (
            <button
              type="button"
              onClick={() => setPreviewSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Preview Container (Matching ExportLongTable & ExportWideTable) */}
      <div className="flex-1 border border-[#2e2e2e] bg-[#121212] flex flex-col overflow-hidden relative">
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          {isLong ? (
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs leading-normal border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-[#1c1c1c] text-neutral-300 z-10 select-none border-b border-[#303030]">
                  <tr>
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                      {headerLang === 'en' ? 'Date' : 'วันที่'}
                    </th>
                    {longVariation === 'full' && (
                      <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                        {headerLang === 'en' ? 'DayType' : 'ประเภทวัน'}
                      </th>
                    )}
                    {(longVariation === 'full' || longVariation === 'standard') && (
                      <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                        {headerLang === 'en' ? 'Type' : 'ประเภท'}
                      </th>
                    )}
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                      {headerLang === 'en' ? 'Category' : 'หมวดหมู่'}
                    </th>
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                      {headerLang === 'en' ? 'Description' : 'รายละเอียด'}
                    </th>
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400 text-right">
                      {headerLang === 'en' ? 'Amount (฿)' : 'จำนวนเงิน (฿)'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filteredLongRows.map((t, idx) => {
                    const dt = resolveDayTypeVisual(t.date, dayTypeConfig);
                    const isIncome = t.type === 'income';
                    const isSavings = t.type === 'savings';

                    let typeBadgeClass = 'text-rose-400 bg-rose-950/30 border-rose-900/40';
                    let amountColor = 'text-rose-400';
                    let amountPrefix = '-';
                    let typeDisplay = headerLang === 'en' ? 'EXPENSE' : 'EXPENSE';

                    if (isIncome) {
                      typeBadgeClass = 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40';
                      amountColor = 'text-emerald-400';
                      amountPrefix = '+';
                      typeDisplay = 'INCOME';
                    } else if (isSavings) {
                      typeBadgeClass = 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40';
                      amountColor = 'text-cyan-400';
                      amountPrefix = '±';
                      typeDisplay = 'SAVINGS';
                    }

                    const catVis = resolveCategoryVisual(t.category, categories);

                    return (
                      <tr key={t.id || idx} className="hover:bg-[#1a1a1a] transition-colors group">
                        {/* Date */}
                        <td className="py-2 px-3 text-neutral-300 font-mono text-[11px] whitespace-nowrap">
                          {t.date}
                        </td>

                        {/* Day Type Badge */}
                        {longVariation === 'full' && (
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-none border inline-block select-none font-mono"
                              style={{
                                color: dt.color,
                                borderColor: `${dt.color}40`,
                                backgroundColor: `${dt.color}15`,
                              }}
                            >
                              {t.dayType || dt.label}
                            </span>
                          </td>
                        )}

                        {/* Type */}
                        {(longVariation === 'full' || longVariation === 'standard') && (
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${typeBadgeClass}`}>
                              {typeDisplay}
                            </span>
                          </td>
                        )}

                        {/* Category */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className="text-[11px] font-medium px-2 py-0.5 rounded-none border inline-flex items-center gap-1.5"
                            style={{
                              color: catVis.color,
                              borderColor: `${catVis.color}35`,
                              backgroundColor: `${catVis.color}12`,
                            }}
                          >
                            {catVis.icon && <span>{catVis.icon}</span>}
                            <span>{t.category}</span>
                          </span>
                        </td>

                        {/* Description */}
                        <td className="py-2 px-3 text-neutral-200 text-xs max-w-[240px] truncate" title={t.description}>
                          {t.description || '—'}
                        </td>

                        {/* Amount */}
                        <td className={`py-2 px-3 text-right font-mono font-bold text-xs tabular-nums ${amountColor}`}>
                          {amountPrefix}
                          {formatMoney(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs leading-normal border-collapse min-w-[800px]">
                <thead className="sticky top-0 bg-[#1c1c1c] text-neutral-300 z-10 select-none border-b border-[#303030]">
                  <tr>
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400 sticky left-0 bg-[#1c1c1c] z-20">
                      {headerLang === 'en' ? 'Date' : 'วันที่ (Date)'}
                    </th>
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                      {headerLang === 'en' ? 'DayType' : 'ประเภทวัน'}
                    </th>
                    {wideDataCats.map(cat => {
                      const vis = resolveCategoryVisual(cat, categories);
                      return (
                        <th
                          key={cat}
                          className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-right whitespace-nowrap"
                          style={{ color: vis.color }}
                        >
                          {cat}
                        </th>
                      );
                    })}
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-right text-[#da291c] sticky right-0 bg-[#1c1c1c] z-20">
                      {headerLang === 'en' ? 'Total' : 'รวมสุทธิ (Total)'}
                    </th>
                    <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400 whitespace-nowrap">
                      {headerLang === 'en' ? 'Notes' : 'Notes'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {filteredWideRows.map(row => {
                    const dt = resolveDayTypeVisual(row.date, dayTypeConfig);
                    return (
                      <tr key={row.id} className="hover:bg-[#1a1a1a] transition-colors group">
                        {/* Date (sticky left) */}
                        <td className="py-2 px-3 text-neutral-300 font-mono text-[11px] whitespace-nowrap sticky left-0 bg-[#121212] group-hover:bg-[#1a1a1a] z-10 border-r border-[#262626]">
                          {row.date}
                        </td>

                        {/* Day Type Badge */}
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-none border inline-block select-none font-mono"
                            style={{
                              color: dt.color,
                              borderColor: `${dt.color}40`,
                              backgroundColor: `${dt.color}15`,
                            }}
                          >
                            {dt.label}
                          </span>
                        </td>

                        {/* Category Columns */}
                        {wideDataCats.map(cat => {
                          const val = row.categoryAmounts[cat];
                          return (
                            <td
                              key={cat}
                              className={`py-2 px-3 text-right font-mono text-xs tabular-nums whitespace-nowrap ${
                                val ? 'text-neutral-200 font-medium' : 'text-neutral-600'
                              }`}
                            >
                              {val ? formatMoney(val) : '—'}
                            </td>
                          );
                        })}

                        {/* Total (sticky right) */}
                        <td className="py-2 px-3 text-right font-mono font-bold text-xs tabular-nums text-white sticky right-0 bg-[#121212] group-hover:bg-[#1a1a1a] z-10 border-l border-[#262626]">
                          {formatMoney(row.total)}
                        </td>

                        {/* Notes */}
                        <td className="py-2 px-3 text-neutral-300 text-xs whitespace-nowrap">
                          {row.note || <span className="text-neutral-600 font-mono">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Hint (Matching ExportPreview) */}
      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-neutral-400 shrink-0">
        <div className="flex items-start gap-2">
          <Info className="w-3.5 h-3.5 text-[#da291c] shrink-0 mt-0.5" />
          <p className="leading-snug">
            ระบบฝังรหัส <strong className="text-neutral-300">UTF-8 BOM</strong> ในไฟล์ CSV อัตโนมัติ เพื่อให้เปิดใน Microsoft Excel และ Google Sheets ได้โดยภาษาไทยไม่เพี้ยน
          </p>
        </div>

        {/* Collapsible Specs Button */}
        <button
          type="button"
          onClick={() => setShowSpecs(!showSpecs)}
          className="flex items-center gap-1 text-[10px] font-mono uppercase text-neutral-400 hover:text-neutral-200 cursor-pointer shrink-0"
        >
          <Layers className="w-3.5 h-3.5 text-[#da291c]" />
          <span>{showSpecs ? 'ซ่อนสเปกการถอดรหัส' : 'ดูกฎเกณฑ์การถอดรหัส (4 ข้อ)'}</span>
          {showSpecs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Accordion / Collapsible Decoding Specifications Grid */}
      {showSpecs && (
        <div className="mt-2.5 border border-[#303030] p-3.5 rounded-none bg-[#121212] shrink-0 space-y-2 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex gap-2.5 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-200 text-[11px]">
                  {isLong ? 'ซิงค์ปฏิทินตามชนิดวัน (Calendar Sync)' : 'จับคู่หัวคอลัมน์แนวนอนอัตโนมัติ'}
                </span>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  {isLong
                    ? 'คอลัมน์ "ชนิดวัน" จะถูกเชื่อมโยงและบันทึกสถิติประเภทวันลงในหน้าปฏิทินระบบโดยอัตโนมัติ'
                    : 'ระบบจะสแกนชื่อคอลัมน์ภาษาไทยเข้ากับหมวดหมู่ที่คุณตั้งค่าไว้ในระบบโดยตรง'}
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-200 text-[11px]">
                  {isLong ? 'รองรับธุรกรรมครบ 3 ขา (รายรับ/จ่าย/ออม)' : 'ตัดคอลัมน์ผลรวมออกเพื่อความปลอดภัย'}
                </span>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  {isLong
                    ? 'คอลัมน์ "ประเภท" รองรับ รายรับ รายจ่าย และเงินออม เพื่อประมวลผลกระแสเงินสดทุกรูปแบบพร้อมกัน'
                    : 'คอลัมน์ "รวม (Total)", "Date", "Notes" จะถูกเพิกเฉยอัตโนมัติในการสร้างยอดเงิน เพื่อป้องกันยอดเบิ้ล'}
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-200 text-[11px]">
                  ระบบสร้างหมวดหมู่อัตโนมัติ (Auto-Provision)
                </span>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  หากพบชื่อหมวดหมู่ที่ยังไม่มีในระบบ เอ็นจิ้นจะทำการสร้างหมวดหมู่ใหม่ขึ้นให้อัตโนมัติโดยโครงสร้างไม่พัง
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="w-1.5 h-1.5 rounded-full bg-[#da291c] mt-1.5 shrink-0" />
              <div>
                <span className="font-bold text-neutral-200 text-[11px]">
                  {isLong ? 'สเปกตัวเลข Satang-First Precision' : 'ทนทานต่อช่องว่าง (Null Tolerance)'}
                </span>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  {isLong
                    ? 'แปลงตัวเลขเป็นหน่วยสตางค์ (x100 Satang Integer) เพื่อความแม่นยำทางคณิตศาสตร์การเงินระดับบัญชี'
                    : 'ช่องว่าง หรือสัญลักษณ์ "฿ -" จะถูกประเมินเป็น 0 และข้ามไปอย่างปลอดภัย ไม่เกิด Error หยุดทำงาน'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default GuidePreviewArea;
