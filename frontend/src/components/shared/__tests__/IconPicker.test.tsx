// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import IconPicker, { IconPickerProps } from '../IconPicker';
import { CATEGORY_ICONS, ICON_CATEGORIES } from '@/constants/categoryIcons';
import { tc } from '@/constants/theme';
import { click, type, q, byText } from '@/test-utils/dom';

// jsdom has no layout: the trigger's rectangle is stubbed, the viewport is jsdom's 1024 x 768.
type Rect = { left: number; top: number; width: number; height: number };
let rect: Rect;
let root: Root;
let host: HTMLDivElement;
let onChange: ReturnType<typeof vi.fn>;
let windowKey: ReturnType<typeof vi.fn>;

const render = (p: Partial<IconPickerProps> = {}) =>
  act(() => root.render(<IconPicker icon={null} onChange={onChange} {...p} />));

const setScroll = (x: number, y: number) => {
  Object.defineProperty(window, 'scrollX', { value: x, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: y, configurable: true });
};

beforeEach(() => {
  rect = { left: 100, top: 20, width: 32, height: 32 };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    ...rect, right: rect.left + rect.width, bottom: rect.top + rect.height, x: rect.left, y: rect.top, toJSON: () => ({}),
  }));
  setScroll(0, 0);
  onChange = vi.fn();
  windowKey = vi.fn();
  window.addEventListener('keydown', windowKey);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  window.removeEventListener('keydown', windowKey);
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const trigger = () => q<HTMLButtonElement>('button[aria-label="เลือกไอคอน"]')!;
const palette = () => q<HTMLElement>('div.fixed');
const search = () => q<HTMLInputElement>('input[type="text"]')!;
const grid = () => q<HTMLElement>('.grid-cols-12');
const cells = () => [...document.querySelectorAll<HTMLButtonElement>('.grid-cols-12 > button')];
const cell = (key: string) => cells().find(c => c.title === CATEGORY_ICONS.find(i => i.key === key)!.label)!;
const open = () => click(trigger());
const pill = (label: string) => byText('.overflow-x-auto button', label) as HTMLButtonElement;
const pressKey = (k: string, target: Element = document.body) => {
  const e = new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  act(() => { target.dispatchEvent(e); });
  return e;
};
const shown = () => cells().map(c => c.title);
const labelsOf = (pred: (i: (typeof CATEGORY_ICONS)[number]) => boolean) => CATEGORY_ICONS.filter(pred).map(i => i.label);
const infoBar = () => q('.min-h-\\[28px\\]')!;
const countText = () => document.body.textContent!;

describe('IconPicker — trigger', () => {
  it('is a button named เลือกไอคอน, closed at first', () => {
    render();
    expect(trigger().title).toBe('เลือกไอคอน');
    expect(trigger().type).toBe('button');
    expect(palette()).toBeNull();
  });

  it('shows the current icon in the given colour', () => {
    render({ icon: 'coffee', color: '#ff0000' });
    const svg = trigger().querySelector('svg')!;
    expect(svg.classList.contains('lucide-coffee')).toBe(true);
    expect(svg.style.color).toBe('rgb(255, 0, 0)');
  });

  it('shows a placeholder glyph when no icon is chosen', () => {
    render({ icon: null });
    expect(trigger().querySelector('svg')).not.toBeNull();
    expect(trigger().querySelector('svg')!.classList.contains('lucide-coffee')).toBe(false);
  });
});

describe('IconPicker — opening', () => {
  it('opens a palette in the page body; clicking the trigger again closes it', () => {
    render();
    open();
    expect(palette()!.parentElement).toBe(document.body);
    open();
    expect(palette()).toBeNull();
  });

  it('lists every icon, with its count twice (search bar and info bar)', () => {
    render();
    open();
    expect(cells()).toHaveLength(CATEGORY_ICONS.length);
    expect(countText()).toContain(`${CATEGORY_ICONS.length} ไอคอน`);
    expect(countText()).toContain(`${CATEGORY_ICONS.length} / ${CATEGORY_ICONS.length}`);
  });

  it('every category has a pill, "ทั้งหมด" first and lit', () => {
    render();
    open();
    const pills = [...document.querySelectorAll<HTMLButtonElement>('.overflow-x-auto button')];
    expect(pills.map(p => p.textContent)).toEqual(ICON_CATEGORIES.map(c => c.label));
    expect(pills[0].classList.contains('bg-neutral-100')).toBe(true);
    expect(pills.slice(1).every(p => !p.classList.contains('bg-neutral-100'))).toBe(true);
  });

  it('focuses the search box after a short delay, not before', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render();
    open();
    act(() => { vi.advanceTimersByTime(49); });
    expect(document.activeElement).not.toBe(search());
    act(() => { vi.advanceTimersByTime(1); });
    expect(document.activeElement).toBe(search());
  });

  it('closing before the delay is over focuses nothing', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    render();
    open();
    open();
    act(() => { vi.advanceTimersByTime(100); });
    expect(palette()).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });
});

describe('IconPicker — where the palette appears', () => {
  const at = () => ({ top: palette()!.style.top, left: palette()!.style.left });

  it('under the trigger, aligned to its left edge', () => {
    rect = { left: 100, top: 20, width: 32, height: 32 };
    render();
    open();
    expect(at()).toEqual({ top: '56px', left: '100px' });
  });

  it('pulled back inside the viewport on the right (580px wide)', () => {
    rect = { left: 900, top: 20, width: 32, height: 32 };
    render();
    open();
    expect(at().left).toBe(`${1024 - 580 - 16}px`);
  });

  it('kept 16px from the left edge', () => {
    rect = { left: 0, top: 20, width: 32, height: 32 };
    render();
    open();
    expect(at().left).toBe('16px');
  });

  it('flips above the trigger when it would run off the bottom (510px tall)', () => {
    rect = { left: 100, top: 600, width: 32, height: 32 };
    render();
    open();
    expect(at().top).toBe(`${600 - 510 - 4}px`);
  });

  it('never goes above 16px from the top, even after flipping', () => {
    rect = { left: 100, top: 300, width: 32, height: 32 };
    render();
    open();
    expect(at().top).toBe('16px');
  });

  it('keeps 16px from the right edge: a trigger 8px short of fitting is pulled back', () => {
    rect = { left: 1024 - 580 - 8, top: 20, width: 32, height: 32 }; // 436 + 580 = 1016 > 1008
    render();
    open();
    expect(at().left).toBe(`${1024 - 580 - 16}px`);
  });

  it('keeps 16px from the bottom edge: a palette 8px short of fitting flips above', () => {
    rect = { left: 100, top: 214, width: 32, height: 32 }; // top would be 250: 250 + 510 = 760 > 752
    render();
    open();
    expect(at().top).toBe('16px'); // flipped (214 - 514 < 16 → clamped), not left at 250
  });

  it('a trigger high up gets the palette right below it', () => {
    rect = { left: 100, top: 200, width: 32, height: 32 };
    render();
    open();
    expect(at().top).toBe('236px'); // 232 + 4: 236 + 510 = 746 ≤ 752
  });
});

describe('IconPicker — choosing', () => {
  it('a click on an icon reports its key and closes the palette', () => {
    render();
    open();
    click(cell('car'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('car');
    expect(palette()).toBeNull();
  });

  it('the chosen icon is ringed, the others are not', () => {
    render({ icon: 'car' });
    open();
    expect(cell('car').classList.contains('ring-accent-ink')).toBe(true);
    expect(cell('home').classList.contains('ring-accent-ink')).toBe(false);
  });

  it('the chosen icon is drawn in the given colour, the others keep the default', () => {
    render({ icon: 'car', color: '#00ff00' });
    open();
    expect(cell('car').querySelector('svg')!.style.color).toBe('rgb(0, 255, 0)');
    expect(cell('home').querySelector('svg')!.style.color).toBe('');
  });

  it('with no colour given the chosen icon uses the display ink', () => {
    render({ icon: 'car' });
    open();
    const probe = document.createElement('div');
    probe.style.color = tc('ink-display');
    expect(cell('car').querySelector('svg')!.style.color).toBe(probe.style.color);
  });

  it('ปิด closes without changing anything', () => {
    render({ icon: 'car' });
    open();
    click(byText('button', 'ปิด'));
    expect(palette()).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('ล้างไอคอน clears the icon (empty key) and closes — and only exists when there is an icon', () => {
    render({ icon: null });
    open();
    expect(byText('button', 'ล้างไอคอน')).toBeNull();
    open();
    render({ icon: 'car' });
    open();
    click(byText('button', 'ล้างไอคอน'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('');
    expect(palette()).toBeNull();
  });
});

describe('IconPicker — info bar and footer', () => {
  it('with nothing chosen and nothing hovered it explains itself', () => {
    render();
    open();
    expect(infoBar().textContent).toContain('เลื่อนเมาส์ชี้บนไอคอนเพื่อดูชื่อ หรือคลิกเพื่อเลือก');
    expect(palette()!.textContent).toContain('ยังไม่ได้เลือกไอคอน');
    expect(palette()!.textContent).toContain('คลิกเลือกไอคอนจากตารางด้านบน');
  });

  it('with an icon chosen it says which', () => {
    render({ icon: 'coffee' });
    open();
    expect(infoBar().textContent).toContain('เลือกอยู่:');
    expect(infoBar().textContent).toContain('กาแฟ / คาเฟ่');
    expect(infoBar().textContent).toContain('(coffee)');
    expect(palette()!.textContent).toContain('key: coffee');
    expect(palette()!.textContent).not.toContain('ยังไม่ได้เลือกไอคอน');
  });

  it('an icon key the list does not know is shown as the raw key, as the footer\'s title and in its key line', () => {
    render({ icon: 'old-emoji-key' });
    open();
    expect(infoBar().textContent).not.toContain('เลือกอยู่:');
    const footer = palette()!.querySelector('.border-t')!;
    expect(footer.querySelector('.text-neutral-200')!.textContent).toBe('old-emoji-key');
    expect(footer.querySelector('.font-mono')!.textContent).toBe('key: old-emoji-key');
  });

  it('a known icon is titled by its Thai name in the footer', () => {
    render({ icon: 'coffee' });
    open();
    expect(palette()!.querySelector('.border-t .text-neutral-200')!.textContent).toBe('กาแฟ / คาเฟ่');
  });

  it('the chosen icon in the info bar wears the given colour, or the display ink', () => {
    render({ icon: 'coffee', color: '#ff0000' });
    open();
    expect((infoBar().querySelector('svg') as SVGElement).style.color).toBe('rgb(255, 0, 0)');
    open();
    render({ icon: 'coffee', color: null });
    open();
    const probe = document.createElement('div');
    probe.style.color = tc('ink-display');
    expect((infoBar().querySelector('svg') as SVGElement).style.color).toBe(probe.style.color);
  });

  it('follows a new icon while it is open', () => {
    render({ icon: 'coffee' });
    open();
    render({ icon: 'car' });
    expect(infoBar().textContent).toContain('รถยนต์ส่วนตัว');
    expect(infoBar().textContent).not.toContain('กาแฟ');
  });

  it('a hover that was on when the palette closed does not come back when it reopens', () => {
    render();
    open();
    act(() => { cell('car').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(infoBar().textContent).toContain('(car)');
    open();
    open();
    expect(infoBar().textContent).toContain('เลื่อนเมาส์ชี้บนไอคอนเพื่อดูชื่อ');
  });

  it('hovering an icon shows its name and key; leaving brings the previous text back', () => {
    render({ icon: 'coffee' });
    open();
    act(() => { cell('car').dispatchEvent(new MouseEvent('mouseover', { bubbles: true })); });
    expect(infoBar().textContent).toContain('รถยนต์ส่วนตัว');
    expect(infoBar().textContent).toContain('(car)');
    expect(infoBar().textContent).not.toContain('เลือกอยู่:');
    act(() => { cell('car').dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })); });
    expect(infoBar().textContent).toContain('เลือกอยู่:');
  });

  it('the footer shows the current icon big, with a title', () => {
    render({ icon: 'coffee' });
    open();
    const big = q('[title="ไอคอนปัจจุบัน"]')!;
    expect(big.querySelector('svg')!.classList.contains('lucide-coffee')).toBe(true);
  });
});

describe('IconPicker — search and categories', () => {
  it('typing narrows the list and updates both counts', () => {
    render();
    open();
    type(search(), 'coffee');
    const want = labelsOf(i => `${i.label} ${i.key} ${i.keywords}`.toLowerCase().includes('coffee'));
    expect(want.length).toBeGreaterThan(0);
    expect(want.length).toBeLessThan(CATEGORY_ICONS.length);
    expect(shown()).toEqual(want);
    expect(countText()).toContain(`${want.length} ไอคอน`);
    expect(countText()).toContain(`${want.length} / ${CATEGORY_ICONS.length}`);
  });

  it('matches the Thai name, the key and the keywords, ignoring case and surrounding spaces', () => {
    render();
    open();
    type(search(), '  กาแฟ ');
    expect(shown()).toContain('กาแฟ / คาเฟ่');
    type(search(), 'COFFEE');
    expect(shown()).toContain('กาแฟ / คาเฟ่');
    type(search(), 'car'); // by key
    expect(shown()).toContain('รถยนต์ส่วนตัว');
    type(search(), 'ขับรถ'); // by keywords only (not in label or key)
    expect(shown()).toContain('รถยนต์ส่วนตัว');
  });

  it('the box shows what was typed', () => {
    render();
    open();
    type(search(), 'coffee');
    expect(search().value).toBe('coffee');
  });

  it('finds an icon by each of its three texts on its own: Thai name, key, keywords', () => {
    render();
    open();
    const norm = (s: string) => s.toLowerCase();
    // a word of the name that appears in neither the key nor the keywords
    const byLabel = CATEGORY_ICONS.map(i => ({ i, w: i.label.split(/[\s/]+/).find(w => w.length >= 2 && !norm(i.key).includes(norm(w)) && !norm(i.keywords).includes(norm(w))) })).find(x => x.w);
    // the key, when neither name nor keywords contain it
    const byKey = CATEGORY_ICONS.find(i => !norm(i.label).includes(norm(i.key)) && !norm(i.keywords).includes(norm(i.key)));
    // a keyword that is in neither the name nor the key
    const byKeyword = CATEGORY_ICONS.map(i => ({ i, w: i.keywords.split(/\s+/).find(w => w.length >= 3 && !norm(i.label).includes(norm(w)) && !norm(i.key).includes(norm(w))) })).find(x => x.w);
    expect(byLabel, 'some icon has a name-only word').toBeTruthy();
    expect(byKeyword, 'some icon has a keyword-only word').toBeTruthy();
    type(search(), byLabel!.w!);
    expect(shown()).toContain(byLabel!.i.label);
    type(search(), byKeyword!.w!);
    expect(shown()).toContain(byKeyword!.i.label);
    if (byKey) { type(search(), byKey.key); expect(shown()).toContain(byKey.label); }
  });

  it('spaces alone do not filter', () => {
    render();
    open();
    type(search(), '   ');
    expect(cells()).toHaveLength(CATEGORY_ICONS.length);
  });

  it('a category pill filters by that category and lights up', () => {
    render();
    open();
    click(pill('อาหาร/ดื่ม'));
    expect(shown()).toEqual(labelsOf(i => i.category === 'food'));
    expect(pill('อาหาร/ดื่ม').classList.contains('bg-neutral-100')).toBe(true);
    expect(pill('ทั้งหมด').classList.contains('bg-neutral-100')).toBe(false);
  });

  it('search inside a category keeps to the category', () => {
    render();
    open();
    click(pill('อาหาร/ดื่ม'));
    type(search(), 'coffee');
    expect(shown()).toEqual(labelsOf(i => i.category === 'food' && `${i.label} ${i.key} ${i.keywords}`.toLowerCase().includes('coffee')));
  });

  it('a term found in several categories is cut down to the chosen one', () => {
    render();
    open();
    type(search(), 'e'); // most English keys have an "e"
    const all = labelsOf(i => `${i.label} ${i.key} ${i.keywords}`.toLowerCase().includes('e'));
    const inFood = labelsOf(i => i.category === 'food' && `${i.label} ${i.key} ${i.keywords}`.toLowerCase().includes('e'));
    expect(inFood.length).toBeGreaterThan(0);
    expect(inFood.length).toBeLessThan(all.length);
    expect(shown()).toEqual(all);
    click(pill('อาหาร/ดื่ม'));
    expect(shown()).toEqual(inFood);
  });

  it('when nothing in the chosen category matches, the matches from every category are shown instead', () => {
    render();
    open();
    click(pill('เดินทาง'));
    type(search(), 'coffee');
    expect(shown()).toEqual(labelsOf(i => `${i.label} ${i.key} ${i.keywords}`.toLowerCase().includes('coffee')));
    expect(shown()).toContain('กาแฟ / คาเฟ่');
  });

  it('no match at all: says so with the term, offers "ดูไอคอนทั้งหมด", and that resets search and category', () => {
    render();
    open();
    click(pill('อาหาร/ดื่ม'));
    type(search(), 'zzzzqq');
    expect(grid()).toBeNull();
    expect(palette()!.textContent).toContain('ไม่พบไอคอนที่ค้นหา "zzzzqq"');
    expect(countText()).toContain('0 ไอคอน');
    click(byText('button', 'ดูไอคอนทั้งหมด'));
    expect(search().value).toBe('');
    expect(cells()).toHaveLength(CATEGORY_ICONS.length);
    expect(pill('ทั้งหมด').classList.contains('bg-neutral-100')).toBe(true);
  });

  it('a ✕ in the search box appears only while there is text, and clears it', () => {
    render();
    open();
    expect(q('button[title="ล้างคำค้นหา"]')).toBeNull();
    type(search(), 'car');
    click(q('button[title="ล้างคำค้นหา"]'));
    expect(search().value).toBe('');
    expect(q('button[title="ล้างคำค้นหา"]')).toBeNull();
    expect(cells()).toHaveLength(CATEGORY_ICONS.length);
  });

  it('closing forgets the search, the category and the hover', () => {
    render();
    open();
    click(pill('อาหาร/ดื่ม'));
    type(search(), 'coffee');
    open(); // close
    open();
    expect(search().value).toBe('');
    expect(pill('ทั้งหมด').classList.contains('bg-neutral-100')).toBe(true);
    expect(cells()).toHaveLength(CATEGORY_ICONS.length);
  });
});

describe('IconPicker — closing', () => {
  it('a mousedown outside closes it; inside the trigger or the palette does not', () => {
    render();
    open();
    act(() => { trigger().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    act(() => { search().dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(palette()).not.toBeNull();
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(palette()).toBeNull();
  });

  it('Esc closes only the palette: a surrounding modal that listens on window never sees the key', () => {
    render();
    open();
    pressKey('Escape');
    expect(palette()).toBeNull();
    expect(windowKey).not.toHaveBeenCalled();
  });

  it('other keys leave it open and pass through', () => {
    render();
    open();
    pressKey('a');
    pressKey('Enter');
    expect(palette()).not.toBeNull();
    expect(windowKey).toHaveBeenCalledTimes(2);
  });

  it('Esc on a closed picker is left alone', () => {
    render();
    pressKey('Escape');
    expect(windowKey).toHaveBeenCalledTimes(1);
  });

  it('scrolling the page by 5px or more closes it', () => {
    render();
    open();
    setScroll(0, 5);
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(palette()).toBeNull();
  });

  it('a small page scroll (under 5px), or a scroll inside the palette, does not', () => {
    render();
    open();
    setScroll(0, 4);
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(palette()).not.toBeNull();
    act(() => { grid()!.dispatchEvent(new Event('scroll')); });
    expect(palette()).not.toBeNull();
  });

  it('a sideways page scroll counts too', () => {
    render();
    open();
    setScroll(7, 0);
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(palette()).toBeNull();
  });

  it('measures the scroll from where the page was when the palette opened', () => {
    setScroll(0, 300);
    render();
    open();
    setScroll(0, 302);
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(palette()).not.toBeNull();
    setScroll(0, 320);
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(palette()).toBeNull();
  });

  it('removes every document / window listener it added (the same handler serves all three, so check type by type)', () => {
    const spies = [document, window].map(t => ({ add: vi.spyOn(t, 'addEventListener'), rem: vi.spyOn(t, 'removeEventListener') }));
    const types = ['mousedown', 'keydown', 'scroll'];
    render();
    open();
    open();
    const pick = (k: 'add' | 'rem') => spies.flatMap(s => s[k].mock.calls.filter(c => types.includes(c[0])).map(c => c[0] as string)).sort();
    expect(pick('add')).toEqual(['keydown', 'mousedown', 'scroll']);
    expect(pick('rem')).toEqual(['keydown', 'mousedown', 'scroll']);
  });

  it('a scroll event with the page where it was when the palette opened does not close it, even if the page was already scrolled sideways', () => {
    setScroll(120, 300);
    render();
    open();
    act(() => { document.body.dispatchEvent(new Event('scroll')); });
    expect(palette()).not.toBeNull();
  });

  it('listens to nothing while closed', () => {
    const spies = [document, window].map(t => vi.spyOn(t, 'addEventListener'));
    render();
    expect(spies.flatMap(s => s.mock.calls.filter(c => ['mousedown', 'keydown', 'scroll'].includes(c[0])))).toHaveLength(0);
  });
});
