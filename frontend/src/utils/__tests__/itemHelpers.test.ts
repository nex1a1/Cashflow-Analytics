import { describe, it, expect } from 'vitest';
import {
  STATUS_CONFIG,
  getWarrantyStatus,
  groupItemsByCategory,
  calculateItemStats,
} from '../itemHelpers';
import { ItemWithDetails } from '../../types';

describe('itemHelpers', () => {
  it('provides badge configuration for all item statuses', () => {
    const statuses = ['planned', 'cancelled', 'purchased', 'stored', 'broken', 'sold'] as const;
    for (const status of statuses) {
      expect(STATUS_CONFIG[status]).toBeDefined();
      expect(STATUS_CONFIG[status].label).toBeTruthy();
      expect(STATUS_CONFIG[status].className).toBeTruthy();
    }
  });

  describe('getWarrantyStatus', () => {
    const refDate = new Date('2026-09-11');

    it('returns null for empty warranty', () => {
      expect(getWarrantyStatus(null, refDate)).toBeNull();
      expect(getWarrantyStatus(undefined, refDate)).toBeNull();
      expect(getWarrantyStatus('', refDate)).toBeNull();
    });

    it('detects active warranty with > 30 days remaining', () => {
      const result = getWarrantyStatus('2026-12-31', refDate);
      expect(result).toBeDefined();
      expect(result!.status).toBe('active');
      expect(result!.daysRemaining).toBeGreaterThan(30);
    });

    it('detects warranty expiring soon (<= 30 days)', () => {
      const result = getWarrantyStatus('2026-09-25', refDate); // 14 days
      expect(result).toBeDefined();
      expect(result!.status).toBe('expiring_soon');
      expect(result!.daysRemaining).toBe(14);
    });

    it('detects expired warranty', () => {
      const result = getWarrantyStatus('2026-01-01', refDate);
      expect(result).toBeDefined();
      expect(result!.status).toBe('expired');
    });
  });

  describe('groupItemsByCategory & calculateItemStats', () => {
    const mockItems: ItemWithDetails[] = [
      {
        id: 1,
        category_id: 10,
        category_name: 'คอมพิวเตอร์',
        name: 'Custom PC',
        status: 'purchased',
        display_price: 50000,
        display_price_satang: 5000000,
        linked_count: 1,
        linked_satang: 5000000,
        priority: 1,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      },
      {
        id: 2,
        category_id: 10,
        category_name: 'คอมพิวเตอร์',
        name: '4K Monitor',
        status: 'purchased',
        display_price: 15000,
        display_price_satang: 1500000,
        linked_count: 0,
        linked_satang: 0,
        priority: 0,
        created_at: '2026-01-02',
        updated_at: '2026-01-02',
      },
      {
        id: 3,
        category_id: 20,
        category_name: 'อุปกรณ์ต่อพ่วง',
        name: 'OLED Steam Deck',
        status: 'planned',
        display_price: 22000,
        display_price_satang: 2200000,
        linked_count: 0,
        linked_satang: 0,
        priority: 3,
        created_at: '2026-01-03',
        updated_at: '2026-01-03',
      },
      {
        id: 4,
        category_id: 20,
        category_name: 'อุปกรณ์ต่อพ่วง',
        name: 'Old Mouse',
        status: 'stored',
        display_price: 1200,
        display_price_satang: 120000,
        linked_count: 0,
        linked_satang: 0,
        priority: 0,
        created_at: '2026-01-04',
        updated_at: '2026-01-04',
      },
      {
        id: 5,
        category_id: 30,
        category_name: 'เฟอร์นิเจอร์',
        name: 'Broken Table',
        status: 'broken',
        display_price: 2500,
        display_price_satang: 250000,
        linked_count: 0,
        linked_satang: 0,
        priority: 0,
        created_at: '2026-01-05',
        updated_at: '2026-01-05',
      },
    ];

    it('groups items properly by category', () => {
      const groups = groupItemsByCategory(mockItems);
      expect(groups.length).toBe(3);
      const pcGroup = groups.find(g => g.categoryName === 'คอมพิวเตอร์');
      expect(pcGroup).toBeDefined();
      expect(pcGroup!.items.length).toBe(2);
      expect(pcGroup!.totalValue).toBe(65000);
    });

    it('computes accurate stats for asset cockpit HUD', () => {
      const stats = calculateItemStats(mockItems);
      expect(stats.activePossessionsValue).toBe(65000); // 50000 + 15000
      expect(stats.wishlistValue).toBe(22000); // 22000
      expect(stats.storedValue).toBe(1200); // 1200
      expect(stats.activeCount).toBe(2);
      expect(stats.plannedCount).toBe(1);
      expect(stats.storedCount).toBe(1);
      expect(stats.archivedCount).toBe(1); // 1 broken
      expect(stats.cancelledCount).toBe(0);
    });
  });
});
