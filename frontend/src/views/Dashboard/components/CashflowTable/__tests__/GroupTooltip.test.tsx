// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { GroupTooltip } from '../GroupTooltip';
import type { HoveredGroupState } from '../types';
import type { CashflowGroup, Category } from '@/types';
import '@/test-utils/dom';

const group = (over: Partial<CashflowGroup> = {}): CashflowGroup =>
  ({ id: 'g', name: 'ค่ากิน', type: 'expense', allocation_type: 'need', order_index: 1, color: '#336699', ...over });
const cat = (id: string, name: string, color?: string): Category => ({ id, name, cashflow_group_id: 'g', color } as Category);

let root: Root | null = null;
const show = (state: HoveredGroupState | null) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<GroupTooltip hoveredGroup={state} />));
};
const tip = () => document.querySelector<HTMLElement>('body > .fixed.pointer-events-none');
const badge = () => tip()!.querySelector<HTMLElement>('.rounded-pill')!;

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  document.body.innerHTML = '';
});

describe('GroupTooltip', () => {

  it('income groups read รายรับ, investing groups read ลงทุน/ออม (SAVE means investing, not cash savings)', () => {
    show({ active: true, x: 0, y: 0, group: group({ type: 'income', allocation_type: null, color: undefined }), activeCats: [] });
    expect(badge().textContent).toBe('รายรับ (+)');
    act(() => root!.render(<GroupTooltip hoveredGroup={{ active: true, x: 0, y: 0, group: group({ type: 'savings', allocation_type: 'savings' }), activeCats: [] }} />));
    expect(badge().textContent).toBe('SAVE');
    expect(badge().className).toContain('text-savings');
  });

});
