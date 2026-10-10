// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AllocationSelect, { AllocationSelectProps } from '../AllocationSelect';
import { click } from '@/test-utils/dom';

let root: Root;
let onChange: ReturnType<typeof vi.fn>;
let parentClick: ReturnType<typeof vi.fn>;

const render = (p: Partial<AllocationSelectProps> = {}) =>
  act(() => root.render(<div onClick={parentClick}><AllocationSelect onChange={onChange} {...p} /></div>));
const radios = () => [...document.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
const press = (el: Element, key: string) => act(() => { el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });

beforeEach(() => {
  onChange = vi.fn();
  parentClick = vi.fn();
  const host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); document.body.innerHTML = ''; });

describe('AllocationSelect — segmented NEED / WANT', () => {
  it('shows both options, no SAVE, and marks the current one', () => {
    render({ value: 'need' });
    expect(radios().map(r => r.textContent)).toEqual(['NEED', 'WANT']);
    expect(radios().map(r => r.getAttribute('aria-checked'))).toEqual(['true', 'false']);
  });

  it('anything but need (null, savings) reads as WANT', () => {
    render({ value: null });
    expect(radios()[1].getAttribute('aria-checked')).toBe('true');
    render({ value: 'savings' });
    expect(radios()[1].getAttribute('aria-checked')).toBe('true');
  });

  it('one click switches; clicking the current one does nothing; the row click does not bubble', () => {
    render({ value: 'want' });
    click(radios()[0]);
    expect(onChange).toHaveBeenCalledWith('need');
    click(radios()[1]);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('arrow keys flip the value; only the checked option is tabbable', () => {
    render({ value: 'want' });
    expect(radios().map(r => r.tabIndex)).toEqual([-1, 0]);
    press(radios()[1], 'ArrowLeft');
    expect(onChange).toHaveBeenCalledWith('need');
  });

  it('disabled blocks clicks', () => {
    render({ value: 'want', disabled: true });
    click(radios()[0]);
    expect(onChange).not.toHaveBeenCalled();
  });
});
