// src/views/Dashboard/components/MainChart/MainChartCategoryFilter.tsx
import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  Layers, Filter, ChevronDown, Search,
  LayoutGrid, Shuffle, Check, X
} from 'lucide-react';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { getContrastTextColor } from './helpers';
import { ToolbarToggleSwitch, ToolbarAllocationSelector } from './MainChartToolbarControls';
import { MainChartCategorySelectorProps, MainChartFilterMenuProps } from './types';

import { tc } from '@/constants/theme';
// ==========================================
// SUBCOMPONENTS: CATEGORY SELECTOR & FILTER
// ==========================================

export const MainChartCategorySelector = memo(({
  dashboardCategory, setDashboardCategory, categories, categoriesWithData,
  searchQuery, setSearchQuery
}: MainChartCategorySelectorProps) => {
  const activeCats = useMemo(() =>
    Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory],
    [dashboardCategory]
  );

  const allExpenseCatNames = useMemo(() =>
    categories
      .filter(c => c.type === 'expense' && categoriesWithData.has(c.name))
      .map(c => c.name),
    [categories, categoriesWithData]
  );

  const variableCatNames = useMemo(() =>
    categories
      .filter(c => c.type === 'expense' && c.allocation_type !== 'need' && categoriesWithData.has(c.name))
      .map(c => c.name),
    [categories, categoriesWithData]
  );

  const isAllActive = activeCats.includes('ALL') || activeCats.length === allExpenseCatNames.length;
  const isVariableActive = !isAllActive && variableCatNames.length > 0 &&
    activeCats.length === variableCatNames.length &&
    variableCatNames.every(n => activeCats.includes(n));

  const toggleCategory = useCallback((catName: string) => {
    if (catName === 'ALL') {
      setDashboardCategory(['ALL']);
      return;
    }
    let currentActive = activeCats.includes('ALL') ? [...allExpenseCatNames] : [...activeCats];
    if (currentActive.includes(catName)) {
      currentActive = currentActive.filter(c => c !== catName);
    } else {
      currentActive.push(catName);
    }
    if (currentActive.length === 0 || currentActive.length === allExpenseCatNames.length) {
      setDashboardCategory(['ALL']);
    } else {
      setDashboardCategory(currentActive);
    }
  }, [activeCats, allExpenseCatNames, setDashboardCategory]);

  const selectAllVariable = useCallback(() => {
    setDashboardCategory(variableCatNames.length > 0 ? variableCatNames : ['ALL']);
  }, [variableCatNames, setDashboardCategory]);

  const filteredCategories = useMemo(() =>
    categories.filter(c =>
      c.type === 'expense' &&
      categoriesWithData.has(c.name) &&
      (c.name.toLowerCase().includes(searchQuery.toLowerCase()) || (c.icon && c.icon.includes(searchQuery)))
    ),
    [categories, categoriesWithData, searchQuery]
  );

  const selectedCount = isAllActive ? allExpenseCatNames.length : activeCats.length;

  return (
    <>
      {/* Quick Presets */}
      <div className="flex p-0.5 rounded-none border shadow-sm bg-canvas border-line/60">
        <button
          onClick={() => setDashboardCategory(['ALL'])}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors ${
            isAllActive ? 'bg-surface-elevated text-accent' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/50'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" /> ทั้งหมด (รวม)
        </button>
        <button
          onClick={selectAllVariable}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-none transition-colors ${
            isVariableActive ? 'bg-surface-elevated text-accent' : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated/50'
          }`}
        >
          <Shuffle className="w-3.5 h-3.5" /> เฉพาะผันแปร
        </button>
      </div>

      {/* Search Bar inside categories tab */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="ค้นหาหมวดหมู่..."
          className="w-full pl-8 pr-7 py-1.5 text-xs rounded-sm border outline-none font-medium transition-colors bg-surface border-line text-slate-200 focus:border-slate-400 placeholder-slate-600"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Checklist */}
      <div className="grid grid-cols-2 gap-1 mt-0.5 max-h-[320px] overflow-y-auto pr-1 select-none">
        {filteredCategories.length > 0 ? (
          filteredCategories.map(c => {
            const isActive = isAllActive || activeCats.includes(c.name) || activeCats.includes(c.id);
            const tickColor = getContrastTextColor(c.color);
            return (
              <button
                key={c.id}
                onClick={() => toggleCategory(c.name)}
                style={{
                  backgroundColor: isActive ? `${c.color || tc('ink-muted')}1a` : 'transparent',
                  // border-color is globally hardened to a hairline gray (darkMode.css); an
                  // inset box-shadow is the only way to still ring the chip in its category color.
                  boxShadow: isActive ? `inset 0 0 0 1px ${c.color || tc('ink-muted')}66` : 'none',
                }}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-none border border-line text-[11px] font-semibold text-left transition-colors ${
                  isActive ? 'text-slate-100' : 'text-slate-500 hover:border-line-strong hover:text-slate-300'
                }`}
              >
                <span
                  className="w-3 h-3 shrink-0 flex items-center justify-center rounded-none"
                  style={{ backgroundColor: isActive ? (c.color || tc('ink-muted')) : 'transparent' }}
                >
                  {isActive && <Check className="w-2.5 h-2.5" strokeWidth={3} style={{ color: tickColor }} />}
                </span>
                <span className="truncate">
                  {c.icon && <CategoryGlyph icon={c.icon} color={c.color} size={14} className="mr-1 opacity-90 inline" />}
                  {c.name}
                </span>
              </button>
            );
          })
        ) : (
          <div className="col-span-2 text-[11px] italic py-6 text-center text-slate-500">
            ไม่พบหมวดหมู่ที่ต้องการ
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between pt-2.5 mt-0.5 border-t border-line/60">
        <span className="text-[11px] font-semibold text-slate-500">
          เลือก <span className="text-slate-200">{selectedCount}</span> จาก {allExpenseCatNames.length} หมวดหมู่
        </span>
        {!isAllActive && (
          <button
            onClick={() => setDashboardCategory(['ALL'])}
            className="text-[11px] font-bold uppercase tracking-wide text-accent hover:text-white"
          >
            ล้างตัวกรอง
          </button>
        )}
      </div>
    </>
  );
});
MainChartCategorySelector.displayName = 'MainChartCategorySelector';

export const MainChartFilterMenu = memo(({
  showSkeleton, showCatMenu, setShowCatMenu, filterMenuRef,
  dashboardCategory, setDashboardCategory,
  categories, categoriesWithData,
  isLogScale, setIsLogScale,
  hideFixedExpenses, setHideFixedExpenses,
  hideWantExpenses, setHideWantExpenses
}: MainChartFilterMenuProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when menu closes
  useEffect(() => {
    if (!showCatMenu) {
      setSearchQuery('');
    }
  }, [showCatMenu]);

  const isCatFiltered = Array.isArray(dashboardCategory) && !dashboardCategory.includes('ALL');
  const hasActiveModifiers = isCatFiltered || isLogScale || hideFixedExpenses || hideWantExpenses;

  return (
    <div className="relative" ref={filterMenuRef}>
      <button
        onClick={() => setShowCatMenu(prev => !prev)}
        style={hasActiveModifiers ? { boxShadow: `inset 0 0 0 1px ${tc('accent', 0.5)}` } : undefined}
        className={`px-3 py-1.5 border border-line rounded-none text-[11px] font-bold outline-none flex items-center gap-1.5 transition-colors ${
          hasActiveModifiers
            ? 'bg-canvas text-accent'
            : showCatMenu
              ? 'bg-surface-elevated text-slate-100'
              : 'bg-canvas text-slate-200 hover:bg-surface-elevated/50'
        }`}
      >
        <Filter className="w-3.5 h-3.5" />
        ตัวเลือกแสดงผล
        {isCatFiltered && (
          <span className="px-1.5 rounded-full text-[11px] font-black bg-accent/20 text-accent border border-accent/40">
            {dashboardCategory.length}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCatMenu ? 'rotate-180' : ''}`} />
      </button>

      {showCatMenu && (
        <div className="absolute right-0 top-full mt-2 w-[460px] max-w-[90vw] rounded-none shadow-2xl border z-[45] flex flex-col overflow-hidden bg-canvas border-line">
          {/* Header */}
          <div className="px-3.5 py-2.5 border-b flex items-center justify-between border-line text-slate-200">
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-accent" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider">ตัวเลือกกราฟ</span>
            </div>
            <button
              onClick={() => setShowCatMenu(false)}
              className="text-slate-500 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-3.5 flex flex-col gap-3">
            {/* Y-axis scale */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">สเกลแกน Y (Logarithmic)</span>
              <button
                disabled={showSkeleton}
                onClick={() => setIsLogScale(prev => !prev)}
                title="ปรับสเกลแกน Y แบบ Logarithmic เพื่อเปรียบเทียบหมวดหมู่อย่างชัดเจน"
                className={`flex items-center gap-2 px-2.5 py-1 rounded-none text-[11px] font-bold disabled:opacity-40 ${
                  isLogScale ? 'bg-emerald-600/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {isLogScale ? 'เปิด' : 'ปิด'}
                <ToolbarToggleSwitch isActive={isLogScale} activeColor="bg-emerald-500" />
              </button>
            </div>

            {/* Allocation filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">แสดงเฉพาะ</span>
              <ToolbarAllocationSelector
                showSkeleton={showSkeleton}
                hideFixedExpenses={hideFixedExpenses}
                setHideFixedExpenses={setHideFixedExpenses}
                hideWantExpenses={hideWantExpenses}
                setHideWantExpenses={setHideWantExpenses}
              />
            </div>

            <div className="border-t border-line/60 pt-3 flex flex-col gap-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">เลือกหมวดหมู่ย่อย</span>
              <MainChartCategorySelector
                dashboardCategory={dashboardCategory}
                setDashboardCategory={setDashboardCategory}
                categories={categories}
                categoriesWithData={categoriesWithData}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
MainChartFilterMenu.displayName = 'MainChartFilterMenu';
