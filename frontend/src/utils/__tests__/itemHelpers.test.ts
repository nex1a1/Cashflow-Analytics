import { describe, it, expect } from 'vitest';
import {
  STATUS_CONFIG,
  getWarrantyStatus,
  groupItemsByCategory,
  calculateItemStats,
  getCategoryAccent,
  sortWishlistItems,
  sortInventoryItems,
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
      expect(result!.shortLabel).toContain('คุ้มครอง');
    });

    it('detects warranty expiring soon (<= 30 days)', () => {
      const result = getWarrantyStatus('2026-09-25', refDate); // 14 days
      expect(result).toBeDefined();
      expect(result!.status).toBe('expiring_soon');
      expect(result!.daysRemaining).toBe(14);
      expect(result!.shortLabel).toBe('เหลือ 14 วัน');
    });

    it('detects expired warranty', () => {
      const result = getWarrantyStatus('2026-01-01', refDate);
      expect(result).toBeDefined();
      expect(result!.status).toBe('expired');
      expect(result!.shortLabel).toBe('หมดประกันแล้ว');
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

    it('sorts groups according to custom category order_index', () => {
      const mockCategories = [
        { id: 30, name: 'เฟอร์นิเจอร์', order_index: 0, created_at: '2026-01-01' },
        { id: 20, name: 'อุปกรณ์ต่อพ่วง', order_index: 1, created_at: '2026-01-01' },
        { id: 10, name: 'คอมพิวเตอร์', order_index: 2, created_at: '2026-01-01' },
      ];
      const groups = groupItemsByCategory(mockItems, mockCategories);
      expect(groups.map(g => g.categoryId)).toEqual([30, 20, 10]);
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

  describe('getCategoryAccent', () => {
    it('matches keyword accents accurately', () => {
      const mobile = getCategoryAccent(1, 'มือถือ & อุปกรณ์');
      expect(mobile.border).toBe('border-l-sky-500');

      const pc = getCategoryAccent(2, 'คอมพิวเตอร์');
      expect(pc.border).toBe('border-l-indigo-500');

      const gunpla = getCategoryAccent(3, 'กันพลา / งานอดิเรก');
      expect(gunpla.border).toBe('border-l-emerald-500');

      const furniture = getCategoryAccent(4, 'เฟอร์นิเจอร์ / ของแต่งห้อง');
      expect(furniture.border).toBe('border-l-amber-500');
    });

    it('falls back deterministically on unknown category names', () => {
      const fallback = getCategoryAccent(99, 'หมวดหมู่ทั่วไป');
      expect(fallback).toBeDefined();
      expect(fallback.border).toContain('border-l-');
    });
  });

  describe('sortWishlistItems & sortInventoryItems', () => {
    const mockWishlist: ItemWithDetails[] = [
      { id: 1, category_id: 1, category_name: 'Tech', name: 'Low Priority', status: 'planned', display_price: 1000, display_price_satang: 100000, linked_count: 0, linked_satang: 0, priority: 2, created_at: '2026-01-01', updated_at: '2026-01-01' },
      { id: 2, category_id: 1, category_name: 'Tech', name: 'High Priority', status: 'planned', display_price: 500, display_price_satang: 50000, linked_count: 0, linked_satang: 0, priority: 9, created_at: '2026-01-02', updated_at: '2026-01-02' },
      { id: 3, category_id: 1, category_name: 'Tech', name: 'Mid Priority', status: 'planned', display_price: 8000, display_price_satang: 800000, linked_count: 0, linked_satang: 0, priority: 5, created_at: '2026-01-03', updated_at: '2026-01-03' },
    ];

    it('sorts wishlist by priority_desc accurately', () => {
      const sorted = sortWishlistItems(mockWishlist, 'priority_desc');
      expect(sorted.map(i => i.id)).toEqual([2, 3, 1]); // 9 -> 5 -> 2
    });

    it('sorts wishlist by price_desc and price_asc accurately', () => {
      const desc = sortWishlistItems(mockWishlist, 'price_desc');
      expect(desc.map(i => i.id)).toEqual([3, 1, 2]); // 8000 -> 1000 -> 500

      const asc = sortWishlistItems(mockWishlist, 'price_asc');
      expect(asc.map(i => i.id)).toEqual([2, 1, 3]); // 500 -> 1000 -> 8000
    });

    const mockInventory: ItemWithDetails[] = [
      { id: 10, category_id: 1, category_name: 'Tech', name: 'Older Buy', status: 'purchased', display_price: 1000, display_price_satang: 100000, linked_count: 0, linked_satang: 0, priority: 0, purchased_at: '2025-01-01', warranty_until: '2027-01-01', created_at: '2025-01-01', updated_at: '2025-01-01' },
      { id: 20, category_id: 1, category_name: 'Tech', name: 'Newer Buy', status: 'purchased', display_price: 30000, display_price_satang: 3000000, linked_count: 0, linked_satang: 0, priority: 0, purchased_at: '2026-05-01', warranty_until: '2026-08-01', created_at: '2026-05-01', updated_at: '2026-05-01' },
    ];

    it('sorts inventory by purchased_desc accurately', () => {
      const sorted = sortInventoryItems(mockInventory, 'purchased_desc');
      expect(sorted.map(i => i.id)).toEqual([20, 10]); // 2026-05-01 -> 2025-01-01
    });

    it('sorts inventory by warranty_asc (soonest expiry first)', () => {
      const sorted = sortInventoryItems(mockInventory, 'warranty_asc');
      expect(sorted.map(i => i.id)).toEqual([20, 10]); // 2026-08-01 -> 2027-01-01
    });
  });
});

