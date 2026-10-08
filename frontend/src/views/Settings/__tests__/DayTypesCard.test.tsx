// @vitest-environment jsdom
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

describe('DayTypesCard', () => {
  it('title, count and an add button', () => {
    mount();
    expect(container!.querySelector('h2')!.textContent).toContain('ประเภทวันบนปฏิทิน');
    expect(container!.querySelector('h2 span')!.textContent).toBe('3');
    click([...container!.querySelectorAll('button')].find(b => b.textContent!.includes('เพิ่ม')));
    expect(props.handleAddDayType).toHaveBeenCalledTimes(1);
  });

  it('shows the types in the order given', () => {
    mount();
    expect(inputs().map(i => i.value)).toEqual(['วันทำงาน', 'วันหยุด', 'โอที']);
  });

  it('no types: an empty list, count 0', () => {
    mount([]);
    expect(inputs()).toHaveLength(0);
    expect(container!.querySelector('h2 span')!.textContent).toBe('0');
  });
});

describe('DayTypesCard ordering', () => {
  it('up/down send the id and direction', () => {
    mount();
    click(btn('เลื่อน วันหยุด ขึ้น'));
    click(btn('เลื่อน วันหยุด ลง'));
    expect((props.handleMoveDayType as ReturnType<typeof vi.fn>).mock.calls).toEqual([['off', 'UP'], ['off', 'DOWN']]);
  });

  it('the first cannot go up and the last cannot go down', () => {
    mount();
    expect(btn('เลื่อน วันทำงาน ขึ้น').disabled).toBe(true);
    expect(btn('เลื่อน วันทำงาน ลง').disabled).toBe(false);
    expect(btn('เลื่อน โอที ขึ้น').disabled).toBe(false);
    expect(btn('เลื่อน โอที ลง').disabled).toBe(true);
    expect(btn('เลื่อน วันหยุด ขึ้น').disabled).toBe(false);
    expect(btn('เลื่อน วันหยุด ลง').disabled).toBe(false);
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

  it('a colour pick is reported with its field; a missing colour shows the neutral swatch', () => {
    mount([dayType('a', { color: null }), dayType('b'), dayType('c')]);
    expect(container!.querySelector<HTMLButtonElement>('button[aria-label="เลือกสี"]')!.style.backgroundColor).toBe('rgb(100, 116, 139)');
    click(container!.querySelector('button[aria-label="เลือกสี"]'));
    click(document.querySelector('button[aria-label="สี #F90606"]'));
    expect(props.handleDayTypeConfigChange).toHaveBeenCalledWith('a', 'color', '#F90606');
  });
});

describe('DayTypesCard delete', () => {
  it('default types are locked; a custom one can be deleted when more than two exist', () => {
    mount();
    expect(locks()).toHaveLength(2);
    expect(deletes()).toHaveLength(1);
    expect(btn('ลบประเภทวัน: โอที')).not.toBeNull();
  });

  it('deleting takes two clicks and sends the id', () => {
    mount();
    click(btn('ลบประเภทวัน: โอที'));
    expect(props.handleDeleteDayType).not.toHaveBeenCalled();
    click(container!.querySelector('button[aria-label="กดอีกครั้งเพื่อยืนยันลบ: โอที"]'));
    expect(props.handleDeleteDayType).toHaveBeenCalledWith('ot');
  });

  it('with only two types left, both are locked even if neither is a default', () => {
    mount([dayType('a'), dayType('b')]);
    expect(locks()).toHaveLength(2);
    expect(deletes()).toHaveLength(0);
  });

  it('with three custom types all three can be deleted (two is the floor, three is not)', () => {
    mount([dayType('a'), dayType('b'), dayType('c')]);
    expect(locks()).toHaveLength(0);
    expect(deletes()).toHaveLength(3);
  });

  it('a lone type is locked too', () => {
    mount([dayType('a')]);
    expect(locks()).toHaveLength(1);
  });
});
