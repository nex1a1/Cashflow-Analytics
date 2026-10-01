import { memo, useMemo, useState } from 'react';
import { Bar as BarChart, Line } from 'react-chartjs-2';
import type { ChartOptions } from 'chart.js';
import { Portfolio } from '@/types';
import { tc } from '@/constants/theme';
import { formatMoney, formatThaiDateShort } from '@/utils/formatters';
import { AnalysisTabHeader } from '@/views/Dashboard/components/SummaryCards/Strategic/SummaryStrategic';
import { buildInvestedSeries, withLivePoint } from './portfolioCharts';
import { todayIso } from './portfolioHelpers';

const baht = (n: number) => `฿${formatMoney(n)}`;
const signedBaht = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}฿${formatMoney(Math.abs(n))}`;
// กำไร = เขียว, ขาดทุน = เหลือง (ไม่ใช้แดง) ตามหลักเดียวกับตัวเลขกำไร/ขาดทุนในหน้านี้
const gainText = (n: number) => (n > 0 ? 'text-income' : n < 0 ? 'text-warn' : 'text-ink-display');
const gainBar = (n: number) => (n >= 0 ? 'bg-income' : 'bg-warn');

interface BarProps { label: string; value: number | null; max: number; barClass: string; textClass?: string }

/** แท่งเดียว: ความยาว = สัดส่วนต่อแท่งที่ยาวที่สุด, ตัวเลขอยู่ท้ายแท่ง */
function Bar({ label, value, max, barClass, textClass = 'text-ink-body' }: BarProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[56px] shrink-0 text-[11px] text-ink-muted">{label}</span>
      <div className="flex-1 h-3 bg-canvas">
        {value != null && <div className={`h-full ${barClass}`} style={{ width: `${Math.max((value / max) * 100, 1)}%` }} />}
      </div>
      <span className={`w-[92px] shrink-0 text-right font-mono tabular-nums text-[12px] ${textClass}`}>{value == null ? 'ยังไม่มีราคา' : baht(value)}</span>
    </div>
  );
}

const TABS = [
  { id: 'bars', label: 'ต้นทุนเทียบมูลค่า' },
  { id: 'gain', label: 'กำไร/ขาดทุน' },
  { id: 'invested', label: 'เงินลงทุนสะสม' },
  { id: 'history', label: 'มูลค่าตามเวลา' },
] as const;
type TabId = typeof TABS[number]['id'];

const axisTick = { color: tc('ink-muted'), font: { size: 11 } };
const moneyTick = (v: string | number) => `฿${formatMoney(Number(v))}`;
const BASE = { responsive: true, maintainAspectRatio: false, animation: false } as const;

/** กำไร/ขาดทุนรายสินทรัพย์ (บาท) แท่งแนวนอน — เฉพาะตัวที่มีราคา */
function GainChart({ rows }: { rows: { name: string; cost: number; value: number | null }[] }) {
  const priced = rows.filter(r => r.value != null).map(r => ({ name: r.name, gain: r.value! - r.cost }));
  const data = {
    labels: priced.map(r => r.name),
    datasets: [{ data: priced.map(r => r.gain), backgroundColor: priced.map(r => tc(r.gain >= 0 ? 'income' : 'warn')) }],
  };
  const options: ChartOptions<'bar'> = {
    ...BASE,
    indexAxis: 'y',
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => signedBaht(Number(c.raw)) } } },
    scales: {
      x: { ticks: { ...axisTick, callback: moneyTick }, grid: { color: tc('line') } },
      y: { ticks: axisTick, grid: { display: false } },
    },
  };
  if (priced.length === 0) return <p className="m-auto text-xs text-ink-muted">ยังไม่มีสินทรัพย์ที่มีราคา</p>;
  return (
    <div className="relative flex-1" style={{ minHeight: Math.max(160, priced.length * 44) }} role="img" aria-label={`กำไรขาดทุนรายสินทรัพย์ ${priced.map(r => `${r.name} ${signedBaht(r.gain)}`).join(' ')}`}>
      <BarChart data={data} options={options} />
    </div>
  );
}

/** เงินลงทุนสุทธิสะสม (ซื้อ − ขาย) ตามวันที่ซื้อขาย เป็นขั้นบันได */
function InvestedChart({ assets }: { assets: Portfolio['assets'] }) {
  const series = useMemo(() => buildInvestedSeries(assets), [assets]);
  if (series.length === 0) return <p className="m-auto text-xs text-ink-muted">ยังไม่มีรายการซื้อขาย</p>;
  const data = {
    labels: series.map(p => formatThaiDateShort(p.date)),
    datasets: [{
      data: series.map(p => p.invested),
      borderColor: tc('accent-ink'),
      backgroundColor: tc('accent', 0.12),
      borderWidth: 2,
      stepped: true as const,
      fill: true,
      pointRadius: series.length > 24 ? 0 : 3,
    }],
  };
  const options: ChartOptions<'line'> = {
    ...BASE,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => baht(Number(c.raw)) } } },
    scales: {
      x: { ticks: { ...axisTick, maxTicksLimit: 8 }, grid: { display: false } },
      y: { ticks: { ...axisTick, callback: moneyTick }, grid: { color: tc('line') } },
    },
  };
  return (
    <div className="relative flex-1 min-h-[200px]" role="img" aria-label={`เงินลงทุนสะสม ล่าสุด ${baht(series[series.length - 1].invested)}`}>
      <Line data={data} options={options} />
    </div>
  );
}

const dayNum = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 86_400_000;
const dayIso = (n: number) => new Date(Math.round(n) * 86_400_000).toISOString().slice(0, 10);

/**
 * มูลค่าพอร์ตเทียบต้นทุนตามเวลา จากที่ระบบจดไว้วันละครั้ง (ตอนเปิดแอป/ดึงราคา/กรอกราคา) + จุดของวันนี้จากตัวเลขสด
 * แกน X เป็นจำนวนวันจริง (ไม่ใช่ลำดับจุด) วันที่ไม่ได้เปิดแอปจะเป็นช่วงห่างบนแกน ไม่ถูกบีบให้ชิดกัน
 */
function HistoryChart({ portfolio }: { portfolio: Portfolio }) {
  const series = useMemo(() => withLivePoint(portfolio.history, portfolio.totals, todayIso()), [portfolio.history, portfolio.totals]);
  if (series.length < 2) {
    return (
      <p className="m-auto max-w-sm text-center text-xs text-ink-muted">
        ระบบจดมูลค่าพอร์ตวันละครั้งเมื่อเปิดแอปหรือดึงราคา กราฟจะขึ้นเมื่อมีข้อมูลอย่างน้อย 2 วัน (ตอนนี้มี {series.length} วัน)
      </p>
    );
  }
  const data = {
    datasets: [
      { label: 'มูลค่า', data: series.map(p => ({ x: dayNum(p.date), y: p.marketValue })), borderColor: tc('accent-ink'), backgroundColor: tc('accent', 0.12), borderWidth: 2, pointRadius: series.length > 24 ? 0 : 3, fill: true },
      { label: 'ต้นทุน', data: series.map(p => ({ x: dayNum(p.date), y: p.cost })), borderColor: tc('ink-muted'), borderDash: [4, 4], borderWidth: 1.5, pointRadius: 0, stepped: true as const },
    ],
  };
  const options: ChartOptions<'line'> = {
    ...BASE,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: tc('surface'), borderColor: tc('line'), borderWidth: 1, cornerRadius: 0, padding: 8,
        titleColor: tc('ink-display'), bodyColor: tc('gray-300'),
        callbacks: {
          title: items => formatThaiDateShort(dayIso(items[0].parsed.x as number)),
          label: c => ` ${c.dataset.label}: ${baht(c.parsed.y as number)}`,
        },
      },
    },
    scales: {
      x: { type: 'linear', ticks: { ...axisTick, maxTicksLimit: 8, precision: 0, callback: v => formatThaiDateShort(dayIso(Number(v))) }, grid: { display: false } },
      y: { ticks: { ...axisTick, callback: moneyTick }, grid: { color: tc('line') } },
    },
  };
  const last = series[series.length - 1];
  return (
    <div className="relative flex-1 min-h-[200px]" role="img" aria-label={`มูลค่าพอร์ตตามเวลา ล่าสุด ${baht(last.marketValue)} ต้นทุน ${baht(last.cost)}`}>
      <Line data={data} options={options} />
    </div>
  );
}

const SUBTITLE: Record<TabId, string> = {
  bars: 'แท่งเทา = เงินที่ลงไป · แท่งสี = มูลค่าตอนนี้ (เขียว = กำไร, เหลือง = ขาดทุน)',
  gain: 'กำไรหรือขาดทุนของแต่ละสินทรัพย์ที่ยังถืออยู่ เทียบกับเงินที่ลงไป',
  invested: 'เงินลงทุนสุทธิ (ซื้อ − ขาย) สะสมตามวันที่ซื้อขาย — ดูเส้นมูลค่าได้ที่แท็บ "มูลค่าตามเวลา"',
  history: 'เส้นแดง = มูลค่าพอร์ต · เส้นประเทา = ต้นทุน (สินทรัพย์ที่มีราคา) — เริ่มสะสมวันละจุดตั้งแต่เปิดใช้ฟีเจอร์นี้ ย้อนหลังก่อนหน้านั้นไม่มีข้อมูล',
};

/**
 * ลงเงินไปเท่าไร เทียบกับตอนนี้มีค่าเท่าไร — สลับดูเป็นแท่งเทียบ / กำไรขาดทุน / เงินลงทุนสะสม
 * "มูลค่าตามเวลา" มีเฉพาะช่วงที่ระบบจดไว้เอง (ไม่มีราคาย้อนหลังก่อนหน้านั้น)
 */
const CostVsValue = memo(function CostVsValue({ portfolio }: { portfolio: Portfolio }) {
  const [tab, setTab] = useState<TabId>('bars');
  const rows = useMemo(
    () => portfolio.assets
      .filter(a => a.units > 0)
      .map(a => ({ id: a.id, name: a.name, cost: a.cost, value: a.marketValue }))
      .sort((a, b) => (b.value ?? b.cost) - (a.value ?? a.cost)),
    [portfolio.assets],
  );
  const max = Math.max(1, ...rows.map(r => Math.max(r.cost, r.value ?? 0)));

  if (rows.length === 0) return <p className="m-auto p-5 text-xs text-ink-muted">ยังไม่มีสินทรัพย์ที่ถืออยู่</p>;

  return (
    <div className="flex flex-col h-full min-h-[240px]">
      <AnalysisTabHeader activeTab={tab} tabs={TABS} onChange={setTab} />
      <div className="flex flex-col gap-3 p-5 flex-1 min-h-0">
        <div>
          <h2 className="text-[13px] font-bold text-ink-display">ลงเงินไปเท่าไร ตอนนี้มีค่าเท่าไร</h2>
          <p className="text-[11px] text-ink-muted mt-0.5">{SUBTITLE[tab]}</p>
        </div>
        {tab === 'gain' && <GainChart rows={rows} />}
        {tab === 'invested' && <InvestedChart assets={portfolio.assets} />}
        {tab === 'history' && <HistoryChart portfolio={portfolio} />}
        {tab === 'bars' && (
          <div className="flex flex-col gap-4 overflow-y-auto">
            {rows.map(r => {
              const gain = r.value == null ? 0 : r.value - r.cost;
              const pct = r.value == null || r.cost <= 0 ? null : (gain / r.cost) * 100;
              return (
                <div key={r.id} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[13px] font-bold text-ink-display truncate">{r.name}</span>
                    {r.value != null && (
                      <span className={`text-[12px] font-bold font-mono tabular-nums ${gainText(gain)}`}>
                        {signedBaht(gain)}{pct != null && ` (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`}
                      </span>
                    )}
                  </div>
                  <Bar label="ลงไป" value={r.cost} max={max} barClass="bg-ink-muted" />
                  <Bar label="ตอนนี้" value={r.value} max={max} barClass={gainBar(gain)} textClass="text-ink-display font-bold" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default CostVsValue;
