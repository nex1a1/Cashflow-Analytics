// @vitest-environment jsdom
import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { act } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { key, type } from '@/test-utils/dom';
import EditableInput from '../EditableInput';

let root: Root | null = null;
let host: HTMLDivElement | null = null;
const render = (el: React.ReactElement) => act(() => {
  if (!root) { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); }
  root.render(el);
});
const input = () => host!.querySelector('input')!;
const focus = () => act(() => input().focus());
const blur = () => act(() => input().blur());

afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; });

describe('EditableInput', () => {
  it('shows the value, the placeholder and the class it is given', () => {
    render(<EditableInput initialValue="ข้าวมันไก่" onSave={vi.fn()} className="cell" placeholder="รายละเอียด..." />);
    expect(input().value).toBe('ข้าวมันไก่');
    expect(input().placeholder).toBe('รายละเอียด...');
    expect(input().className).toBe('cell');
  });

  it('no value shows an empty box', () => {
    render(<EditableInput onSave={vi.fn()} />);
    expect(input().value).toBe('');
  });

  it('leaving the box saves what was typed', () => {
    const onSave = vi.fn();
    render(<EditableInput initialValue="เดิม" onSave={onSave} />);
    focus(); type(input(), 'ใหม่'); blur();
    expect(onSave).toHaveBeenCalledWith('ใหม่');
  });

  it('Enter saves (by leaving the box)', () => {
    const onSave = vi.fn();
    render(<EditableInput initialValue="เดิม" onSave={onSave} />);
    focus(); type(input(), 'ใหม่'); key(input(), 'Enter');
    expect(onSave).toHaveBeenCalledWith('ใหม่');
    expect(document.activeElement).not.toBe(input());
  });

  it('leaving without a change saves nothing', () => {
    const onSave = vi.fn();
    render(<EditableInput initialValue="เดิม" onSave={onSave} />);
    focus(); blur();
    type(input(), 'เดิม'); blur();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Esc puts the old text back and saves nothing', () => {
    const onSave = vi.fn();
    render(<EditableInput initialValue="เดิม" onSave={onSave} />);
    focus(); type(input(), 'พิมพ์ผิด'); key(input(), 'Escape');
    expect(onSave).not.toHaveBeenCalled();
    expect(input().value).toBe('เดิม');
    expect(document.activeElement).not.toBe(input());
  });

  it('after an Esc the next edit saves again', () => {
    const onSave = vi.fn();
    render(<EditableInput initialValue="เดิม" onSave={onSave} />);
    focus(); type(input(), 'พิมพ์ผิด'); key(input(), 'Escape');
    focus(); type(input(), 'ถูก'); blur();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith('ถูก');
  });

  it('a new value from outside replaces the box', () => {
    render(<EditableInput initialValue="เดิม" onSave={vi.fn()} />);
    render(<EditableInput initialValue="จากเซิร์ฟเวอร์" onSave={vi.fn()} />);
    expect(input().value).toBe('จากเซิร์ฟเวอร์');
  });
});
