// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import Dropdown from '../Dropdown';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => { document.body.innerHTML = ''; });

// DayDetailModal and BatchAddModal both close themselves on an Esc that reaches `window`. An open Dropdown
// inside them (InvestFields: asset / buy-sell) must swallow the Esc it uses to close its own list, otherwise
// one key press closes the dropdown AND the whole modal.
describe('Dropdown', () => {
  it('Esc closes the open list without letting the key reach window (so a surrounding modal stays open)', () => {
    Element.prototype.scrollIntoView = vi.fn(); // not implemented by jsdom
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(
      <Dropdown value="a" options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} onChange={() => {}} aria-label="สินทรัพย์" />,
    ));

    const windowKey = vi.fn();
    window.addEventListener('keydown', windowKey);

    const trigger = container.querySelector('button') as HTMLButtonElement;
    act(() => trigger.click());
    expect(document.querySelector('[role="listbox"]')).not.toBeNull();

    act(() => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });

    expect(document.querySelector('[role="listbox"]')).toBeNull();
    expect(windowKey).not.toHaveBeenCalled();

    window.removeEventListener('keydown', windowKey);
    act(() => root.unmount());
  });

  it('Esc on a closed Dropdown is left alone (a modal can still close)', () => {
    Element.prototype.scrollIntoView = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => root.render(<Dropdown value="a" options={[{ value: 'a', label: 'A' }]} onChange={() => {}} />));

    const windowKey = vi.fn();
    window.addEventListener('keydown', windowKey);
    const trigger = container.querySelector('button') as HTMLButtonElement;
    act(() => { trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })); });
    expect(windowKey).toHaveBeenCalledTimes(1);

    window.removeEventListener('keydown', windowKey);
    act(() => root.unmount());
  });
});
