// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import ImportPreviewModal from '../ImportPreviewModal';

// Without this React ignores act() and warns that the environment is not a test one.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const preview = {
  items: [{ id: '1', date: '2026-10-03', category: 'อาหาร', description: 'x', amount: 10, dayNote: '' }],
  updatedCategories: [],
  isConfigChanged: false,
  isCategoryChanged: false,
  newDayTypes: {},
};

// MainLayout mounts the modal permanently and importPreview stays null until a CSV is parsed, so the
// render that shows the dialog must call exactly the same hooks as the empty render before it. A hook
// below `if (!importPreview) return null` makes React throw "Rendered more hooks than during the
// previous render" and, with no error boundary, unmounts the whole app. renderToStaticMarkup renders
// once and cannot catch that, so this needs a real client root and a re-render.
describe('ImportPreviewModal', () => {
  it('shows the dialog when a preview arrives after the empty first render', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const show = (importPreview: typeof preview | null) =>
      act(() =>
        root.render(
          <ImportPreviewModal
            importPreview={importPreview}
            setImportPreview={() => {}}
            confirmImport={() => {}}
            categories={[]}
          />,
        ),
      );

    show(null);
    expect(container.innerHTML).toBe('');

    expect(() => show(preview)).not.toThrow();
    expect(container.querySelector('[role="dialog"][aria-label="ตรวจสอบข้อมูลก่อนนำเข้า"]')).not.toBeNull();

    act(() => root.unmount());
    container.remove();
  });
});
