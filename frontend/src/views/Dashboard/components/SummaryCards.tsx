// src/views/Dashboard/components/SummaryCards.tsx
import React, { memo } from 'react';
import { 
  Activity, Wallet, Target, Scale, UtensilsCrossed,
  TrendingUp, Zap, Layers, Home, Award, TrendingDown, Navigation,
  ShieldCheck, Gauge, Repeat, LucideIcon
} from 'lucide-react';
import { useDashboardContext } from '../context/DashboardContext';
import { formatMoney, calculatePeriodDelta } from '@/utils/formatters';
import sharkLogo from '@/assets/images/shark-white.svg';
import AnimatedNumber from '@/components/ui/AnimatedNumber';
import CategoryGlyph from '@/components/shared/CategoryGlyph';

// ── TypeScript Interfaces ────────────────────────────────────────────────────

interface PrevTotals {
  income: number;
  expense: number;
  txCount: number;
}

interface RentSub {
  rent: number;
  electricity: number;
  internet: number;
  water: number;
}

interface SubscriptionService {
  name: string;
  icon?: string;
  amount: number;
}

interface WantCategory {
  id: string | number;
  name: string;
  icon: string;
  color?: string;
  amount: number;
  pctOfWant: number;
}

interface PaceStatus {
  label: string;
  color: string;
  bg: string;
}

interface EomStatus {
  label: string;
  color: string;
  bg: string;
  border: string;
}

interface ForecastingDetails {
  currentDay: number;
  lastDayOfMonth: number;
  remainingDays: number;
  monthProgressPct: number;
  fixedTotal: number;
  variableUpToToday: number;
  projectedVariableRemaining: number;
  actualDailyVariableAvg: number;
  projectedSurplusPct: number;
  maxAllowedExpense: number;
  requiredReduction: number;
  requiredDailyReduction: number;
  paceStatus: PaceStatus;
  eomStatus: EomStatus;
}

interface SummaryAnalytics {
  // Vitals
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  savingsRate: number;
  totalSavings: number;
  datesInPeriod?: string[];
  prevTotals?: PrevTotals;
  periodLabel?: string;
  // Strategic
  dailyAvg: number;
  foodPercentage: number | string;
  foodTotal: number;
  foodDailyAvg: number;
  foodPctOfIncome: number | string;
  foodWorkdayAvg: number;
  foodHolidayAvg: number;
  dailyWorkdayAvg: number;
  dailyHolidayAvg: number;
  maxFoodDayAmount: number;
  variableTotal: number;
  fixedTotal: number;
  topWantCategories?: WantCategory[];
  rentPercentage: number | string;
  rentTotal: number;
  rentSub?: RentSub;
  subscriptionTotal: number;
  subscriptionPctOfIncome: number | string;
  subscriptionPercentage: number | string;
  subscriptionCount: number;
  subscriptionSub?: Record<string, number>;
  topSubscriptionServices?: SubscriptionService[];
  // Forecasting
  showForecasting?: boolean;
  projectedExpense: number;
  safeToSpend: number;
  projectedSurplus: number;
  forecastingDetails?: ForecastingDetails;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Formats a signed monetary value with the sign BEFORE the ฿ symbol.
 * e.g. -1234 → "-฿1,234.00"  |  1234 → "฿1,234.00"
 */
const formatSignedMoney = (value: number): string => {
  const abs = Math.abs(value);
  return value < 0 ? `-฿${formatMoney(abs)}` : `฿${formatMoney(abs)}`;
};

// ── Shared UI ────────────────────────────────────────────────────────────────

const Shimmer = ({ className }: { className?: string }) => (
  <div className={`rounded-none animate-pulse bg-neutral-800/80 ${className || ''}`} />
);

const SectionHeader = ({ icon: Icon, title }: { icon?: LucideIcon; title: string }) => (
  <div className="px-4 py-2 flex items-center justify-between border-b border-[#2d2d2d] bg-[#121212]/80">
    <div className="flex items-center gap-2">
      <div className="w-[3px] h-3 bg-[#da291c] shrink-0" />
      {Icon && <Icon className="w-3.5 h-3.5 text-neutral-400" />}
      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-200">
        {title}
      </span>
    </div>
  </div>
);

// ── SECTION 1: FINANCIAL VITALS ──────────────────────────────────────────────

interface SummaryVitalsProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

const SummaryVitals = memo(({ analytics, showSkeleton }: SummaryVitalsProps) => {
  const {
    totalIncome, totalExpense, netCashflow, savingsRate,
    datesInPeriod, prevTotals, periodLabel
  } = analytics;

  const periodDays = Math.max(1, datesInPeriod?.length || 1);
  const avgIncomePerDay = totalIncome / periodDays;
  const avgExpensePerDay = totalExpense / periodDays;
  const expensePercent = totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0;

  const getSavingsGradeInfo = (rate: number) => {
    if (rate >= 30) return { grade: 'A+', label: 'ELITE',     cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    if (rate >= 20) return { grade: 'A',  label: 'STRONG',    cls: 'bg-teal-500/10 text-teal-400 border-teal-500/20' };
    if (rate >= 15) return { grade: 'B',  label: 'GOOD',      cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
    if (rate >= 10) return { grade: 'C',  label: 'FAIR',      cls: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    if (rate >= 5)  return { grade: 'D',  label: 'WEAK',      cls: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
    return           { grade: 'F',  label: 'CRITICAL',  cls: 'bg-[#da291c]/10 text-[#da291c] border-[#da291c]/20' };
  };

  const gradeInfo = getSavingsGradeInfo(savingsRate);

  const hasPriorData = Boolean(prevTotals && prevTotals.txCount > 0);
  const curPeriodLabel = periodLabel || 'PoP';

  const incomeDelta  = calculatePeriodDelta({ current: totalIncome,  prev: prevTotals?.income ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'income' });
  const expenseDelta = calculatePeriodDelta({ current: totalExpense, prev: prevTotals?.expense ?? 0, hasPriorData, periodLabel: curPeriodLabel, type: 'expense' });
  const netDelta     = calculatePeriodDelta({ current: netCashflow,  prev: prevTotals ? (prevTotals.income - prevTotals.expense) : 0, hasPriorData, periodLabel: curPeriodLabel, type: 'net' });

  return (
    <div className="flex flex-col">
      <SectionHeader icon={Activity} title="ตัวชี้วัดหลัก (Core Vitals)" />
      <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d]">

        {/* INCOME CELL */}
        <div className="group relative overflow-hidden p-4 flex flex-col justify-between min-h-[110px] border-l-2 border-l-emerald-500 bg-[#181818] hover:bg-[#1d1d1d] transition-none">
          <div className="absolute -right-2 -bottom-2 opacity-[0.03] pointer-events-none w-16 h-16">
            <img src={sharkLogo} alt="" className="w-full h-full object-contain filter grayscale opacity-40" />
          </div>

          <div className="flex justify-between items-center mb-1 gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400 truncate min-w-0">
              รายรับรวม
            </span>
          </div>

          <div className="mt-1">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className="text-2xl xl:text-3xl font-black text-emerald-400 tabular-nums tracking-tight leading-none">
                <AnimatedNumber value={totalIncome} />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between z-10 gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-4 w-24" />
            ) : (
              <span className="text-[10px] font-bold text-neutral-500 tabular-nums truncate">
                เฉลี่ย ฿{formatMoney(avgIncomePerDay)} / วัน
              </span>
            )}
            {!showSkeleton && (
              <div
                className={`px-1.5 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-none cursor-default shrink-0 transition-none ${incomeDelta.cls}`}
                title={incomeDelta.tooltipText}
              >
                {incomeDelta.text}
              </div>
            )}
          </div>
        </div>

        {/* EXPENSE CELL */}
        <div className="group relative overflow-hidden p-4 flex flex-col justify-between min-h-[110px] border-l-2 border-l-[#da291c] bg-[#181818] hover:bg-[#1d1d1d] transition-none">
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
            <Wallet size={72} />
          </div>

          {/* #5 Fix: min-w-0 on label container + shrink-0 on badge to prevent badge crush */}
          <div className="flex justify-between items-center mb-1 gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400 truncate min-w-0">
              รายจ่ายรวม
            </span>
            {!showSkeleton && (
              <div className="px-1.5 py-0.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 rounded-none text-[9px] font-black uppercase tracking-widest shrink-0">
                ใช้ไป {expensePercent}%
              </div>
            )}
          </div>

          <div className="mt-1">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className="text-2xl xl:text-3xl font-black text-rose-400 tabular-nums tracking-tight leading-none">
                <AnimatedNumber value={totalExpense} />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between z-10 gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-4 w-24" />
            ) : (
              <span className="text-[10px] font-bold text-neutral-500 tabular-nums truncate">
                เฉลี่ย ฿{formatMoney(avgExpensePerDay)} / วัน
              </span>
            )}
            {!showSkeleton && (
              <div
                className={`px-1.5 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-none cursor-default shrink-0 transition-none ${expenseDelta.cls}`}
                title={expenseDelta.tooltipText}
              >
                {expenseDelta.text}
              </div>
            )}
          </div>
        </div>

        {/* CASHFLOW CELL */}
        <div className={`group relative overflow-hidden p-4 flex flex-col justify-between min-h-[110px] border-l-2 bg-[#181818] hover:bg-[#1d1d1d] transition-none ${
          netCashflow >= 0 ? 'border-l-yellow-500' : 'border-l-[#da291c]'
        }`}>
          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
            {netCashflow >= 0 ? <Navigation size={72} /> : <TrendingDown size={72} />}
          </div>

          {/* #5 Fix: min-w-0 + shrink-0 so savings-grade badge never gets squished */}
          <div className="flex justify-between items-start mb-1 gap-2 min-w-0">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-neutral-400 truncate min-w-0 pt-0.5">
              กระแสเงินสดสุทธิ
            </span>
            {!showSkeleton && (
              <div className={`px-1.5 py-0.5 border flex items-center gap-1.5 rounded-none text-[9px] font-black uppercase tracking-widest shrink-0 ${gradeInfo.cls}`}>
                <span>ออม {savingsRate}%</span>
                <span className="opacity-30">|</span>
                <span className="font-extrabold">{gradeInfo.grade} {gradeInfo.label}</span>
              </div>
            )}
          </div>

          <div className="mt-1">
            {showSkeleton ? (
              <Shimmer className="h-8 w-28 my-1" />
            ) : (
              <div className={`text-2xl xl:text-3xl font-black tabular-nums tracking-tight leading-none ${
                netCashflow >= 0 ? 'text-yellow-400' : 'text-[#da291c]'
              }`}>
                <AnimatedNumber value={netCashflow} />
              </div>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between z-10 gap-1.5">
            {showSkeleton ? (
              <Shimmer className="h-4 w-12" />
            ) : (
              <span className={`text-[10px] font-black tracking-[0.12em] uppercase truncate ${
                netCashflow >= 0 ? 'text-yellow-500' : 'text-[#da291c]'
              }`}>
                {netCashflow >= 0 ? 'Surplus (ส่วนเกิน)' : 'Deficit (ติดลบ)'}
              </span>
            )}
            {!showSkeleton && (
              <div
                className={`px-1.5 py-0.5 border text-[9px] font-black uppercase tracking-wider rounded-none cursor-default shrink-0 transition-none ${netDelta.cls}`}
                title={netDelta.tooltipText}
              >
                {netDelta.text}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
});

SummaryVitals.displayName = 'SummaryVitals';

// ── SECTION 2 SUB-CARDS ──────────────────────────────────────────────────────

function getFoodIncomeStatus(pct: number) {
  const num = Number.parseFloat(String(pct)) || 0;
  if (num <= 20) return { label: 'สมดุลดี',      cls: 'text-emerald-400 border-emerald-400/30' };
  if (num <= 30) return { label: 'ปานกลาง',      cls: 'text-amber-400 border-amber-400/30' };
  return            { label: 'สัดส่วนสูง',     cls: 'text-rose-400 border-rose-400/30' };
}

// ── Shared Strategic card shell ────────────────────────────────────────────
// All 7 Strategic*Card components below share this exact shell (watermark icon,
// blur-on-hover content, hover detail overlay) — only the metric body, threshold
// row, and overlay body differ per card.

interface StrategicCardShellProps {
  icon: LucideIcon;
  borderColorClass: string;
  hoverBgClass?: string;
  label: string;
  thresholdRow?: React.ReactNode;
  overlayTitle?: string;
  overlayBadge?: React.ReactNode;
  overlayBody?: React.ReactNode;
  showOverlay?: boolean;
  children: React.ReactNode;
}

const StrategicCardShell = memo(({
  icon: Icon,
  borderColorClass,
  hoverBgClass = 'hover:bg-[#1d1d1d]',
  label,
  thresholdRow,
  overlayTitle,
  overlayBadge,
  overlayBody,
  showOverlay = true,
  children,
}: StrategicCardShellProps) => (
  <div className={`group relative overflow-hidden p-3.5 flex flex-col justify-between h-full min-h-[150px] bg-[#181818] ${hoverBgClass} transition-none border-l-2 ${borderColorClass}`}>
    <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-neutral-700">
      <Icon size={72} />
    </div>

    <div className="flex-1 flex flex-col justify-between w-full h-full transition-none group-hover:blur-[1.5px] group-hover:opacity-20">
      <span className="text-[9px] font-black uppercase tracking-[0.12em] text-neutral-400 mb-1">
        {label}
      </span>

      {thresholdRow}

      {children}
    </div>

    {/* #2 Fix: removed pointer-events-none — users can now select/copy values */}
    {showOverlay && overlayBody && (
      <div className="absolute inset-0 p-2 bg-[#181818]/95 opacity-0 group-hover:opacity-100 transition-none z-20 flex flex-col justify-start">
        {overlayTitle && (
          <div className="text-[9px] font-black uppercase tracking-wider text-neutral-400 border-b border-[#303030] pb-1 flex justify-between items-center shrink-0 gap-1">
            <span className="truncate">{overlayTitle}</span>
            {overlayBadge}
          </div>
        )}
        {overlayBody}
      </div>
    )}
  </div>
));

StrategicCardShell.displayName = 'StrategicCardShell';

interface RentCardProps {
  rentPercentageNum: number;
  rentTotal: number;
  rentSub?: RentSub;
  showSkeleton?: boolean;
}

const StrategicRentCard = memo(({ rentPercentageNum, rentTotal, rentSub, showSkeleton }: RentCardProps) => {
  const isOver = rentPercentageNum > 30;
  let rentBarBg = 'bg-sky-500';
  if (showSkeleton)   rentBarBg = 'bg-slate-700 animate-pulse';
  else if (isOver)    rentBarBg = 'bg-[#da291c]';

  return (
    <StrategicCardShell
      icon={Home}
      borderColorClass={isOver ? 'border-l-[#da291c]' : 'border-l-sky-500'}
      hoverBgClass="hover:bg-[#1c1c1c]"
      label="ภาระที่พักอาศัย (Rent Ratio)"
      thresholdRow={!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>เกณฑ์แนะนำ</span>
          <span className="text-sky-400 font-extrabold">&lt; 30% ของรายรับ</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="รายละเอียดที่พัก"
      overlayBadge={<span className="text-sky-400 font-extrabold text-[8px] border border-sky-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">4 หมวด</span>}
      overlayBody={rentSub && (
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-sky-300 uppercase tracking-wide flex items-center gap-1"><span>🏢</span> ค่าเช่า</span>
            <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(rentSub.rent)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-amber-300 uppercase tracking-wide flex items-center gap-1"><span>⚡</span> ค่าไฟ</span>
            <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(rentSub.electricity)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-wide flex items-center gap-1"><span>🌐</span> ค่าเน็ต</span>
            <span className="text-[13px] font-black text-indigo-400 tabular-nums">฿{formatMoney(rentSub.internet)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-cyan-300 uppercase tracking-wide flex items-center gap-1"><span>💧</span> ค่าน้ำ</span>
            <span className="text-[13px] font-black text-cyan-400 tabular-nums">฿{formatMoney(rentSub.water)}</span>
          </div>
        </div>
      )}
    >
      <div className="mt-auto z-10">
        {showSkeleton ? (
          <Shimmer className="h-6 w-16 my-1" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <div className={`text-lg font-black ${isOver ? 'text-[#da291c]' : 'text-sky-400'}`}>
              {rentPercentageNum.toFixed(1)}%
            </div>
            <div className="text-[10px] font-bold text-neutral-500 tabular-nums">
              ฿{formatMoney(rentTotal)}
            </div>
          </div>
        )}

        <div className="w-full h-1 mt-2 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
          <div
            className={`h-full absolute left-0 top-0 transition-none ${rentBarBg}`}
            style={{ width: showSkeleton ? '50%' : `${Math.min(100, rentPercentageNum)}%` }}
          />
        </div>
      </div>
    </StrategicCardShell>
  );
});

StrategicRentCard.displayName = 'StrategicRentCard';

interface SubscriptionCardProps {
  subscriptionTotal?: number;
  subscriptionPctOfIncome?: number | string;
  subscriptionPercentage?: number | string;
  subscriptionCount?: number;
  subscriptionSub?: Record<string, number>;
  topSubscriptionServices?: SubscriptionService[];
  totalIncome?: number;
  showSkeleton?: boolean;
}

const StrategicSubscriptionCard = memo(({
  subscriptionTotal = 0,
  subscriptionPctOfIncome = 0,
  subscriptionPercentage = 0,
  subscriptionCount = 0,
  topSubscriptionServices = [],
  totalIncome = 0,
  showSkeleton
}: SubscriptionCardProps) => {
  const subPctNum    = Number.parseFloat(String(subscriptionPctOfIncome)) || 0;
  const subExpPctNum = Number.parseFloat(String(subscriptionPercentage)) || 0;
  const isIncomeBased = totalIncome > 0;
  const displayPct    = isIncomeBased ? subPctNum : subExpPctNum;

  const isLeak     = isIncomeBased ? displayPct > 10 : displayPct > 15;
  const isModerate = isIncomeBased ? displayPct > 5  : displayPct > 8;

  let statusBadge = {
    label: 'SAFE',       cls: 'text-purple-400 border-purple-400/30',
    borderLeft: 'border-l-purple-500', barBg: 'bg-purple-500', colorText: 'text-purple-400'
  };
  if (isLeak) {
    statusBadge = {
      label: 'LEAK ALERT', cls: 'text-[#da291c] border-[#da291c]/30',
      borderLeft: 'border-l-[#da291c]', barBg: 'bg-[#da291c]', colorText: 'text-[#da291c]'
    };
  } else if (isModerate) {
    statusBadge = {
      label: 'MODERATE',   cls: 'text-amber-400 border-amber-400/30',
      borderLeft: 'border-l-amber-500', barBg: 'bg-amber-500', colorText: 'text-amber-400'
    };
  }

  const barWidth = isIncomeBased
    ? Math.min(100, Math.max(displayPct > 0 ? 5 : 0, (displayPct / 10) * 100))
    : Math.min(100, Math.max(displayPct > 0 ? 5 : 0, (displayPct / 15) * 100));

  // #6 Fix: pad to an even number of cells so the 2-col grid stays symmetric
  const services = [...(topSubscriptionServices ?? [])].slice(0, 4);
  const paddedServices = services.length % 2 !== 0
    ? [...services, null]
    : services;

  return (
    <StrategicCardShell
      icon={Repeat}
      borderColorClass={statusBadge.borderLeft}
      hoverBgClass="hover:bg-[#1c1c1c]"
      label="บริการรายเดือน (Subscriptions)"
      thresholdRow={!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>เกณฑ์แนะนำ</span>
          <span className="text-purple-400 font-extrabold">
            {isIncomeBased ? '< 5% ของรายรับ' : '< 8% ของรายจ่าย'}
          </span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="เจาะลึกรายเดือน"
      overlayBadge={<span className={`font-extrabold text-[8px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${statusBadge.cls}`}>{subscriptionCount} รายการ</span>}
      overlayBody={(
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          {paddedServices.length > 0 ? (
            paddedServices.map((item, idx) =>
              item ? (
                <div key={idx} className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
                  <span className="text-[9px] font-bold text-purple-300 uppercase tracking-wide truncate flex items-center gap-1">
                    <CategoryGlyph icon={item.icon} size={12} fallbackEmoji="🔄" /> {item.name}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[13px] font-black text-purple-400 tabular-nums">฿{formatMoney(item.amount)}</span>
                    {subscriptionTotal > 0 && (
                      <span className="text-[9px] font-bold text-neutral-500">
                        ({((item.amount / subscriptionTotal) * 100).toFixed(0)}%)
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div key={`pad-${idx}`} className="bg-[#181818]" />
              )
            )
          ) : (
            <div className="col-span-2 bg-[#181818] p-2 text-center text-[9px] text-neutral-500 flex items-center justify-center">
              ไม่มีข้อมูลรายเดือน
            </div>
          )}
        </div>
      )}
    >
      <div className="mt-auto z-10">
        {showSkeleton ? (
          <Shimmer className="h-6 w-16 my-1" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <div className={`text-lg font-black ${statusBadge.colorText}`}>
              {displayPct.toFixed(1)}%
            </div>
            <div className="text-[10px] font-bold text-neutral-500 tabular-nums">
              ฿{formatMoney(subscriptionTotal)}
            </div>
          </div>
        )}

        <div className="w-full h-1 mt-2 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
          <div
            className={`h-full absolute left-0 top-0 transition-none ${showSkeleton ? 'bg-slate-700 animate-pulse' : statusBadge.barBg}`}
            style={{ width: showSkeleton ? '50%' : `${barWidth}%` }}
          />
        </div>
      </div>
    </StrategicCardShell>
  );
});

StrategicSubscriptionCard.displayName = 'StrategicSubscriptionCard';

interface LifestyleCardProps {
  lifestyleRatio: number;
  variableTotal: number;
  topWantCategories?: WantCategory[];
  showSkeleton?: boolean;
}

const StrategicLifestyleCard = memo(({ lifestyleRatio, variableTotal, topWantCategories, showSkeleton }: LifestyleCardProps) => {
  const isOver = lifestyleRatio > 35;
  return (
    <StrategicCardShell
      icon={Zap}
      borderColorClass={isOver ? 'border-l-[#da291c]' : 'border-l-orange-500'}
      label="ดัชนีฟุ่มเฟือย (Want Ratio)"
      thresholdRow={!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>เกณฑ์แนะนำ</span>
          <span className="text-orange-400 font-extrabold">&lt; 30% ของรายรับ</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="หมวดฟุ่มเฟือย Top 4"
      overlayBadge={<span className="text-orange-400 font-extrabold text-[8px] border border-orange-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">Top 4</span>}
      overlayBody={(
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          {topWantCategories && topWantCategories.length > 0 ? (
            topWantCategories.map(cat => (
              <div key={cat.id} className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
                <span className="text-[9px] font-bold text-neutral-300 uppercase tracking-wide truncate flex items-center gap-1">
                  <CategoryGlyph icon={cat.icon} color={cat.color} size={12} /> {cat.name}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[13px] font-black text-orange-400 tabular-nums">฿{formatMoney(cat.amount)}</span>
                  <span className="text-[9px] font-bold text-neutral-500">({cat.pctOfWant}%)</span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-[#181818] p-2 text-center text-[9px] text-neutral-500 flex items-center justify-center">
              ไม่มีข้อมูลฟุ่มเฟือย
            </div>
          )}
        </div>
      )}
    >
      <div className="mt-auto z-10">
        {showSkeleton ? (
          <Shimmer className="h-6 w-16 my-1" />
        ) : (
          <div className="flex items-baseline gap-1.5">
            <div className={`text-lg font-black ${isOver ? 'text-[#da291c]' : 'text-orange-400'}`}>
              {lifestyleRatio.toFixed(1)}%
            </div>
            <div className="text-[10px] font-bold text-neutral-500 tabular-nums">
              ฿{formatMoney(variableTotal)}
            </div>
          </div>
        )}

        <div className="w-full h-1 mt-2 rounded-none bg-neutral-900 border border-neutral-800/80 overflow-hidden relative">
          <div
            className={`h-full absolute left-0 top-0 transition-none ${showSkeleton ? 'bg-slate-700 animate-pulse' : 'bg-orange-500'}`}
            style={{ width: showSkeleton ? '50%' : `${Math.min(100, lifestyleRatio)}%` }}
          />
        </div>
      </div>
    </StrategicCardShell>
  );
});

StrategicLifestyleCard.displayName = 'StrategicLifestyleCard';

interface VictoryCardProps {
  dailyVictory: number;
  periodDays: number;
  dailyIncome: number;
  dailyFixed: number;
  dailyVariable: number;
  dailySavings: number;
  showSkeleton?: boolean;
}

const StrategicVictoryCard = memo(({ dailyVictory, periodDays, dailyIncome, dailyFixed, dailyVariable, dailySavings, showSkeleton }: VictoryCardProps) => {
  const isPositive = dailyVictory >= 0;
  return (
    <StrategicCardShell
      icon={Award}
      borderColorClass={isPositive ? 'border-l-lime-500' : 'border-l-[#da291c]'}
      label="เงินเหลือรายวัน (Victory)"
      thresholdRow={!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>ระยะเวลาคำนวณ</span>
          <span className="text-lime-400 font-extrabold">{periodDays} วันในงวด</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="โครงสร้างรายวัน"
      overlayBadge={
        <span className={`font-extrabold text-[8px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${
          isPositive ? 'text-lime-400 border-lime-400/30' : 'text-[#da291c] border-[#da291c]/30'
        }`}>เฉลี่ย {periodDays} วัน</span>
      }
      overlayBody={(
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wide">📥 รับ/วัน</span>
            <span className="text-[13px] font-black text-emerald-400 tabular-nums">฿{formatMoney(dailyIncome)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">🔒 จำเป็น/วัน</span>
            <span className="text-[13px] font-black text-rose-400 tabular-nums">฿{formatMoney(dailyFixed)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">🎯 ตามใจ/วัน</span>
            <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(dailyVariable)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wide">🏦 ออม/วัน</span>
            <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(dailySavings)}</span>
          </div>
        </div>
      )}
    >
      <div className="mt-auto z-10">
        {showSkeleton ? (
          <Shimmer className="h-6 w-20" />
        ) : (
          // #4 Fix: sign before ฿ symbol
          <div className={`text-lg font-black tabular-nums leading-none ${isPositive ? 'text-lime-400' : 'text-[#da291c]'}`}>
            {formatSignedMoney(dailyVictory)}
          </div>
        )}
        <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
          {isPositive ? 'กำไรสะสมรายวัน' : 'ขาดทุนสะสมรายวัน'}
        </div>
      </div>
    </StrategicCardShell>
  );
});

StrategicVictoryCard.displayName = 'StrategicVictoryCard';

interface FoodRatioCardProps {
  foodPercentage: number | string;
  foodPctOfIncome: number | string;
  foodTotal: number;
  showSkeleton?: boolean;
}

const StrategicFoodRatioCard = memo(({ foodPercentage, foodPctOfIncome, foodTotal, showSkeleton }: FoodRatioCardProps) => {
  const foodStatus = getFoodIncomeStatus(Number(foodPctOfIncome));
  const pctOfExpense = Number(foodPercentage);
  const pctOfIncome  = Number(foodPctOfIncome);

  // #7 Fix: improved overlay — show budget utilization vs thresholds instead of raw % duplication
  const vsExpThreshold  = pctOfExpense > 25  ? `เกินเกณฑ์ ${(pctOfExpense - 25).toFixed(1)}%`  : `เหลือ ${(25 - pctOfExpense).toFixed(1)}% จากเกณฑ์`;
  const vsIncThreshold  = pctOfIncome  > 20  ? `เกินเกณฑ์ ${(pctOfIncome  - 20).toFixed(1)}%`  : `เหลือ ${(20 - pctOfIncome).toFixed(1)}% จากเกณฑ์`;

  return (
    <StrategicCardShell
      icon={UtensilsCrossed}
      borderColorClass="border-l-amber-500"
      label="สัดส่วนค่าอาหาร"
      thresholdRow={!showSkeleton && (
        <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
          <span>เกณฑ์สัดส่วน</span>
          <span className="text-amber-400 font-extrabold">&lt; 25% ของรายจ่าย</span>
        </div>
      )}
      showOverlay={!showSkeleton}
      overlayTitle="เจาะลึกงบอาหาร"
      overlayBadge={<span className={`font-extrabold text-[8px] border px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0 ${foodStatus.cls}`}>{foodStatus.label}</span>}
      overlayBody={(
        <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">🍽️ รวมค่าอาหาร</span>
            <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(foodTotal)}</span>
          </div>
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">📉 % รายจ่าย</span>
            <span className="text-[13px] font-black text-rose-400 tabular-nums">{foodPercentage}%</span>
          </div>
          {/* vs Expense threshold */}
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">เทียบเกณฑ์ 25%</span>
            <span className={`text-[11px] font-black tabular-nums ${pctOfExpense > 25 ? 'text-[#da291c]' : 'text-emerald-400'}`}>
              {vsExpThreshold}
            </span>
          </div>
          {/* vs Income threshold */}
          <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
            <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">เทียบรายรับ 20%</span>
            <span className={`text-[11px] font-black tabular-nums ${pctOfIncome > 20 ? 'text-[#da291c]' : 'text-emerald-400'}`}>
              {vsIncThreshold}
            </span>
          </div>
        </div>
      )}
    >
      <div className="mt-auto z-10">
        {showSkeleton ? (
          <Shimmer className="h-6 w-12" />
        ) : (
          <div className="text-lg font-black leading-none text-amber-400">
            {foodPercentage}%
          </div>
        )}
        <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
          ของรายจ่ายรวม
        </div>
      </div>
    </StrategicCardShell>
  );
});

StrategicFoodRatioCard.displayName = 'StrategicFoodRatioCard';

interface FoodDailyCardProps {
  foodDailyAvg: number;
  foodTotal: number;
  foodWorkdayAvg: number;
  foodHolidayAvg: number;
  maxFoodDayAmount: number;
  showSkeleton?: boolean;
}

const StrategicFoodDailyCard = memo(({ foodDailyAvg, foodTotal, foodWorkdayAvg, foodHolidayAvg, maxFoodDayAmount, showSkeleton }: FoodDailyCardProps) => (
  <StrategicCardShell
    icon={UtensilsCrossed}
    borderColorClass="border-l-orange-400"
    label="กินเฉลี่ย/วัน"
    thresholdRow={!showSkeleton && (
      <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
        <span>งบกินรวม</span>
        <span className="text-orange-400 font-extrabold tabular-nums">฿{formatMoney(foodTotal)}</span>
      </div>
    )}
    showOverlay={!showSkeleton}
    overlayTitle="พฤติกรรมการกิน"
    overlayBadge={<span className="text-orange-400 font-extrabold text-[8px] border border-orange-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">ทำงาน vs หยุด</span>}
    overlayBody={(
      <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
        <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
          <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wide">💼 วันทำงาน</span>
          <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(foodWorkdayAvg)}</span>
        </div>
        <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
          <span className="text-[9px] font-bold text-orange-400 uppercase tracking-wide">🏖️ วันหยุด</span>
          <span className="text-[13px] font-black text-orange-400 tabular-nums">฿{formatMoney(foodHolidayAvg)}</span>
        </div>
        <div className="col-span-2 bg-[#181818] p-1.5 flex flex-col justify-center text-left">
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">🏆 พีคสูงสุดใน 1 วัน</span>
          <span className="text-[13px] font-black text-rose-400 tabular-nums">฿{formatMoney(maxFoodDayAmount)}</span>
        </div>
      </div>
    )}
  >
    <div className="mt-auto z-10">
      {showSkeleton ? (
        <Shimmer className="h-6 w-16" />
      ) : (
        <div className="text-lg font-black tabular-nums leading-none text-orange-400">
          ฿{formatMoney(foodDailyAvg)}
        </div>
      )}
      <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
        ค่าอาหารรายวัน
      </div>
    </div>
  </StrategicCardShell>
));

StrategicFoodDailyCard.displayName = 'StrategicFoodDailyCard';

interface DailyExpenseCardProps {
  dailyAvg: number;
  totalExpense: number;
  dailyWorkdayAvg: number;
  dailyHolidayAvg: number;
  dailyFixed: number;
  dailyVariable: number;
  showSkeleton?: boolean;
}

const StrategicDailyExpenseCard = memo(({ dailyAvg, totalExpense, dailyWorkdayAvg, dailyHolidayAvg, dailyFixed, dailyVariable, showSkeleton }: DailyExpenseCardProps) => (
  <StrategicCardShell
    icon={TrendingDown}
    borderColorClass="border-l-[#da291c]"
    label="รายจ่ายเฉลี่ย/วัน"
    thresholdRow={!showSkeleton && (
      <div className="my-auto py-1 border-y border-neutral-800/60 flex items-center justify-between text-[9px] font-bold text-neutral-500">
        <span>ยอดจ่ายรวม</span>
        <span className="text-rose-400 font-extrabold tabular-nums">฿{formatMoney(totalExpense)}</span>
      </div>
    )}
    showOverlay={!showSkeleton}
    overlayTitle="อัตราจ่ายรายวัน"
    overlayBadge={<span className="text-rose-400 font-extrabold text-[8px] border border-rose-400/30 px-1.5 py-0.5 rounded-none leading-none whitespace-nowrap shrink-0">ทำงาน vs หยุด</span>}
    overlayBody={(
      <div className="flex-1 grid grid-cols-2 gap-[1px] bg-neutral-800/50 mt-1 overflow-hidden">
        <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
          <span className="text-[9px] font-bold text-sky-400 uppercase tracking-wide">💼 วันทำงาน</span>
          <span className="text-[13px] font-black text-sky-400 tabular-nums">฿{formatMoney(dailyWorkdayAvg)}</span>
        </div>
        <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
          <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">🏖️ วันหยุด</span>
          <span className="text-[13px] font-black text-rose-400 tabular-nums">฿{formatMoney(dailyHolidayAvg)}</span>
        </div>
        <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wide">🔒 จำเป็น/วัน</span>
          <span className="text-[13px] font-black text-neutral-300 tabular-nums">฿{formatMoney(dailyFixed)}</span>
        </div>
        <div className="bg-[#181818] p-1.5 flex flex-col justify-center text-left">
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">🎯 ตามใจ/วัน</span>
          <span className="text-[13px] font-black text-amber-400 tabular-nums">฿{formatMoney(dailyVariable)}</span>
        </div>
      </div>
    )}
  >
    <div className="mt-auto z-10">
      {showSkeleton ? (
        <Shimmer className="h-6 w-16" />
      ) : (
        // #4 Fix: sign before ฿ — dailyAvg should always be positive here, but defensive
        <div className="text-lg font-black tabular-nums leading-none text-rose-400">
          {formatSignedMoney(dailyAvg)}
        </div>
      )}
      <div className="text-[9px] font-bold text-neutral-500 mt-2 leading-none">
        เฉลี่ยรวมทุกวัน
      </div>
    </div>
  </StrategicCardShell>
));

StrategicDailyExpenseCard.displayName = 'StrategicDailyExpenseCard';

// ── SECTION 2: STRATEGIC ─────────────────────────────────────────────────────

interface SummaryStrategicProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

const SummaryStrategic = memo(({ analytics, showSkeleton }: SummaryStrategicProps) => {
  const {
    totalIncome, totalSavings, netCashflow,
    dailyAvg, foodPercentage, foodTotal, foodDailyAvg, foodPctOfIncome,
    foodWorkdayAvg, foodHolidayAvg, dailyWorkdayAvg, dailyHolidayAvg, maxFoodDayAmount,
    variableTotal, fixedTotal, topWantCategories,
    rentPercentage, rentTotal, rentSub, datesInPeriod,
    subscriptionTotal, subscriptionPctOfIncome, subscriptionPercentage,
    subscriptionCount, subscriptionSub, topSubscriptionServices
  } = analytics;

  const periodDays  = Math.max(1, datesInPeriod?.length || 1);
  const totalExpense = fixedTotal + variableTotal;
  const dailyVictory  = netCashflow / periodDays;
  const dailyIncome   = totalIncome / periodDays;
  const dailyFixed    = fixedTotal / periodDays;
  const dailyVariable = variableTotal / periodDays;
  const dailySavings  = totalSavings / periodDays;

  const rentPercentageNum = Number.parseFloat(String(rentPercentage)) || 0;
  const lifestyleRatio    = totalIncome > 0 ? ((variableTotal / totalIncome) * 100) : 0;

  return (
    <div className="grid grid-cols-12 items-stretch gap-px bg-[#2d2d2d]">

      {/* Strategic Analysis (7 cols) */}
      <div className="col-span-7 flex flex-col">
        <SectionHeader icon={Target} title="วิเคราะห์กลยุทธ์ (Strategic Analysis)" />
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-[1px] bg-[#2d2d2d] flex-1">
          <StrategicRentCard rentPercentageNum={rentPercentageNum} rentTotal={rentTotal} rentSub={rentSub} showSkeleton={showSkeleton} />
          <StrategicSubscriptionCard
            subscriptionTotal={subscriptionTotal}
            subscriptionPctOfIncome={subscriptionPctOfIncome}
            subscriptionPercentage={subscriptionPercentage}
            subscriptionCount={subscriptionCount}
            subscriptionSub={subscriptionSub}
            topSubscriptionServices={topSubscriptionServices}
            totalIncome={totalIncome}
            showSkeleton={showSkeleton}
          />
          <StrategicLifestyleCard lifestyleRatio={lifestyleRatio} variableTotal={variableTotal} topWantCategories={topWantCategories} showSkeleton={showSkeleton} />
          <StrategicVictoryCard
            dailyVictory={dailyVictory} periodDays={periodDays}
            dailyIncome={dailyIncome} dailyFixed={dailyFixed}
            dailyVariable={dailyVariable} dailySavings={dailySavings}
            showSkeleton={showSkeleton}
          />
        </div>
      </div>

      {/* Key Metrics (5 cols) */}
      <div className="col-span-5 flex flex-col">
        <SectionHeader icon={Scale} title="ข้อมูลสำคัญ (Metrics)" />
        <div className="grid grid-cols-3 gap-[1px] bg-[#2d2d2d] flex-1">
          <StrategicFoodRatioCard foodPercentage={foodPercentage} foodPctOfIncome={foodPctOfIncome} foodTotal={foodTotal} showSkeleton={showSkeleton} />
          <StrategicFoodDailyCard foodDailyAvg={foodDailyAvg} foodTotal={foodTotal} foodWorkdayAvg={foodWorkdayAvg} foodHolidayAvg={foodHolidayAvg} maxFoodDayAmount={maxFoodDayAmount} showSkeleton={showSkeleton} />
          <StrategicDailyExpenseCard dailyAvg={dailyAvg} totalExpense={totalExpense} dailyWorkdayAvg={dailyWorkdayAvg} dailyHolidayAvg={dailyHolidayAvg} dailyFixed={dailyFixed} dailyVariable={dailyVariable} showSkeleton={showSkeleton} />
        </div>
      </div>

    </div>
  );
});

SummaryStrategic.displayName = 'SummaryStrategic';

// ── SECTION 3: FORECASTING ───────────────────────────────────────────────────

interface SummaryForecastingProps {
  analytics: SummaryAnalytics;
  showSkeleton?: boolean;
}

const SummaryForecasting = memo(({ analytics, showSkeleton }: SummaryForecastingProps) => {
  const { showForecasting, projectedExpense, safeToSpend, projectedSurplus, forecastingDetails } = analytics;

  if (!showForecasting) return null;

  const details = forecastingDetails || {} as ForecastingDetails;
  const currentDay              = details.currentDay              || 1;
  const lastDayOfMonth          = details.lastDayOfMonth          || 30;
  const remainingDays           = details.remainingDays           || 0;
  const monthProgressPct        = details.monthProgressPct        || 0;
  const fixedTotal              = details.fixedTotal              || 0;
  const variableUpToToday       = details.variableUpToToday       || 0;
  const projectedVariableRemaining = details.projectedVariableRemaining || 0;
  const actualDailyVariableAvg  = details.actualDailyVariableAvg  || 0;
  const projectedSurplusPct     = details.projectedSurplusPct     || 0;
  const maxAllowedExpense        = details.maxAllowedExpense       || 0;
  const requiredReduction        = details.requiredReduction       || 0;
  const requiredDailyReduction   = details.requiredDailyReduction  || 0;
  const paceStatus  = details.paceStatus  || { label: 'คุมงบได้ดี (On Track)', color: '#10b981', bg: 'bg-emerald-950/30' };
  const eomStatus   = details.eomStatus   || { label: 'โซนปลอดภัยสูง', color: '#10b981', bg: 'bg-emerald-950/40', border: 'border-emerald-500' };

  const headroom     = safeToSpend - actualDailyVariableAvg;
  const safePaceRatio = safeToSpend > 0 ? Math.min(100, (actualDailyVariableAvg / safeToSpend) * 100) : 100;

  // Stacked proportions
  const totalProj  = Math.max(1, projectedExpense);
  const fixedPct   = Math.min(100, Math.max(0, (fixedTotal / totalProj) * 100));
  const varSpentPct = Math.min(100, Math.max(0, (variableUpToToday / totalProj) * 100));
  const varRemPct  = Math.min(100, Math.max(0, (projectedVariableRemaining / totalProj) * 100));

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#2d2d2d] bg-[#121212]/90">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-3.5 bg-[#da291c] shrink-0" />
          <TrendingUp className="w-4 h-4 text-neutral-300" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-neutral-100">
            พยากรณ์สิ้นเดือน (Projection &amp; Safe Zone Center)
          </span>
        </div>
        <div
          className={`px-2.5 py-1 border text-[10px] font-black tracking-wider uppercase flex items-center gap-1.5 ${eomStatus.bg} ${eomStatus.border}`}
          style={{ color: eomStatus.color }}
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>{eomStatus.label}</span>
        </div>
      </div>

      {/* #8 Fix: Burn-Pace bar restructured into 2 rows for breathing room */}
      <div className="px-4 py-2.5 bg-[#151515] border-b border-[#2d2d2d] flex flex-col gap-2 text-xs">
        {/* Row A: pace label + badge + ceiling */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-neutral-300 font-bold uppercase tracking-wider">Burn Pace:</span>
            <span
              className="text-xs font-black uppercase px-2.5 py-0.5 border"
              style={{ backgroundColor: `${paceStatus.color}15`, color: paceStatus.color, borderColor: `${paceStatus.color}40` }}
            >
              {paceStatus.label}
            </span>
          </div>
          <div className="text-xs text-neutral-300 font-mono bg-neutral-900 px-2 py-0.5 border border-neutral-800">
            เพดานงบทั้งเดือน: <span className="text-emerald-400 font-bold">฿{formatMoney(maxAllowedExpense)}</span>
          </div>
        </div>

        {/* Row B: calendar progress */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-neutral-400 font-mono">
            วันในเดือน: <span className="text-white font-bold">{currentDay}/{lastDayOfMonth}</span>
            <span className="text-neutral-500"> ({monthProgressPct}%)</span>
          </span>
          <div className="w-28 h-2 bg-neutral-800 overflow-hidden relative border border-neutral-700/60">
            <div
              className="h-full"
              style={{ width: `${Math.min(100, monthProgressPct)}%`, backgroundColor: paceStatus.color }}
            />
          </div>
          <span className="text-neutral-400 font-mono">
            คงเหลือ <span className="text-neutral-100 font-bold">{remainingDays} วัน</span>
          </span>
        </div>
      </div>

      {/* 3-Column HUD Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[1px] bg-[#2d2d2d]">

        {/* Card 1: Projected Expense */}
        <div className="group relative overflow-hidden p-5 flex flex-col gap-4 bg-indigo-950/20 hover:bg-indigo-950/30 transition-none border-l-2 border-l-indigo-500">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-300">พยากรณ์รายจ่ายเดือนนี้</span>
              <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 border border-indigo-700/60">MONTHLY FORECAST</span>
            </div>
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 mt-2" />
            ) : (
              <div>
                <div className="text-2xl lg:text-3xl font-black text-indigo-400 tabular-nums tracking-tight leading-none mt-2">
                  <AnimatedNumber value={projectedExpense} />
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-1.5 flex items-center justify-between">
                  <span>เพดานงบทั้งเดือน (รายรับ):</span>
                  <span className="text-emerald-400 font-bold">฿{formatMoney(maxAllowedExpense)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="h-1.5 w-full bg-neutral-800 flex overflow-hidden border border-indigo-900/40">
              <div style={{ width: `${fixedPct}%` }}   className="bg-slate-400" title="Fixed" />
              <div style={{ width: `${varSpentPct}%` }} className="bg-indigo-500" title="Var Spent" />
              <div style={{ width: `${varRemPct}%` }}   className="bg-indigo-800/80" title="Var Projected" />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span className="text-slate-300">ภาระคงที่ ({fixedPct.toFixed(0)}%)</span>
              <span className="text-indigo-300">จ่ายแล้ว ({varSpentPct.toFixed(0)}%)</span>
              <span className="text-indigo-400">ประเมิน ({varRemPct.toFixed(0)}%)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-indigo-900/50 text-xs font-mono text-neutral-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• ภาระคงที่/ที่พัก (Fixed/Rent):</span>
              <span className="text-white font-bold">฿{formatMoney(fixedTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• รายจ่ายประจำวันแล้ว ({currentDay} วัน):</span>
              <span className="text-white font-bold">฿{formatMoney(variableUpToToday)}</span>
            </div>
            <div className="flex justify-between items-center text-indigo-300">
              <span>• ประเมินรายวันคงเหลือ ({remainingDays} วัน):</span>
              <span className="font-bold">฿{formatMoney(projectedVariableRemaining)}</span>
            </div>
          </div>

          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-indigo-500">
            <TrendingUp size={80} />
          </div>
        </div>

        {/* Card 2: Safe to Spend */}
        <div className={`group relative overflow-hidden p-5 flex flex-col gap-4 transition-none border-l-2 ${
          safeToSpend > 300
            ? 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l-teal-500'
            : 'bg-red-950/20 hover:bg-red-950/30 border-l-[#da291c]'
        }`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-300">เพดานใช้วันละไม่เกิน</span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 border ${
                headroom >= 0
                  ? 'text-teal-300 bg-teal-950/80 border-teal-700/60'
                  : 'text-red-300 bg-red-950/80 border-red-700/60'
              }`}>
                {headroom >= 0 ? 'SAFE ZONE' : 'OVER PACED'}
              </span>
            </div>
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 mt-2" />
            ) : (
              <div>
                <div className={`text-2xl lg:text-3xl font-black tabular-nums tracking-tight leading-none mt-2 ${
                  safeToSpend > 300 ? 'text-emerald-400' : 'text-[#da291c]'
                }`}>
                  <AnimatedNumber value={safeToSpend} />
                  <span className="text-sm text-neutral-400 ml-1 font-normal">/วัน</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 mt-1.5">
                  เพดานงบรายวัน (รวมทุกหมวดประจำวัน) ห้ามเกินนี้
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="h-1.5 w-full bg-neutral-800 overflow-hidden relative border border-neutral-700/60">
              <div
                className={`h-full ${headroom >= 0 ? 'bg-teal-400' : 'bg-[#da291c]'}`}
                style={{ width: `${Math.min(100, safePaceRatio)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>อัตราใช้จริง: {safePaceRatio.toFixed(0)}% ของเพดาน</span>
              <span>อีก {remainingDays} วันที่เหลือ</span>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-800/80 text-xs font-mono text-neutral-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• สปีดใช้จ่ายรายวันปัจจุบัน:</span>
              <span className="text-white font-bold">฿{formatMoney(actualDailyVariableAvg)}/วัน</span>
            </div>
            {headroom >= 0 ? (
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">• ส่วนต่างปลอดภัย (Headroom):</span>
                <span className="font-black text-emerald-400">+฿{formatMoney(headroom)}/วัน</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-amber-300 font-bold">
                <span>• ต้องปรับลดสปีดลงอีก:</span>
                <span>-฿{formatMoney(requiredDailyReduction)}/วัน</span>
              </div>
            )}
          </div>

          <div className={`absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none ${
            safeToSpend > 300 ? 'text-teal-500' : 'text-[#da291c]'
          }`}>
            <Zap size={80} />
          </div>
        </div>

        {/* Card 3: Projected Net Cashflow */}
        <div className="group relative overflow-hidden p-5 flex flex-col gap-4 bg-purple-950/20 hover:bg-purple-950/30 transition-none border-l-2 border-l-purple-500">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-neutral-300">กระแสเงินสดสุทธิคาดการณ์</span>
              <span className="text-[10px] font-mono font-bold text-purple-300 bg-purple-950/80 px-2 py-0.5 border border-purple-700/60">
                EOM SURPLUS / DEFICIT
              </span>
            </div>
            {showSkeleton ? (
              <Shimmer className="h-8 w-32 mt-2" />
            ) : (
              <div className="text-2xl lg:text-3xl font-black text-purple-400 tabular-nums tracking-tight leading-none mt-2">
                <AnimatedNumber value={projectedSurplus} />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="h-1.5 w-full bg-neutral-800 overflow-hidden relative border border-purple-900/40">
              <div
                className={`h-full ${projectedSurplus >= 0 ? 'bg-purple-500' : 'bg-[#da291c]'}`}
                style={{ width: `${Math.min(100, Math.max(0, projectedSurplusPct))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>เงินสดคงเหลือคาดการณ์:</span>
              <span className="text-purple-300 font-bold">{projectedSurplusPct}% ของรายรับ</span>
            </div>
          </div>

          <div className="pt-3 border-t border-purple-900/50 text-xs font-mono text-neutral-300 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">• เพดานรายรับรวมทั้งเดือน:</span>
              <span className="text-purple-300 font-bold">฿{formatMoney(maxAllowedExpense)}</span>
            </div>
            {requiredReduction > 0 ? (
              <div className="flex justify-between items-center text-[#da291c] font-black border-t border-purple-900/30 pt-1">
                <span>• ต้องคุมรายจ่ายลงอีกรวม:</span>
                <span>-฿{formatMoney(requiredReduction)}</span>
              </div>
            ) : (
              <div className="flex justify-between items-center text-emerald-400 font-bold border-t border-purple-900/30 pt-1">
                <span>• อัตราเงินสดคงเหลือสะสม:</span>
                <span>+{projectedSurplusPct}%</span>
              </div>
            )}
          </div>

          <div className="absolute -right-3 -bottom-3 opacity-[0.03] pointer-events-none text-purple-500">
            <Layers size={80} />
          </div>
        </div>

      </div>
    </div>
  );
});

SummaryForecasting.displayName = 'SummaryForecasting';

// ── ROOT EXPORT ───────────────────────────────────────────────────────────────

/**
 * SummaryCards — Mission control center for financial vitals.
 */
export default function SummaryCards() {
  const { analytics, showSkeleton } = useDashboardContext();

  if (!analytics) return null;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Core Vitals */}
      <div className="w-full flex flex-col rounded-none overflow-hidden border border-[#2d2d2d] bg-[#181818] shadow-sm">
        <SummaryVitals analytics={analytics as SummaryAnalytics} showSkeleton={showSkeleton} />
      </div>

      {/* 2. Strategic & Key Metrics */}
      <div className="w-full flex flex-col rounded-none overflow-hidden border border-[#2d2d2d] bg-[#181818] shadow-sm">
        <SummaryStrategic analytics={analytics as SummaryAnalytics} showSkeleton={showSkeleton} />
      </div>

      {/* 3. Forecasting */}
      {analytics.showForecasting && (
        <div className="w-full flex flex-col rounded-none overflow-hidden border border-[#2d2d2d] bg-[#181818] shadow-sm">
          <SummaryForecasting analytics={analytics as SummaryAnalytics} showSkeleton={showSkeleton} />
        </div>
      )}
    </div>
  );
}
