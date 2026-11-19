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

  it('the second click deletes, once, with no arguments', () => {
    const del = vi.fn();
    mountEl(<DangerZone handleDeleteAllData={del} />);
    click(resetBtn());
    click(resetBtn());
    expect(del).toHaveBeenCalledTimes(1);
    expect(del.mock.calls[0]).toEqual([]);
  });

});
