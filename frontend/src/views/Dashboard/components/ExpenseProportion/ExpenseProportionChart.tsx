// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionChart.tsx
import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { formatMoney } from '../../../../utils/formatters';
import { ExpenseProportionChartProps } from './types';

import { tc } from '@/constants/theme';
export const ExpenseProportionChart = React.memo<ExpenseProportionChartProps>(({
  activeChartData,
  options,
  isAllocationMode,
  activeTotal,
  onMouseLeave,
  isSliceHovered = false,
  hoveredItem = null,
  activeItems,
}) => {
  const formattedAmt = formatMoney(activeTotal);
  const amtLength = formattedAmt.length;

  // Responsive center typography based on digit count
  const fontClass = useMemo(() => {
    if (amtLength > 12) return 'text-[11px]';
    return 'text-[12px]';
  }, [amtLength]);

  // When hovering on grid, show the hovered item in the center
  const displayLabel = hoveredItem
    ? (hoveredItem.name || 'หมวดหมู่')
    : (isAllocationMode ? 'รายได้' : 'รวม');

  const displayValue = hoveredItem 
    ? formatMoney(hoveredItem.amount)
    : formattedAmt;

  const valueColor = hoveredItem
    ? (hoveredItem.color || tc('accent'))
    : tc('ink-display');

  return (
    <div 
      onMouseLeave={onMouseLeave}
      className="shrink-0 flex flex-col items-center justify-center p-3 border-r border-dashed border-line bg-canvas/20"
    >
      <div className="relative w-[140px] h-[140px]" aria-hidden="true">
        <Doughnut data={activeChartData} options={options} />

        {/*
          Center HUD Layer:
          Hides completely (opacity-0) when hovering over a chart slice so Chart.js tooltip
          can take center stage with zero text collision or overlapping.
        */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-1 transition-opacity duration-150 ${
            isSliceHovered ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span
            className="text-[11px] font-black uppercase tracking-widest text-slate-400 max-w-[72px] truncate text-center"
            title={displayLabel}
          >
            {displayLabel}
          </span>
          <span
            className={`${fontClass} font-black tabular-nums max-w-[76px] truncate text-center tracking-tight`}
            style={{ color: valueColor }}
            title={`฿${displayValue}`}
          >
            {displayValue}
          </span>
          {hoveredItem && 'percentage' in hoveredItem && (
            <span className="text-[11px] font-black tabular-nums text-slate-400 -mt-0.5">
              {hoveredItem.percentage}%
            </span>
          )}
        </div>
      </div>

      {/* Screen-reader equivalent: the doughnut canvas exposes none of this data to assistive tech */}
      <table className="sr-only">
        <caption>สัดส่วนรายจ่าย {isAllocationMode ? 'ตามสัดส่วน 50/30/20' : 'ตามหมวดหมู่'} รวม ฿{formattedAmt}</caption>
        <thead>
          <tr>
            <th scope="col">รายการ</th>
            <th scope="col">จำนวนเงิน</th>
            <th scope="col">สัดส่วน</th>
          </tr>
        </thead>
        <tbody>
          {activeItems.map((item) => (
            <tr key={item.id || item.name}>
              <td>{item.name}</td>
              <td>฿{formatMoney(item.amount)}</td>
              <td>{item.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

ExpenseProportionChart.displayName = 'ExpenseProportionChart';
export default ExpenseProportionChart;
