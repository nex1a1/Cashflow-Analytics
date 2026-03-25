# 📊 Cashflow Analytics PRO

> **Personal Finance Tracker ระดับ Advanced** — เน้นการวิเคราะห์กระแสเงินสด (Cashflow) ตัดความซับซ้อนของระบบบัญชีแบบเดิมทิ้ง เพื่อให้คุณเห็นภาพรวมสุขภาพทางการเงินที่แท้จริง พร้อม Dashboard เชิงลึก, Activity Graph และระบบ Smart CSV Import

[![Vibe Coded](https://img.shields.io/badge/Vibe-Coded-blueviolet?style=for-the-badge)](https://github.com/nex1a/Cashflow-Analytics)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=nodedotjs)](https://nodejs.org/)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite)](https://sqlite.org/)

---

## ✨ 100% Vibe Coded Project

โปรเจกต์นี้คือผลงานจากการใช้แนวคิด **Vibe Coding** — การสร้างแอปพลิเคชันระดับ Production-ready โดยที่ผู้พัฒนาเน้นการสื่อสารความต้องการและวิสัยทัศน์ (Vibe) ให้ AI (Google Gemini & Claude) เป็นผู้ลงมือเขียนโค้ดและจัดการสถาปัตยกรรมทั้งหมด

**💡 บทบาทในการพัฒนา:**
- **Human (Product Owner):** ออกแบบ User Experience, กำหนด Logic ทางการเงิน (เช่น การเน้น Cashflow แทนการทำ Double-entry bookkeeping), รีวิวคุณภาพโค้ด และปรับจูน UI ให้ใช้งานง่ายที่สุด
- **AI (Developer):** รับ Requirement มาเปลี่ยนเป็น Full-stack Code (React/Node.js), ออกแบบ Schema ของ SQLite, จัดการ State Management ที่ซับซ้อน และสร้าง UI Components ที่ตอบสนองได้รวดเร็ว

---

## 🚀 Key Features

### 📈 Dashboard & Activity Heatmap
- **Financial Analytics:** สรุปรายรับ-รายจ่ายสุทธิ, อัตราการออม (Savings Rate) และเงินคงเหลือ
- **Burn Rate Monitoring:** ติดตามอัตราการใช้จ่ายต่อวัน และสัดส่วนค่าใช้จ่ายสำคัญ (เช่น ค่าอาหาร, ที่พัก)
- **Activity Graph:** ไทม์ไลน์กิจกรรมสไตล์ GitHub ที่รวมข้อมูลกระแสเงินสดและประเภทวัน (ทำงาน/หยุด) ไว้ในที่เดียว ช่วยให้เห็น Pattern การใช้เงินสัมพันธ์กับไลฟ์สไตล์

### 🧺 Smart Batch Add & Suggestions
- **Basket System:** เพิ่มรายการได้ทีละหลายรายการ (Batch) แล้วบันทึกรวดเดียว ช่วยประหยัดเวลา
- **Quick Suggestions:** ระบบจดจำประวัติเก่า เพื่อแนะนำรายการที่ใช้บ่อย ให้คุณบันทึกได้ใน 1 คลิก

### 📅 Advanced Calendar & Day Settings
- **Holistic View:** ปฏิทินที่แยกโซนข้อมูลชัดเจน เห็นยอดสรุปรายวันและประเภทของวัน
- **Day Categorization:** กำหนดประเภทวัน (Work, Holiday, Sick, Leave) เพื่อนำไปวิเคราะห์ผลกระทบต่อกระแสเงินสด

### 📋 Clean Ledger (สมุดบัญชี)
- **Inline Editing:** แก้ไขข้อมูลได้โดยตรงจากตาราง ไม่ต้องเปิดหน้าใหม่
- **Powerful Filters:** ระบบกรองข้อมูลขั้นสูง กรองตามช่วงเวลา, หมวดหมู่, หรือกลุ่ม Cashflow (Income/Expense/Fixed/Debt)

### 📥 Smart CSV Import & Export
- **Auto-Mapping:** ระบบจับคู่หมวดหมู่อัตโนมัติจากประวัติเดิมเมื่อนำเข้า CSV
- **Import Preview:** ตรวจสอบและแก้ไขข้อมูลก่อนนำเข้า Database จริง
- **Data Portability:** รองรับการ Export ข้อมูลทั้งหมดออกมาเป็นไฟล์ CSV เพื่อนำไปใช้งานต่อ

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), Tailwind CSS, Chart.js, Lucide Icons |
| **Backend** | Node.js (Express) |
| **Database** | **SQLite3** (via better-sqlite3) |
| **Infrastructure**| Docker & Docker Compose |

---

## 📂 Project Structure

```text
.
├── backend/
│   ├── data/                 # SQLite Database Volume
│   └── src/
│       ├── config/           # Database Connection
│       ├── controllers/      # Business Logic
│       ├── models/           # DB Schema & Initialization
│       └── routes/           # API Endpoints
└── frontend/
    └── src/
        ├── components/       # UI & Modals (BatchAdd, Export, Import)
        ├── hooks/            # Custom React Hooks (Analytics, Filters, CSV)
        ├── services/         # API Service Layer
        ├── views/            # Page Components (Dashboard, Calendar, Ledger, Settings)
        └── utils/            # Formatters & Helpers
```

---

## 🐳 Getting Started (Docker)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)

1. **Clone the Repository**
   ```bash
   git clone https://github.com/nex1a/Cashflow-Analytics.git
   cd Cashflow-Analytics
   ```

2. **Spin up with Docker Compose**
   ```bash
   docker compose up -d
   ```

3. **Access the Application**
   - **Web Interface:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000/api](http://localhost:3000/api)

---

## 🌓 Dark / Light Mode
รองรับการเปลี่ยนโหมดสีแบบ Real-time ซึ่งครอบคลุมทุกส่วนของแอปพลิเคชัน รวมถึง Chart และ Activity Graph เพื่อความสบายตาในการใช้งานทุกสภาพแสง

---

## 📝 License
This project is for educational and personal use. Created with ❤️ and AI.
