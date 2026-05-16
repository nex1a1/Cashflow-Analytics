import { useMemo } from 'react';
import { useDashboardContext } from '../context/DashboardContext';

const makeCumulative = (dataArr) => {
  let sum = 0;
  return dataArr.map(val => { sum += (val || 0); return sum; });
};

export function useChartDataEngine({ chartViewType, isBreakdown, showTrendLines, isSmoothLine, isCumulative, sankeyData }) {
  const { analytics, categories, filterPeriod, dashboardCategory, hideFixedExpenses, chartGroupBy, dm } = useDashboardContext();

  const categoriesWithData = useMemo(() => {
    if (!analytics) return new Set();
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';
    const withData = new Set();
    categories.forEach(c => {
      const total = showMonthly
        ? analytics.sortedMonthsKeys?.reduce((sum, m) => sum + (analytics.monthlyCatMap?.[c.id]?.[m] || 0), 0)
        : analytics.datesInPeriod?.reduce((sum, d) => sum + (analytics.dailyCatMap?.[c.id]?.[d] || 0), 0);
      if (total > 0) withData.add(c.name);
    });
    return withData;
  }, [analytics, filterPeriod, chartGroupBy, categories]);

  const displayChartData = useMemo(() => {
    if (chartViewType === 'sankey') return sankeyData;
    if (!analytics?.mainChartData) return null;
    const isSingleMonthView = !!filterPeriod.match(/^\d{4}-\d{2}$/);
    const showMonthly = !isSingleMonthView && chartGroupBy === 'monthly';
    const xLabels = analytics.mainChartData.labels;

    if (isBreakdown) {
      const activeCats = Array.isArray(dashboardCategory) ? dashboardCategory : [dashboardCategory];
      let catsToRender = activeCats.includes('ALL')
        ? categories.filter(c => c.type === 'expense' && categoriesWithData.has(c.name) && (!hideFixedExpenses || !c.isFixed))
        : categories.filter(c => (activeCats.includes(c.name) || activeCats.includes(c.id)) && categoriesWithData.has(c.name));

      const datasets = catsToRender.map(catObj => {
        const catName = catObj.name;
        const catId = catObj.id;
        const catColor = catObj.color || '#64748B';
        let data = showMonthly
          ? analytics.sortedMonthsKeys.map(m => analytics.monthlyCatMap[catId]?.[m] || 0)
          : analytics.datesInPeriod.map(d => analytics.dailyCatMap[catId]?.[d] || 0);
        if (isCumulative) data = makeCumulative(data);

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
          pointBorderColor: dm ? '#1e293b' : '#ffffff',
          fill: false,
          borderRadius: 0,
        };
      });

      if (showTrendLines && !showMonthly && chartViewType !== 'line' && !isCumulative) {
        const mtdDataset = analytics.mainChartData.datasets.find(ds => ds.label?.includes('เฉลี่ยสะสม'));
        const avgDataset = analytics.mainChartData.datasets.find(ds => ds.label?.includes('เฉลี่ยทั้งเดือน'));
        if (mtdDataset) datasets.push({ ...mtdDataset, type: 'line', tension: isSmoothLine ? 0.4 : 0, borderWidth: 4 });
        if (avgDataset) datasets.push({ ...avgDataset, type: 'line', borderWidth: 2 });
      }
      return { labels: xLabels, datasets };
    }

    let filteredDatasets = [...analytics.mainChartData.datasets];
    if (analytics.mainChartType === 'combo' && !showTrendLines) {
      filteredDatasets = filteredDatasets.filter(ds => ds.type !== 'line' || ds.label === 'Cashflow');
    }
    if (isCumulative) {
       filteredDatasets = filteredDatasets.filter(ds => !(ds.label && (ds.label.includes('เฉลี่ยสะสม') || ds.label.includes('เฉลี่ยทั้งเดือน'))));
    }

    const processedDatasets = filteredDatasets.map(ds => {
      const isTrendLine = ds.label && (ds.label.includes('เฉลี่ยสะสม') || ds.label.includes('เฉลี่ยทั้งเดือน') || ds.label === 'Cashflow');
      let finalData = ds.data;
      if (isCumulative && !isTrendLine && ds.label !== 'Cashflow') {
         finalData = makeCumulative(ds.data);
      }
      if (isTrendLine && !isCumulative) {
        return { ...ds, data: finalData, type: 'line', tension: isSmoothLine ? 0.4 : 0, borderWidth: ds.label.includes('เฉลี่ยทั้งเดือน') ? 2 : 4 };
      }
      const newType = chartViewType === 'line' ? 'line' : 'bar';
      let bgColor = ds.backgroundColor;
      let borderColor = ds.borderColor || ds.backgroundColor;
      if (chartViewType === 'bar') {
        if (ds.borderColor && !ds.backgroundColor?.includes('0.6')) bgColor = ds.borderColor;
        else if (ds.backgroundColor?.includes('rgba')) bgColor = borderColor;
      }
      let bWidth = 0;
      if (chartViewType === 'line') {
        bWidth = (Array.isArray(dashboardCategory) && dashboardCategory.length > 1 && !dashboardCategory.includes('ALL')) ? 3 : 4;
      }
      return {
        ...ds, data: finalData, type: newType, tension: isSmoothLine ? 0.4 : 0,
        backgroundColor: chartViewType === 'line' ? ds.backgroundColor : bgColor,
        borderColor, borderWidth: bWidth, borderRadius: 4,
        pointRadius: chartViewType === 'line' ? 4 : 0,
        pointBackgroundColor: borderColor,
        pointBorderWidth: 2, pointBorderColor: dm ? '#1e293b' : '#ffffff',
      };
    });
    return { ...analytics.mainChartData, datasets: processedDatasets };
  }, [analytics, filterPeriod, chartGroupBy, chartViewType, isBreakdown, showTrendLines, isSmoothLine, isCumulative, dashboardCategory, categories, categoriesWithData, hideFixedExpenses, dm, sankeyData]);

  const legendDatasets = useMemo(() => {
    if (!displayChartData?.datasets) return [];
    if (chartViewType === 'sankey') return [];
    return displayChartData.datasets.filter(ds => {
      if (ds.label?.includes('เฉลี่ย') || ds.label === 'Cashflow') return false;
      return ds.data?.some(v => v > 0);
    });
  }, [displayChartData, chartViewType]);

  return {
    displayChartData,
    legendDatasets,
    categoriesWithData
  };
}
