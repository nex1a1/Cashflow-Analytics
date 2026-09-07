import type { Request, Response, NextFunction } from 'express';

export function getLocalTimestamp(): string {
  const now = new Date();
  const pad = (n: number, z = 2) => String(n).padStart(z, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const mi = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const ms = pad(now.getMilliseconds(), 3);
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}.${ms}`;
}

/**
 * Detailed Comprehensive Audit Logger
 * Logs Who, What, Where, and How for every API interaction with zero text truncation.
 */
export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  // Only monitor API routes
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }

  const startTime = Date.now();
  const timestamp = getLocalTimestamp();

  // 1. ใคร (WHO)
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '')
    || req.socket.remoteAddress
    || req.ip
    || '127.0.0.1';
  const origin = (req.headers.origin as string) || (req.headers.referer as string) || 'direct (Local / CLI)';
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown User-Agent';

  // 2. ที่ไหน (WHERE)
  const method = req.method;
  const path = req.originalUrl;

  // 3. ทำอะไร (WHAT - Action and Full Parameters)
  let actionDetail = '';
  if (method === 'DELETE') {
    if (path.includes('/transactions/month/')) {
      const month = path.split('/transactions/month/')[1]?.split('?')[0];
      actionDetail = `[คำสั่งลบข้อมูล] ลบข้อมูลธุรกรรมทั้งเดือน: ${month}`;
    } else if (path.includes('/transactions/')) {
      const id = path.split('/transactions/')[1]?.split('?')[0];
      actionDetail = `[คำสั่งลบข้อมูล] ลบธุรกรรมเดี่ยว ID: ${id}`;
    } else if (path.includes('/reset-all')) {
      actionDetail = `[คำสั่งล้างระบบ] ล้างข้อมูลทั้งหมดในฐานข้อมูล (RESET ALL)`;
    } else if (path.includes('/categories/')) {
      const id = path.split('/categories/')[1]?.split('?')[0];
      actionDetail = `[คำสั่งลบข้อมูล] ลบหมวดหมู่ ID: ${id}`;
    } else if (path.includes('/groups/')) {
      const id = path.split('/groups/')[1]?.split('?')[0];
      actionDetail = `[คำสั่งลบข้อมูล] ลบกลุ่มกระแสเงินสด ID: ${id}`;
    } else if (path.includes('/day-types/')) {
      const id = path.split('/day-types/')[1]?.split('?')[0];
      actionDetail = `[คำสั่งลบข้อมูล] ลบประเภทวัน ID: ${id}`;
    }
  } else if (method === 'POST') {
    if (path.includes('/transactions/predict')) {
      actionDetail = `[AI ทำนายหมวดหมู่] ทำนายหมวดหมู่จากคำอธิบาย`;
    } else if (path.includes('/transactions')) {
      const count = Array.isArray(req.body) ? req.body.length : 1;
      actionDetail = `[คำสั่งบันทึกข้อมูล] เพิ่ม/อัปเดตธุรกรรมจำนวน ${count} รายการ`;
    } else if (path.includes('/backup')) {
      actionDetail = `[คำสั่งสำรองข้อมูล] ดำเนินการสำรองฐานข้อมูล SQLite`;
    } else if (path.includes('/calendar')) {
      actionDetail = `[คำสั่งปฏิทิน] อัปเดตประเภทวันของวันที่ ${req.body?.date || 'ไม่ระบุ'} (ประเภท: ${req.body?.day_type_id || 'ไม่ระบุ'}, โน้ต: "${req.body?.note || ''}")`;
    } else if (path.includes('/settings')) {
      actionDetail = `[คำสั่งตั้งค่า] อัปเดตการตั้งค่า ${req.body?.key} = "${req.body?.value}"`;
    } else if (path.includes('/categories')) {
      actionDetail = `[คำสั่งหมวดหมู่] เพิ่ม/อัปเดตหมวดหมู่: "${req.body?.name}"`;
    } else if (path.includes('/groups')) {
      actionDetail = `[คำสั่งกลุ่ม] เพิ่ม/อัปเดตกลุ่มกระแสเงินสด: "${req.body?.name}"`;
    } else if (path.includes('/day-types')) {
      actionDetail = `[คำสั่งประเภทวัน] เพิ่ม/อัปเดตประเภทวัน: "${req.body?.label}" [${req.body?.name}]`;
    }
  }

  // 4. อย่างไร (HOW - Outcome, Status Code, Elapsed Time)
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const isError = status >= 400;
    const isMutation = method !== 'GET';

    if (isMutation || isError) {
      const icon = isError ? '❌' : '⚡';
      console.log(`\n${icon} [AUDIT LOG] [${timestamp}]`);
      console.log(`   👤 [ใคร - WHO]       : IP: ${ip} | ที่มา (Origin): ${origin} | Client: ${userAgent}`);
      console.log(`   📍 [ที่ไหน - WHERE]  : ${method} ${path}`);
      if (actionDetail) {
        console.log(`   🎯 [ทำอะไร - WHAT]   : ${actionDetail}`);
      }
      console.log(`   ⚙️  [อย่างไร - HOW]   : ผลลัพธ์: HTTP ${status} | ระยะเวลาประมวลผล: ${duration}ms`);
    } else {
      // Read requests (GET) logged cleanly
      console.log(`[API ${method}] [${timestamp}] ${path} - HTTP ${status} (${duration}ms) [IP: ${ip}]`);
    }
  });

  next();
}
