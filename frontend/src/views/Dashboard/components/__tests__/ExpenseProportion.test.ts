import { describe, it, expect } from 'vitest';
import {
  calculateSimulatedAllocation,
  sortProportionItems,
  buildDoughnutChartData,
  resolveDoughnutHoverIndex,
} from '../ExpenseProportion/proportionHelpers';
import { AllocationItemData, GroupItemData, CategoryItemData } from '../ExpenseProportion/types';

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
    const mockGroups: GroupItemData[] = [
      {
        id: 'g-1',
        name: 'Group 1',
        amount: 3000,
        color: '#f00',
        percentage: '30',
        categories: [
          { id: 'c-1', name: 'Cat 1', amount: 1000, relativePercentage: 33 },
          { id: 'c-2', name: 'Cat 2', amount: 2000, relativePercentage: 67 },
        ],
      },
      {
        id: 'g-2',
        name: 'Group 2',
        amount: 7000,
        color: '#0f0',
        percentage: '70',
        categories: [
          { id: 'c-3', name: 'Cat 3', amount: 3000, relativePercentage: 43 },
          { id: 'c-4', name: 'Cat 4', amount: 4000, relativePercentage: 57 },
        ],
      },
    ];

    it('returns -1 for empty elements', () => {
      expect(resolveDoughnutHoverIndex([], true, mockGroups)).toBe(-1);
    });

    it('returns direct element index for single dataset mode', () => {
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 2 }], false, mockGroups)).toBe(2);
    });

    it('maps outer subcategory index back to parent group index in group mode', () => {
      // Outer ring index 0 (Cat 1) -> Group 0
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 0 }], true, mockGroups)).toBe(0);
      // Outer ring index 1 (Cat 2) -> Group 0
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 1 }], true, mockGroups)).toBe(0);
      // Outer ring index 2 (Cat 3) -> Group 1
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 2 }], true, mockGroups)).toBe(1);
      // Outer ring index 3 (Cat 4) -> Group 1
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 0, index: 3 }], true, mockGroups)).toBe(1);
    });

    it('returns inner ring group index directly in group mode', () => {
      expect(resolveDoughnutHoverIndex([{ datasetIndex: 1, index: 1 }], true, mockGroups)).toBe(1);
    });
  });

  describe('buildDoughnutChartData', () => {
    it('creates two datasets in group mode with outer subcategories and inner groups', () => {
      const mockGroups: GroupItemData[] = [
        {
          id: 'g-1',
          name: 'Group 1',
          amount: 500,
          color: '#ff0000',
          percentage: '100',
          categories: [
            { id: 'c-1', name: 'C1', amount: 200, relativePercentage: 40, color: '#f55' },
            { id: 'c-2', name: 'C2', amount: 300, relativePercentage: 60, color: '#faa' },
          ],
        },
      ];

      const chartData = buildDoughnutChartData(mockGroups, true, -1);
      expect(chartData.datasets).toHaveLength(2);
      expect(chartData.datasets[0].label).toContain('Outer');
      expect(chartData.datasets[0].data).toEqual([200, 300]);
      expect(chartData.datasets[1].label).toContain('Inner');
      expect(chartData.datasets[1].data).toEqual([500]);
    });

    it('creates single dataset for category mode with highlighting for hovered index', () => {
      const mockCats: CategoryItemData[] = [
        { id: 'c-1', name: 'C1', amount: 200, color: '#f00', percentage: '40' },
        { id: 'c-2', name: 'C2', amount: 300, color: '#0f0', percentage: '60' },
      ];

      const chartData = buildDoughnutChartData(mockCats, false, 1);
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].borderColor).toEqual(['#303030', '#da291c']);
    });
  });
});
