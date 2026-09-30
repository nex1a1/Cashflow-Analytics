import { memo } from 'react';
import { Portfolio } from '@/types';
import { formatMoney } from '@/utils/formatters';
import CostVsValue from './CostVsValue';
import AllocationPanel from './AllocationPanel';
import { buildInvestedSeries } from './portfolioCharts';
import { describeHolding } from './portfolioHelpers';

const plMoney = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}฿${formatMoney(Math.abs(n))}`;
const plPct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(2)}%`;
/** กำไร = เขียว · ขาดทุน = เทาอ่อนไม่ใช่แดง: ราคาตลาดขึ้นลงเป็นเรื่องปกติ ไม่ใช่ปัญหาที่ต้องรีบทำอะไร (แดงสงวนไว้ให้ปัญหาจริง) */
export const plColor = (n: number | null | undefined) => (n == null || n === 0 ? 'text-ink-display' : n > 0 ? 'text-income' : 'text-ink-soft');

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const Row = ({ label, value, valueClass = 'text-ink-display', sub, small = false }: { label: string; value: string; valueClass?: string; sub?: string; small?: boolean }) => (
  <div className={`flex items-baseline justify-between gap-3 py-2 border-t border-line first:border-t-0 ${small ? 'pl-3' : ''}`}>
    <dt className={`text-ink-body ${small ? 'text-[11px]' : 'text-[12px]'}`}>{label}</dt>
    <dd className="text-right">
      <span className={`font-bold tabular-nums ${small ? 'text-[12px]' : 'text-[14px]'} ${valueClass}`}>{value}</span>
      {sub && <span className={`ml-2 text-[11px] tabular-nums ${valueClass}`}>{sub}</span>}
    </dd>
  </div>
);

const PortfolioSummary = memo(function PortfolioSummary({ portfolio }: { portfolio: Portfolio }) {
  const { totals, generalSavings } = portfolio;
  const totalPl = totals.unrealized + totals.realized;
  const totalPct = totals.cost > 0 ? (totalPl / totals.cost) * 100 : null;
  const first = buildInvestedSeries(portfolio.assets)[0];
  const holding = first ? describeHolding(first.date, todayIso()) : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid xl:grid-cols-[minmax(300px,1fr)_minmax(0,2fr)_minmax(280px,1fr)] gap-[1px] bg-line border border-line">
        <section aria-label="สรุปพอร์ต" className="bg-surface p-5 flex flex-col gap-4">
          <div>
            <h2 className="text-[13px] font-bold text-ink-display">มูลค่าพอร์ตตอนนี้</h2>
            <p className="mt-2 text-[32px] leading-none font-black tabular-nums tracking-tight text-ink-display">฿{formatMoney(totals.marketValue)}</p>
            <p className="mt-2 text-[13px] text-ink-body tabular-nums">
              ลงทุนไปแล้ว <span className="font-bold text-ink-soft">฿{formatMoney(totals.cost)}</span>
              {holding && <span> · ถือมา {holding}</span>}
            </p>
          </div>
          <dl className="flex flex-col">
            <Row label="กำไร/ขาดทุนรวม" value={plMoney(totalPl)} valueClass={plColor(totalPl)} sub={totalPct == null ? undefined : plPct(totalPct)} />
            <Row small label="ยังไม่ขาย" value={plMoney(totals.unrealized)} valueClass={plColor(totals.unrealized)} />
            <Row small label="ขายแล้ว" value={plMoney(totals.realized)} valueClass={plColor(totals.realized)} />
          </dl>
          {totalPl < 0 && (
            <p className="text-[11px] text-ink-muted">ตอนนี้มูลค่าต่ำกว่าต้นทุนชั่วคราว ราคาขึ้นลงเป็นเรื่องปกติของการลงทุนระยะยาว</p>
          )}
        </section>

        <section aria-label="เงินที่ลงไปเทียบมูลค่าตอนนี้" className="bg-surface flex flex-col">
          <CostVsValue portfolio={portfolio} />
        </section>

        <section aria-label="สัดส่วนพอร์ต" className="bg-surface p-5 flex flex-col">
          <AllocationPanel portfolio={portfolio} />
        </section>
      </div>

      {(totals.unpricedCount > 0 || generalSavings !== 0) && (
        <p className="text-[11px] text-ink-body flex flex-wrap gap-x-4 gap-y-1">
          {totals.unpricedCount > 0 && (
            <span className="text-warn">{totals.unpricedCount} สินทรัพย์ยังไม่มีราคา จึงไม่รวมในมูลค่าปัจจุบัน — กรอกราคาเองในแถวนั้นได้</span>
          )}
          {generalSavings !== 0 && (
            <span>เงินออมทั่วไป (ไม่ผูกสินทรัพย์) ฿{formatMoney(generalSavings)} — นับเป็นต้นทุน ไม่มีมูลค่าตลาด</span>
          )}
        </p>
      )}
    </div>
  );
});

export default PortfolioSummary;
