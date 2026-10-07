import { describe, it, expect } from 'vitest';
import { getAvailableChartViews, getMainChartTitle, getContrastTextColor, updateActiveCategories, getDatasetIndicatorStyle } from '../helpers';
import { tc } from '@/constants/theme';

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

  describe('getMainChartTitle — the remaining views', () => {
    it('names each series type, and a breakdown beats the series type', () => {
      expect(getMainChartTitle('bar', 'daily-expense', false)).toBe('รายจ่ายรายวัน');
      expect(getMainChartTitle('line', 'bar', false)).toBe('เทรนด์เปรียบเทียบ');
      expect(getMainChartTitle('line', undefined, false)).toBe('เปรียบเทียบรายจ่ายตามหมวดหมู่');
      expect(getMainChartTitle('line', 'daily-expense', true)).toBe('แจกแจงรายจ่ายตามหมวดหมู่');
    });
  });

  describe('getAvailableChartViews — the other views are never disabled', () => {
    it('only Sparkline depends on the period', () => {
      for (const single of [true, false]) {
        expect(getAvailableChartViews(single).filter(v => v.id !== 'multiples').every(v => v.disabled === false && !v.title)).toBe(true);
      }
    });
  });

  describe('getContrastTextColor', () => {
    it('dark text on a light colour, light text on a dark one', () => {
      expect(getContrastTextColor('#FFFFFF')).toBe(tc('surface'));
      expect(getContrastTextColor('#FDE047')).toBe(tc('surface')); // yellow
      expect(getContrastTextColor('#000000')).toBe(tc('on-accent'));
      expect(getContrastTextColor('#1E3A8A')).toBe(tc('on-accent')); // navy
    });

    it('understands 3-digit hex and a missing #', () => {
      expect(getContrastTextColor('#FFF')).toBe(tc('surface'));
      expect(getContrastTextColor('000')).toBe(tc('on-accent'));
      expect(getContrastTextColor('ffffff')).toBe(tc('surface'));
    });

    it('falls back to the default text colour for nothing or nonsense', () => {
      for (const bad of [null, undefined, '', '#12', '#12345678', 'red']) expect(getContrastTextColor(bad as any)).toBe(tc('on-accent'));
    });
  });

  describe('updateActiveCategories (legend click)', () => {
    const all = ['ข้าว', 'บันเทิง', 'จิปาถะ'];

    it('from ALL, clicking one switches it off and keeps the rest', () => {
      expect(updateActiveCategories('ข้าว', ['ALL'], all)).toEqual(['บันเทิง', 'จิปาถะ']);
    });

    it('clicking an unselected one adds it', () => {
      expect(updateActiveCategories('จิปาถะ', ['ข้าว'], all)).toEqual(['ข้าว', 'จิปาถะ']);
    });

    it('selecting the last missing one means ALL again', () => {
      expect(updateActiveCategories('จิปาถะ', ['ข้าว', 'บันเทิง'], all)).toEqual(['ALL']);
    });

    it('switching off the last selected one also means ALL (an empty chart is never a state)', () => {
      expect(updateActiveCategories('ข้าว', ['ข้าว'], all)).toEqual(['ALL']);
    });

    it('does not change the list it was given', () => {
      const active = ['ข้าว'];
      updateActiveCategories('บันเทิง', active, all);
      expect(active).toEqual(['ข้าว']);
    });
  });

  describe('getDatasetIndicatorStyle (legend swatch)', () => {
    it('a line is a wide thin bar in its line colour; a bar is a square in its fill colour', () => {
      expect(getDatasetIndicatorStyle({ type: 'line', borderColor: '#111111', backgroundColor: '#222222' } as any)).toEqual({ width: 16, height: 3, backgroundColor: '#111111' });
      expect(getDatasetIndicatorStyle({ type: 'bar', borderColor: '#111111', backgroundColor: '#222222' } as any)).toEqual({ width: 10, height: 10, backgroundColor: '#222222' });
    });

    it('falls back to the other colour, then to the muted colour', () => {
      expect(getDatasetIndicatorStyle({ type: 'line', backgroundColor: '#222222' } as any).backgroundColor).toBe('#222222');
      expect(getDatasetIndicatorStyle({ type: 'bar', borderColor: '#111111' } as any).backgroundColor).toBe('#111111');
      expect(getDatasetIndicatorStyle({ type: 'bar' } as any).backgroundColor).toBe(tc('ink-muted'));
    });
  });
});
