import { useMemo } from 'react';
import {
  getComboChartOptions,
  getBarChartOptions,
  getLineChartOptions,
} from '@/utils/chartOptions';
import { formatMoney, formatBaht } from '@/utils/formatters';
import { useDashboardContext } from '../context/DashboardContext';
import { isSingleUnitPeriod } from '@/utils/payCycle';

import { tc } from '@/constants/theme';
interface ChartOptionsProps {
  chartViewType: string;
  isBreakdown: boolean;
  isLogScale: boolean;
}

function formatAllocLine(label: string, amount: number, total: number, isCurrentFlow?: boolean): string {
  if (amount <= 0) return '';
  const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : '0.0';
  const marker = isCurrentFlow ? ' ◄ (เส้นทางนี้)' : '';
  return `  ${label}: ${formatBaht(amount)} (${pct}%)${marker}`;
}

function buildSankeyAllocLines(item: any): string[] {
  const { need = 0, want = 0, savings = 0, total = item.flow } = item.allocBreakdown || {};
  const allocCount = (need > 0 ? 1 : 0) + (want > 0 ? 1 : 0) + (savings > 0 ? 1 : 0);
  if (allocCount <= 1) return [];

  const lines = [
    '──────────────────────',
    `รวมทั้งหมวด: ${formatBaht(total)}`
  ];

  const needLine = formatAllocLine('Need', need, total, item.from?.includes('Need'));
  if (needLine) lines.push(needLine);

  const wantLine = formatAllocLine('Want', want, total, item.from?.includes('Want'));
  if (wantLine) lines.push(wantLine);

  const savLine = formatAllocLine('Savings', savings, total, item.from?.includes('Savings'));
  if (savLine) lines.push(savLine);

  return lines;
}

function formatSankeyTooltipLabel(c: any): string[] {
  const item = c.dataset?.data?.[c.dataIndex];
  if (!item) return [];

  const lines = [`${formatBaht(item.flow)} (${item.percent || '-'})`];
  if (item.allocBreakdown) {
    lines.push(...buildSankeyAllocLines(item));
  }
  return lines;
}

function cleanSankeyNodeName(str: string): string {
  if (!str) return '';
  const lastOpen = str.lastIndexOf('(');
  return (lastOpen !== -1 && str.endsWith(')'))
    ? str.slice(0, lastOpen).trimEnd()
    : str;
}

function formatSankeyTooltipTitle(tooltipItems: any[]): string {
  const item = tooltipItems[0]?.raw;
  if (!item) return '';
  return `${cleanSankeyNodeName(item.from)} → ${cleanSankeyNodeName(item.to)}`;
}

interface ResolveBaseChartOptionsParams {
  isBreakdown: boolean;
  chartViewType: string;
  mainChartType?: string;
  yType: 'logarithmic' | 'linear';
  autoSkip: boolean;
}

function resolveBaseChartOptions({ isBreakdown, chartViewType, mainChartType, yType, autoSkip }: ResolveBaseChartOptionsParams): any {
  if (isBreakdown) {
    return chartViewType === 'line'
      ? getLineChartOptions(yType, autoSkip)
      : getBarChartOptions(yType, autoSkip);
  }
  if (chartViewType === 'line') {
    return getLineChartOptions(yType, autoSkip);
  }
  if (mainChartType === 'combo') {
    return getComboChartOptions(yType, autoSkip, tc('ink-display'));
  }
  return getBarChartOptions(yType, autoSkip);
}

export function useChartOptions({ chartViewType, isBreakdown, isLogScale }: ChartOptionsProps) {
  const { analytics, filterPeriod } = useDashboardContext();

  return useMemo(() => {
    if (!analytics) return {};
    
    // Check if the current period is a single month (e.g., "2024-03")
    // If it is, we don't want to skip days on the X-axis.
    // If it's a longer period (H1, Q1, YYYY, all), we enable autoSkip.
    const isSingleMonth = isSingleUnitPeriod(filterPeriod);
    const autoSkip = !isSingleMonth;

    if (chartViewType === 'sankey') {
      return {
        responsive: true, maintainAspectRatio: false, color: tc('ink-display'),
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: (ctx: any) => {
              const item = ctx.tooltipItems[0];
              if (item?.element?.options?.backgroundColor) {
                return item.element.options.backgroundColor;
              }
              return tc('surface');
            },
            titleColor: () => tc('ink-display'),
            bodyColor: () => tc('gray-300'),
            borderColor: (ctx: any) => {
              const item = ctx.tooltipItems[0];
              return item?.element?.options?.backgroundColor || (tc('line'));
            },
            borderWidth: 2,
            padding: 12,
            cornerRadius: 0,
            callbacks: {
              label: (c: any) => formatSankeyTooltipLabel(c),
              title: (tooltipItems: any[]) => formatSankeyTooltipTitle(tooltipItems),
              labelColor: (context: any) => {
                const item = context.raw;
                const flowColor = item?.color || (tc('ink-muted'));
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
          // Hide empty series, but keep a negative one (Cashflow in a deficit month).
          filter: (tooltipItem: any) => Boolean(Number(tooltipItem.raw)),
          callbacks: {
            ...baseOptions.plugins?.tooltip?.callbacks,
            footer: (tooltipItems: any[]) => {
              if (!isBreakdown || tooltipItems.length <= 1) return '';
              const sum = tooltipItems.reduce((acc, item) => acc + (item.parsed.y || 0), 0);
              return `รวม: ${formatMoney(sum)} ฿`;
            }
          }
        },
      },
    };
  }, [isBreakdown, chartViewType, analytics?.mainChartType, analytics, isLogScale, filterPeriod]);
}
