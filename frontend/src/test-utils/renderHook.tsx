// Minimal renderHook for jsdom tests (no @testing-library): mounts a real React root, so effects and async state run.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

// Without this React ignores act() and warns that the environment is not a test one.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type Wrapper = React.ComponentType<{ children: React.ReactNode }>;
const Passthrough: Wrapper = ({ children }) => <>{children}</>;

export function renderHook<T>(hook: () => T, wrapper: Wrapper = Passthrough) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const result = { current: undefined as unknown as T };
  const Probe = () => {
    result.current = hook();
    return null;
  };
  const Wrap = wrapper;
  act(() => root.render(<Wrap><Probe /></Wrap>));
  return {
    result,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

/** Let pending promises / timers settle inside act so state updates are applied. */
export const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)); });

export { act };
