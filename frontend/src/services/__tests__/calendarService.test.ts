import { describe, it, expect, vi, afterEach } from 'vitest';
import { calendarService } from '../api';

const stubFetch = () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  vi.stubGlobal('fetch', fetchMock);
  return () => JSON.parse((fetchMock.mock.calls[fetchMock.mock.calls.length - 1] as [string, RequestInit])[1].body as string);
};

describe('calendarService.save', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('เปลี่ยนแค่ประเภทวันต้องไม่ส่ง note/note_icon ไป (ไม่งั้น backend ตีความเป็นลบโน้ต)', async () => {
    const body = stubFetch();
    await calendarService.save('2026-03-18', 'type-1');
    expect(body()).toEqual({ date: '2026-03-18', type_id: 'type-1' });
  });

  it("ส่ง '' ได้เพื่อลบ และส่งไอคอนคู่กับโน้ต", async () => {
    const body = stubFetch();
    await calendarService.save('2026-03-18', 'type-1', '', '');
    expect(body()).toEqual({ date: '2026-03-18', type_id: 'type-1', note: '', note_icon: '' });
    await calendarService.save('2026-03-18', 'type-1', 'วันเกิด', 'cake');
    expect(body()).toEqual({ date: '2026-03-18', type_id: 'type-1', note: 'วันเกิด', note_icon: 'cake' });
  });
});
