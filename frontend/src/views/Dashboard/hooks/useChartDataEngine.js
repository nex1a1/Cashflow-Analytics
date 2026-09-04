import { useMemo } from 'react';
import { useDashboardContext } from '../context/DashboardContext';

function resolveDatasetBgColor(ds, chartViewType, borderColor) {
  if (chartViewType !== 'bar') return ds.backgroundColor;
  if (ds.borderColor && !ds.backgroundColor?.includes('0.6')) return ds.borderColor;
  if (ds.backgroundColor?.includes('rgba')) return borderColor;
  return ds.backgroundColor;
}

function resolveDatasetBorderWidth(chartViewType, dashboardCategory) {
  if (chartViewType !== 'line') return 0;
  return (Array.isArray(dashboardCategory) && dashboardCategory.length > 1 && !dashboardCategory.includes('ALL')) ? 3 : 4;
}

function processStandardDataset(ds, { chartViewType, isSmoothLine, hiddenDatasets, dashboardCategory }) {
  if (ds.label === 'Cashflow') {
    return {
      ...ds,
      type: 'line',
      tension: isSmoothLine ? 0.4 : 0,
      borderWidth: 4,
      hidden: hiddenDatasets?.includes(ds.label)
    };
  }

  const isLine = chartViewType === 'line';
  const borderColor = ds.borderColor || ds.backgroundColor;
  const bgColor = resolveDatasetBgColor(ds, chartViewType, borderColor);
  const bWidth = resolveDatasetBorderWidth(chartViewType, dashboardCategory);

  return {
    ...ds,
    type: isLine ? 'line' : 'bar',
    tension: isSmoothLine ? 0.4 : 0,
    backgroundColor: isLine ? ds.backgroundColor : bgColor,
    borderColor,
    borderWidth: bWidth,
    borderRadius: 0,
    pointRadius: isLine ? 4 : 0,
    pointBackgroundColor: borderColor,
    pointBorderWidth: 2,
    pointBorderColor: '#1e293b',
    hidden: hiddenDatasets?.includes(ds.label)
  };
}

export function useChartDataEngine({ chartViewType, isBreakdown, isSmoothLine, sankeyData, chartGroupMode, hiddenDatasets }) {
  const { transactions, analytics, categories, filterPeriod, dashboardCategory, hideFixedExpenses, hideWantExpenses, chartGroupBy, dm } = useDashboardContext();

  const categoriesWithData = useMemo(() => {
    if (!categories) return new Set();
    const withData = new Set();
    const catLookup = new Map();
    categories.forEach(c => catLookup.set(c.id, c.name));

    const activeTx = transactions || [];
    activeTx.forEach(t => {
      if (!t.date) return;
      let match = false;
      if (!filterPeriod || filterPeriod === 'ALL') match = true;
      else if (filterPeriod.length === 4) match = t.date.startsWith(filterPeriod);
      else if (filterPeriod.length === 7) match = t.date.startsWith(filterPeriod);
      else match = true;

      if (match && Number.parseFloat(t.amount) > 0) {
        const catName = catLookup.get(t.category_id) || t.category;
        if (catName) withData.add(catName);
      }
    });

    if (withData.size === 0) {
      categories.filter(c => c.type === 'expense').forEach(c => withData.add(c.name));
    }
    return withData;
  }, [transactions, categories, filterPeriod]);

  const displayChartData = useMemo(() => {
    if (chartViewType === 'sankey') return sankeyData;
    if (!analytics?.mainChartData) return null;
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';
    const xLabels = analytics.mainChartData.labels;

    if (isBreakdown) {
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      let catsToRender = activeCats.includes('ALL')
        ? categories.filter(c => c.type === 'expense' && categoriesWithData.has(c.name))
        : categories.filter(c => (activeCats.includes(c.name) || activeCats.includes(c.id)) && categoriesWithData.has(c.name));

      const datasets = catsToRender.map(catObj => {
        const catName = catObj.name;
        const catId = catObj.id;
        const catColor = catObj.color || '#64748B';
        let data = showMonthly
          ? analytics.sortedMonthsKeys.map(m => analytics.monthlyCatMap[catId]?.[m] || 0)
          : analytics.datesInPeriod.map(d => analytics.dailyCatMap[catId]?.[d] || 0);

        return {
          type: chartViewType === 'line' ? 'line' : 'bar',
          label: catName,
          data,
          borderColor: catColor,
          backgroundColor: chartViewType === 'line' ? catColor + '33' : catColor,
          borderWidth: chartViewType === 'line' ? 2.5 : 1,
          tension: isSmoothLine ? 0.4 : 0,
          pointRadius: chartViewType === 'line' ? 3 : 0,
          pointBackgroundColor: catColor,
          pointBorderWidth: 2,
          pointBorderColor: '#1e293b',
          fill: false,
          borderRadius: 0,
          hidden: hiddenDatasets?.includes(catName),
        };
      });

      return { labels: xLabels, datasets };
    }

    let filteredDatasets = analytics.mainChartData.datasets.filter(ds => ds.type !== 'line' || ds.label === 'Cashflow');
    const processedDatasets = filteredDatasets.map(ds => processStandardDataset(ds, { chartViewType, isSmoothLine, hiddenDatasets, dashboardCategory }));

    return { ...analytics.mainChartData, datasets: processedDatasets };
  }, [analytics, filterPeriod, chartGroupBy, chartViewType, isBreakdown, isSmoothLine, dashboardCategory, categories, categoriesWithData, hideFixedExpenses, hideWantExpenses, dm, sankeyData, hiddenDatasets]);

  const legendDatasets = useMemo(() => {
    if (!displayChartData?.datasets) return [];
    if (chartViewType === 'sankey') return [];
    return displayChartData.datasets.filter(ds => {
      if (ds.label?.includes('เฉลี่ย') || ds.label === 'Cashflow' || ds.label?.includes('Target') || ds.label?.includes('เป้าหมาย')) return false;
      return ds.data?.some(v => v > 0);
    });
  }, [displayChartData, chartViewType]);

  return {
    displayChartData,
    legendDatasets,
    categoriesWithData
  };
}
