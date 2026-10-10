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
  it('renders nothing until something is hovered', () => {
    show(null);
    expect(tip()).toBeNull();
    act(() => root!.render(<GroupTooltip hoveredGroup={{ active: false, x: 0, y: 0, group: group() }} />));
    expect(tip()).toBeNull();
  });

  it('sits above the hovered header at its centre, portalled to the body', () => {
    show({ active: true, x: 300, y: 120, group: group(), activeCats: [] });
    expect(tip()!.style.left).toBe('300px');
    expect(tip()!.style.top).toBe('114px');
  });

  it('a group lists the categories that have figures and how to expand it', () => {
    show({ active: true, x: 0, y: 0, group: group(), activeCats: [cat('a', 'ข้าว', '#FF0000'), cat('b', 'กาแฟ')] });
    const t = tip()!.textContent!;
    expect(badge().textContent).toBe('NEED');
    expect(t).toContain('หมวดหมู่ย่อย (2):');
    expect(t).toContain('ข้าว');
    expect(t).toContain('กาแฟ');
    expect(t).toContain('คลิกหัวตารางเพื่อ ยุบ/ขยาย');
  });

  it('a group without figures in the period says so and offers to select it', () => {
    show({ active: true, x: 0, y: 0, group: group({ allocation_type: 'want' }) });
    expect(badge().textContent).toBe('WANT');
    expect(tip()!.textContent).toContain('ไม่มีหมวดหมู่ย่อยที่มีรายการในช่วงนี้');
    expect(tip()!.textContent).toContain('คลิกหัวตารางเพื่อ เลือก');
  });

  it('income groups read รายรับ, investing groups read ลงทุน/ออม (SAVE means investing, not cash savings)', () => {
    show({ active: true, x: 0, y: 0, group: group({ type: 'income', allocation_type: null, color: undefined }), activeCats: [] });
    expect(badge().textContent).toBe('รายรับ (+)');
    act(() => root!.render(<GroupTooltip hoveredGroup={{ active: true, x: 0, y: 0, group: group({ type: 'savings', allocation_type: 'savings' }), activeCats: [] }} />));
    expect(badge().textContent).toBe('SAVE');
    expect(badge().className).toContain('text-savings');
  });

  it('a category shows its own name, its group and how to toggle it', () => {
    show({ active: true, x: 10, y: 50, type: 'category', group: group({ color: undefined }), category: cat('a', 'ข้าว'), activeCats: [] });
    const t = tip()!.textContent!;
    expect(t).toContain('ข้าว');
    expect(t).toContain('กลุ่มหลัก:');
    expect(badge().textContent).toBe('ค่ากิน');
    expect(t).toContain('กดรูปตาเพื่อเปิด/ปิดการคำนวณหมวดหมู่นี้');
    expect(t).not.toContain('หมวดหมู่ย่อย');
  });

  it('a "category" hover without the category falls back to the group tooltip', () => {
    show({ active: true, x: 0, y: 0, type: 'category', group: group(), activeCats: [] });
    expect(badge().textContent).toBe('NEED');
  });
});
