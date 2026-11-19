import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import CalendarDayCell from '../CalendarDayCell';

const render = (note?: string) =>
  renderToStaticMarkup(
    <CalendarDayCell
      day={9}
      dateStr="2025-06-09"
      isToday={false}
      isWeekend={false}
      dayTypeConfig={[{ id: 'work', name: 'workday', label: 'ทำงาน', color: '#3B82F6' }]}
      dayType="work"
      note={note}
      noteIcon="briefcase"
      handleDayTypeChange={() => {}}
      onSelectDate={() => {}}
    />,
  );

describe('CalendarDayCell negative amounts', () => {
  const sell = { id: 's1', description: 'ขายทอง', category: 'ออมทอง', amount: -200, group_type: 'savings' } as never;
  const html = renderToStaticMarkup(
    <CalendarDayCell
      day={9}
      dateStr="2025-06-09"
      isToday={false}
      isWeekend={false}
      dayTypeConfig={[{ id: 'work', name: 'workday', label: 'ทำงาน', color: '#3B82F6' }]}
      dayType="work"
      data={{ exp: 0, inc: 0, items: [sell], incItems: [] }}
      handleDayTypeChange={() => {}}
      onSelectDate={() => {}}
    />,
  );

  it('a savings sell reads −฿200.00 in its tooltip, never ฿-200.00', () => {
    expect(html).toContain('title="ขายทอง — −฿200.00"');
    expect(html).not.toContain('฿-');
  });

});
