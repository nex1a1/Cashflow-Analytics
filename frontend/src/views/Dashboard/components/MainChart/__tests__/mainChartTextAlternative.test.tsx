import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MainChartTextAlternative } from '../MainChartTextAlternative';

describe('MainChartTextAlternative', () => {
  it('lists Sankey flows as from / to / amount rows', () => {
    const html = renderToStaticMarkup(
      <MainChartTextAlternative
        caption="โครงสร้างกระแสเงินสด"
        isSankey
        data={{ datasets: [{ data: [{ from: 'เงินเดือน', to: 'เงินสดรวม', flow: 25180 }] }] }}
      />,
    );
    expect(html).toContain('<caption>โครงสร้างกระแสเงินสด</caption>');
    expect(html).toContain('<td>เงินเดือน</td><td>เงินสดรวม</td><td>฿25,180.00</td>');
  });

  it('skips hidden and all-zero series, one row per label', () => {
    const html = renderToStaticMarkup(
      <MainChartTextAlternative
        caption="รายจ่ายรายวัน"
        isSankey={false}
        data={{
          labels: ['1', '2'],
          datasets: [
            { label: 'Expense', data: [100, 250] },
            { label: 'Hidden', hidden: true, data: [9, 9] },
            { label: 'Zero', data: [0, 0] },
          ],
        }}
      />,
    );
    expect(html).toContain('<th scope="col">Expense</th>');
    expect(html).not.toContain('Hidden');
    expect(html).not.toContain('Zero');
    expect(html).toContain('<th scope="row">2</th><td>฿250.00</td>');
  });

  it('renders nothing when there is no data', () => {
    expect(renderToStaticMarkup(<MainChartTextAlternative caption="x" isSankey={false} data={null} />)).toBe('');
  });
});
