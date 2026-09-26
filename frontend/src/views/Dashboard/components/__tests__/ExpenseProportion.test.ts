import { describe, it, expect } from 'vitest';
import {
  calculateSimulatedAllocation,
  sortProportionItems,
  buildDoughnutChartData,
  resolveDoughnutHoverIndex,
} from '../ExpenseProportion/proportionHelpers';
import { AllocationItemData, CategoryItemData } from '../ExpenseProportion/types';
import { tc } from '@/constants/theme';

describe('ExpenseProportion helpers', () => {
  describe('calculateSimulatedAllocation', () => {
    const mockAllocation: AllocationItemData[] = [
      {
        id: 'needs',
        name: 'Needs',
        amount: 50000,
        color: '#ef4444',
        icon: '🏠',
        target: 50,
        percentage: '50.0',
        groups: [
          { id: 'rent-group', name: 'Rent', amount: 30000 },
          { id: 'groceries-group', name: 'Groceries', amount: 20000 },
        ],
      },
      {
        id: 'wants',
        name: 'Wants',
        amount: 30000,
        color: '#f59e0b',
        icon: '🛍️',
        target: 30,
        percentage: '30.0',
        groups: [
          { id: 'dining-group', name: 'Dining', amount: 20000 },
          { id: 'travel-group', name: 'Travel', amount: 10000 },
        ],
      },
      {
        id: 'savings',
        name: 'Savings',
        amount: 20000,
        color: '#10b981',
        icon: '🏦',
        target: 20,
        percentage: '20.0',
        groups: [],
      },
    ];

    it('returns original allocation if not in allocation mode', () => {
      const result = calculateSimulatedAllocation(false, ['dining-group'], mockAllocation, 100000, 80000, 20000);
      expect(result.simulatedAllocation).toBe(mockAllocation);
      expect(result.totalReduced).toBe(0);
    });

    it('returns original allocation if no groups are excluded', () => {
      const result = calculateSimulatedAllocation(true, [], mockAllocation, 100000, 80000, 20000);
      expect(result.simulatedAllocation).toBe(mockAllocation);
      expect(result.totalReduced).toBe(0);
    });

    it('correctly simulates reduction and increases net savings', () => {
      // Exclude dining-group (20000)
      const result = calculateSimulatedAllocation(true, ['dining-group'], mockAllocation, 100000, 80000, 20000);

      expect(result.totalReduced).toBe(20000);

      const simNeeds = result.simulatedAllocation.find(a => a.id === 'needs');
      const simWants = result.simulatedAllocation.find(a => a.id === 'wants');
      const simSavings = result.simulatedAllocation.find(a => a.id === 'savings');

      expect(simNeeds?.amount).toBe(50000);
      expect(simNeeds?.percentage).toBe('50.0');

      expect(simWants?.amount).toBe(10000); // 30000 - 20000
      expect(simWants?.percentage).toBe('10.0');

      expect(simSavings?.amount).toBe(40000); // 20000 original + 20000 saved
      expect(simSavings?.percentage).toBe('40.0');
    });
  });

  describe('sortProportionItems', () => {
    const mockItems: CategoryItemData[] = [
      { id: 'cat-1', name: 'Food', amount: 1500, color: '#f00', percentage: '15.0', order_index: 2 },
      { id: 'cat-2', name: 'Transport', amount: 3000, color: '#0f0', percentage: '30.0', order_index: 1 },
      { id: 'cat-3', name: 'Coffee', amount: 500, color: '#00f', percentage: '5.0', order_index: 3 },
    ];

    it('sorts by amount descending', () => {
      const sorted = sortProportionItems(mockItems, 'amount-desc', false);
      expect(sorted.map(i => i.id)).toEqual(['cat-2', 'cat-1', 'cat-3']);
    });

    it('sorts by amount ascending', () => {
      const sorted = sortProportionItems(mockItems, 'amount-asc', false);
      expect(sorted.map(i => i.id)).toEqual(['cat-3', 'cat-1', 'cat-2']);
    });

    it('sorts by order ascending', () => {
      const sorted = sortProportionItems(mockItems, 'order-asc', false);
      expect(sorted.map(i => i.id)).toEqual(['cat-2', 'cat-1', 'cat-3']);
    });

    it('sorts by order descending', () => {
      const sorted = sortProportionItems(mockItems, 'order-desc', false);
      expect(sorted.map(i => i.id)).toEqual(['cat-3', 'cat-1', 'cat-2']);
    });

    it('preserves order when isAllocationMode is true', () => {
      const sorted = sortProportionItems(mockItems, 'amount-desc', true);
      expect(sorted.map(i => i.id)).toEqual(['cat-1', 'cat-2', 'cat-3']);
    });
  });

  describe('resolveDoughnutHoverIndex', () => {
    it('returns -1 for empty elements', () => {
      expect(resolveDoughnutHoverIndex([])).toBe(-1);
    });

    it('returns direct element index for selected element', () => {
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 2 }])).toBe(2);
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 0 }])).toBe(0);
    });
  });

  describe('buildDoughnutChartData', () => {
    it('creates single dataset for category mode with highlighting for hovered index', () => {
      const mockCats: CategoryItemData[] = [
        { id: 'c-1', name: 'C1', amount: 200, color: '#f00', percentage: '40' },
        { id: 'c-2', name: 'C2', amount: 300, color: '#0f0', percentage: '60' },
      ];

      const chartData = buildDoughnutChartData(mockCats, 1);
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].borderColor).toEqual([tc('line'), tc('accent')]);
      expect(chartData.datasets[0].data).toEqual([200, 300]);
    });

    it('creates chart data with default borders when no index is hovered', () => {
      const mockCats: CategoryItemData[] = [
        { id: 'c-1', name: 'C1', amount: 200, color: '#f00', percentage: '40' },
        { id: 'c-2', name: 'C2', amount: 300, color: '#0f0', percentage: '60' },
      ];

      const chartData = buildDoughnutChartData(mockCats, -1);
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].borderColor).toEqual([tc('line'), tc('line')]);
    });
  });
});
