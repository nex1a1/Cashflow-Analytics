// src/views/Dashboard/components/ExpenseProportion/ExpenseProportionChart.tsx
import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { formatMoney } from '../../../../utils/formatters';
import { ExpenseProportionChartProps } from './types';

export const ExpenseProportionChart = React.memo<ExpenseProportionChartProps>(({
  activeChartData,
  options,
  isAllocationMode,
  isGroupMode,
  activeTotal,
  onMouseLeave,
  isSliceHovered = false,
  hoveredItem = null,
}) => {
  const formattedAmt = formatMoney(activeTotal);
  const amtLength = formattedAmt.length;

  // Responsive center typography based on digit count and cutout diameter
  const fontClass = useMemo(() => {
    if (isGroupMode) {
      if (amtLength > 12) return 'text-[8.5px]';
      if (amtLength > 9) return 'text-[9.5px]';
      return 'text-[10.5px]';
    }
    if (amtLength > 12) return 'text-[10px]';
    if (amtLength > 9) return 'text-[11px]';
    return 'text-[12px]';
  }, [isGroupMode, amtLength]);

  // When hovering on grid, show the hovered item in the center
  const displayLabel = hoveredItem 
    ? (hoveredItem.name || 'Category')
    : (isAllocationMode ? 'Income' : 'Total');

  const displayValue = hoveredItem 
    ? formatMoney(hoveredItem.amount)
    : formattedAmt;

  const valueColor = hoveredItem
    ? (hoveredItem.color || '#da291c')
    : '#f1f5f9';

  return (
    <div 
      onMouseLeave={onMouseLeave}
      className="shrink-0 flex flex-col items-center justify-center p-3 border-r border-dashed border-[#303030] bg-[#181818]/20"
    >
      <div className="relative w-[140px] h-[140px]">
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
            className="text-[8px] font-black uppercase tracking-widest opacity-60 text-slate-400 max-w-[72px] truncate text-center"
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
            <span className="text-[7.5px] font-black tabular-nums text-slate-400 -mt-0.5">
              {hoveredItem.percentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

ExpenseProportionChart.displayName = 'ExpenseProportionChart';
export default ExpenseProportionChart;
