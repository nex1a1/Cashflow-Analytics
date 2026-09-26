import { describe, it, expect } from 'vitest';
import { getAvailableChartViews, getMainChartTitle } from '../helpers';

describe('MainChart helpers', () => {
  describe('getAvailableChartViews', () => {
    it('returns all 4 views with multiples marked disabled when isSingleMonth is true (default)', () => {
      const views = getAvailableChartViews(true);
      expect(views.map(v => v.id)).toEqual(['line', 'bar', 'sankey', 'multiples']);
      const multiplesView = views.find(v => v.id === 'multiples');
      expect(multiplesView?.label).toBe('Sparkline');
      expect(multiplesView?.disabled).toBe(true);
      expect(multiplesView?.title).toBe('ต้องเลือกช่วงเวลามากกว่า 1 เดือน เพื่อดู Sparkline');
    });

    it('returns all 4 views with multiples enabled when isSingleMonth is false (> 1 month selected)', () => {
      const views = getAvailableChartViews(false);
      expect(views.map(v => v.id)).toEqual(['line', 'bar', 'sankey', 'multiples']);
      const multiplesView = views.find(v => v.id === 'multiples');
      expect(multiplesView?.label).toBe('Sparkline');
      expect(multiplesView?.disabled).toBe(false);
    });
  });

  describe('getMainChartTitle', () => {
    it('returns correct titles for various view modes', () => {
      expect(getMainChartTitle('sankey')).toBe('โครงสร้างกระแสเงินสด');
      expect(getMainChartTitle('multiples')).toBe('เทรนด์รายหมวด');
      expect(getMainChartTitle('bar', 'combo', false)).toBe('วิเคราะห์กระแสเงินสด');
      expect(getMainChartTitle('bar', 'combo', true)).toBe('แจกแจงรายจ่ายตามหมวดหมู่');
    });
  });
});
