import { memo, useMemo, useState } from 'react';
import { Doughnut } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { Portfolio } from '@/types';
import { tc, type ThemeToken } from '@/constants/theme';
import { formatMoney } from '@/utils/formatters';
import { AllocationItem, assetColorMap, buildAllocation, buildAllocationByKind } from './portfolioCharts';

type Mode = 'asset' | 'kind';
const MODES: { id: Mode; label: string }[] = [
  { id: 'asset', label: 'รายตัว' },
  { id: 'kind', label: 'ตามประเภท' },
];

const baseOptions = (items: AllocationItem[]): ChartOptions<'doughnut'> => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: tc('surface'),
      borderColor: tc('line'),
      borderWidth: 1,
      cornerRadius: 0,
      padding: 8,
      titleColor: tc('ink-display'),
      bodyColor: tc('gray-300'),
      callbacks: {
        label: c => ` ฿${formatMoney(Number(c.raw))} (${items[c.dataIndex]?.pct.toFixed(1)}%)`,
      },
    },
  },
});

const Legend = ({ items, colors, active }: { items: AllocationItem[]; colors: Record<string, string>; active: boolean }) => (
  <ul aria-hidden={!active} className={`[grid-area:1/1] min-w-0 flex flex-col gap-1.5 ${active ? '' : 'invisible'}`}>
    {items.map(a => (
      <li key={a.id} className="flex items-center gap-2 text-[12px]">
        <span className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: colors[a.id] }} />
        <span className="flex-1 min-w-0 truncate text-ink-soft" title={a.name}>{a.name}</span>
        <span className="font-bold tabular-nums text-ink-display">{a.pct.toFixed(0)}%</span>
      </li>
    ))}
  </ul>
);

/**
 * วงกลมสัดส่วนตามมูลค่า + รายการเรียงมากไปน้อย (รายการเป็นตัวหลักที่อ่านค่า วงกลมช่วยเห็นภาพรวม)
 * สลับ รายตัว / ตามประเภท — สองรายการวางซ้อนในช่องเดียว (invisible) ความสูงจึงไม่เด้งตอนสลับ
 */
const AllocationPanel = memo(function AllocationPanel({ portfolio }: { portfolio: Portfolio }) {
  const [mode, setMode] = useState<Mode>('asset');
  const view = useMemo(() => {
    // รายตัวต้องใช้สีชุดเดียวกับตารางสินทรัพย์ (ทำแผนที่สีจากสินทรัพย์ทั้งหมด ไม่ใช่เฉพาะที่ยังถืออยู่)
    const build = (items: AllocationItem[], map: Record<string, ThemeToken>) => {
      const colors = Object.fromEntries(items.map(a => [a.id, tc(map[a.id])]));
      return {
        items,
        colors,
        options: baseOptions(items),
        data: {
          labels: items.map(a => a.name),
          datasets: [{ data: items.map(a => a.value), backgroundColor: items.map(a => colors[a.id]), borderColor: tc('surface'), borderWidth: 2 }],
        },
      };
    };
    const byAsset = buildAllocation(portfolio);
    const byKind = buildAllocationByKind(portfolio);
    return {
      asset: build(byAsset, assetColorMap(portfolio.assets)),
      kind: build(byKind, assetColorMap(byKind)),
      total: byAsset.reduce((s, a) => s + a.value, 0),
      anyUnpriced: byAsset.some(a => !a.priced),
    };
  }, [portfolio]);

  const active = view[mode];
  if (view.asset.items.length === 0) return <p className="m-auto text-xs text-ink-muted">ยังไม่มีสินทรัพย์ที่ถืออยู่</p>;

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-bold text-ink-display">สัดส่วนพอร์ต</h2>
        <div role="group" aria-label="มุมมองสัดส่วน" className="flex border border-line">
          {MODES.map(m => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`px-2 py-1 text-[11px] font-bold ${mode === m.id ? 'bg-surface-elevated text-ink-display' : 'text-ink-muted hover:text-ink-display'}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative w-[112px] h-[112px] shrink-0" role="img" aria-label={`สัดส่วนพอร์ต ${active.items.map(a => `${a.name} ${a.pct.toFixed(0)}%`).join(' ')}`}>
          <Doughnut data={active.data} options={active.options} />
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[11px] text-ink-muted">{active.items.length} {mode === 'asset' ? 'รายการ' : 'ประเภท'}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0 grid">
          <Legend items={view.asset.items} colors={view.asset.colors} active={mode === 'asset'} />
          <Legend items={view.kind.items} colors={view.kind.colors} active={mode === 'kind'} />
        </div>
      </div>
      <p className="mt-auto text-[11px] text-ink-muted tabular-nums">
        รวม ฿{formatMoney(view.total)}{view.anyUnpriced && ' · บางรายการยังไม่มีราคา ใช้ต้นทุนแทน'}
      </p>
    </div>
  );
});

export default AllocationPanel;
