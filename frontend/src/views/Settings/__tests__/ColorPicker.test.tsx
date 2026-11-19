// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ColorPicker from '../components/ColorPicker';
import { click, key, type, q } from '@/test-utils/dom';

let root: Root | null = null;
let container: HTMLElement | null = null;
let onChange: AnyMock;
let color = '#336699';
const render = () => act(() => root!.render(<ColorPicker color={color} onChange={onChange as never} />));
const mount = (c = '#336699') => {
  color = c;
  onChange = vi.fn();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  render();
};
const trigger = () => container!.querySelector<HTMLButtonElement>('button[aria-label="เลือกสี"]')!;
const palette = () => document.querySelector<HTMLElement>('.fixed.z-9999');
const open = () => click(trigger());
const swatches = () => [...palette()!.querySelectorAll<HTMLButtonElement>('button[aria-label^="สี "]')];
const tabBtn = (label: string) => [...palette()!.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label)!;
const hexBox = () => q<HTMLInputElement>('input[aria-label="รหัสสี HEX"]')!;
const nativeColor = () => q<HTMLInputElement>('input[type="color"]')!;

const rectOf = (r: Partial<DOMRect>) => vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, right: 20, top: 0, bottom: 20, width: 20, height: 20, x: 0, y: 0, toJSON: () => ({}), ...r } as DOMRect);
const setScroll = (x: number, y: number) => {
  Object.defineProperty(window, 'scrollX', { value: x, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
};
const scroll = () => act(() => { window.dispatchEvent(new Event('scroll')); });

beforeEach(() => { setScroll(0, 0); });
afterEach(() => {
  if (root) act(() => root!.unmount());
  container?.remove();
  root = null; container = null;
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

// The palette is a design decision: a 15 x 10 grid, hue left to right, lightness top to bottom, greys last. Pinned in full.
const SPECTRUM = [
  '#EAC8C8', '#EAD6C8', '#EAE5C8', '#E0EAC8', '#D1EAC8', '#C8EACD', '#C8EADB', '#C8EAEA', '#C8DBEA', '#C8CDEA', '#D1C8EA', '#E0C8EA', '#EAC8E5', '#EAC8D6', '#D4D7DD',
  '#EBA2A2', '#EBC2A2', '#EBE0A2', '#D7EBA2', '#B7EBA2', '#A2EBAD', '#A2EBCC', '#A2EBEB', '#A2CCEB', '#A2ADEB', '#B7A2EB', '#D7A2EB', '#EBA2E0', '#EBA2C2', '#C0C5CE',
  '#F07575', '#F0AA75', '#F0DD75', '#CDF075', '#98F075', '#75F088', '#75F0BB', '#75F0F0', '#75BBF0', '#7588F0', '#9875F0', '#CD75F0', '#F075DD', '#F075AA', '#A9AFBC',
  '#F53D3D', '#F58D3D', '#F5D93D', '#C1F53D', '#71F53D', '#3DF559', '#3DF5A5', '#3DF5F5', '#3DA5F5', '#3D59F5', '#713DF5', '#C13DF5', '#F53DD9', '#F53D8D', '#8D95A5',
  '#F90606', '#F96F06', '#F9D406', '#B4F906', '#4BF906', '#06F92B', '#06F990', '#06F9F9', '#0690F9', '#062BF9', '#4B06F9', '#B406F9', '#F906D4', '#F9066F', '#707A8F',
  '#C61010', '#C65F10', '#C6AB10', '#93C610', '#44C610', '#10C62B', '#10C677', '#10C6C6', '#1077C6', '#102BC6', '#4410C6', '#9310C6', '#C610AB', '#C6105F', '#5E6778',
  '#981616', '#984E16', '#988416', '#739816', '#3B9816', '#169829', '#16985F', '#169898', '#165F98', '#162998', '#3B1698', '#731698', '#981684', '#98164E', '#4C5361',
  '#691616', '#693A16', '#695D16', '#526916', '#2E6916', '#166923', '#166945', '#166969', '#164569', '#162369', '#2E1669', '#521669', '#69165D', '#69163A', '#383D47',
  '#3F1212', '#3F2612', '#3F3912', '#333F12', '#1F3F12', '#123F19', '#123F2C', '#123F3F', '#122C3F', '#12193F', '#1F123F', '#33123F', '#3F1239', '#3F1226', '#24272E',
  '#E9EAED', '#D8DADF', '#CACDD3', '#B9BDC6', '#A8ADB8', '#979EAA', '#89909F', '#788191', '#6A7181', '#5E6573', '#505662', '#434751', '#353941', '#292C32', '#1C1E22',
];
const CURATED = [
  '#DA291C', '#FF4D4D', '#FF7675', '#FF9F43', '#F0932B', '#E17055', '#D63031', '#AE0E0E', '#FD79A8', '#E84393', '#F39C12', '#F1C40F',
  '#10B981', '#2ECC71', '#27AE60', '#1ABC9C', '#16A085', '#7BED9F', '#3B82F6', '#3498DB', '#0984E3', '#74B9FF', '#00CEC9', '#54A0FF',
  '#8B5CF6', '#9B59B6', '#8E44AD', '#A29BFE', '#E056FD', '#6C5CE7', '#94A3B8', '#64748B', '#475569', '#334155', '#1E293B', '#0F172A',
];

describe('ColorPicker custom colour', () => {

  const leaveHex = () => act(() => { hexBox().focus(); hexBox().blur(); });

  // Other screens append two digits for transparency ("#RRGGBB35"); "#f00" + "35" is not a colour, so a short colour is stored as six digits.

  it('other keys in the box do not store a short colour', () => {
    mount();
    open();
    type(hexBox(), '#0af');
    key(hexBox(), 'a');
    key(hexBox(), 'Tab');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Enter stores a short colour too', () => {
    mount();
    open();
    type(hexBox(), '#0af');
    key(hexBox(), 'Enter');
    expect(onChange).toHaveBeenCalledWith('#00aaff');
  });

  it('leaving the box right after a six-digit colour was stored does not store it again', () => {
    mount();
    open();
    type(hexBox(), '#ff0000');
    color = '#ff0000'; // the parent took it
    render();
    leaveHex();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

});

describe('ColorPicker closing', () => {

  it('listens only while open: nothing is attached once it is closed', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const remove = vi.spyOn(document, 'removeEventListener');
    const wRemove = vi.spyOn(window, 'removeEventListener');
    mount();
    expect(add.mock.calls.filter(c => c[0] === 'mousedown' || c[0] === 'keydown')).toHaveLength(0);
    open();
    expect(add.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['mousedown', 'keydown']));
    open();
    expect(remove.mock.calls.map(c => c[0])).toEqual(expect.arrayContaining(['mousedown', 'keydown']));
    expect(wRemove.mock.calls.map(c => c[0])).toContain('scroll');
  });

});
