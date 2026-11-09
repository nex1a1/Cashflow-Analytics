// frontend/src/utils/categoryColors.ts
// Category colours come from their cashflow group: the categories of one group share its hue and step through a small
// lightness/hue ramp around it, so a chart line, heatmap column or legend dot says which group it belongs to and two
// categories of a group can still be told apart. The category's own stored `color` stays in the DB untouched (it is the
// fallback when the category has no group) and is what the save paths send back.
import type { CashflowGroup, Category } from '../types';

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Max lightness spread of a group's ramp, and the step per category until that cap (fraction of 0–1). */
const MAX_SPAN = 0.34;
const STEP = 0.09;
/** Ramp stays inside this lightness band, so no shade turns near-black or near-white. */
const L_MIN = 0.28;
const L_MAX = 0.78;
/** Total hue swing across a ramp, in degrees: keeps neighbours apart without leaving the group's hue family. */
const HUE_SWING = 20;

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl | null {
  const m = HEX_RE.exec(hex.trim());
  if (!m) return null;
  let v = m[1];
  if (v.length === 3) v = v.split('').map(ch => ch + ch).join('');
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}

function hslToHex({ h, s, l }: Hsl): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1] =
    hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r1)}${to(g1)}${to(b1)}`.toUpperCase();
}

/** How far a group's shades spread, in percent of the full ramp (0 = every category is the group colour). */
export const DEFAULT_SHADE_STRENGTH = 40;
export const SHADE_STRENGTH_STEP = 1;

/** Stored setting → a whole number 0–100; anything else falls back to the default. */
export function parseShadeStrength(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_SHADE_STRENGTH;
  return Math.min(100, Math.max(0, Math.round(n / SHADE_STRENGTH_STEP) * SHADE_STRENGTH_STEP));
}

/**
 * `count` shades of `groupColor`, darkest first. One category gets the group colour itself; more spread around it
 * (the ramp is centred on the group's lightness, shifted inward when that sits near the band's edge).
 * `strength` (0–100) scales the spread: 0 gives the group colour to every category.
 */
export function groupShades(groupColor: string, count: number, strength = 100): string[] {
  if (count <= 0) return [];
  const base = hexToHsl(groupColor);
  if (!base) return Array(count).fill(groupColor);
  const k = Math.min(100, Math.max(0, strength)) / 100;
  if (count === 1 || k === 0) return Array(count).fill(hslToHex(base));
  const span = Math.min(MAX_SPAN, STEP * (count - 1)) * k;
  const center = Math.min(Math.max(base.l, L_MIN + span / 2), L_MAX - span / 2);
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1); // 0 … 1
    return hslToHex({ h: base.h + (t - 0.5) * HUE_SWING * k, s: base.s, l: center - span / 2 + span * t });
  });
}

/** The categories with `color` replaced by their group's shade (in `order_index` order inside each group). */
export function withGroupColors<T extends Category>(categories: T[], groups: CashflowGroup[], strength = 100): T[] {
  if (!groups.length || !categories.length) return categories;
  const groupColor = new Map(groups.filter(g => g.color).map(g => [g.id, g.color as string]));
  const byGroup = new Map<string, T[]>();
  for (const c of categories) {
    const gid = c.cashflowGroup || c.cashflow_group_id;
    if (!gid || !groupColor.has(gid)) continue;
    const list = byGroup.get(gid);
    if (list) list.push(c);
    else byGroup.set(gid, [c]);
  }
  const color = new Map<string, string>();
  for (const [gid, list] of byGroup) {
    const sorted = [...list].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    groupShades(groupColor.get(gid)!, sorted.length, strength).forEach((hex, i) => color.set(sorted[i].id, hex));
  }
  return categories.map(c => {
    const hex = color.get(c.id);
    return hex && hex !== c.color ? { ...c, color: hex } : c;
  });
}
