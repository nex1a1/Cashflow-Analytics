// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import DayTypesCard, { DayTypesCardProps } from '../components/DayTypesCard';
import { click, type } from '@/test-utils/dom';
import { dayType } from './fixtures';

let root: Root | null = null;
let container: HTMLElement | null = null;
let props: DayTypesCardProps;
const mount = (dayTypeConfig = [dayType('work', { label: 'วันทำงาน', isDefault: true }), dayType('off', { label: 'วันหยุด', isDefault: true }), dayType('ot', { label: 'โอที' })]) => {
  props = { dayTypeConfig, handleAddDayType: vi.fn(), handleMoveDayType: vi.fn(), handleDayTypeConfigChange: vi.fn(async () => true), handleDeleteDayType: vi.fn() };
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<DayTypesCard {...props} />));
};
const inputs = () => [...container!.querySelectorAll<HTMLInputElement>('input[type="text"]')];
const btn = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
const locks = () => container!.querySelectorAll('span[title="ลบไม่ได้ (ต้องมีอย่างน้อย 2)"]');
const deletes = () => container!.querySelectorAll('button[aria-label^="ลบประเภทวัน"]');

beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  vi.useRealTimers();
});

describe('DayTypesCard ordering', () => {
  it('up/down send the id and direction', () => {
    mount();
    click(btn('เลื่อน วันหยุด ขึ้น'));
    click(btn('เลื่อน วันหยุด ลง'));
    expect((props.handleMoveDayType as AnyMock).mock.calls).toEqual([['off', 'UP'], ['off', 'DOWN']]);
  });

});

describe('DayTypesCard editing', () => {
  it('a typed label is saved after the pause with the id and field', async () => {
    mount();
    type(inputs()[2], 'โอทีวันหยุด');
    await act(async () => { vi.advanceTimersByTime(400); });
    expect(props.handleDayTypeConfigChange).toHaveBeenCalledWith('ot', 'label', 'โอทีวันหยุด');
  });

  it('a blank label is refused with a message', async () => {
    mount();
    type(inputs()[0], '');
    await act(async () => { vi.advanceTimersByTime(1000); });
    expect(container!.textContent).toContain('ต้องมีชื่อประเภทวัน');
    expect(props.handleDayTypeConfigChange).not.toHaveBeenCalled();
  });

});

describe('DayTypesCard delete', () => {

  it('deleting takes two clicks and sends the id', () => {
    mount();
    click(btn('ลบประเภทวัน: โอที'));
    expect(props.handleDeleteDayType).not.toHaveBeenCalled();
    click(container!.querySelector('button[aria-label="กดอีกครั้งเพื่อยืนยันลบ: โอที"]'));
    expect(props.handleDeleteDayType).toHaveBeenCalledWith('ot');
  });

});
