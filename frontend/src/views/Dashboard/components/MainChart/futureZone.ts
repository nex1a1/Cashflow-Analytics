// src/views/Dashboard/components/MainChart/futureZone.ts
// "ตอนนี้" marker + plan (future) styling for the main chart: actual = solid, plan = hatched bars,
// dashed line, hollow points, muted tick labels, a faint zone behind the future part.
import { tc } from '@/constants/theme';
import { localTodayIso, monthKeyOf } from '@/utils/payCycle';

export interface FutureZone {
  /** index of the bar/point that holds today (-1 when today is not on the axis) */
  currentIdx: number;
  /** first index that is wholly in the future (= length when nothing is planned) */
  futureFrom: number;
  /** x-axis unit: whole months/cycles or single days */
  unit: 'month' | 'day';
}

/** keys are sorted ISO strings (`YYYY-MM` or `YYYY-MM-DD`), so plain string compare is date order */
export function resolveFutureZone(
  keys: string[],
  unit: 'month' | 'day',
  filterPeriod: string,
  todayIso: string = localTodayIso()
): FutureZone | null {
  if (!keys || keys.length === 0) return null;
  const todayKey = unit === 'month' ? monthKeyOf(todayIso, filterPeriod) : todayIso;
  let futureFrom = keys.length;
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] > todayKey) { futureFrom = i; break; }
  }
  if (futureFrom === keys.length && keys[keys.length - 1] < todayKey) return null; // all past: nothing to mark
  return { currentIdx: keys.indexOf(todayKey), futureFrom, unit };
}

const hatchCache = new Map<string, CanvasPattern>();

/** diagonal-hatch fill for a plan bar; falls back to a translucent fill where canvas is unavailable */
export function planFill(color: string): string | CanvasPattern {
  const fallback = withAlpha(color, 0.28);
  const cached = hatchCache.get(color);
  if (cached) return cached;
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const ctx = c.getContext('2d');
    if (!ctx) return fallback;
    ctx.fillStyle = withAlpha(color, 0.12);
    ctx.fillRect(0, 0, 8, 8);
    ctx.strokeStyle = withAlpha(color, 0.75);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, 10); ctx.lineTo(10, -2);
    ctx.moveTo(-2, 2); ctx.lineTo(2, -2);
    ctx.moveTo(6, 10); ctx.lineTo(10, 6);
    ctx.stroke();
    const pattern = ctx.createPattern(c, 'repeat');
    if (!pattern) return fallback;
    hatchCache.set(color, pattern);
    return pattern;
  } catch {
    return fallback;
  }
}

/** `#rrggbb` / `rgb(a)` → `rgba(r,g,b,alpha)`; anything else is returned unchanged */
export function withAlpha(color: string, alpha: number): string {
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = Number.parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map(s => s.trim());
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return color;
}

/** Per-index styling of one dataset: solid up to today, plan look after it. */
export function applyPlanStyle(ds: any, zone: FutureZone | null): any {
  if (!zone || zone.futureFrom >= (ds.data?.length ?? 0)) return ds;
  const { futureFrom } = zone;
  const base: string = ds.borderColor || ds.backgroundColor;
  if (typeof base !== 'string') return ds;

  if (ds.type === 'bar') {
    const solid = ds.backgroundColor;
    return {
      ...ds,
      backgroundColor: (ctx: any) => (ctx.dataIndex >= futureFrom ? planFill(base) : solid),
      borderWidth: ds.borderWidth || 1,
    };
  }
  // line dataset: dashed segments into the future, hollow points
  const solidPoint = ds.pointBackgroundColor ?? base;
  return {
    ...ds,
    segment: { borderDash: (ctx: any) => (ctx.p1DataIndex >= futureFrom ? [6, 6] : undefined) },
    pointBackgroundColor: (ctx: any) => (ctx.dataIndex >= futureFrom ? tc('canvas') : solidPoint),
    pointBorderColor: (ctx: any) => (ctx.dataIndex >= futureFrom ? base : (ds.pointBorderColor ?? base)),
    pointBorderWidth: 2,
  };
}

/** Chart.js inline plugin: faint zone behind the plan + a dashed "ตอนนี้" line on the current unit. */
// Static: react-chartjs-2 registers plugins once per chart instance, so the zone is read from
// `options.plugins.futureZone.zone` (which does follow period / view changes).
export const futureZonePlugin = {
    id: 'futureZone',
    beforeDatasetsDraw(chart: any) {
      const zone: FutureZone | null = chart.options?.plugins?.futureZone?.zone ?? null;
      if (!zone) return;
      const { ctx, chartArea, scales } = chart;
      const x = scales?.x;
      if (!x || !chartArea || zone.futureFrom >= x.ticks.length) return;
      const halfStep = (x.getPixelForValue(1) - x.getPixelForValue(0)) / 2 || 0;
      const left = Math.max(chartArea.left, x.getPixelForValue(zone.futureFrom) - halfStep);
      ctx.save();
      ctx.fillStyle = tc('ink-body', 0.05);
      ctx.fillRect(left, chartArea.top, chartArea.right - left, chartArea.bottom - chartArea.top);
      ctx.restore();
    },
    afterDatasetsDraw(chart: any) {
      const zone: FutureZone | null = chart.options?.plugins?.futureZone?.zone ?? null;
      if (!zone || zone.currentIdx < 0) return;
      const { ctx, chartArea, scales } = chart;
      const x = scales?.x;
      if (!x || !chartArea) return;
      const px = x.getPixelForValue(zone.currentIdx);
      if (!Number.isFinite(px)) return;
      const color = tc('accent-ink');
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, chartArea.top);
      ctx.lineTo(px, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      const text = zone.unit === 'month' ? 'เดือนนี้' : 'วันนี้';
      ctx.font = '600 11px Inter, "Bai Jamjuree", sans-serif';
      const w = ctx.measureText(text).width + 12;
      const bx = Math.min(Math.max(px - w / 2, chartArea.left), chartArea.right - w);
      ctx.fillStyle = color;
      ctx.fillRect(bx, chartArea.top, w, 18);
      ctx.fillStyle = tc('on-accent');
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(text, bx + w / 2, chartArea.top + 9.5);
      ctx.restore();
    },
};

/** x tick colour/weight: current unit accent + bold, plan muted */
export function planTickStyle(zone: FutureZone | null) {
  return {
    color: (ctx: any) => {
      if (!zone) return tc('ink-body');
      if (ctx.index === zone.currentIdx) return tc('accent-ink');
      return ctx.index >= zone.futureFrom ? tc('ink-muted') : tc('ink-body');
    },
    // `weight` is scriptable on its own, so `font.size` stays a plain number (11px floor)
    font: { size: 11, weight: (ctx: any) => (zone && ctx.index === zone.currentIdx ? '700' : '400') },
  };
}
