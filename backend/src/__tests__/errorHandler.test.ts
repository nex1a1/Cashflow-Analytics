import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../middleware/errorHandler';
import { ApiError } from '../middleware/ApiError';

function run(err: unknown) {
  const res: any = { statusCode: 0, body: undefined as any };
  res.status = (s: number) => { res.statusCode = s; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  errorHandler(err, {} as any, res, () => {});
  log.mockRestore();
  return res as { statusCode: number; body: any };
}

describe('errorHandler', () => {
  it('Zod v4 errors carry their issues (v4 has no .errors)', () => {
    let err: unknown;
    try { z.object({ a: z.string() }).parse({}); } catch (e) { err = e; }
    const r = run(err);
    expect(r.statusCode).toBe(400);
    expect(r.body.error).toBe('Validation Error');
    expect(r.body.details).toHaveLength(1);
    expect(r.body.details[0].path).toEqual(['a']);
  });

  it('passes ApiError status and message through', () => {
    const r = run(new ApiError(409, 'ลบไม่ได้'));
    expect(r).toMatchObject({ statusCode: 409, body: { error: 'ลบไม่ได้' } });
  });

  it('maps a foreign key violation to 409 instead of a bare 500', () => {
    const r = run(Object.assign(new Error('FOREIGN KEY constraint failed'), { code: 'SQLITE_CONSTRAINT_FOREIGNKEY' }));
    expect(r.statusCode).toBe(409);
    expect(r.body.error).toMatch(/ยังถูกใช้งานอยู่/);
  });

  it('shows the Thai message of a DB trigger abort as a 400', () => {
    const r = run(Object.assign(new Error('ข้อมูลซื้อขายไม่สอดคล้อง'), { code: 'SQLITE_CONSTRAINT_TRIGGER' }));
    expect(r).toMatchObject({ statusCode: 400, body: { error: 'ข้อมูลซื้อขายไม่สอดคล้อง' } });
  });

  it('answers a malformed JSON body with 400, not 500', () => {
    const r = run(Object.assign(new SyntaxError('Unexpected token'), { status: 400, type: 'entity.parse.failed' }));
    expect(r.statusCode).toBe(400);
  });

  it('answers an oversized body with 413, not 500', () => {
    const r = run(Object.assign(new Error('request entity too large'), { status: 413, type: 'entity.too.large' }));
    expect(r.statusCode).toBe(413);
  });

  it('hides the details of an unknown error behind a 500', () => {
    const r = run(new Error('secret internals'));
    expect(r).toMatchObject({ statusCode: 500, body: { error: 'Internal Server Error' } });
  });
});
