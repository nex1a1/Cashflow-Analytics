// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { Chart, defaults } from 'chart.js';
import { tc } from '@/constants/theme';
import '../chartSetup';

describe('chartSetup', () => {
  it('registers every chart type the Dashboard and Portfolio draw, and sets the chart defaults', () => {
    for (const id of ['bar', 'line', 'doughnut', 'sankey']) expect(Chart.registry.getController(id)).toBeTruthy();
    for (const id of ['arc', 'flow']) expect(Chart.registry.getElement(id)).toBeTruthy();
    expect(Chart.registry.getScale('logarithmic')).toBeTruthy();
    expect(defaults.font.family).toBe("'Inter', 'Bai Jamjuree', sans-serif");
    expect(defaults.color).toBe(tc('ink-body'));
    expect(defaults.borderColor).toBe(tc('line'));
  });
});
