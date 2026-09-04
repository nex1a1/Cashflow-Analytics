import { useMemo } from 'react';
import {
  getComboChartOptions,
  getBarChartOptions,
  getLineChartOptions,
} from '../../../utils/chartOptions';
import { formatMoney } from '../../../utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';

function formatAllocLine(label, amount, total, isCurrentFlow) {
  if (amount <= 0) return null;
  const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';
  const marker = isCurrentFlow ? ' ◄ (สายธารนี้)' : '';
  return `  ${label}: ฿${formatMoney(amount)} (${pct}%)${marker}`;
}

function buildSankeyAllocLines(item) {
  const { need = 0, want = 0, savings = 0, total = item.flow } = item.allocBreakdown || {};
  const allocCount = (need > 0 ? 1 : 0) + (want > 0 ? 1 : 0) + (savings > 0 ? 1 : 0);
  if (allocCount <= 1) return [];

  const lines = [
    '──────────────────────',
    `รวมทั้งหมวด: ฿${formatMoney(total)}`
  ];

  const needLine = formatAllocLine('Need', need, total, item.from?.includes('Need'));
  if (needLine) lines.push(needLine);

  const wantLine = formatAllocLine('Want', want, total, item.from?.includes('Want'));
  if (wantLine) lines.push(wantLine);

  const savLine = formatAllocLine('Savings', savings, total, item.from?.includes('Savings'));
  if (savLine) lines.push(savLine);

  return lines;
}

function formatSankeyTooltipLabel(c) {
  const item = c.dataset?.data?.[c.dataIndex];
  if (!item) return '';

  const lines = [`฿${formatMoney(item.flow)} (${item.percent || '-'})`];
  if (item.allocBreakdown) {
    lines.push(...buildSankeyAllocLines(item));
  }
  return lines;
}

function cleanSankeyNodeName(str) {
  if (!str) return '';
  const lastOpen = str.lastIndexOf('(');
  return (lastOpen !== -1 && str.endsWith(')'))
    ? str.slice(0, lastOpen).trimEnd()
    : str;
}

function formatSankeyTooltipTitle(tooltipItems) {
  const item = tooltipItems[0]?.raw;
  if (!item) return '';
  return `${cleanSankeyNodeName(item.from)} → ${cleanSankeyNodeName(item.to)}`;
}

function resolveBaseChartOptions({ isBreakdown, chartViewType, mainChartType, dm, yType, autoSkip }) {
  if (isBreakdown) {
    return chartViewType === 'line'
      ? getLineChartOptions(dm, yType, autoSkip)
      : getBarChartOptions(dm, yType, autoSkip);
  }
  if (chartViewType === 'line') {
    return getLineChartOptions(dm, yType, autoSkip);
  }
  if (mainChartType === 'combo') {
    return getComboChartOptions(dm, yType, autoSkip);
  }
  return getBarChartOptions(dm, yType, autoSkip);
}

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
            titleColor: () => '#FFFFFF',
            bodyColor: () => '#CBD5E1',
            borderColor: (ctx) => {
              const item = ctx.tooltipItems[0];
              return item?.element?.options?.backgroundColor || ('#303030');
            },
            borderWidth: 2,
            padding: 12,
            cornerRadius: 0,
            callbacks: {
              label: (c) => formatSankeyTooltipLabel(c),
              title: (tooltipItems) => formatSankeyTooltipTitle(tooltipItems),
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
    
    const yType = isLogScale ? 'logarithmic' : 'linear';
    const isStacked = isBreakdown && chartViewType === 'bar';
    const baseOptions = resolveBaseChartOptions({
      isBreakdown,
      chartViewType,
      mainChartType: analytics.mainChartType,
      dm,
      yType,
      autoSkip
    });

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
