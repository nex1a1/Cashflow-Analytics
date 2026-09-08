// frontend/src/components/modals/ExportModal/ExportWideTable.tsx
import React, { useMemo } from 'react';
import { Category, TransactionDisplay } from '../../../types';
import { formatMoney } from '../../../utils/formatters';
import { fromISODate } from '../../../utils/dateHelpers';
import { calculateCategoryTotal } from './exportUtils';
import { DayTypeInfo } from './types';

export interface ExportWideTableProps {
  data: TransactionDisplay[];
  categories: Category[];
  getDayTypeInfo: (date: string) => DayTypeInfo;
}

export default function ExportWideTable({
  data,
  categories,
  getDayTypeInfo,
}: ExportWideTableProps) {
  const dates = useMemo(() => {
    return Array.from(new Set(data.map((t) => t.date))).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const activeCats = useMemo(() => {
    return categories.filter((c) => data.some((t) => t.category === c.name || t.category_id === c.id));
  }, [categories, data]);

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs leading-normal border-collapse min-w-[800px]">
        <thead className="sticky top-0 bg-[#1c1c1c] text-neutral-300 z-10 select-none border-b border-[#303030]">
          <tr>
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400 sticky left-0 bg-[#1c1c1c] z-20">
              วันที่ (Date)
            </th>
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
              ประเภทวัน
            </th>
            {activeCats.map((cat) => (
              <th
                key={cat.id}
                className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-right whitespace-nowrap"
                style={{ color: cat.color || '#a3a3a3' }}
              >
                {cat.name}
              </th>
            ))}
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-right text-[#da291c] sticky right-0 bg-[#1c1c1c] z-20">
              รวมสุทธิ (Total)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#262626]">
          {dates.map((date) => {
            const dt = getDayTypeInfo(date);
            let rowTotal = 0;

            return (
              <tr key={date} className="hover:bg-[#1a1a1a] transition-colors group">
                {/* Date (sticky left) */}
                <td className="py-2 px-3 text-neutral-300 font-mono text-[11px] whitespace-nowrap sticky left-0 bg-[#121212] group-hover:bg-[#1a1a1a] z-10 border-r border-[#262626]">
                  {fromISODate(date)}
                </td>

                {/* Day Type Badge */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-none border inline-block select-none font-mono"
                    style={{
                      color: dt.color,
                      borderColor: `${dt.color}40`,
                      backgroundColor: `${dt.color}15`,
                    }}
                  >
                    {dt.label}
                  </span>
                </td>

                {/* Categories */}
                {activeCats.map((cat) => {
                  const total = calculateCategoryTotal(data, date, cat.name);
                  rowTotal += total;

                  return (
                    <td
                      key={cat.id}
                      className={`py-2 px-3 text-right font-mono text-xs tabular-nums whitespace-nowrap ${
                        total > 0 ? 'text-neutral-200 font-medium' : 'text-neutral-600'
                      }`}
                    >
                      {total > 0 ? formatMoney(total) : '—'}
                    </td>
                  );
                })}

                {/* Row Total (sticky right) */}
                <td className="py-2 px-3 text-right font-mono font-bold text-xs tabular-nums text-white sticky right-0 bg-[#121212] group-hover:bg-[#1a1a1a] z-10 border-l border-[#262626]">
                  {formatMoney(rowTotal)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
