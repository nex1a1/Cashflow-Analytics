import { memo, useMemo } from 'react';
import useBudgets from '@/hooks/useBudgets';
import CategoryGlyph from '@/components/shared/CategoryGlyph';
import { readable } from '@/constants/theme';
import { isCyclePeriod, isSingleUnitPeriod, localTodayIso } from '@/utils/payCycle';
import { AVG_UNITS, computeEnvelopes, periodElapsed, type BudgetLevel, type EnvelopeRow } from '@/utils/budgetEnvelope';
import { useDashboardContext } from '../context/DashboardContext';
import { Shimmer } from './SummaryCards/helpers';

const baht = (satang: number) => `฿${Math.round(satang / 100).toLocaleString('th-TH')}`;

// ok = the group's own colour; over budget switches to warn/danger so colour still signals the overrun
const LEVEL_BAR: Record<BudgetLevel, string> = { ok: '', warn: 'bg-warn', over: 'bg-danger' };
const LEVEL_TEXT: Record<BudgetLevel, string> = { ok: 'text-ink-display', warn: 'text-warn', over: 'text-danger' };

/** งบหลวมต่อเดือน/รอบ (เฉพาะกลุ่มที่ตั้งงบไว้ในหน้าตั้งค่า)
 *  แสดงเฉพาะตอนเลือกดูเดือนเดียวหรือรอบเดียว — ช่วงหลายเดือน/ทั้งปีเทียบกับงบรายเดือนไม่ได้ จึงซ่อนทั้งแผง
 *  ใช้ `transactions` ของแดชบอร์ดตรงๆ: ตัวโหลดข้อมูลดึงย้อนหลังไว้ 3 เดือน/รอบอยู่แล้วเมื่อเลือกหน่วยเดียว (ค่าเฉลี่ยจึงไม่ต้องดึงเพิ่ม) */
const BudgetEnvelopes = memo(function BudgetEnvelopes() {
  const { transactions, categories, cashflowGroups = [], filterPeriod, getFilterLabel, showSkeleton: isLoading } = useDashboardContext();
  const { budgets } = useBudgets();
  const today = localTodayIso();
  const visible = isSingleUnitPeriod(filterPeriod);

  const groupOfCategory = useMemo(
    () => new Map(categories.map((c) => [c.id, c.cashflowGroup ?? c.cashflow_group_id ?? ''])),
    [categories],
  );

  const groups = useMemo(
    () => [...cashflowGroups].sort((a, b) => a.order_index - b.order_index).filter((g) => budgets[g.id] > 0),
    [cashflowGroups, budgets],
  );

  // ระหว่างโหลดช่วงใหม่ `transactions` ยังเป็นของช่วงเก่า — ไม่คำนวณ ไม่งั้นตัวเลขจะผิดไปชั่วครู่
  const stats = useMemo(() => {
    if (!visible || isLoading || groups.length === 0) return null;
    const rows: EnvelopeRow[] = [];
    for (const t of transactions) {
      if (t.group_type !== 'expense' || !t.category_id) continue;
      rows.push({ date: t.date, satang: Math.round(t.amount * 100), groupId: groupOfCategory.get(t.category_id) ?? '' });
    }
    return new Map(computeEnvelopes(rows, budgets, filterPeriod, today).map((e) => [e.groupId, e]));
  }, [visible, isLoading, groups.length, transactions, groupOfCategory, budgets, filterPeriod, today]);

  if (!visible || groups.length === 0) return null;
  const unit = isCyclePeriod(filterPeriod) ? 'รอบ' : 'เดือน';
  const pace = periodElapsed(filterPeriod, today);
  const hasPlan = [...(stats?.values() ?? [])].some((e) => e.planned > 0);

  return (
    <section aria-label={`งบต่อ${unit}`} className="border border-line bg-surface">
      <div className="flex items-center justify-between gap-3 px-4 py-1.5 border-b border-line">
        <span className="text-[11px] font-black text-ink-muted">งบ · {getFilterLabel(filterPeriod)}</span>
        <span className="flex items-center gap-3 text-[11px] text-ink-muted">
          {pace != null && <span className="flex items-center gap-1" title="ถ้าแถบสีเลย ^ ไป แปลว่าใช้เงินเร็วกว่าเวลาที่ผ่านไป"><span aria-hidden="true" className="inline-block w-2 h-[6px] bg-ink-display [clip-path:polygon(50%_0,100%_100%,0_100%)]" />วันนี้ (ผ่านไป {Math.round(pace * 100)}% ของ{unit})</span>}
          <span className="flex items-center gap-1"><span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full bg-ink-muted" />เฉลี่ย {AVG_UNITS} {unit}</span>
          {hasPlan && <span>สีจาง = คาดการณ์จากรายการที่ลงล่วงหน้า</span>}
        </span>
      </div>
      <ul className="divide-y divide-line">
        {groups.map((group) => {
          const env = stats?.get(group.id);
          const usedPct = env ? Math.min(100, (env.spent / env.budget) * 100) : 0;
          const plannedPct = env ? Math.min(100 - usedPct, (env.planned / env.budget) * 100) : 0;
          const diff = env ? env.budget - env.spent : 0;
          return (
            <li key={group.id} className="grid grid-cols-[170px_1fr_300px] items-center gap-4 px-4 py-2 min-h-[57px]">
              <span className="flex items-center gap-2 min-w-0 text-[13px] font-bold text-ink-display">
                <CategoryGlyph icon={group.icon} color={readable(group.color)} size={14} className="shrink-0" />
                <span className="truncate">{group.name}</span>
              </span>
              {env ? (
                <span aria-hidden="true" className="relative block h-2 bg-surface-elevated">
                  <span className={`absolute inset-y-0 left-0 ${LEVEL_BAR[env.level]}`} style={{ width: `${usedPct}%`, backgroundColor: env.level === 'ok' ? group.color ?? undefined : undefined }} />
                  <span className="absolute inset-y-0" style={{ left: `${usedPct}%`, width: `${plannedPct}%`, backgroundColor: `color-mix(in srgb, ${group.color} 30%, transparent)` }} />
                  {pace != null && (
                    <span className="absolute top-full mt-0.5 -ml-1 w-2 h-[6px] bg-ink-display [clip-path:polygon(50%_0,100%_100%,0_100%)]" style={{ left: `${pace * 100}%` }} />
                  )}
                  {env.avg != null && env.avg > 0 && (
                    <span className="absolute top-full mt-0.5 w-1.5 h-1.5 -ml-[3px] rounded-full bg-ink-muted" style={{ left: `${Math.min(100, (env.avg / env.budget) * 100)}%` }} />
                  )}
                </span>
              ) : (
                <Shimmer className="h-2" />
              )}
              {env ? (
                <span className="flex flex-col items-end gap-0.5 tabular-nums">
                  <span className="text-[13px] font-bold text-ink-display">
                    <span className={LEVEL_TEXT[env.level]}>{baht(env.spent)}</span>
                    <span className="text-ink-muted"> / {baht(env.budget)}</span>{' '}
                    <span className={`ml-1 text-[11px] font-semibold ${LEVEL_TEXT[env.level]}`}>
                      {diff >= 0 ? `เหลือ ${baht(diff)}` : `เกิน ${baht(-diff)}`}
                    </span>
                  </span>
                  <span className="text-[11px] text-ink-muted">
                    {env.avg != null && <span title={`เฉลี่ยของ${unit}ก่อนหน้า`}>เฉลี่ย {env.avgUnits} {unit} {baht(env.avg)}</span>}
                    {env.avg != null && env.planned > 0 && ' · '}
                    {env.planned > 0 && <span>คาดการณ์อีก {baht(env.planned)}</span>}
                  </span>
                </span>
              ) : (
                <Shimmer className="h-8 w-48 justify-self-end" />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
});

export default BudgetEnvelopes;
