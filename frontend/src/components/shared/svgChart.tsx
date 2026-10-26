// Small building blocks shared by the hand-drawn SVG charts (Ghost Pacer, Forecasting, Allocation trend).
import React, { SVGProps, useEffect, useRef, useState } from 'react';
import { FONT_MONO, tc } from '@/constants/theme';

/** Tracks the container's pixel size so the SVG viewBox can match it 1:1 (keeps text and strokes unscaled). */
export function useSvgSize(initW = 800, initH = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: initW, h: initH });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize(s => {
        const next = { w: w > 0 ? w : s.w, h: h > 0 ? h : s.h };
        return next.w === s.w && next.h === s.h ? s : next;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** "M x y L x y …" through the points. */
export const linePath = (pts: readonly (readonly [number, number])[]) =>
  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');

/** Chart text: the 11px mono floor, everything else passed through. */
export const MonoText = (props: SVGProps<SVGTextElement>) => <text fontSize="11" fontFamily={FONT_MONO} {...props} />;

/** Two right-edge labels closer than 18px: keep `a`'s side and move `b` 16px away from it, both kept inside [top, bottom]. */
export function separateLabels(a: number, b: number, top: number, bottom: number): [number, number] {
  if (Math.abs(a - b) >= 18) return [a, b];
  if (b >= a) {
    const nb = Math.min(bottom, a + 16);
    return [Math.max(top, nb - 16), nb];
  }
  const nb = Math.max(top, a - 16);
  return [Math.min(bottom, nb + 16), nb];
}

/** Geometry of a month-long day chart: day 0 (฿0) at the left edge, the last day at `xEnd`. */
export interface DayFrame {
  viewW: number;
  padL: number;
  padT: number;
  plotW: number;
  baseY: number;
  totalDays: number;
  getX: (day: number) => number;
}

/** The day (1…totalDays) under the pointer, or null outside the plot. */
export function dayAtPointer(e: React.MouseEvent<SVGSVGElement>, f: DayFrame): number | null | undefined {
  const rect = e.currentTarget.getBoundingClientRect();
  if (rect.width <= 0) return undefined; // not laid out: keep whatever is shown
  const svgX = ((e.clientX - rect.left) / rect.width) * f.viewW;
  if (svgX < f.padL - 6 || svgX > f.getX(f.totalDays) + 6) return null;
  const ratio = Math.max(0, Math.min(1, (svgX - f.padL) / f.plotW));
  return Math.max(1, Math.min(f.totalDays, Math.round(ratio * f.totalDays)));
}

/** Tooltip box beside the hovered point: right of it unless that would leave the chart, kept inside the plot. */
export function tooltipAt(f: DayFrame, x: number, y: number, tipW: number, tipH: number) {
  const raw = x + tipW + 14 > f.viewW ? x - tipW - 12 : x + 12;
  return {
    x: Math.max(f.padL + 2, Math.min(f.viewW - tipW - 8, raw)),
    y: Math.max(f.padT + 2, Math.min(y - tipH / 2, f.baseY - tipH - 2)),
  };
}

/** One faint hairline per day. */
export const DayGrid = ({ f }: { f: DayFrame }) => (
  <>
    {Array.from({ length: f.totalDays - 1 }, (_, i) => i + 1).map(d => (
      <line key={`vgrid-${d}`} x1={f.getX(d)} y1={f.padT} x2={f.getX(d)} y2={f.baseY} stroke={tc('line')} strokeWidth="1" />
    ))}
  </>
);

/** Bottom axis: Day 1 · Day N (วันนี้) · Day last, plus 5/10/15… ticks kept clear of the edges and of today's label. */
export function DayAxis({ f, today }: { f: DayFrame; today: number }) {
  const { padL, baseY, totalDays, getX } = f;
  const xToday = getX(today);
  const xEnd = getX(totalDays);
  const step = totalDays > 20 ? 5 : totalDays > 10 ? 2 : 1;
  const ticks: number[] = [];
  for (let d = step; d < totalDays; d += step) ticks.push(d);
  return (
    <>
      <line x1={padL} y1={baseY} x2={xEnd} y2={baseY} stroke={tc('line')} strokeWidth="1" />
      {xToday - padL > 90 && <MonoText x={padL} y={baseY + 12} fill={tc('ink-muted')}>Day 1</MonoText>}
      <MonoText x={xToday} y={baseY + 12} fill={tc('ink-body')} textAnchor="middle" fontWeight="bold">Day {today} (วันนี้)</MonoText>
      {xEnd - xToday > 100 && <MonoText x={xEnd} y={baseY + 12} fill={tc('ink-muted')} textAnchor="end">Day {totalDays}</MonoText>}
      {ticks.map(d => {
        const x = getX(d);
        if (x < padL + 16 || x > xEnd - 16) return null;
        if (Math.abs(x - xToday) < 60) return null; // "Day N (วันนี้)" is ~95px wide, centered on today
        return (
          <g key={d}>
            <line x1={x} y1={baseY} x2={x} y2={baseY + 3} stroke={tc('ink-muted')} strokeWidth="1" />
            <MonoText x={x} y={baseY + 12} fill={tc('ink-muted')} textAnchor="middle">{d}</MonoText>
          </g>
        );
      })}
    </>
  );
}

/** Tooltip heading "Day N (วันนี้ | คาดการณ์)". */
export const TooltipDay = ({ y, day, isToday, isFuture }: { y: number; day: number; isToday: boolean; isFuture: boolean }) => (
  <MonoText x="8" y={y} fill={tc('ink-display')} fontWeight="bold">
    Day {day}
    <tspan fill={isToday ? tc('accent-ink') : isFuture ? tc('ink-body') : tc('ink-muted')} fontSize="11" fontWeight="normal">
      {isToday ? ' (วันนี้)' : isFuture ? ' (คาดการณ์)' : ''}
    </tspan>
  </MonoText>
);

/** End-of-month label box to the right of the plot. */
export const EdgeBadge = ({ x, y, w, stroke, fill = stroke, children }: { x: number; y: number; w: number; stroke: string; fill?: string; children: React.ReactNode }) => (
  <g transform={`translate(${x + 6}, ${y - 7})`}>
    <rect x="0" y="0" width={w} height="15" fill={tc('canvas')} stroke={stroke} strokeWidth="0.8" rx="2" />
    <MonoText x="6" y="11" fill={fill} fontWeight="bold">{children}</MonoText>
  </g>
);
