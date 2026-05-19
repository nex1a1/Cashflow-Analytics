import { useMemo } from 'react';
import {
  getComboChartOptions,
  getBarChartOptions,
  getLineChartOptions,
} from '../../../utils/chartOptions';
import { formatMoney } from '../../../utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';

export function useChartOptions({ chartViewType, isBreakdown, isLogScale }) {
  const { analytics, dm, filterPeriod } = useDashboardContext();

  return useMemo(() => {
    if (!analytics) return {};
    
    // Check if the current period is a single month (e.g., "2024-03")
    // If it is, we don't want to skip days on the X-axis.
    // If it's a longer period (H1, Q1, YYYY, all), we enable autoSkip.
    const isSingleMonth = /^\d{4}-\d{2}$/.test(filterPeriod);
    const autoSkip = !isSingleMonth;

    if (chartViewType === 'sankey') {
      return {
        responsive: true, maintainAspectRatio: false, color: dm ? '#FFFFFF' : '#1e293b',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: (ctx) => {
              const item = ctx.tooltipItems[0];
              if (item?.element?.options?.backgroundColor) {
                return item.element.options.backgroundColor;
              }
              return dm ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)';
            },
            titleColor: (ctx) => dm ? '#FFFFFF' : '#1e293b',
            bodyColor: (ctx) => dm ? '#CBD5E1' : '#475569',
            borderColor: (ctx) => {
              const item = ctx.tooltipItems[0];
              return item?.element?.options?.backgroundColor || (dm ? '#475569' : '#e2e8f0');
            },
            borderWidth: 2,
            padding: 12,
            cornerRadius: 2,
            callbacks: {
              label: (c) => {
                const item = c.dataset.data[c.dataIndex];
                if (!item) return '';
                return [`จำนวน: ${formatMoney(item.flow)} ฿`, `สัดส่วน: ${item.percent || '-'}`];
              },
              title: (tooltipItems) => {
                const item = tooltipItems[0].raw;
                if (!item) return '';
                return `${item.from} → ${item.to}`;
              },
              labelColor: (context) => {
                const item = context.raw;
                const flowColor = item?.color || (dm ? '#475569' : '#94a3b8');
                return {
                  borderColor: flowColor,
                  backgroundColor: flowColor,
                  borderRadius: 2
                };
              }
            }
          }
        },
        layout: { padding: { top: 10, bottom: 10 } }
      };
    }
    
    let baseOptions;
    const yType = isLogScale ? 'logarithmic' : 'linear';
    const isStacked = isBreakdown && chartViewType === 'bar';
    if (isBreakdown && chartViewType === 'bar') baseOptions = getBarChartOptions(dm, yType, autoSkip);
    else if (isBreakdown && chartViewType === 'line') baseOptions = getLineChartOptions(dm, yType, autoSkip);
    else if (analytics.mainChartType === 'combo' && chartViewType === 'bar') baseOptions = getComboChartOptions(dm, yType, autoSkip);
    else if (chartViewType === 'line') baseOptions = getLineChartOptions(dm, yType, autoSkip);
    else baseOptions = getBarChartOptions(dm, yType, autoSkip);

    return {
      ...baseOptions,
      scales: {
        ...baseOptions.scales,
        x: { ...baseOptions.scales?.x, stacked: isStacked },
        y: { 
          ...baseOptions.scales?.y, 
          stacked: isStacked,
          ...(isLogScale && { min: 1 })
        },
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          mode: 'index', intersect: false,
          filter: (tooltipItem) => tooltipItem.raw > 0,
          callbacks: {
            ...baseOptions.plugins?.tooltip?.callbacks,
            footer: (tooltipItems) => {
              if (!isBreakdown || tooltipItems.length <= 1) return null;
              const sum = tooltipItems.reduce((acc, item) => acc + (item.parsed.y || 0), 0);
              return `รวม: ${formatMoney(sum)} ฿`;
            }
          }
        },
      },
    };
  }, [isBreakdown, chartViewType, dm, analytics?.mainChartType, analytics, isLogScale]);
}
