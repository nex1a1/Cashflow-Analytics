// src/views/Dashboard/components/MainChart/spikeCap.ts
// One big day (an SSD, the rent) flattens every other bar to the floor. When the tallest bar dwarfs the usual ones,
// the y axis stops just above the usual range and the cut bars carry their real total on top.
import { tc, FONT_MONO } from '@/constants/theme';
import { formatBahtShort } from '@/utils/formatters';

/** The tallest bar must be this many times the usual high (p90) before the axis is cut. */
export const SPIKE_RATIO = 4;
/** The cut axis reaches this many times the usual high. */
const CAP_HEADROOM = 2;
const MIN_BARS = 5;

const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

/** Round up to a round number (…, 2,000, 2,500, 3,000, …), so the cut axis still has round ticks. */
export function niceCeil(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v));
  return NICE_STEPS.find(step => step * p >= v - 1e-9)! * p;
}

/** Axis maximum for these bar totals, or null when nothing stands out enough to cut. */
export function resolveSpikeCap(totals: number[]): number | null {
  const pos = totals.filter(v => v > 0).sort((a, b) => a - b);
  if (pos.length < MIN_BARS) return null;
  const usualHigh = pos[Math.floor((pos.length - 1) * 0.9)];
  const max = pos[pos.length - 1];
  if (!(usualHigh > 0) || max <= usualHigh * SPIKE_RATIO) return null;
  // p90 can itself be one of a few spikes (two big days in a short month): use the highest value below the spikes.
  const below = pos.filter(v => v <= usualHigh * SPIKE_RATIO / CAP_HEADROOM);
  const base = below.length ? below[below.length - 1] : usualHigh;
  return niceCeil(base * CAP_HEADROOM);
}

/**
 * Per-index height of the bars: stacked parts add up; side-by-side bars (income next to expense, several categories)
 * reach only as high as the tallest. Line overlays and negatives are left out.
 */
export function barTotals(datasets: { type?: string; data?: unknown[] }[] | undefined, stacked: boolean): number[] {
  const out: number[] = [];
  for (const ds of datasets ?? []) {
    if (ds.type && ds.type !== 'bar') continue;
    (ds.data ?? []).forEach((v, i) => {
      const n = Number(v);
      const h = Number.isFinite(n) && n > 0 ? n : 0;
      out[i] = stacked ? (out[i] ?? 0) + h : Math.max(out[i] ?? 0, h);
    });
  }
  return out;
}

const TAG_H = 18;
const TAG_PAD_X = 12;
const ROW_GAP = 4;
/** Space between two tags on one row. */
const TAG_GAP = 4;
const POINTER = 4;
/** Rows of tags above the plot at most; past that a tag shares the top row. */
export const MAX_TAG_ROWS = 2;
/** Cut bars this close (in bars) may need a second row of tags. */
const CROWD_SPAN = 3;
/** Slanted gap drawn across a cut bar, this far below the axis top. */
const BREAK_AT = 9;
const BREAK_GAP = 4;
const BREAK_SLANT = 4;

/** Room above the plot for the tags (Chart.js `layout.padding.top`): one row, or two when cut bars sit close. */
export function spikeTagRoom(totals: number[], cap: number): number {
  const cut = totals.flatMap((t, i) => (t > cap ? [i] : []));
  const crowded = cut.some((idx, k) => k > 0 && idx - cut[k - 1] <= CROWD_SPAN);
  const rows = crowded ? MAX_TAG_ROWS : 1;
  return rows * (TAG_H + ROW_GAP) + POINTER + 2;
}

/** Whole baht: a tag points at the bar, the tooltip keeps the satang. */
export const tagText = (total: number) => formatBahtShort(Math.round(total));

export interface TagSlot { index: number; left: number; width: number; row: number }

/**
 * The cut bar to crown: the largest total, once there are two or more cut bars (their heights all look the same).
 * Ties go to the earlier day. Null with fewer than two.
 */
export function topCutIndex(totals: number[], cap: number): number | null {
  let top: number | null = null;
  let count = 0;
  totals.forEach((t, i) => {
    if (!(t > cap)) return;
    count += 1;
    if (top === null || t > totals[top]) top = i;
  });
  return count >= 2 ? top : null;
}

/**
 * One tag per cut bar, centred on the bar and kept inside [minX, maxX]. The `pinned` tag (the largest) takes row 0
 * first; then left to right each tag takes the lowest row (0 = next to the plot) where it overlaps no tag already
 * there. With every row taken it goes to row 0.
 */
export function layoutTags(
  bars: { index: number; x: number; width: number }[], minX: number, maxX: number,
  pinned: number | null = null, rows = MAX_TAG_ROWS,
): TagSlot[] {
  const taken: [number, number][][] = Array.from({ length: rows }, () => []);
  const place = (b: { index: number; x: number; width: number }, forceRow?: number): TagSlot => {
    const left = Math.min(Math.max(b.x - b.width / 2, minX), maxX - b.width);
    const right = left + b.width;
    const clear = (r: number) => taken[r].every(([l, rr]) => right + TAG_GAP <= l || left >= rr + TAG_GAP);
    let row = forceRow ?? taken.findIndex((_, r) => clear(r));
    if (row < 0) row = 0;
    taken[row].push([left, right]);
    return { index: b.index, left, width: b.width, row };
  };
  const pin = pinned === null ? undefined : bars.find(b => b.index === pinned);
  const slots = pin ? [place(pin, 0)] : [];
  for (const b of [...bars].sort((a, c) => a.x - c.x)) if (b !== pin) slots.push(place(b));
  return slots;
}

interface DrawnBar { x: number; width: number; value: number }

/**
 * The drawn bars at an index that run past the cap: the stack as one bar (its parts share x and width), or each
 * side-by-side bar that is itself over the cap.
 */
function cutBarsAt(chart: any, i: number, cap: number, stacked: boolean): DrawnBar[] {
  const bars: DrawnBar[] = [];
  chart.data?.datasets?.forEach((ds: any, di: number) => {
    if (ds.type && ds.type !== 'bar') return;
    if (chart.isDatasetVisible ? !chart.isDatasetVisible(di) : chart.getDatasetMeta(di).hidden) return;
    const el = chart.getDatasetMeta(di).data?.[i];
    const value = Number(ds.data?.[i]);
    if (el && Number.isFinite(el.x)) bars.push({ x: el.x, width: el.width, value: Number.isFinite(value) ? value : 0 });
  });
  if (!stacked) return bars.filter(b => b.value > cap);
  const widest = bars.reduce<DrawnBar | null>((best, b) => (b.width > (best?.width ?? 0) ? b : best), null);
  return widest ? [widest] : [];
}

function drawBreak(ctx: CanvasRenderingContext2D, x: number, barWidth: number, top: number) {
  const half = barWidth / 2 + 1;
  const y = top + BREAK_AT;
  ctx.fillStyle = tc('canvas');
  ctx.beginPath();
  ctx.moveTo(x - half, y + BREAK_SLANT);
  ctx.lineTo(x + half, y);
  ctx.lineTo(x + half, y + BREAK_GAP);
  ctx.lineTo(x - half, y + BREAK_SLANT + BREAK_GAP);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = tc('ink-display', 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - half, y + BREAK_SLANT);
  ctx.lineTo(x + half, y);
  ctx.moveTo(x - half, y + BREAK_SLANT + BREAK_GAP);
  ctx.lineTo(x + half, y + BREAK_GAP);
  ctx.stroke();
}

/**
 * Chart.js inline plugin for a cut axis. Each clipped bar gets a slanted break near the top, so it reads as
 * "taller than shown", and a tag above the plot with its total; tags of neighbouring bars stack into a second row
 * with a leader line down to their bar. Reads `options.plugins.spikeCap`.
 */
export const spikeCapPlugin = {
  id: 'spikeCap',
  afterDatasetsDraw(chart: any) {
    const cfg = chart.options?.plugins?.spikeCap;
    if (!cfg?.cap || !cfg.totals) return;
    const { ctx, chartArea } = chart;
    if (!chartArea) return;
    ctx.save();
    ctx.font = `700 11px ${FONT_MONO}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const cut: { index: number; x: number; width: number; bars: DrawnBar[]; text: string }[] = [];
    (cfg.totals as number[]).forEach((total, i) => {
      if (!(total > cfg.cap)) return;
      const bars = cutBarsAt(chart, i, cfg.cap, Boolean(cfg.stacked));
      if (!bars.length) return;
      // the tag points at the tallest cut bar; its total is that bar's value (side by side) or the stack's
      const anchor = bars.reduce((a, b) => (b.value > a.value ? b : a));
      const text = tagText(total);
      cut.push({ index: i, x: anchor.x, bars, text, width: ctx.measureText(text).width + TAG_PAD_X });
    });
    const byIndex = new Map(cut.map(c => [c.index, c]));

    for (const c of cut) for (const b of c.bars) drawBreak(ctx, b.x, b.width, chartArea.top);

    // the cut bars all stand as tall as the axis: the largest gets the gold of rank 1 (as in รายจ่ายสูงสุด)
    const top = topCutIndex(cfg.totals as number[], cfg.cap);

    for (const slot of layoutTags(cut, chartArea.left, chartArea.right, top)) {
      const c = byIndex.get(slot.index)!;
      const isTop = slot.index === top;
      const rowBottom = chartArea.top - POINTER - 2 - slot.row * (TAG_H + ROW_GAP);
      const ty = rowBottom - TAG_H;
      if (slot.row > 0) {
        // leader from a raised tag down past the first row to its bar
        ctx.strokeStyle = tc('ink-muted', 0.7);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(Math.round(c.x) + 0.5, rowBottom);
        ctx.lineTo(Math.round(c.x) + 0.5, chartArea.top);
        ctx.stroke();
      }
      ctx.fillStyle = tc('surface-elevated');
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(slot.left, ty, slot.width, TAG_H, 4); else ctx.rect(slot.left, ty, slot.width, TAG_H);
      if (slot.row === 0) {
        ctx.moveTo(c.x - POINTER, rowBottom);
        ctx.lineTo(c.x, rowBottom + POINTER);
        ctx.lineTo(c.x + POINTER, rowBottom);
      }
      ctx.fill();
      ctx.fillStyle = isTop ? tc('gold') : tc('expense');
      ctx.fillRect(slot.left, ty, isTop ? 3 : 2, TAG_H); // money-red edge: this is spending; gold: the largest
      ctx.fillStyle = isTop ? tc('gold') : tc('ink-display');
      ctx.fillText(c.text, slot.left + slot.width / 2 + 1, ty + TAG_H / 2 + 0.5);
    }
    ctx.restore();
  },
};
