import { memo, useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { Portfolio } from '@/types';
import { tc } from '@/constants/theme';
import { formatMoney } from '@/utils/formatters';
import { assetColorMap, buildAllocation } from './portfolioCharts';

const OPTIONS: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  cutout: '68%',
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
};

/** วงกลมสัดส่วนตามมูลค่า + รายการเรียงมากไปน้อย (รายการเป็นตัวหลักที่อ่านค่า วงกลมช่วยเห็นภาพรวม) */
const AllocationPanel = memo(function AllocationPanel({ portfolio }: { portfolio: Portfolio }) {
  const { items, colors, data, total } = useMemo(() => {
    const it = buildAllocation(portfolio);
    const map = assetColorMap(portfolio.assets);
    return {
      items: it,
      colors: map,
      total: it.reduce((s, a) => s + a.value, 0),
      data: {
        labels: it.map(a => a.name),
        datasets: [{ data: it.map(a => a.value), backgroundColor: it.map(a => tc(map[a.id])), borderColor: tc('surface'), borderWidth: 2 }],
      },
    };
  }, [portfolio]);

  if (items.length === 0) return <p className="m-auto text-xs text-ink-muted">ยังไม่มีสินทรัพย์ที่ถืออยู่</p>;

  return (
    <div className="flex flex-col gap-3 h-full">
      <h2 className="text-[13px] font-bold text-ink-display">สัดส่วนพอร์ต</h2>
      <div className="flex items-center gap-4">
        <div className="relative w-[112px] h-[112px] shrink-0" role="img" aria-label={`สัดส่วนพอร์ต ${items.map(a => `${a.name} ${a.pct.toFixed(0)}%`).join(' ')}`}>
          <Doughnut data={data} options={OPTIONS} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-ink-muted">{items.length} รายการ</span>
          </div>
        </div>
        <ul className="flex-1 min-w-0 flex flex-col gap-1.5">
          {items.map(a => (
            <li key={a.id} className="flex items-center gap-2 text-[12px]">
              <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: tc(colors[a.id]) }} />
              <span className="flex-1 min-w-0 truncate text-ink-soft" title={a.name}>{a.name}</span>
              <span className="font-bold tabular-nums text-ink-display">{a.pct.toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-auto text-[11px] text-ink-muted tabular-nums">
        รวม ฿{formatMoney(total)}{items.some(a => !a.priced) && ' · บางรายการยังไม่มีราคา ใช้ต้นทุนแทน'}
      </p>
    </div>
  );
});

export default AllocationPanel;
