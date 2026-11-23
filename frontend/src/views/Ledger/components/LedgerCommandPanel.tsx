import React from 'react';
import { BUDGET_RULES } from '@/constants/budgetRules';
import { formatBaht } from '@/utils/formatters';
import { Activity, TrendingUp, TrendingDown, Wallet, ChevronDown } from 'lucide-react';

export function getSavingsRateStyle(savingsRate: number): string {
  if (savingsRate >= BUDGET_RULES.surplus.min) return 'bg-income/10 text-income border-income/20';
  return 'bg-danger/10 text-danger border-danger/20';
}

export interface LedgerCommandPanelProps {
  sumInc: number;
  sumExp: number;
  /** ลงทุน/ออมสุทธิ (ซื้อ − ขาย) — อยู่นอก "รายจ่าย" และรวมอยู่ใน "คงเหลือสุทธิ" */
  sumSav?: number;
  net: number;
  savingsRate: number;
  getSubValue: (val: number) => React.ReactNode;
  showGroupBreakdown: boolean;
  setShowGroupBreakdown: React.Dispatch<React.SetStateAction<boolean>>;
  totalActiveGroupCards: number;
}

export const LedgerCommandPanel: React.FC<LedgerCommandPanelProps> = ({
  sumInc,
  sumExp,
  sumSav = 0,
  net,
  savingsRate,
  getSubValue,
  showGroupBreakdown,
  setShowGroupBreakdown,
  totalActiveGroupCards
}) => {
  const isNetPositive = net >= 0;
  const netBorderClass = isNetPositive 
    ? 'border-l-income' 
    : 'border-l-expense';

  return (
    <div className="w-full flex flex-col rounded-none overflow-hidden border bg-canvas border-line">
      <div className="px-3.5 py-2 flex items-center justify-between border-b bg-surface/50 border-line/60">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-ink" />
          <span className="text-[11px] font-black uppercase tracking-widest text-ink-body font-sans">
            สรุปรายรับ-รายจ่าย
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-px bg-surface-elevated/60">
        <div className="group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] border-l-income bg-canvas hover:bg-surface-hover">
          <div className="relative z-10 flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-body font-sans">
              รายรับรวม
            </span>
          </div>
          <div className="relative z-10 mt-0.5">
            <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-income font-mono">
              {formatBaht(sumInc)}
            </div>
          </div>
          <div className="relative z-10 mt-1 flex items-center justify-between">
            <span className="text-[11px] font-bold tabular-nums text-ink-muted font-sans">
              {getSubValue(sumInc)}
            </span>
          </div>
        </div>

        <div className="group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] border-l-expense bg-canvas hover:bg-surface-hover">
          <div className="relative z-10 flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-body font-sans">
              รายจ่ายรวม
            </span>
          </div>
          <div className="relative z-10 mt-0.5">
            <div className="text-2xl font-black tabular-nums tracking-tight leading-none text-expense font-mono">
              {formatBaht(sumExp)}
            </div>
          </div>
          <div className="relative z-10 mt-1 flex items-center justify-between">
            <span className="text-[11px] font-bold tabular-nums text-ink-muted font-sans">
              {getSubValue(sumExp)}
            </span>
          </div>
        </div>

        <div className={`group relative overflow-hidden p-3 px-3.5 flex flex-col justify-between min-h-[76px] border-l-[3px] bg-canvas hover:bg-surface-hover ${netBorderClass}`}>
          <div className="relative z-10 flex justify-between items-center mb-0.5">
            <span className="text-[11px] font-black uppercase tracking-wider text-ink-body font-sans">
              คงเหลือสุทธิ
            </span>
            <div className="flex items-center gap-1">
              {sumInc > 0 && (
                <div className={`px-1.5 py-0.5 rounded-pill text-[11px] font-black uppercase tracking-widest flex items-center gap-1 border ${getSavingsRateStyle(savingsRate)}`}>
                  <span>{savingsRate}% ของรายรับ</span>
                </div>
              )}
              <span className={`px-1.5 py-0.5 rounded-pill text-[11px] font-black uppercase tracking-widest border ${isNetPositive ? 'bg-income/10 text-income border-income/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                {isNetPositive ? 'เหลือ' : 'ขาดดุล'}
              </span>
            </div>
          </div>
          <div className="relative z-10 mt-0.5">
            <div className={`text-2xl font-black tabular-nums tracking-tight leading-none font-mono ${isNetPositive ? 'text-income' : 'text-danger'}`}>
              {formatBaht(net)}
            </div>
          </div>
          <div className="relative z-10 mt-1 flex items-center justify-between">
            <span className="text-[11px] font-bold tabular-nums text-ink-muted font-sans">
              {getSubValue(net)}
            </span>
            {sumSav !== 0 && (
              <span className="text-[11px] font-bold tabular-nums text-savings font-sans" title="เงินลงทุน/ออมสุทธิในช่วงนี้ (ซื้อ − ขาย) ไม่นับเป็นรายจ่าย">
                ในนี้ลงทุน/ออม {formatBaht(sumSav)}
              </span>
            )}
          </div>
        </div>
      </div>

      {totalActiveGroupCards > 0 && (
        <button
          onClick={() => setShowGroupBreakdown(v => !v)}
          className="w-full py-1.5 px-4 bg-surface hover:bg-surface-hover border-t border-line/80 flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest font-mono text-ink-body hover:text-ink-display transition-colors group cursor-pointer"
          title="ขยาย/หุบ แผงจำแนกหมวดหมู่ย่อย"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showGroupBreakdown ? 'rotate-180 text-accent-ink group-hover:-translate-y-0.5' : 'text-ink-muted group-hover:text-accent-ink group-hover:translate-y-0.5'}`} />
          <span>{showGroupBreakdown ? 'หุบการจำแนกตามกลุ่มรายรับ-รายจ่าย' : `ขยายดูการจำแนกตามกลุ่มรายรับ-รายจ่าย (${totalActiveGroupCards} กลุ่ม)`}</span>
        </button>
      )}
    </div>
  );
};

export interface LedgerGroupBreakdownSectionProps {
  activeIncomeCards: React.ReactNode[];
  activeSavingsCards: React.ReactNode[];
  activeExpenseCards: React.ReactNode[];
}

export const LedgerGroupBreakdownSection: React.FC<LedgerGroupBreakdownSectionProps> = ({
  activeIncomeCards,
  activeSavingsCards,
  activeExpenseCards
}) => {
  const blocks = [
    { key: 'inc', label: 'รายรับ', Icon: TrendingUp, tone: 'text-income', rows: activeIncomeCards },
    { key: 'sav', label: 'การออมและลงทุน', Icon: Wallet, tone: 'text-savings', rows: activeSavingsCards },
    { key: 'exp', label: 'รายจ่าย', Icon: TrendingDown, tone: 'text-expense', rows: activeExpenseCards },
  ].filter(b => b.rows.length > 0);

  return (
    <div className="m-reveal flex flex-col border border-line bg-canvas">
      {blocks.map(({ key, label, Icon, tone, rows }) => (
        <section key={key} data-block={key} className="flex flex-col">
          <div className={`flex items-center gap-1.5 px-3.5 py-1 bg-surface/50 border-y border-line/60 text-[11px] font-black uppercase tracking-wider font-sans ${tone}`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </div>
          <div className="m-stagger flex flex-col divide-y divide-line/40">
            {rows}
          </div>
        </section>
      ))}
    </div>
  );
};

export default LedgerCommandPanel;
