import { describe, it, expect } from 'vitest';
import { parseLooseDate } from '../dateHelpers';

describe('parseLooseDate (CSV import dates)', () => {
  it.each([
    ['2026-10-05', '2026-10-05'],
    ['5/10/2026', '2026-10-05'],
    ['05/10/2026', '2026-10-05'],
    [' 5/10/2026 ', '2026-10-05'],
    ['5/10/2569', '2026-10-05'], // พ.ศ. จาก Excel ภาษาไทย
    ['2569-10-05', '2026-10-05'],
    ['29/2/2024', '2024-02-29'],
  ])('reads %s as %s', (input, expected) => {
    expect(parseLooseDate(input)).toBe(expected);
  });

  it.each(['', '1/2', '5/10/26', '31/2/2026', '2026-02-30', '2026-13-01', 'abc', '2026-1-5', '0/10/2026'])(
    'rejects %j',
    (input) => {
      expect(parseLooseDate(input)).toBeNull();
    },
  );
});
