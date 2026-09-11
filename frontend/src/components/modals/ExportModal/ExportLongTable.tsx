// frontend/src/components/modals/ExportModal/ExportLongTable.tsx
import React from 'react';
import { Category, CashflowGroup, TransactionDisplay } from '../../../types';
import { formatMoney } from '../../../utils/formatters';
import { fromISODate } from '../../../utils/dateHelpers';
import { DayTypeInfo, ExportFormatKey } from './types';
import CategoryGlyph from '../../shared/CategoryGlyph';

export interface ExportLongTableProps {
  data: TransactionDisplay[];
  categories: Category[];
  cashflowGroups?: CashflowGroup[];
  getDayTypeInfo: (date: string) => DayTypeInfo;
  exportFormat: ExportFormatKey;
}

export default function ExportLongTable({
  data,
  categories,
  cashflowGroups = [],
  getDayTypeInfo,
  exportFormat,
}: ExportLongTableProps) {
  const isFullCsv = exportFormat === 'full_csv';
  const groupMap = new Map(cashflowGroups.map((g) => [g.id, g]));

  return (
    <div className="w-full overflow-x-auto custom-scrollbar">
      <table className="w-full text-left text-xs leading-normal border-collapse min-w-[700px]">
        <thead className="sticky top-0 bg-[#1c1c1c] text-neutral-300 z-10 select-none border-b border-[#303030]">
          <tr>
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
              วันที่
            </th>
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
              ประเภทวัน
            </th>
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
              ประเภท
            </th>
            {isFullCsv && (
              <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
                กลุ่มกระแสเงิน
              </th>
            )}
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
              หมวดหมู่
            </th>
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400">
              รายละเอียด
            </th>
            <th className="py-2.5 px-3 font-mono font-bold uppercase tracking-wider text-[10px] text-neutral-400 text-right">
              จำนวนเงิน (฿)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#262626]">
          {data.map((t, idx) => {
            const cat = categories.find((c) => c.name === t.category || c.id === t.category_id);
            const dt = getDayTypeInfo(t.date);
            const type = cat?.type || t.group_type || 'expense';

            const isIncome = type === 'income';
            const isSavings = type === 'savings';

            let typeBadgeClass = 'text-rose-400 bg-rose-950/30 border-rose-900/40';
            let amountColor = 'text-rose-400';
            let amountPrefix = '-';

            if (isIncome) {
              typeBadgeClass = 'text-emerald-400 bg-emerald-950/30 border-emerald-900/40';
              amountColor = 'text-emerald-400';
              amountPrefix = '+';
            } else if (isSavings) {
              typeBadgeClass = 'text-cyan-400 bg-cyan-950/30 border-cyan-900/40';
              amountColor = 'text-cyan-400';
              amountPrefix = '±';
            }

            const groupId = cat?.cashflowGroup || cat?.cashflow_group_id;
            const group = groupId ? groupMap.get(groupId) : undefined;
            const catColor = cat?.color || '#a3a3a3';

            return (
              <tr key={t.id || idx} className="hover:bg-[#1a1a1a] transition-colors group">
                {/* Date */}
                <td className="py-2 px-3 text-neutral-300 font-mono text-[11px] whitespace-nowrap">
                  {fromISODate(t.date)}
                </td>

                {/* Day Type Badge with sharp border */}
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

                {/* Type */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 border ${typeBadgeClass}`}>
                    {type.toUpperCase()}
                  </span>
                </td>

                {/* Group (if full_csv) */}
                {isFullCsv && (
                  <td className="py-2 px-3 text-neutral-400 text-xs whitespace-nowrap">
                    {group?.name || '—'}
                  </td>
                )}

                {/* Category with sharp border */}
                <td className="py-2 px-3 whitespace-nowrap">
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-none border inline-flex items-center gap-1.5"
                    style={{
                      color: catColor,
                      borderColor: `${catColor}35`,
                      backgroundColor: `${catColor}12`,
                    }}
                  >
                    {cat?.icon && <CategoryGlyph icon={cat.icon} color={catColor} size={11} />}
                    <span>{t.category}</span>
                  </span>
                </td>

                {/* Description */}
                <td className="py-2 px-3 text-neutral-200 text-xs max-w-[240px] truncate" title={t.description}>
                  {t.description || '—'}
                </td>

                {/* Amount */}
                <td className={`py-2 px-3 text-right font-mono font-bold text-xs tabular-nums ${amountColor}`}>
                  {amountPrefix}
                  {formatMoney(t.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
