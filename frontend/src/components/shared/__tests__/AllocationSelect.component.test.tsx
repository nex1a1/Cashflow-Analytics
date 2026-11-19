// @vitest-environment jsdom
import type { Mock } from 'vitest';
type AnyMock = Mock<(...args: any[]) => any>;
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import AllocationSelect, { AllocationSelectProps } from '../AllocationSelect';
import { click } from '@/test-utils/dom';

let root: Root;
let onChange: AnyMock;
let parentClick: AnyMock;

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

});
