// frontend/src/components/shared/CategoryGlyph.tsx
// Single source of truth for rendering a category/group `icon` value: a curated key or legacy emoji
// renders as a monochrome Lucide icon tinted with the item's own color (Pure Lucide Mandate).
import React from 'react';
import { CATEGORY_ICON_MAP, DEFAULT_CATEGORY_ICON } from '@/constants/categoryIcons';

export interface CategoryGlyphProps {
  icon?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
  /** Legacy fallback emoji or key shown when `icon` is empty */
  fallbackEmoji?: string;
}

/** Comprehensive mapping from legacy unicode emojis to stable Lucide icon keys */
const EMOJI_TO_KEY_MAP: Record<string, string> = {
  // Housing / Living
  '🏠': 'home', '🏢': 'building-2', '🏡': 'home', '🛋️': 'sofa', '🛋': 'sofa',
  // Shopping & Lifestyle
  '🛍️': 'shopping-bag', '🛍': 'shopping-bag', '🛒': 'shopping-cart', '📦': 'package',
  '🏷️': 'tag', '🏷': 'tag', '🎁': 'gift', '👕': 'shirt',
  // Finance & Money
  '💰': 'coins', '💸': 'banknote', '💵': 'banknote', '💳': 'credit-card',
  '🏦': 'landmark', '📈': 'trending-up', '📉': 'trending-down', '🪙': 'coins', '💎': 'diamond',
  // Food & Dining
  '🍽️': 'utensils', '🍽': 'utensils', '🍜': 'utensils', '🍔': 'sandwich', '🍕': 'pizza',
  '☕': 'coffee', '🍺': 'beer', '🍻': 'beer', '🍷': 'wine', '🍿': 'popcorn',
  // Tech & Gadgets
  '💻': 'laptop', '🖥️': 'monitor', '🖥': 'monitor', '📱': 'smartphone', '🎮': 'gamepad-2',
  '🤖': 'bot', '⚡': 'zap', '🌐': 'globe', '📶': 'wifi',
  // Transport
  '🚗': 'car', '🚕': 'car', '🛵': 'bike', '🚲': 'bike', '✈️': 'plane', '✈': 'plane', '⛽': 'fuel',
  // Utilities & Misc
  '✂️': 'scissors', '✂': 'scissors', '🔄': 'repeat', '💧': 'droplet', '🔧': 'wrench',
  '🔨': 'hammer', '📁': 'folder', '📄': 'file-text', '📌': 'pin', '✨': 'sparkles',
  '🎬': 'film', '🎵': 'music-2', '📚': 'book-open', '🎓': 'graduation-cap', '🐶': 'dog',
  '🐱': 'cat', '💊': 'pill', '❤️': 'heart', '❤': 'heart', '🛡️': 'shield-check',
  '🛡': 'shield-check', '🏋️': 'dumbbell', '🏋': 'dumbbell', '💼': 'briefcase',
  '🏖️': 'sun', '🏖': 'sun', '🏆': 'trophy', '🔒': 'lock', '🎯': 'target',
  '📥': 'arrow-down-left',
};

export default function CategoryGlyph({ icon, color, size = 14, className = '', fallbackEmoji }: CategoryGlyphProps) {
  const rawKey = icon?.trim();
  const key = (rawKey && EMOJI_TO_KEY_MAP[rawKey]) || rawKey;
  let Icon = key ? CATEGORY_ICON_MAP[key] : undefined;

  if (!Icon && fallbackEmoji) {
    const rawFallback = fallbackEmoji.trim();
    const mappedFallback = EMOJI_TO_KEY_MAP[rawFallback] || rawFallback;
    Icon = CATEGORY_ICON_MAP[mappedFallback];
  }

  if (Icon) {
    return <Icon size={size} className={className} style={{ color: color || undefined }} aria-hidden="true" />;
  }

  // If there's an alphanumeric text label (not a pictograph/emoji), render it as text
  if (key && !/\p{Extended_Pictographic}/u.test(key)) {
    return <span className={className}>{key}</span>;
  }

  return <DEFAULT_CATEGORY_ICON size={size} className={className} style={{ color: color || undefined }} aria-hidden="true" />;
}
