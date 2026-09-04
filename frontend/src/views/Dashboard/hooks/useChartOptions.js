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
        responsive: true, maintainAspectRatio: false, color: '#FFFFFF',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: (ctx) => {
              const item = ctx.tooltipItems[0];
              if (item?.element?.options?.backgroundColor) {
                return item.element.options.backgroundColor;
              }
              return '#121212';
            },
            titleColor: (ctx) => '#FFFFFF',
            bodyColor: (ctx) => '#CBD5E1',
            borderColor: (ctx) => {
              const item = ctx.tooltipItems[0];
              return item?.element?.options?.backgroundColor || ('#303030');
            },
            borderWidth: 2,
            padding: 12,
            cornerRadius: 0,
            callbacks: {
              label: (c) => {
                const item = c.dataset.data[c.dataIndex];
                if (!item) return '';
                const lines = [
                  `฿${formatMoney(item.flow)} (${item.percent || '-'})`
                ];

                if (item.allocBreakdown) {
                  const { need = 0, want = 0, savings = 0, total = item.flow } = item.allocBreakdown;
                  const allocCount = (need > 0 ? 1 : 0) + (want > 0 ? 1 : 0) + (savings > 0 ? 1 : 0);
                  if (allocCount > 1) {
                    lines.push('──────────────────────');
                    lines.push(`รวมทั้งหมวด: ฿${formatMoney(total)}`);
                    const isNeedFlow = item.from?.includes('Need');
                    const isWantFlow = item.from?.includes('Want');
                    const isSavFlow = item.from?.includes('Savings');

                    if (need > 0) {
                      const pct = total > 0 ? ((need / total) * 100).toFixed(1) : '0.0';
                      lines.push(`  Need: ฿${formatMoney(need)} (${pct}%)${isNeedFlow ? ' ◄ (สายธารนี้)' : ''}`);
                    }
                    if (want > 0) {
                      const pct = total > 0 ? ((want / total) * 100).toFixed(1) : '0.0';
                      lines.push(`  Want: ฿${formatMoney(want)} (${pct}%)${isWantFlow ? ' ◄ (สายธารนี้)' : ''}`);
                    }
                    if (savings > 0) {
                      const pct = total > 0 ? ((savings / total) * 100).toFixed(1) : '0.0';
                      lines.push(`  Savings: ฿${formatMoney(savings)} (${pct}%)${isSavFlow ? ' ◄ (สายธารนี้)' : ''}`);
                    }
                  }
                }

                return lines;
              },
              title: (tooltipItems) => {
                const item = tooltipItems[0]?.raw;
                const cleanName = (str) => {
                  if (!str) return '';
                  const lastOpen = str.lastIndexOf('(');
                  return (lastOpen !== -1 && str.endsWith(')'))
                    ? str.slice(0, lastOpen).trimEnd()
                    : str;
                };
                return `${cleanName(item.from)} → ${cleanName(item.to)}`;
              },
              labelColor: (context) => {
                const item = context.raw;
                const flowColor = item?.color || ('#475569');
                return {
                  borderColor: flowColor,
                  backgroundColor: flowColor,
                  borderRadius: 0
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
              const sum = tooltipItems
                .filter(item => {
                  const label = item.dataset?.label;
                  return !(label?.includes('เฉลี่ย') || label?.includes('Target') || label?.includes('เป้าหมาย'));
                })
                .reduce((acc, item) => acc + (item.parsed.y || 0), 0);
              return `รวม: ${formatMoney(sum)} ฿`;
            }
          }
        },
      },
    };
  }, [isBreakdown, chartViewType, dm, analytics?.mainChartType, analytics, isLogScale]);
}
