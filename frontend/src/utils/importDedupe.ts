interface Comparable {
  date: string;
  category: string;
  description?: string | null;
  amount: number;
}

const keyOf = (r: Comparable) => `${r.date}|${r.category}|${(r.description ?? '').trim()}|${Math.round(r.amount * 100)}`;

/**
 * Drops CSV rows that are already stored (same date, category, description and amount in satang).
 * Matching is by count, so two identical lunches in the file against one stored row import one of them.
 */
export function splitImportDuplicates<T extends Comparable>(items: T[], existing: Comparable[]): { fresh: T[]; skipped: number } {
  const stored = new Map<string, number>();
  for (const e of existing) stored.set(keyOf(e), (stored.get(keyOf(e)) ?? 0) + 1);

  const fresh: T[] = [];
  let skipped = 0;
  for (const item of items) {
    const key = keyOf(item);
    const left = stored.get(key) ?? 0;
    if (left > 0) {
      stored.set(key, left - 1);
      skipped++;
    } else {
      fresh.push(item);
    }
  }
  return { fresh, skipped };
}
