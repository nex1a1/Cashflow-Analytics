// src/views/Dashboard/components/CashflowTable/CashflowTableHeader.tsx
import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { CashflowGroup } from '@/types';
import { getHighlightBgColor, getSubHighlightBgColor } from './helpers';
import { MONTH_COL_CLS, GROUP_COL_CLS, CAT_COL_CLS } from './constants';
import { HeaderProps } from './types';

export const CashflowTableHeader = React.memo(({
  activeIncomeGroups,
  activeExpenseGroups,
  expandedGroups,
  toggleGroup,
  getActiveCatsForGroup,
  dm,
  thinBorder,
  boundaryBorder,
  boxBorder,
  handleMouseEnter,
  handleCategoryMouseEnter,
  handleMouseLeave,
  hoveredCol,
  setHoveredCol,
  excludedGroups,
  toggleGroupExclusion,
  excludedCategories,
  toggleCategoryExclusion,
}: HeaderProps) => {
  // Fix #5: use module-level highlight helpers (isRowHovered = false in header)
  const getHeaderGroupBg = (group: CashflowGroup, isColHovered: boolean) =>
    getHighlightBgColor(group, isColHovered, false, dm);
  const getHeaderCatBg = (group: CashflowGroup, subColor: string | null | undefined, isColHovered: boolean) =>
    getSubHighlightBgColor(group, subColor, isColHovered, false, dm);

  return (
    <thead className="sticky top-0 z-30 bg-[#121212]">
      <tr>
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('month')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold text-center sticky left-0 z-50 align-middle border-l border-r border-b ${thinBorder} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.15)] transition-colors ${MONTH_COL_CLS} ${
            hoveredCol === 'month' ? 'bg-[#303030] text-white' : 'text-neutral-200 bg-[#121212]'
          }`}
        >
          ช่วงเวลา
        </th>

        {activeIncomeGroups.length > 0 && (
          <th
            colSpan={activeIncomeGroups.reduce(
              (acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1),
              0,
            )}
            className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} text-emerald-400`}
          >
            รายรับ (+)
          </th>
        )}

        {activeExpenseGroups.length > 0 && (
          <th
            colSpan={activeExpenseGroups.reduce(
              (acc, g) => acc + (expandedGroups.has(g.id) ? getActiveCatsForGroup(g.id).length + 1 : 1),
              0,
            )}
            className={`px-3 py-1.5 font-black text-center border-l border-b border-dashed ${thinBorder} text-slate-400`}
          >
            รายจ่าย (-)
          </th>
        )}

        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('trend')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold border-l !border-l-[#3e3e3e] border-b ${thinBorder} align-middle sticky right-[250px] z-50 shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.35)] transition-colors w-[155px] min-w-[155px] max-w-[155px] ${
            hoveredCol === 'trend' ? 'bg-[#303030] text-[#da291c]' : 'text-[#da291c] bg-[#121212]'
          }`}
        >
          รวมรายจ่าย (Trend)
        </th>
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('net')}
          onMouseLeave={() => setHoveredCol(null)}
          className={`px-3 py-2.5 font-bold border-l border-b ${thinBorder} align-middle sticky right-[140px] z-50 transition-colors w-[110px] min-w-[110px] max-w-[110px] ${
            hoveredCol === 'net' ? 'bg-[#303030] text-white' : 'text-neutral-200 bg-[#121212]'
          }`}
        >
          เงินคงเหลือ
        </th>
        {/* Fix #10: เพิ่ม title tooltip อธิบายสูตรคำนวณ */}
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('pct-left')}
          onMouseLeave={() => setHoveredCol(null)}
          title="(เงินคงเหลือ ÷ รายรับรวม) × 100 — อัตราการออม"
          className={`px-2 py-2.5 font-bold border-l border-b text-center align-middle sticky right-[70px] z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors cursor-help ${
            hoveredCol === 'pct-left' ? 'bg-[#303030] text-white' : 'text-neutral-200 bg-[#121212]'
          }`}
        >
          %เหลือ
        </th>
        {/* Fix #10: เพิ่ม title tooltip อธิบายสูตรคำนวณ */}
        <th
          rowSpan={2}
          onMouseEnter={() => setHoveredCol('pct-spent')}
          onMouseLeave={() => setHoveredCol(null)}
          title="(รายจ่ายรวม ÷ รายรับรวม) × 100 — อัตราการใช้จ่าย"
          className={`px-2 py-2.5 font-bold border-l border-r border-b text-center align-middle sticky right-0 z-50 w-[70px] min-w-[70px] max-w-[70px] ${thinBorder} transition-colors cursor-help ${
            hoveredCol === 'pct-spent' ? 'bg-[#303030] text-white' : 'text-neutral-200 bg-[#121212]'
          }`}
        >
          %จ่าย
        </th>
      </tr>

      <tr>
        {activeIncomeGroups.map((g, idx) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const isLastIncome = idx === activeIncomeGroups.length - 1;
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isExcluded = excludedGroups.has(g.id);
          const groupColor = g.color || '#34d399';

          return (
            <React.Fragment key={g.id}>
              <th
                onMouseEnter={(e) => { handleMouseEnter(e, g); setHoveredCol(colId); }}
                onMouseLeave={() => { handleMouseLeave(); setHoveredCol(null); }}
                className={`px-2 py-1.5 font-extrabold text-center transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isLastIncome && !isExpanded ? boundaryBorder : ''} ${isExcluded ? 'opacity-40' : ''} ${GROUP_COL_CLS}`}
                style={{ color: isExcluded ? undefined : groupColor, backgroundColor: getHeaderGroupBg(g, isColHovered) }}
              >
                <div className="flex items-center justify-center gap-1 min-w-0">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`กลุ่มรายรับ ${g.name} - คลิกเพื่อ${isExpanded ? 'ยุบ' : 'ขยาย'}`}
                    onClick={() => toggleGroup(g.id)}
                    className={`cursor-pointer inline-flex items-center gap-1 bg-transparent border-0 p-0 transition-opacity select-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${isExcluded ? 'opacity-40 grayscale' : ''}`}
                  >
                    <CategoryGlyph
                      icon={g.icon}
                      color={isExcluded ? '#737373' : groupColor}
                      size={18}
                      fallbackEmoji="💰"
                    />
                    {cats.length > 0 && (
                      <span className={`text-[10px] font-mono leading-none ${isExpanded ? 'text-[#da291c]' : 'text-emerald-400/70'}`}>
                        {isExpanded ? '«' : '»'}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleGroupExclusion(g.id); }}
                    className={`p-1 rounded-none transition-colors inline-flex items-center justify-center shrink-0 ${
                      isExcluded
                        ? 'text-neutral-400 hover:text-neutral-300 hover:bg-[#303030]'
                        : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                    }`}
                    title={isExcluded ? `นำกลุ่ม ${g.name} กลับมารวมคำนวณ` : `ยกเว้นกลุ่ม ${g.name} จากการคำนวณ`}
                  >
                    {isExcluded ? <EyeOff className="w-3 h-3 text-rose-400/80" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              {isExpanded && cats.map((c, cIdx) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isExcluded || isCatExcluded;

                return (
                  <th
                    key={c.id}
                    onMouseEnter={(e) => { handleCategoryMouseEnter?.(e, g, c); setHoveredCol(catColId); }}
                    onMouseLeave={() => { handleMouseLeave(); setHoveredCol(null); }}
                    className={`px-2 py-1.5 font-black text-center text-[10px] uppercase border-l border-b transition-colors ${cIdx === cats.length - 1 && isLastIncome ? boundaryBorder : thinBorder} border-t-[#3e3e3e]/65 border-b-[#3e3e3e]/65 ${isCatFaded ? 'opacity-30' : ''} ${CAT_COL_CLS}`}
                    style={{ backgroundColor: getHeaderCatBg(g, c.color, isCatColHovered) }}
                    title={c.name}
                  >
                    <div className="flex items-center justify-center gap-1 min-w-0">
                      <CategoryGlyph icon={c.icon} color={isCatFaded ? '#64748B' : c.color} size={15} className={isCatFaded ? 'opacity-60' : ''} fallbackEmoji="📁" />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCategoryExclusion(c.id); }}
                        className={`p-0.5 rounded transition-colors inline-flex items-center justify-center shrink-0 ${
                          isCatExcluded
                            ? 'text-neutral-400 hover:text-neutral-300 hover:bg-[#303030]'
                            : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                        }`}
                        title={isCatExcluded ? `นำหมวด ${c.name} กลับมารวมคำนวณ` : `ยกเว้นหมวด ${c.name} จากการคำนวณ`}
                      >
                        {isCatExcluded ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </th>
                );
              })}
            </React.Fragment>
          );
        })}

        {activeExpenseGroups.map((g) => {
          const isExpanded = expandedGroups.has(g.id);
          const cats = getActiveCatsForGroup(g.id);
          const colId = `g-${g.id}`;
          const isColHovered = hoveredCol === colId;
          const isExcluded = excludedGroups.has(g.id);
          const groupColor = g.color || '#cbd5e1';

          return (
            <React.Fragment key={g.id}>
              <th
                onMouseEnter={(e) => { handleMouseEnter(e, g); setHoveredCol(colId); }}
                onMouseLeave={() => { handleMouseLeave(); setHoveredCol(null); }}
                className={`px-2 py-1.5 font-bold text-center transition-colors border-l border-b ${isExpanded ? boxBorder : thinBorder} ${isExcluded ? 'opacity-40' : ''} ${GROUP_COL_CLS}`}
                style={{ color: isExcluded ? undefined : groupColor, backgroundColor: getHeaderGroupBg(g, isColHovered) }}
              >
                <div className="flex items-center justify-center gap-1 min-w-0">
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={`กลุ่มรายจ่าย ${g.name} - คลิกเพื่อ${isExpanded ? 'ยุบ' : 'ขยาย'}`}
                    onClick={() => toggleGroup(g.id)}
                    className={`cursor-pointer inline-flex items-center gap-1 bg-transparent border-0 p-0 transition-opacity select-none hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#da291c] ${isExcluded ? 'opacity-40 grayscale' : ''}`}
                  >
                    <CategoryGlyph
                      icon={g.icon}
                      color={isExcluded ? '#737373' : groupColor}
                      size={18}
                      fallbackEmoji="📦"
                    />
                    {cats.length > 0 && (
                      <span className={`text-[20px] font-mono leading-none ${isExpanded ? 'text-[#da291c]' : 'text-slate-400'}`}>
                        {isExpanded ? '«' : '»'}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleGroupExclusion(g.id); }}
                    className={`p-1 rounded-none transition-colors inline-flex items-center justify-center shrink-0 ${
                      isExcluded
                        ? 'text-neutral-400 hover:text-neutral-300 hover:bg-[#303030]'
                        : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                    }`}
                    title={isExcluded ? `นำกลุ่ม ${g.name} กลับมารวมคำนวณ` : `ยกเว้นกลุ่ม ${g.name} จากการคำนวณ`}
                  >
                    {isExcluded ? <EyeOff className="w-3 h-3 text-rose-400/80" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </th>
              {isExpanded && cats.map((c) => {
                const catColId = `c-${c.id}`;
                const isCatColHovered = hoveredCol === catColId;
                const isCatExcluded = excludedCategories?.has(c.id);
                const isCatFaded = isExcluded || isCatExcluded;

                return (
                  <th
                    key={c.id}
                    onMouseEnter={(e) => { handleCategoryMouseEnter?.(e, g, c); setHoveredCol(catColId); }}
                    onMouseLeave={() => { handleMouseLeave(); setHoveredCol(null); }}
                    className={`px-2 py-1.5 font-black text-center text-[10px] uppercase border-l border-b transition-colors ${thinBorder} border-t-[#3e3e3e]/65 border-b-[#3e3e3e]/65 ${isCatFaded ? 'opacity-30' : ''} ${CAT_COL_CLS}`}
                    style={{ backgroundColor: getHeaderCatBg(g, c.color, isCatColHovered) }}
                    title={c.name}
                  >
                    <div className="flex items-center justify-center gap-1 min-w-0">
                      <CategoryGlyph icon={c.icon} color={isCatFaded ? '#64748B' : c.color} size={15} className={isCatFaded ? 'opacity-60' : ''} fallbackEmoji="📁" />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCategoryExclusion(c.id); }}
                        className={`p-0.5 rounded transition-colors inline-flex items-center justify-center shrink-0 ${
                          isCatExcluded
                            ? 'text-neutral-400 hover:text-neutral-300 hover:bg-[#303030]'
                            : 'text-neutral-400 hover:text-white hover:bg-[#303030]/50'
                        }`}
                        title={isCatExcluded ? `นำหมวด ${c.name} กลับมารวมคำนวณ` : `ยกเว้นหมวด ${c.name} จากการคำนวณ`}
                      >
                        {isCatExcluded ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                      </button>
                    </div>
                  </th>
                );
              })}
            </React.Fragment>
          );
        })}
      </tr>
    </thead>
  );
});

CashflowTableHeader.displayName = 'CashflowTableHeader';
