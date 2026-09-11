import { describe, it, expect } from 'vitest';
import {
  CATEGORY_ICONS,
  CATEGORY_ICON_MAP,
  DEFAULT_CATEGORY_ICON,
  ICON_CATEGORIES,
} from '../categoryIcons';

describe('categoryIcons', () => {
  it('contains over 200 curated icons', () => {
    expect(CATEGORY_ICONS.length).toBeGreaterThanOrEqual(200);
  });

  it('has unique keys across all icons', () => {
    const keys = CATEGORY_ICONS.map((d) => d.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('ensures all icons have non-empty labels, categories, and valid Lucide Icon components', () => {
    CATEGORY_ICONS.forEach((d) => {
      expect(d.key).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(d.category).toBeTruthy();
      expect(typeof d.Icon).toBe('object');
    });
  });

  it('maps all keys in CATEGORY_ICON_MAP accurately', () => {
    expect(Object.keys(CATEGORY_ICON_MAP).length).toBe(CATEGORY_ICONS.length);
    CATEGORY_ICONS.forEach((d) => {
      expect(CATEGORY_ICON_MAP[d.key]).toBe(d.Icon);
    });
  });

  it('defines valid category tabs in ICON_CATEGORIES with Lucide icons (no emojis)', () => {
    expect(ICON_CATEGORIES.length).toBeGreaterThan(5);
    const categoryIds = ICON_CATEGORIES.map((c) => c.id);
    expect(categoryIds).toContain('all');
    expect(categoryIds).toContain('finance');
    expect(categoryIds).toContain('food');
    expect(categoryIds).toContain('transport');
    expect(categoryIds).toContain('housing');
    expect(categoryIds).toContain('shopping');
    expect(categoryIds).toContain('tech');
    expect(categoryIds).toContain('health');
    expect(categoryIds).toContain('work');
    expect(categoryIds).toContain('family');
    expect(categoryIds).toContain('tools');

    ICON_CATEGORIES.forEach((cat) => {
      expect(cat.Icon).toBeDefined();
      expect(typeof cat.Icon).toBe('object');
      // Ensure no legacy emoji property exists
      expect((cat as any).emoji).toBeUndefined();
    });
  });

  it('has a valid DEFAULT_CATEGORY_ICON fallback', () => {
    expect(DEFAULT_CATEGORY_ICON).toBeDefined();
    expect(typeof DEFAULT_CATEGORY_ICON).toBe('object');
  });
});
