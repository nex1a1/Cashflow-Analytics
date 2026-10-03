import React from 'react';
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

describe('CalendarDayCell day note', () => {
  it('draws nothing for a day without a note', () => {
    expect(render()).not.toContain('lucide-briefcase');
  });

  it('shows the picked icon and the text right after the day number', () => {
    const html = render('เริ่มงานวันแรก');
    expect(html).toContain('lucide-briefcase');
    expect(html).toContain('เริ่มงานวันแรก');
  });

  // overflow:hidden on a tight line box (leading-none + Bai Jamjuree size-adjust) cuts the stacked vowel /
  // tone marks of Thai text (measured: 4px of "เริ่ม" lost). Same rule as `.truncate` in index.css:
  // clip horizontally only so marks may overflow vertically.
  it('clips the note horizontally only, so Thai vowels and tone marks are not cut', () => {
    const wrapper = /<span class="([^"]*)" title="เริ่มงานวันแรก">/.exec(render('เริ่มงานวันแรก'));
    expect(wrapper).not.toBeNull();
    const classes = wrapper![1].split(' ');
    expect(classes).toContain('overflow-x-clip');
    expect(classes).not.toContain('overflow-hidden');
  });
});
