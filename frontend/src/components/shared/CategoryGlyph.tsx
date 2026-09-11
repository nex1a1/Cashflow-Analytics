// frontend/src/components/shared/CategoryGlyph.tsx
// Single source of truth for rendering a category/group `icon` value: a curated key renders as
// a monochrome Lucide icon tinted with the item's own color; anything else (legacy emoji, a
// custom character someone typed) renders as-is, exactly like the old `{icon || fallback}` code.
import React from 'react';
import { CATEGORY_ICON_MAP, DEFAULT_CATEGORY_ICON } from '@/constants/categoryIcons';

export interface CategoryGlyphProps {
  icon?: string | null;
  color?: string | null;
  size?: number;
  className?: string;
  /** Emoji shown when `icon` is empty — pass the same default the call site used to use (e.g. '📦'). */
  fallbackEmoji?: string;
}

export default function CategoryGlyph({ icon, color, size = 14, className = '', fallbackEmoji }: CategoryGlyphProps) {
  const key = icon?.trim();
  const Icon = key ? CATEGORY_ICON_MAP[key] : undefined;

  if (Icon) {
    return <Icon size={size} className={className} style={{ color: color || undefined }} aria-hidden="true" />;
  }

  if (key) {
    return <span className={className}>{key}</span>;
  }

  if (fallbackEmoji) {
    return <span className={className}>{fallbackEmoji}</span>;
  }

  return <DEFAULT_CATEGORY_ICON size={size} className={className} style={{ color: color || undefined }} aria-hidden="true" />;
}
