// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import ColorPicker from '../components/ColorPicker';
import { click, key, type, q } from '@/test-utils/dom';

let root: Root | null = null;
let container: HTMLElement | null = null;
let onChange: ReturnType<typeof vi.fn>;
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
const palette = () => document.querySelector<HTMLElement>('.fixed.z-\\[9999\\]');
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

describe('ColorPicker trigger', () => {
  it('is a small swatch in the current colour, with a label, and nothing is open at first', () => {
    mount('#336699');
    expect(trigger().style.backgroundColor).toBe('rgb(51, 102, 153)');
    expect(trigger().title).toBe('เลือกสี');
    expect(palette()).toBeNull();
  });

  it('opens the palette in <body> (not inside the row) and a second click closes it', () => {
    mount();
    open();
    expect(palette()).not.toBeNull();
    expect(container!.contains(palette())).toBe(false);
    open();
    expect(palette()).toBeNull();
  });
});

describe('ColorPicker placement', () => {
  it('sits just below the swatch, left edges lined up', () => {
    rectOf({ left: 100, right: 120, top: 50, bottom: 70 });
    mount();
    open();
    expect(palette()!.style.top).toBe('74px');
    expect(palette()!.style.left).toBe('100px');
  });

  it('flips to the left when it would run off the right edge (8px margin)', () => {
    rectOf({ left: 800, right: 820, top: 50, bottom: 70 });
    mount();
    open();
    expect(palette()!.style.left).toBe(`${820 - 290}px`);
  });

  it('stays put when it fits exactly inside the margin, flips one pixel later', () => {
    const edge = window.innerWidth - 8 - 290; // 726
    rectOf({ left: edge, right: edge + 20, top: 50, bottom: 70 });
    mount();
    open();
    expect(palette()!.style.left).toBe(`${edge}px`);
    act(() => root!.unmount()); container!.remove(); document.body.innerHTML = '';
    vi.restoreAllMocks();
    rectOf({ left: edge + 1, right: edge + 21, top: 50, bottom: 70 });
    mount();
    open();
    expect(palette()!.style.left).toBe(`${edge + 21 - 290}px`);
  });

  it('flips above the swatch when it would run off the bottom', () => {
    rectOf({ left: 100, right: 120, top: 600, bottom: 620 });
    mount();
    open();
    expect(palette()!.style.top).toBe(`${600 - 290 - 4}px`);
  });

  it('stays below when it fits exactly, flips one pixel later', () => {
    const edge = window.innerHeight - 8 - 290 - 4; // bottom at 466 -> top 470 -> 470+290 = 760
    rectOf({ left: 100, right: 120, top: edge - 20, bottom: edge });
    mount();
    open();
    expect(palette()!.style.top).toBe(`${edge + 4}px`);
    act(() => root!.unmount()); container!.remove(); document.body.innerHTML = '';
    vi.restoreAllMocks();
    rectOf({ left: 100, right: 120, top: edge - 19, bottom: edge + 1 });
    mount();
    open();
    expect(palette()!.style.top).toBe(`${edge - 19 - 290 - 4}px`);
  });
});

describe('ColorPicker spectrum tab', () => {
  it('is the first tab: a 15 x 10 grid of distinct swatches', () => {
    mount();
    open();
    const s = swatches();
    expect(s).toHaveLength(150);
    expect(new Set(s.map(b => b.title)).size).toBe(150);
    expect(s[0].title).toBe('#EAC8C8');
    expect(s[60].title).toBe('#F90606');
    expect(s[67].title).toBe('#06F9F9');
    expect(s[135].title).toBe('#E9EAED'); // the bottom row is greys, light to dark
    expect(s[149].title).toBe('#1C1E22');
    expect(s[14].title).toBe('#D4D7DD'); // the last column is desaturated
  });

  it('every swatch is named for screen readers', () => {
    mount();
    open();
    expect(swatches()[60].getAttribute('aria-label')).toBe('สี #F90606');
  });

  it('picking a swatch reports the colour and closes the palette', () => {
    mount();
    open();
    click(swatches()[60]);
    expect(onChange).toHaveBeenCalledWith('#F90606');
    expect(palette()).toBeNull();
  });

  it('the swatch of the current colour is ringed, whatever the letter case', () => {
    mount('#f90606');
    open();
    const ringed = swatches().filter(b => b.className.includes('ring-1 ring-white z-10'));
    expect(ringed.map(b => b.title)).toEqual(['#F90606']);
  });

  it('no ring when the colour is not in the palette', () => {
    mount('#123456');
    open();
    expect(swatches().some(b => /(^|\s)ring-1 ring-white z-10/.test(b.className))).toBe(false);
  });
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

describe('ColorPicker palettes in full', () => {
  it('the spectrum grid is exactly this, in this order', () => {
    mount();
    open();
    expect(swatches().map(b => b.title)).toEqual(SPECTRUM);
  });

  it('the curated themes are exactly these, three rows of twelve', () => {
    mount();
    open();
    click(tabBtn('ธีมแนะนำ'));
    expect(swatches().map(b => b.title)).toEqual(CURATED);
  });
});

describe('ColorPicker curated tab', () => {
  it('switches to three named groups of twelve', () => {
    mount();
    open();
    click(tabBtn('ธีมแนะนำ'));
    expect(swatches()).toHaveLength(36);
    expect(palette()!.textContent).toContain('WARM & VIBRANT');
    expect(palette()!.textContent).toContain('COOL & TEAL');
    expect(palette()!.textContent).toContain('VIOLET & OBSIDIAN');
    expect(swatches()[0].title).toBe('#DA291C');
  });

  it('picking from it reports the colour and closes', () => {
    mount();
    open();
    click(tabBtn('ธีมแนะนำ'));
    click(swatches().find(b => b.title === '#10B981'));
    expect(onChange).toHaveBeenCalledWith('#10B981');
    expect(palette()).toBeNull();
  });

  it('rings the current colour here too', () => {
    mount('#10b981');
    open();
    click(tabBtn('ธีมแนะนำ'));
    expect(swatches().filter(b => /(^|\s)ring-1 ring-white z-10/.test(b.className)).map(b => b.title)).toEqual(['#10B981']);
  });

  it('can go back to the spectrum', () => {
    mount();
    open();
    click(tabBtn('ธีมแนะนำ'));
    click(tabBtn('แผงสเปกตรัม'));
    expect(swatches()).toHaveLength(150);
  });

  it('the active tab is underlined, the other is not', () => {
    mount();
    open();
    expect(tabBtn('แผงสเปกตรัม').className).toContain('border-accent-ink');
    expect(tabBtn('ธีมแนะนำ').className).toContain('border-transparent');
    click(tabBtn('ธีมแนะนำ'));
    expect(tabBtn('ธีมแนะนำ').className).toContain('border-accent-ink');
    expect(tabBtn('แผงสเปกตรัม').className).toContain('border-transparent');
  });
});

describe('ColorPicker custom colour', () => {
  it('shows the current colour as a preview and in the native colour input', () => {
    mount('#336699');
    open();
    expect(palette()!.querySelector<HTMLElement>('[title="สีปัจจุบัน"]')!.style.backgroundColor).toBe('rgb(51, 102, 153)');
    expect(nativeColor().value).toBe('#336699');
  });

  it('the native colour input reports its value and leaves the palette open', () => {
    mount();
    open();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
    act(() => { setter.call(nativeColor(), '#00ff00'); nativeColor().dispatchEvent(new Event('input', { bubbles: true })); });
    expect(onChange).toHaveBeenCalledWith('#00ff00');
    expect(palette()).not.toBeNull();
  });

  it('the HEX box starts with the current colour', () => {
    mount('#336699');
    open();
    expect(hexBox().value).toBe('#336699');
    expect(hexBox().maxLength).toBe(7);
  });

  it.each([['#AABBCC', '#AABBCC'], ['aabbcc', '#aabbcc'], ['#abcdef', '#abcdef'], ['  #123456  ', '#123456']])('typing %s is accepted as %s', (typed, sent) => {
    mount();
    open();
    type(hexBox(), typed);
    expect(onChange).toHaveBeenCalledWith(sent);
  });

  const leaveHex = () => act(() => { hexBox().focus(); hexBox().blur(); });

  // Other screens append two digits for transparency ("#RRGGBB35"); "#f00" + "35" is not a colour, so a short colour is stored as six digits.
  it.each([['#f00', '#ff0000'], ['0f0', '#00ff00'], ['#AbC', '#AAbbCC']])('a short colour %s is stored as six digits (%s) when you leave the box', (typed, sent) => {
    mount();
    open();
    type(hexBox(), typed);
    expect(onChange).not.toHaveBeenCalled(); // "#ff0" is also the start of "#ff0000": do not guess while typing
    leaveHex();
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(sent);
  });

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

  it('typing a six-digit colour one character at a time reports only the final colour, never the short prefix', () => {
    mount();
    open();
    for (const typed of ['#', '#f', '#ff', '#ff0', '#ff00', '#ff000']) type(hexBox(), typed);
    expect(onChange).not.toHaveBeenCalled();
    type(hexBox(), '#ff0000');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('#ff0000');
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

  it('leaving the box with something that is not a colour reports nothing', () => {
    mount();
    open();
    type(hexBox(), '#12');
    leaveHex();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([['#ab'], ['12345'], ['#GGGGGG'], ['#12345'], ['zzz'], ['']])('typing "%s" is not a colour: nothing is reported, the text stays as typed', (typed) => {
    mount();
    open();
    type(hexBox(), typed);
    expect(onChange).not.toHaveBeenCalled();
    expect(hexBox().value).toBe(typed);
  });

  it('follows the colour when it changes from outside', () => {
    mount('#336699');
    open();
    color = '#AA0000';
    render();
    expect(hexBox().value).toBe('#AA0000');
  });
});

describe('ColorPicker closing', () => {
  it('Esc closes; other keys do not', () => {
    mount();
    open();
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true })); });
    expect(palette()).not.toBeNull();
    act(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    expect(palette()).toBeNull();
  });

  it('a click elsewhere closes it; a click inside the palette or on the swatch does not (the swatch toggles by itself)', () => {
    mount();
    open();
    act(() => { palette()!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(palette()).not.toBeNull();
    act(() => { trigger().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(palette()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(palette()).toBeNull();
  });

  it('scrolling the page more than a few pixels closes it; a small nudge does not', () => {
    setScroll(0, 100);
    mount();
    open();
    setScroll(0, 103);
    scroll();
    expect(palette()).not.toBeNull();
    setScroll(0, 105);
    scroll();
    expect(palette()).toBeNull();
  });

  it('scrolling up counts as much as scrolling down; exactly four pixels is still a nudge', () => {
    setScroll(0, 100);
    mount();
    open();
    setScroll(0, 96);
    scroll();
    expect(palette()).not.toBeNull();
    setScroll(0, 95);
    scroll();
    expect(palette()).toBeNull();
  });

  it('sideways scroll counts too, and scrolling back near the start does not', () => {
    setScroll(50, 0);
    mount();
    open();
    setScroll(53, 0);
    scroll();
    expect(palette()).not.toBeNull();
    setScroll(60, 0);
    scroll();
    expect(palette()).toBeNull();
  });

  it('the scroll position is taken when the palette opens, not when the page loaded', () => {
    setScroll(0, 500);
    mount();
    setScroll(0, 900);
    open();
    setScroll(0, 902);
    scroll();
    expect(palette()).not.toBeNull();
  });

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

  it('a click that closes it does not open it again on the next scroll', () => {
    mount();
    open();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    setScroll(0, 500);
    scroll();
    expect(palette()).toBeNull();
  });

  it('Esc does not stop the key for others: it is a popover, not a modal layer', () => {
    mount();
    open();
    const onWindow = vi.fn();
    window.addEventListener('keydown', onWindow);
    act(() => { document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    window.removeEventListener('keydown', onWindow);
    expect(onWindow).toHaveBeenCalledTimes(1);
  });
});
