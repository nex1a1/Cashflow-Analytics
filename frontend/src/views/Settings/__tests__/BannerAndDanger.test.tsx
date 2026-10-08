// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import OrphanWarningBanner from '../components/OrphanWarningBanner';
import DangerZone from '../components/DangerZone';
import { click, key } from '@/test-utils/dom';
import { cat, grp } from './fixtures';

let root: Root | null = null;
let container: HTMLElement | null = null;
const mountEl = (el: React.ReactElement) => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
};
const text = () => container!.textContent ?? '';

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  vi.useRealTimers();
});

describe('OrphanWarningBanner', () => {
  it('says nothing when every category still has its group', () => {
    mountEl(<OrphanWarningBanner categories={[cat('c1', { cashflowGroup: 'g1' })]} cashflowGroups={[grp('g1')]} />);
    expect(container!.innerHTML).toBe('');
  });

  it('a category with no group at all is not an orphan (it never had one)', () => {
    mountEl(<OrphanWarningBanner categories={[cat('c1', { cashflowGroup: null }), cat('c2', { cashflowGroup: undefined })]} cashflowGroups={[]} />);
    expect(container!.innerHTML).toBe('');
  });

  it('lists the categories whose group was deleted, with a count and what to do', () => {
    mountEl(<OrphanWarningBanner
      categories={[cat('c1', { name: 'ค่ากาแฟ', cashflowGroup: 'gone' }), cat('c2', { name: 'ค่ารถ', cashflowGroup: 'g1' }), cat('c3', { name: 'ค่าเน็ต', cashflowGroup: 'gone2' })]}
      cashflowGroups={[grp('g1')]}
    />);
    expect(text()).toContain('มีหมวดหมู่ที่กลุ่มถูกลบไปแล้ว');
    expect(container!.querySelector('.font-mono')!.textContent).toBe('2');
    expect(text()).toContain('ค่ากาแฟ,');
    expect(text()).toContain('ค่าเน็ต');
    expect(text()).not.toContain('ค่าเน็ต,'); // no comma after the last one
    expect(text()).not.toContain('ค่ารถ');
    expect(text()).toContain('กรุณากำหนดกลุ่มใหม่ให้หมวดหมู่เหล่านี้');
  });

  it('each listed category shows its own icon', () => {
    mountEl(<OrphanWarningBanner categories={[cat('c1', { cashflowGroup: 'gone', icon: 'coffee' }), cat('c2', { cashflowGroup: 'gone', icon: 'car' })]} cashflowGroups={[]} />);
    expect(container!.querySelectorAll('svg.lucide-coffee, svg.lucide-car').length).toBe(2);
  });

  it('is a warning-coloured box', () => {
    mountEl(<OrphanWarningBanner categories={[cat('c1', { cashflowGroup: 'gone' })]} cashflowGroups={[]} />);
    expect((container!.firstElementChild as HTMLElement).className).toContain('text-warn');
  });

  it('updates when the groups change', () => {
    const categories = [cat('c1', { cashflowGroup: 'g9' })];
    mountEl(<OrphanWarningBanner categories={categories} cashflowGroups={[]} />);
    expect(text()).toContain('มีหมวดหมู่');
    act(() => root!.render(<OrphanWarningBanner categories={categories} cashflowGroups={[grp('g9')]} />));
    expect(container!.innerHTML).toBe('');
  });
});

describe('DangerZone', () => {
  const resetBtn = () => [...container!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'ล้างข้อมูลทั้งหมด' || b.textContent === 'กดอีกครั้งเพื่อยืนยัน')!;

  it('explains what a reset deletes and that it cannot be undone', () => {
    mountEl(<DangerZone handleDeleteAllData={() => {}} />);
    expect(container!.querySelector('h2')!.textContent).toBe('โซนอันตราย');
    expect(text()).toContain('รีเซ็ตระบบเป็นค่าเริ่มต้น');
    expect(text()).toContain('รายการทั้งหมดในระบบ');
    expect(text()).toContain('ประวัติปฏิทิน');
    expect(text()).toContain('รีเซ็ตการตั้งค่า');
    expect(text()).toContain('ไม่สามารถกู้คืนได้');
  });

  it('one click only arms the button; nothing is deleted', () => {
    const del = vi.fn();
    mountEl(<DangerZone handleDeleteAllData={del} />);
    click(resetBtn());
    expect(del).not.toHaveBeenCalled();
    expect(resetBtn().textContent).toBe('กดอีกครั้งเพื่อยืนยัน');
  });

  it('the second click deletes, once, with no arguments', () => {
    const del = vi.fn();
    mountEl(<DangerZone handleDeleteAllData={del} />);
    click(resetBtn());
    click(resetBtn());
    expect(del).toHaveBeenCalledTimes(1);
    expect(del.mock.calls[0]).toEqual([]);
  });

  it('waiting 3 seconds disarms it', () => {
    const del = vi.fn();
    mountEl(<DangerZone handleDeleteAllData={del} />);
    click(resetBtn());
    act(() => { vi.advanceTimersByTime(3100); });
    expect(resetBtn().textContent).toBe('ล้างข้อมูลทั้งหมด');
    click(resetBtn());
    expect(del).not.toHaveBeenCalled();
  });

  it('Esc disarms it', () => {
    const del = vi.fn();
    mountEl(<DangerZone handleDeleteAllData={del} />);
    click(resetBtn());
    key(document.body, 'Escape');
    expect(resetBtn().textContent).toBe('ล้างข้อมูลทั้งหมด');
  });
});
