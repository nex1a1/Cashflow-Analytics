# 📊 Cashflow Analytics PRO

> Personal finance tracker ระดับ advanced — วิเคราะห์รายรับรายจ่ายเชิงลึก พร้อม Dashboard, ปฏิทิน, Activity Graph และ Smart CSV Import

---

## ✨ Vibe Coded — จริง 100%

โปรเจกต์นี้สร้างขึ้นผ่านกระบวนการ **Vibe Coding** โดยไม่ได้พิมพ์โค้ดเองแม้แต่บรรทัดเดียว

ในเวอร์ชันแรก ใช้ **Google Gemini Pro** เป็นผู้เขียนโค้ด และในการพัฒนาต่อยอดรอบที่สองนี้ ย้ายมาใช้ **Claude (Anthropic)** ซึ่งให้ผลลัพธ์ที่ดีขึ้นอย่างเห็นได้ชัดทั้งในแง่ความแม่นยำของโค้ด, การจัดการ state, และการ debug

**บทบาทของผู้พัฒนา (ตัวผม):**
- กำหนดทิศทางและ feature ทั้งหมด
- ออกแบบ UX/UI และตัดสินใจด้าน layout
- ทดสอบ, หา bug, และ review ผลลัพธ์
- บอกว่าอะไรดีหรือไม่ดี แล้วให้ AI แก้

**บทบาทของ AI:**
- เขียนโค้ดทั้งหมด
- refactor, debug, และ optimise
- แนะนำ approach ที่เหมาะสม

---

## 🚀 Features

### 📈 Dashboard วิเคราะห์เชิงลึก
- สรุปรายรับ / รายจ่าย / เงินคงเหลือ พร้อม Sparkline
- อัตราการออม (Savings Rate) และอัตราเผาผลาญเงิน/วัน
- **ค่ากินเฉลี่ย/วัน** และ **รายจ่ายผันแปร/วัน** แยก card ชัดเจน
- เปรียบเทียบ MoM (Month-over-Month) ในตาราง Cashflow Statement
- กราฟโดนัท สัดส่วนหมวดหมู่ + Top 7 รายการใช้จ่าย
- Activity Graph สไตล์ GitHub Contribution Graph

### 🗓️ ปฏิทินรายวัน
- Grid ปฏิทินแสดงรายจ่าย/รายรับสูงสุด Top 5 ต่อวัน พร้อมราคา
- คลิก cell เปิด **Day Detail Popup** — ดู, เพิ่ม, ลบรายการได้เลยโดยไม่ต้องออกไปหน้าอื่น
- Optimistic UI — บันทึกแล้วเห็นผลทันทีโดยไม่รอ server
- ระบบ Day Type: กำหนดประเภทวัน (ทำงาน, หยุด, ลาป่วย ฯลฯ) ต่อ cell

### 📒 Ledger (ฐานข้อมูลบัญชี)
- ค้นหา filter ขั้นสูงด้วย category, กลุ่มรายจ่าย, วันที่, และจำนวนเงิน
- Summary bar แสดงยอดรวมรายรับ/รายจ่าย/คงเหลือของผลการค้นหา
- ลบรายการรายวันได้จาก summary bar

### 📥 Smart Import CSV
- รองรับ 2 format อัตโนมัติ — **ไม่ต้องเลือก format เอง**
  - **Wide Format (Excel):** แต่ละคอลัมน์คือหมวดหมู่ย่อย — auto-map ไปหา category
  - **Long Format (System Export):** ใส่ตรงได้เลย หมวดหมู่ไม่มีก็สร้างให้อัตโนมัติ
- Preview modal ก่อน import จริง — แก้ไข category, description, amount, ลบรายการที่ไม่ต้องการได้
- Pagination แบบ day-based ไม่ตัดกลางวัน

### ⚙️ Settings
- จัดการ category รายรับ/รายจ่าย: icon, ชื่อ, สี, กลุ่ม Cashflow, Fixed/Variable
- Color palette 16 สีพร้อม custom color picker
- จัดการ Day Types ของปฏิทิน
- Danger Zone: Factory Reset

### 🌓 Dark / Light Mode
- ครอบคลุมทุกหน้า ทุก component รวมถึง modal และ popup

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (Vite), Tailwind CSS, Chart.js, Lucide Icons |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 15 |
| Infrastructure | Docker & Docker Compose |

**โครงสร้างโค้ด Frontend:**
```
src/
├── App.jsx
├── components/
│   ├── DashboardView.jsx
│   ├── CalendarView.jsx
│   ├── LedgerView.jsx
│   ├── SettingsView.jsx
│   ├── DayDetailModal.jsx
│   └── ui/ (AnimatedNumber, Sparkline, EditableInput)
├── hooks/
│   ├── useAnalytics.js
│   └── useCategories.js
└── utils/
    ├── csvParser.js
    ├── dateHelpers.js
    └── formatters.js
```

---

## 🐳 วิธีติดตั้ง

**ต้องการ:** Docker Desktop

```bash
# 1. Clone
git clone https://github.com/yourusername/cashflow-analytics-pro.git
cd cashflow-analytics-pro

# 2. Run
docker-compose up -d --build

# 3. เปิดเบราว์เซอร์
# http://localhost:5173

# หยุดระบบ
docker-compose down
```

---

## 📌 สิ่งที่ยังไม่มี (Roadmap)

- [ ] Budget ต่อหมวดหมู่ + แจ้งเตือนเมื่อใกล้เกิน
- [ ] Recurring transaction (template รายการประจำ)
- [ ] Yearly overview — กราฟภาพรวม 12 เดือน
- [ ] Edit transaction inline ใน Ledger

---

## 💬 บทส่งท้าย

โปรเจกต์นี้เริ่มจากความต้องการส่วนตัว — อยากมีเครื่องมือติดตามการใช้เงินที่ **ตรงกับพฤติกรรมตัวเอง** มากกว่าแอปสำเร็จรูปทั่วไป
> Concept & Product by **Natthawut Bokham**
> Code by **Claude (Anthropic)** — previously Gemini Pro 3.1