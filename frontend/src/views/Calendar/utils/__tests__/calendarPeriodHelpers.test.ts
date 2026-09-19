import { describe, it, expect } from 'vitest';
import { resolveDefaultDayTypeId, THAI_MONTHS, DAY_OF_WEEK_LABELS } from '../calendarPeriodHelpers';
import { DayType } from '../../../../types';

describe('Calendar Period Helpers', () => {
  const mockDayTypeConfig: DayType[] = [
    { id: 'dt-work', name: 'workday', label: 'ทำงาน', color: '#10B981', order_index: 1 },
    { id: 'dt-holiday', name: 'holiday', label: 'วันหยุด', color: '#EF4444', order_index: 2 },
    { id: 'dt-sick', name: 'sick_leave', label: 'ลาป่วย', color: '#F59E0B', order_index: 3 },
  ];

  it('resolves workday id for weekday when name is present', () => {
    const result = resolveDefaultDayTypeId(mockDayTypeConfig, false);
    expect(result).toBe('dt-work');
  });

  it('resolves holiday id for weekend when name is present', () => {
    const result = resolveDefaultDayTypeId(mockDayTypeConfig, true);
    expect(result).toBe('dt-holiday');
  });

  it('falls back to index 0 for weekday if workday name is missing', () => {
    const configWithoutNames: DayType[] = [
      { id: 'custom-1', label: 'ทำงาน', color: '#10B981' },
      { id: 'custom-2', label: 'วันหยุด', color: '#EF4444' },
    ];
    const result = resolveDefaultDayTypeId(configWithoutNames, false);
    expect(result).toBe('custom-1');
  });

  it('falls back to index 1 for weekend if holiday name is missing', () => {
    const configWithoutNames: DayType[] = [
      { id: 'custom-1', label: 'ทำงาน', color: '#10B981' },
      { id: 'custom-2', label: 'วันหยุด', color: '#EF4444' },
    ];
    const result = resolveDefaultDayTypeId(configWithoutNames, true);
    expect(result).toBe('custom-2');
  });

  it('provides all 12 Thai months', () => {
    expect(THAI_MONTHS.length).toBe(12);
    expect(THAI_MONTHS[0]).toBe('มกราคม');
    expect(THAI_MONTHS[11]).toBe('ธันวาคม');
  });

  it('provides 7 day of week labels starting Sunday', () => {
    expect(DAY_OF_WEEK_LABELS.length).toBe(7);
    expect(DAY_OF_WEEK_LABELS[0]).toBe('อา.');
    expect(DAY_OF_WEEK_LABELS[6]).toBe('ส.');
  });
});
