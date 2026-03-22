# 📊 Cashflow Analytics PRO

> Personal finance tracker ระดับ advanced — โฟกัสกระแสเงินสด (Cashflow) แบบเพียวๆ ตัดความซับซ้อนทิ้ง วิเคราะห์รายรับรายจ่ายเชิงลึก พร้อม Dashboard, ปฏิทิน, Activity Graph สไตล์ GitHub และ Smart CSV Import

---

## ✨ 100% Vibe Coded Project

โปรเจกต์นี้คือเครื่องพิสูจน์พลังของ **Vibe Coding** — การสร้างแอปพลิเคชันตั้งแต่ศูนย์จนจบระดับ Production-ready โดยที่ผู้พัฒนา **"ไม่ได้พิมพ์โค้ดเองแม้แต่บรรทัดเดียว"**

แอปพลิเคชันนี้เกิดจากการทำงานร่วมกันอย่างลงตัวระหว่าง Human (Concept & Product Owner) และ AI (Google Gemini & Claude ในฐานะ Developer) จนออกมาเป็นโปรเจกต์ที่มี Clean Architecture และ UI/UX ที่สมบูรณ์แบบ

**💡 แนวทางการพัฒนา (How we built this):**
- **Human (Product Owner):** กำหนดวิสัยทัศน์, ออกแบบ Logic ทางการเงิน, ตัดสินใจฟีเจอร์ (เช่น การหั่นระบบ Wallet ที่ซับซ้อนทิ้งเพื่อเน้น Core Cashflow), รีวิวโค้ดอย่างละเอียด, และออกแบบ Layout ให้ใช้งานจริงได้ไหลลื่น
- **AI (Developer):** รับ Requirement มาแปลงเป็นโค้ดตั้งแต่ Frontend (React/Tailwind) ไปจนถึง Backend (Node.js/SQLite), จัดการ State Management, และ Optimize ประสิทธิภาพหน้า UI

---

## 🚀 Features (ฟีเจอร์เด่น)

### 📈 Dashboard & Activity Graph
- สรุปรายรับสุทธิ / รายจ่ายสุทธิ / เงินคงเหลือ / อัตราการออม
- เฝ้าระวังตัวเลขสำคัญ: อัตราเผาผลาญรายจ่ายต่อวัน, สัดส่วนค่าหอ/ค่าที่พัก, สัดส่วนค่ากิน
- **(New!) Activity Graph:** ไทม์ไลน์กิจกรรมสไตล์ GitHub ดูกระแสเงินสดและวันหยุดรายปี ชนกันเป็นผืนเดียวพร้อมสมูท Scrollbar แนวนอน
- ตาราง Cashflow Statement รูปแบบคล้าย Excel โชว์ยอดการเติบโตแบบ MoM (Month-over-Month)

### 🧺 สรุปค่าใช้จ่ายประจำวัน (Batch Add)
- ระบบตะกร้าให้เพิ่มรายการทีละหลายๆ รายการแล้วกดบันทึกรวดเดียว
- **Quick Suggestions:** เรียนรู้จากประวัติเก่า ช่วยให้กดเพิ่มรายการประจำได้ใน 1 คลิก
- **Date Badge:** กำกับป้ายวันที่ในตะกร้าชัดเจน หมดปัญหาความสับสนเวลาจดย้อนหลัง

### 📅 Calendar & Day Settings
- ปฏิทินรายเดือนที่แยกโซน Header (วันที่/ชนิดวัน) กับ Content (รายการบัญชี) อย่างชัดเจน
- กำหนดชนิดวันได้ (ทำงาน, วันหยุด, ลาป่วย, ลากิจ) พร้อมสรุปจำนวนวันในแต่ละเดือน

### 📋 Ledger (สมุดบัญชี)
- หน้าสมุดบัญชีที่คลีน โฟกัสเฉพาะรายรับ-รายจ่าย พร้อมฟังก์ชันแก้ไขข้อมูลในตารางโดยตรง (Inline Edit)
- Advanced Filters กรองแบบผสมได้หลายเงื่อนไข

### 📥 Smart CSV Import
- นำเข้าไฟล์ CSV พร้อมระบบจับคู่หมวดหมู่อัตโนมัติ (Auto-categorization) จากประวัติเดิม
- Preview Modal พร้อมระบบแบ่งหน้า (Pagination) ให้ตรวจสอบ แก้ไข หรือลบรายการก่อนกดเข้า Database จริง

### 🌓 Dark / Light Mode
- สลับโหมดสีได้แบบ Real-time ครอบคลุมทุก Component, Modal, กราฟ และ Activity Graph เพื่อการใช้งานที่สบายตา

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), Tailwind CSS, Chart.js, Lucide Icons |
| **Backend** | Node.js, Express.js |
| **Database** | **SQLite3** |
| **Infrastructure**| Docker & Docker Compose |

**โครงสร้างโปรเจกต์ (Clean Architecture):**
```text
.
├── backend/
│   ├── data/                 # SQLite Database Volume
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── models/
│       └── routes/
└── frontend/
    └── src/
        ├── components/       # Modals & Reusable Components
        │   └── ui/           # Base UI Elements (Sparkline, DatePicker, etc.)
        ├── constants/
        ├── hooks/            # Custom React Hooks
        ├── services/         # API Calls
        ├── styles/
        ├── utils/            # Helpers & Formatters
        └── views/            # Main Pages (Dashboard, Calendar, Ledger)

🐳 วิธีติดตั้งและใช้งาน
Prerequisites: Docker Desktop

# 1. Clone repository
git clone [https://github.com/nex1a/Cashflow-Analytics.git](https://github.com/nex1a/Cashflow-Analytics.git)

# 2. Start the application
docker compose up -d

# 3. Access the web app
# เปิดเบราว์เซอร์ไปที่: http://localhost:5173