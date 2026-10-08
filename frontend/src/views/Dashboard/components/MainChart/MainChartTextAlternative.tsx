// src/views/Dashboard/components/MainChart/MainChartTextAlternative.tsx
import React, { memo } from 'react';
import { formatMoney, formatBaht } from '@/utils/formatters';

interface SankeyFlow { from: string; to: string; flow: number }
interface Series { label?: string; hidden?: boolean; data?: unknown[] }
interface ChartDataLike { labels?: string[]; datasets?: Series[] }

interface Props {
  caption: string;
  isSankey: boolean;
  data: ChartDataLike | null | undefined;
}

/** ตารางสำหรับ screen reader: <canvas> ไม่เปิดข้อมูลของกราฟให้ assistive tech (เหมือนโดนัทใน ExpenseProportionChart) */
export const MainChartTextAlternative = memo(({ caption, isSankey, data }: Props) => {
  const datasets = data?.datasets;
  if (!datasets?.length) return null;

  if (isSankey) {
    const flows = (datasets[0].data ?? []) as SankeyFlow[];
    return (
      <div className="sr-only">
        <table>
          <caption>{caption}</caption>
          <thead>
            <tr>
              <th scope="col">จาก</th>
              <th scope="col">ไปยัง</th>
              <th scope="col">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {flows.map((f, i) => (
              <tr key={`${f.from}>${f.to}>${i}`}>
                <td>{f.from}</td>
                <td>{f.to}</td>
                <td>{formatBaht(f.flow)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Same rule as the legend: skip series the user hid and series that are all zero.
  const series = datasets.filter(ds => !ds.hidden && (ds.data as number[] | undefined)?.some(v => v !== 0));
  const labels = data?.labels ?? [];
  if (!series.length) return null;

  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">ช่วงเวลา</th>
            {series.map((ds, i) => <th key={`${ds.label}-${i}`} scope="col">{ds.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {labels.map((label, row) => (
            <tr key={`${label}-${row}`}>
              <th scope="row">{label}</th>
              {series.map((ds, i) => (
                <td key={`${ds.label}-${i}`}>{formatBaht(Number((ds.data as number[])[row]) || 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

MainChartTextAlternative.displayName = 'MainChartTextAlternative';
