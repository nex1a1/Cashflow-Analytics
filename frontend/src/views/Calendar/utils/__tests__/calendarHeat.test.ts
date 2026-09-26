import { describe, it, expect } from 'vitest';
import {
  getCalendarHeatLevel,
  getCalendarHeatStyle,
  CALENDAR_HEAT_COLORS,
  CALENDAR_HEAT_GRADIENTS,
  burnAlpha
} from '../../components/CalendarDayCell';

describe('Calendar Tactical Heat Steps Engine', () => {
  describe('getCalendarHeatLevel', () => {
    it('returns level 0 for zero, negative or missing expense', () => {
      expect(getCalendarHeatLevel(0, 5000)).toBe(0);
      expect(getCalendarHeatLevel(-100, 5000)).toBe(0);
    });

    it('returns level 1 for daily normal baseline spend', () => {
      // 39 THB out of 6,950 max (0.5%)
      expect(getCalendarHeatLevel(39, 6950)).toBe(1);
      // 80 THB out of 6,950 max
      expect(getCalendarHeatLevel(80, 6950)).toBe(1);
      // 200 THB out of 6,950 max
      expect(getCalendarHeatLevel(200, 6950)).toBe(1);
    });

    it('returns level 2 for moderate spend (Amber)', () => {
      // 473 THB out of 6,950 max (>= 300)
      expect(getCalendarHeatLevel(473, 6950)).toBe(2);
      // 814 THB out of 6,950 max (~11.7%)
      expect(getCalendarHeatLevel(814, 6950)).toBe(2);
    });

    it('returns level 3 for high spend (Coral)', () => {
      // 2,771 THB out of 6,950 max (~39.8%)
      expect(getCalendarHeatLevel(2771, 6950)).toBe(3);
      // 1,200 THB out of 4,000 max (30%)
      expect(getCalendarHeatLevel(1200, 4000)).toBe(3);
    });

    it('returns level 4 for peak heavy spend (Thunderbolt Crimson)', () => {
      // 5,839 THB out of 6,950 max (~84%)
      expect(getCalendarHeatLevel(5839, 6950)).toBe(4);
      // 6,950 THB out of 6,950 max (100%)
      expect(getCalendarHeatLevel(6950, 6950)).toBe(4);
      // Absolute high spend >= 3000 THB
      expect(getCalendarHeatLevel(3500, 8000)).toBe(4);
    });
  });

  describe('getCalendarHeatStyle', () => {
    it('returns undefined for levels 0 and 1 (keeping daily baseline clean)', () => {
      expect(getCalendarHeatStyle(0)).toBeUndefined();
      expect(getCalendarHeatStyle(1)).toBeUndefined();
    });

    it('returns background gradients for levels 2, 3, and 4', () => {
      expect(getCalendarHeatStyle(2)).toEqual({ backgroundImage: CALENDAR_HEAT_GRADIENTS[2] });
      expect(getCalendarHeatStyle(3)).toEqual({ backgroundImage: CALENDAR_HEAT_GRADIENTS[3] });
      expect(getCalendarHeatStyle(4)).toEqual({ backgroundImage: CALENDAR_HEAT_GRADIENTS[4] });
    });
  });

  describe('burnAlpha backward compatibility', () => {
    it('returns 0 for levels 0 and 1, and positive alphas for levels 2-4', () => {
      expect(burnAlpha(0, 5000)).toBe(0);
      expect(burnAlpha(39, 6950)).toBe(0);
      expect(burnAlpha(500, 6950)).toBe(0.10);
      expect(burnAlpha(2771, 6950)).toBe(0.20);
      expect(burnAlpha(6950, 6950)).toBe(0.32);
    });
  });
});
