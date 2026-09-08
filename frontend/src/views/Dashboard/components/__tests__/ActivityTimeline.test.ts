import { describe, it, expect } from 'vitest';
import {
  getExpenseLevel,
  getHeatmapColor,
  getLocalTodayString,
  FERRARI_HEATMAP_SHADES
} from '../ActivityTimeline';

describe('ActivityTimeline helpers and thermal engine', () => {
  describe('getExpenseLevel', () => {
    it('returns 0 for zero or negative amount', () => {
      expect(getExpenseLevel(0, 1000)).toBe(0);
      expect(getExpenseLevel(-100, 1000)).toBe(0);
    });

    it('returns levels 1 through 6 proportionally', () => {
      const threshold = 600;
      expect(getExpenseLevel(50, threshold)).toBe(1);  // 50/600 = 1/12 <= 1/6 -> 1
      expect(getExpenseLevel(100, threshold)).toBe(1); // 100/600 = 1/6 -> 1
      expect(getExpenseLevel(150, threshold)).toBe(2); // 150/600 = 1/4 <= 2/6 -> 2
      expect(getExpenseLevel(200, threshold)).toBe(2); // 200/600 = 2/6 -> 2
      expect(getExpenseLevel(300, threshold)).toBe(3); // 300/600 = 3/6 -> 3
      expect(getExpenseLevel(400, threshold)).toBe(4); // 400/600 = 4/6 -> 4
      expect(getExpenseLevel(500, threshold)).toBe(5); // 500/600 = 5/6 -> 5
      expect(getExpenseLevel(600, threshold)).toBe(6); // 600/600 = 1 -> 6
      expect(getExpenseLevel(1200, threshold)).toBe(6); // > 600 -> 6
    });
  });

  describe('getHeatmapColor', () => {
    it('returns canvas near-black #181818 for level 0', () => {
      expect(getHeatmapColor(0)).toBe('#181818');
    });

    it('returns corresponding Ferrari thermal shades for levels 1 to 6', () => {
      expect(getHeatmapColor(1)).toBe(FERRARI_HEATMAP_SHADES[0]);
      expect(getHeatmapColor(3)).toBe(FERRARI_HEATMAP_SHADES[2]);
      expect(getHeatmapColor(6)).toBe(FERRARI_HEATMAP_SHADES[5]);
      expect(getHeatmapColor(6)).toBe('#da291c'); // Rosso Corsa
    });
  });

  describe('getLocalTodayString', () => {
    it('returns date formatted as YYYY-MM-DD in local time', () => {
      const today = getLocalTodayString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const now = new Date();
      const expectedYear = String(now.getFullYear());
      const expectedMonth = String(now.getMonth() + 1).padStart(2, '0');
      const expectedDate = String(now.getDate()).padStart(2, '0');

      expect(today).toBe(`${expectedYear}-${expectedMonth}-${expectedDate}`);
    });
  });

  describe('FERRARI_HEATMAP_SHADES', () => {
    it('has exactly 6 progressive thermal levels ending in Rosso Corsa', () => {
      expect(FERRARI_HEATMAP_SHADES).toHaveLength(6);
      expect(FERRARI_HEATMAP_SHADES[5]).toBe('#da291c');
    });
  });
});
