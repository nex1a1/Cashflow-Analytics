/** ข้อผิดพลาดที่ผู้ใช้แก้ได้เอง (400/404/409) — global error handler ส่งข้อความกลับตามจริงแทน 500 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}
