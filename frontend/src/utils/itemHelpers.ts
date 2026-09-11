import { ItemCategory, ItemStatus, ItemWithDetails } from '../types';

export interface StatusBadgeInfo {
  label: string;
  className: string;
}

export const STATUS_CONFIG: Record<ItemStatus, StatusBadgeInfo> = {
  planned: {
    label: 'วางแผน (Wishlist)',
    className: 'text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  purchased: {
    label: 'ใช้งานอยู่',
    className: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  stored: {
    label: 'เก็บเข้ากรุ / สำรอง',
    className: 'text-sky-400 border-sky-500/40 bg-sky-500/10',
  },
  broken: {
    label: 'พัง / ชำรุด',
    className: 'text-[#da291c] border-[#da291c]/50 bg-red-950/20',
  },
  sold: {
    label: 'ขายแล้ว',
    className: 'text-purple-400 border-purple-500/40 bg-purple-500/10',
  },
  cancelled: {
    label: 'ยกเลิก',
    className: 'text-neutral-400 border-neutral-600 bg-neutral-800/40',
  },
};

export interface WarrantyStatus {
  status: 'active' | 'expiring_soon' | 'expired';
  label: string;
  shortLabel: string;
  daysRemaining?: number;
  className: string;
}

/**
 * Calculates warranty badge status and remaining days.
 */
export function getWarrantyStatus(warrantyUntil?: string | null, referenceDate = new Date()): WarrantyStatus | null {
  if (!warrantyUntil) return null;

  const target = new Date(warrantyUntil);
  if (isNaN(target.getTime())) return null;

  // Set reference to start of day
  const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const expiry = new Date(target.getFullYear(), target.getMonth(), target.getDate());

  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `หมดประกันแล้ว (${warrantyUntil})`,
      shortLabel: 'หมดประกันแล้ว',
      className: 'text-neutral-500 border-neutral-700 bg-neutral-800/30',
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'expiring_soon',
      label: `ประกันเหลือ ${diffDays} วัน (${warrantyUntil})`,
      shortLabel: diffDays === 0 ? 'หมดประกันวันนี้' : `เหลือ ${diffDays} วัน`,
      daysRemaining: diffDays,
      className: 'text-amber-400 border-amber-500/50 bg-amber-950/20 animate-pulse',
    };
  }

  return {
    status: 'active',
    label: `ประกันถึง ${warrantyUntil}`,
    shortLabel: diffDays >= 365 ? `คุ้มครองอีก ${Math.round((diffDays / 365) * 10) / 10} ปี` : `คุ้มครองอีก ${diffDays} วัน`,
    daysRemaining: diffDays,
    className: 'text-teal-400 border-teal-500/30 bg-teal-950/20',
  };
}

export interface CategoryItemGroup {
  categoryId: number;
  categoryName: string;
  items: ItemWithDetails[];
  totalValue: number;
}

/**
 * Groups items by category and preserves ordering according to categories order_index if provided.
 */
export function groupItemsByCategory(
  items: ItemWithDetails[],
  categories?: ItemCategory[]
): CategoryItemGroup[] {
  const map = new Map<number, CategoryItemGroup>();

  for (const item of items) {
    if (!map.has(item.category_id)) {
      map.set(item.category_id, {
        categoryId: item.category_id,
        categoryName: item.category_name,
        items: [],
        totalValue: 0,
      });
    }
    const group = map.get(item.category_id)!;
    group.items.push(item);
    group.totalValue += item.display_price;
  }

  const groups = Array.from(map.values());

  if (categories && categories.length > 0) {
    const orderMap = new Map<number, number>();
    categories.forEach((cat, idx) => {
      orderMap.set(cat.id, cat.order_index ?? idx);
    });

    return groups.sort((a, b) => {
      const orderA = orderMap.has(a.categoryId) ? orderMap.get(a.categoryId)! : 9999;
      const orderB = orderMap.has(b.categoryId) ? orderMap.get(b.categoryId)! : 9999;
      if (orderA !== orderB) return orderA - orderB;
      return a.categoryName.localeCompare(b.categoryName, 'th');
    });
  }

  return groups.sort((a, b) => a.categoryName.localeCompare(b.categoryName, 'th'));
}

export interface ItemAnalyticsStats {
  activePossessionsValue: number;
  wishlistValue: number;
  storedValue: number;
  activeCount: number;
  plannedCount: number;
  storedCount: number;
  archivedCount: number; // broken or sold
  cancelledCount: number;
}

/**
 * Calculates high-level summary KPIs for the Cockpit HUD.
 */
export function calculateItemStats(items: ItemWithDetails[]): ItemAnalyticsStats {
  let activePossessionsValue = 0;
  let wishlistValue = 0;
  let storedValue = 0;
  let activeCount = 0;
  let plannedCount = 0;
  let storedCount = 0;
  let archivedCount = 0;
  let cancelledCount = 0;

  for (const item of items) {
    switch (item.status) {
      case 'purchased':
        activePossessionsValue += item.display_price;
        activeCount++;
        break;
      case 'planned':
        wishlistValue += item.display_price;
        plannedCount++;
        break;
      case 'stored':
        storedValue += item.display_price;
        storedCount++;
        break;
      case 'broken':
      case 'sold':
        archivedCount++;
        break;
      case 'cancelled':
        cancelledCount++;
        break;
    }
  }

  return {
    activePossessionsValue,
    wishlistValue,
    storedValue,
    activeCount,
    plannedCount,
    storedCount,
    archivedCount,
    cancelledCount,
  };
}
