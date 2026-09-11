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
    className: 'text-neutral-300 border-neutral-500/40 bg-neutral-500/10',
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

export interface CategoryAccent {
  border: string;
  text: string;
  pill: string;
  dot: string;
}

const CATEGORY_ACCENT_PALETTE: CategoryAccent[] = [
  { border: 'border-l-sky-500', text: 'text-sky-400', pill: 'bg-sky-950/40 text-sky-300 border-sky-500/40', dot: 'bg-sky-400' },
  { border: 'border-l-indigo-500', text: 'text-indigo-400', pill: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/40', dot: 'bg-indigo-400' },
  { border: 'border-l-emerald-500', text: 'text-emerald-400', pill: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40', dot: 'bg-emerald-400' },
  { border: 'border-l-amber-500', text: 'text-amber-400', pill: 'bg-amber-950/40 text-amber-300 border-amber-500/40', dot: 'bg-amber-400' },
  { border: 'border-l-rose-500', text: 'text-rose-400', pill: 'bg-rose-950/40 text-rose-300 border-rose-500/40', dot: 'bg-rose-400' },
  { border: 'border-l-teal-500', text: 'text-teal-400', pill: 'bg-teal-950/40 text-teal-300 border-teal-500/40', dot: 'bg-teal-400' },
  { border: 'border-l-purple-500', text: 'text-purple-400', pill: 'bg-purple-950/40 text-purple-300 border-purple-500/40', dot: 'bg-purple-400' },
  { border: 'border-l-orange-500', text: 'text-orange-400', pill: 'bg-orange-950/40 text-orange-300 border-orange-500/40', dot: 'bg-orange-400' },
];

/**
 * Returns a curated distinct color accent for category group headers.
 * Uses smart keyword matching with fallback to deterministic hashing.
 */
export function getCategoryAccent(categoryId: number, categoryName = ''): CategoryAccent {
  const lower = categoryName.toLowerCase();
  if (/มือถือ|โทรศัพท์|สมาร์ทโฟน|อุปกรณ์/i.test(lower)) return CATEGORY_ACCENT_PALETTE[0]; // Sky Blue
  if (/คอม|ไอที|ฮาร์ดแวร์|tech/i.test(lower)) return CATEGORY_ACCENT_PALETTE[1]; // Indigo
  if (/กันพลา|อดิเรก|ของสะสม|เกม|โมเดล|hobby/i.test(lower)) return CATEGORY_ACCENT_PALETTE[2]; // Emerald
  if (/เฟอร์นิเจอร์|โต๊ะ|ของแต่ง|ห้อง|บ้าน/i.test(lower)) return CATEGORY_ACCENT_PALETTE[3]; // Amber
  if (/เครื่องแต่งกาย|เสื้อ|แฟชั่น|รองเท้า|นาฬิกา|apparel/i.test(lower)) return CATEGORY_ACCENT_PALETTE[4]; // Rose
  if (/เครื่องเสียง|หูฟัง|กล้อง|เลนส์|audio/i.test(lower)) return CATEGORY_ACCENT_PALETTE[5]; // Teal
  if (/หนังสือ|พัฒนา|ยานพาหนะ|รถ/i.test(lower)) return CATEGORY_ACCENT_PALETTE[7]; // Orange

  const idx = Math.abs(categoryId) % CATEGORY_ACCENT_PALETTE.length;
  return CATEGORY_ACCENT_PALETTE[idx];
}

export type WishlistSortOption = 'priority_desc' | 'price_desc' | 'price_asc' | 'date_desc';
export type InventorySortOption = 'purchased_desc' | 'price_desc' | 'price_asc' | 'warranty_asc' | 'date_desc';

export interface SortOption<T extends string = string> {
  value: T;
  label: string;
}

export const WISHLIST_SORT_OPTIONS: SortOption<WishlistSortOption>[] = [
  { value: 'priority_desc', label: 'ความสำคัญ (มาก → น้อย)' },
  { value: 'price_desc', label: 'ราคาประเมิน (มาก → น้อย)' },
  { value: 'price_asc', label: 'ราคาประเมิน (น้อย → มาก)' },
  { value: 'date_desc', label: 'บันทึกล่าสุด (ใหม่สุด)' },
];

export const INVENTORY_SORT_OPTIONS: SortOption<InventorySortOption>[] = [
  { value: 'purchased_desc', label: 'วันที่ซื้อ (ล่าสุด → เก่าสุด)' },
  { value: 'price_desc', label: 'มูลค่า (มาก → น้อย)' },
  { value: 'price_asc', label: 'มูลค่า (น้อย → มาก)' },
  { value: 'warranty_asc', label: 'ประกัน (ใกล้หมดก่อน)' },
  { value: 'date_desc', label: 'บันทึกล่าสุด (ใหม่สุด)' },
];

/**
 * Sorts wishlist items based on chosen sorting criteria.
 */
export function sortWishlistItems(items: ItemWithDetails[], sortBy: WishlistSortOption): ItemWithDetails[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'priority_desc':
      return sorted.sort((a, b) => {
        const pA = a.priority ?? 0;
        const pB = b.priority ?? 0;
        if (pB !== pA) return pB - pA;
        return b.display_price - a.display_price;
      });
    case 'price_desc':
      return sorted.sort((a, b) => b.display_price - a.display_price);
    case 'price_asc':
      return sorted.sort((a, b) => a.display_price - b.display_price);
    case 'date_desc':
      return sorted.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    default:
      return sorted;
  }
}

/**
 * Sorts inventory items based on chosen sorting criteria.
 */
export function sortInventoryItems(items: ItemWithDetails[], sortBy: InventorySortOption): ItemWithDetails[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'purchased_desc':
      return sorted.sort((a, b) => {
        const dateA = a.purchased_at || '0000-00-00';
        const dateB = b.purchased_at || '0000-00-00';
        if (dateB !== dateA) return dateB.localeCompare(dateA);
        return b.display_price - a.display_price;
      });
    case 'price_desc':
      return sorted.sort((a, b) => b.display_price - a.display_price);
    case 'price_asc':
      return sorted.sort((a, b) => a.display_price - b.display_price);
    case 'warranty_asc':
      return sorted.sort((a, b) => {
        if (a.warranty_until && !b.warranty_until) return -1;
        if (!a.warranty_until && b.warranty_until) return 1;
        if (a.warranty_until && b.warranty_until) return a.warranty_until.localeCompare(b.warranty_until);
        return (b.purchased_at || '').localeCompare(a.purchased_at || '');
      });
    case 'date_desc':
      return sorted.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    default:
      return sorted;
  }
}


