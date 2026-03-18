# 📊 Cashflow Analytics PRO

> Personal finance tracker ระดับ advanced — วิเคราะห์รายรับรายจ่ายเชิงลึก พร้อม Dashboard, ปฏิทิน, Activity Graph และ Smart CSV Import

---

## ✨ Vibe Coded — จริง 100%

โปรเจกต์นี้สร้างขึ้นผ่านกระบวนการ **Vibe Coding** โดยไม่ได้พิมพ์โค้ดเองแม้แต่บรรทัดเดียว

ในเวอร์ชันแรก ใช้ **Google Gemini Pro** เป็นผู้เขียนโค้ด และในการพัฒนาต่อยอดรอบที่สองนี้ ย้ายมาใช้ **Claude (Anthropic)** ซึ่งให้ผลลัพธ์ที่ดีขึ้นอย่างเห็นได้ชัดทั้งในแง่ความแม่นยำของโค้ด, การจัดการ state, และการ debug

**บทบาทของผู้พัฒนา (Concept & Product Owner):**
- กำหนดทิศทางของแอปพลิเคชันและฟีเจอร์ทั้งหมด
- ออกแบบ UX/UI, ตรรกะทางสถิติการเงิน (เช่น สัดส่วนค่าหอต่อรายรับ) และ Layout
- ทดสอบการทำงาน, ตรวจสอบบั๊ก, และทำ Code Review เพื่อชี้จุดให้ AI แก้ไข

**บทบาทของ AI (Developer):**
- เขียนโค้ดทั้งหมดตั้งแต่ Frontend ไปจนถึง Backend
- Debug และ Optimize ประสิทธิภาพ (เช่น การใช้ `useMemo` เพื่อลดการ Render)
- นำเสนอโซลูชันทางเทคนิคที่เหมาะสม

---

## 🚀 Features (ฟีเจอร์เด่น)

### 📈 Dashboard วิเคราะห์เชิงลึก
- สรุปรายรับสุทธิ / รายจ่ายสุทธิ / เงินคงเหลือ พร้อมกราฟ Sparkline
- คำนวณอัตราการออม (Savings Rate) และอัตราเผาผลาญเงินต่อวัน (Burn Rate)
- **แยกการ์ดวิเคราะห์เฉพาะจุด:** ค่ากินเฉลี่ย/วัน, รายจ่ายผันแปร/วัน, สัดส่วนค่าที่พัก (ตามหลักการไม่ควรเกิน 30% ของรายรับ)
- ตารางสรุปกระแสเงินสด (Cashflow Statement) เปรียบเทียบ MoM (Month-over-Month) สไตล์ Excel
- Activity Graph แสดงไทม์ไลน์การทำธุรกรรมแบบสไตล์ GitHub Contribution

### ⚡ Smart Quick Suggestions (ฟีเจอร์ใหม่)
- วิเคราะห์ประวัติการใช้จ่ายที่บ่อยที่สุด และสร้างเป็นปุ่ม "รายการที่ใช้บ่อย" ให้อัตโนมัติ
- แสดงจำนวน "ครั้ง" ที่เคยใช้รายการนั้นๆ
- กดปุ่มปุ๊บ ข้อมูลจะวิ่งลงฟอร์มทันที ทั้งในหน้า **Day Detail Modal** (เลย์เอาต์ Side-by-side) และหน้า **Batch Add** (เลย์เอาต์ 3 คอลัมน์)

### 🗓️ ปฏิทินรายวัน
- แสดงรายรับ/รายจ่ายสูงสุด 5 อันดับแรกของแต่ละวัน
- รองรับการกำหนดประเภทวัน (Day Type) เช่น วันทำงาน, วันหยุด, ลาป่วย
- คลิกที่ปฏิทินเพื่อเปิด Popup จัดการรายการของวันนั้นๆ ได้ทันทีโดยไม่ต้องเปลี่ยนหน้า (Optimistic UI)

### 📒 Ledger (ฐานข้อมูลบัญชี)
- ตัวกรองขั้นสูง (Advanced Filters) — กรองได้ตาม วันที่, กลุ่มรายจ่าย (Fixed/Variable), หมวดหมู่, และค้นหาจากข้อความ
- แสดงยอดรวม (Summary Bar) เฉพาะผลลัพธ์ที่กรองออกมา
- รองรับระบบ Pagination สำหรับข้อมูลจำนวนมาก

### 📥 Smart Import / Export CSV
- **อัปโหลดแบบไม่ต้องระบุ Format:** ระบบจะประเมินให้อัตโนมัติว่าไฟล์เป็น Wide Format (Excel) หรือ Long Format (System)
- Auto-mapping Category: ถ้าชื่อใน Excel ไม่ตรงกับระบบ จะพยายามจับคู่เข้าหมวดหมู่ที่เหมาะสมให้
- มีหน้า **Preview Modal** ให้ตรวจสอบ แก้ไข หรือลบรายการก่อนกดบันทึกลง Database จริง
- สามารถ Export ข้อมูลออกมาเป็น CSV ได้ทั้ง 2 รูปแบบ

### 🌓 Dark / Light Mode
- สลับโหมดสีได้แบบ Real-time ครอบคลุมทุก Modal และ Popup เพื่อการใช้งานที่สบายตาในทุกช่วงเวลา
---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), Tailwind CSS, Chart.js, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | **SQLite3**|
| **Infrastructure**| Docker & Docker Compose |

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
git clone https://github.com/nex1a1/Cashflow-Analytics.git
cd Cashflow-Analytics

# 2. Run
docker-compose up -d --build

# 3. เปิดเบราว์เซอร์
# http://localhost:5173

# หยุดระบบ
docker-compose down
```
---

## 💬 บทส่งท้าย

โปรเจกต์นี้เริ่มจากความต้องการส่วนตัว — อยากมีเครื่องมือติดตามการใช้เงินที่ **ตรงกับพฤติกรรมตัวเอง** มากกว่าแอปสำเร็จรูปทั่วไป
> Concept & Product by **Natthawut Bokham**
> Code by **Claude (Anthropic)** — **Gemini Pro 3.1**