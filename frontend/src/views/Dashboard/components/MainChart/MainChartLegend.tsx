// src/views/Dashboard/components/MainChart/MainChartLegend.tsx
import React, { useMemo, useCallback, memo } from 'react';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { updateActiveCategories, getDatasetIndicatorStyle } from './helpers';
import {
  BreakdownLegendItemProps,
  BreakdownLegendProps,
  StandardLegendItemProps,
  StandardLegendProps,
  MainChartLegendProps,
} from './types';

// ==========================================
// SUBCOMPONENTS: LEGENDS
// ==========================================

export const BreakdownLegendItem = memo(({ category, isActive, onToggle }: BreakdownLegendItemProps) => {
  const isHidden = !isActive;
  return (
    <button
      onClick={() => onToggle(category.name)}
      className={`flex items-center gap-1.5 border border-transparent rounded-none px-1.5 py-0.5 transition-opacity duration-100 hover:opacity-80 select-none cursor-pointer ${
        isHidden ? 'opacity-35 line-through' : 'opacity-100'
      }`}
      title="คลิกเพื่อเปิด/ซ่อนหมวดหมู่นี้"
    >
      <span
        className="inline-block rounded-none shrink-0 w-2.5 h-2.5"
        style={{ backgroundColor: category.color || '#64748B' }}
      />
      <span className="text-[10px] font-medium leading-none text-slate-400">
        {category.icon && <CategoryGlyph icon={category.icon} color={category.color} size={12} className="mr-1 opacity-90 inline" />}
        {category.name}
      </span>
    </button>
  );
});
BreakdownLegendItem.displayName = 'BreakdownLegendItem';

export const BreakdownLegend = memo(({ categories, categoriesWithData, dashboardCategory, setDashboardCategory }: BreakdownLegendProps) => {
  const catsWithDataList = useMemo(() =>
    categories.filter(c => c.type === 'expense' && categoriesWithData.has(c.name)),
    [categories, categoriesWithData]
  );
  const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
  const allCatNames = useMemo(() => catsWithDataList.map(c => c.name), [catsWithDataList]);

  const handleToggle = useCallback((catName: string) => {
    setDashboardCategory(updateActiveCategories(catName, activeCats, allCatNames));
  }, [activeCats, allCatNames, setDashboardCategory]);

  if (catsWithDataList.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-1 border-t border-[#303030]/60">
      {catsWithDataList.map(c => {
        const isActive = activeCats.includes('ALL') || activeCats.includes(c.name) || activeCats.includes(c.id);
        return (
          <BreakdownLegendItem
            key={c.id}
            category={c}
            isActive={isActive}
            onToggle={handleToggle}
          />
        );
      })}
    </div>
  );
});
BreakdownLegend.displayName = 'BreakdownLegend';

export const StandardLegendItem = memo(({ dataset, isHidden, onToggle }: StandardLegendItemProps) => {
  const label = dataset.label || '';
  return (
    <button
      onClick={() => onToggle(label)}
      className={`flex items-center gap-1.5 border border-transparent rounded-none px-1.5 py-0.5 transition-opacity duration-100 hover:opacity-80 select-none cursor-pointer ${
        isHidden ? 'opacity-35 line-through' : 'opacity-100'
      }`}
      title="คลิกเพื่อเปิด/ซ่อนชุดข้อมูลนี้"
    >
      <span
        className="inline-block rounded-none shrink-0"
        style={getDatasetIndicatorStyle(dataset)}
      />
      <span className="text-[10px] font-medium leading-none text-slate-400">
        {label}
        {dataset.yAxisID === 'y1' && <span className="text-slate-500"> (แกนขวา)</span>}
      </span>
    </button>
  );
});
StandardLegendItem.displayName = 'StandardLegendItem';

export const StandardLegend = memo(({ legendDatasets, hiddenDatasets, setHiddenDatasets }: StandardLegendProps) => {
  const toggleDataset = useCallback((label: string) => {
    setHiddenDatasets(prev =>
      prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
    );
  }, [setHiddenDatasets]);

  if (legendDatasets.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-3 mt-1 border-t border-[#303030]/60">
      {legendDatasets.map((ds, i) => (
        <StandardLegendItem
          key={ds.label || i}
          dataset={ds}
          isHidden={Boolean(ds.label && hiddenDatasets.includes(ds.label))}
          onToggle={toggleDataset}
        />
      ))}
    </div>
  );
});
StandardLegend.displayName = 'StandardLegend';

export const MainChartLegend = memo(({
  legendDatasets,
  hiddenDatasets,
  setHiddenDatasets,
  isBreakdown,
  dashboardCategory,
  setDashboardCategory,
  categories,
  categoriesWithData
}: MainChartLegendProps) => {
  if (isBreakdown) {
    return (
      <BreakdownLegend
        categories={categories}
        categoriesWithData={categoriesWithData}
        dashboardCategory={dashboardCategory}
        setDashboardCategory={setDashboardCategory}
      />
    );
  }

  return (
    <StandardLegend
      legendDatasets={legendDatasets}
      hiddenDatasets={hiddenDatasets}
      setHiddenDatasets={setHiddenDatasets}
    />
  );
});
MainChartLegend.displayName = 'MainChartLegend';
