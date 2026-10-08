// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { Wallet } from 'lucide-react';
import StatCard, { StatCardProps } from '../StatCard';
import '@/test-utils/dom'; // enables React's act() environment

let root: Root;
let host: HTMLDivElement;

const COLOR = { bg: 'bg-test-bg', text: 'text-test-ink', border: 'rgb(1, 2, 3)' };
const render = (over: Partial<StatCardProps> = {}) =>
  act(() => root.render(<StatCard icon={<Wallet data-testid="ic" />} label="รายรับ" value="1,200.00" color={COLOR} {...over} />));

beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); document.body.innerHTML = ''; });

const withClass = (cls: string) => [...host.querySelectorAll(`.${cls}`)];
const trend = () => host.querySelector('.rounded-pill');

describe('StatCard — vitals (default)', () => {
  it('shows the label and the value, both in the text colour', () => {
    render();
    const label = host.querySelector('p')!;
    expect(label.textContent).toBe('รายรับ');
    expect(label.classList.contains('text-test-ink')).toBe(true);
    const value = [...host.querySelectorAll('div')].find(d => d.textContent === '1,200.00' && d.classList.contains('tabular-nums'))!;
    expect(value.classList.contains('text-test-ink')).toBe(true);
  });

  it('draws the icon twice: large and faint in the background, 18px in the badge with the bg colour', () => {
    render();
    const icons = [...host.querySelectorAll('svg')];
    expect(icons.map(i => i.getAttribute('width'))).toEqual(['80', '18']);
    expect(icons[1].parentElement!.classList.contains('bg-test-bg')).toBe(true);
    expect(icons[0].parentElement!.classList.contains('text-test-ink')).toBe(true);
  });

  it('keeps the icon\'s own props apart from the sizes it overrides', () => {
    render();
    expect(host.querySelectorAll('[data-testid="ic"]')).toHaveLength(2);
  });

  it('shows sub value only when given', () => {
    render();
    expect(host.textContent).not.toContain('เทียบเดือนก่อน');
    render({ subValue: 'เทียบเดือนก่อน' });
    const sub = [...host.querySelectorAll('p')].find(p => p.textContent === 'เทียบเดือนก่อน')!;
    expect(sub.classList.contains('text-test-ink')).toBe(true);
    render({ subValue: '' });
    expect(host.querySelectorAll('p')).toHaveLength(1);
    render({ subValue: null });
    expect(host.querySelectorAll('p')).toHaveLength(1);
  });

  it('shows the sub value node (JSX) between the value and the text sub value', () => {
    render({ subValueJSX: <span data-x="jsx">กราฟเล็ก</span>, subValue: 'ข้อความ' });
    const jsx = host.querySelector('[data-x="jsx"]')!;
    expect(jsx).not.toBeNull();
    expect(jsx.nextElementSibling!.textContent).toBe('ข้อความ');
  });

  it('shows the top-right badge only when given', () => {
    render();
    expect(host.querySelector('.top-2.right-2\\.5')).toBeNull();
    render({ topRightBadge: <b>ใหม่</b> });
    expect(host.querySelector('.top-2.right-2\\.5')!.textContent).toBe('ใหม่');
  });

  it('no trend → no pill', () => {
    render();
    expect(trend()).toBeNull();
    render({ trend: null });
    expect(trend()).toBeNull();
  });

  it('a good trend: up arrow, green', () => {
    render({ trend: { value: 12.5, isGood: true } });
    expect(trend()!.textContent).toBe('12.5%');
    expect(trend()!.classList.contains('text-emerald-400')).toBe(true);
    expect(trend()!.classList.contains('text-danger')).toBe(false);
    expect(trend()!.querySelector('svg.lucide-trending-up')).not.toBeNull();
    expect(trend()!.querySelector('svg.lucide-trending-down')).toBeNull();
  });

  it('a bad trend: down arrow, danger', () => {
    render({ trend: { value: 3, isGood: false } });
    expect(trend()!.textContent).toBe('3%');
    expect(trend()!.classList.contains('text-danger')).toBe(true);
    expect(trend()!.classList.contains('text-emerald-400')).toBe(false);
    expect(trend()!.querySelector('svg.lucide-trending-down')).not.toBeNull();
    expect(trend()!.querySelector('svg.lucide-trending-up')).toBeNull();
  });

  it('a zero trend is still shown as 0%', () => {
    render({ trend: { value: 0, isGood: true } });
    expect(trend()!.textContent).toBe('0%');
  });

  it('ignores the compact-only border colour', () => {
    render();
    expect((host.firstElementChild as HTMLElement).style.borderColor).toBe('');
  });
});

describe('StatCard — compact', () => {
  it('is one horizontal row with label, sub value and value', () => {
    render({ variant: 'compact', subValue: 'ต่อวัน' });
    expect([...host.querySelectorAll('p')].map(p => p.textContent)).toEqual(['รายรับ', 'ต่อวัน', '1,200.00']);
    expect(host.querySelectorAll('svg')).toHaveLength(1);
    expect(host.querySelector('svg')!.parentElement!.classList.contains('bg-test-bg')).toBe(true);
  });

  it('no sub value → no second line', () => {
    render({ variant: 'compact' });
    expect([...host.querySelectorAll('p')].map(p => p.textContent)).toEqual(['รายรับ', '1,200.00']);
  });

  it('paints the label, the sub value and the value in the text colour', () => {
    render({ variant: 'compact', subValue: 'ต่อวัน' });
    expect(host.querySelectorAll('p')).toHaveLength(3);
    for (const p of host.querySelectorAll('p')) expect(p.classList.contains('text-test-ink')).toBe(true);
  });

  it('takes its border colour from the card colours when given, otherwise leaves it to the theme', () => {
    render({ variant: 'compact' });
    expect((host.firstElementChild as HTMLElement).style.borderColor).toBe('rgb(1, 2, 3)');
    render({ variant: 'compact', color: { bg: 'b', text: 't' } });
    expect((host.firstElementChild as HTMLElement).style.borderColor).toBe('');
  });

  it('does not draw the trend pill, the badge or the JSX line (they belong to the big card)', () => {
    render({ variant: 'compact', trend: { value: 5, isGood: true }, topRightBadge: <b>ใหม่</b>, subValueJSX: <i>ก</i> });
    expect(trend()).toBeNull();
    expect(host.textContent).not.toContain('ใหม่');
    expect(host.querySelector('i')).toBeNull();
  });

  it('keeps the icon at its own size', () => {
    render({ variant: 'compact' });
    expect(host.querySelector('svg')!.getAttribute('width')).toBe('24'); // lucide default: not resized
  });

  it('the two variants differ in structure', () => {
    render({ variant: 'compact' });
    const compact = host.innerHTML;
    render({ variant: 'vitals' });
    expect(host.innerHTML).not.toBe(compact);
  });
});
