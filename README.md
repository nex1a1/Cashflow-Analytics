# Cashflow Analytics 💰📊

Cashflow Analytics เป็น Web Application สำหรับบันทึกและวิเคราะห์กระแสเงินสด (รายรับ-รายจ่าย) ส่วนบุคคลหรือธุรกิจขนาดเล็ก ถูกออกแบบมาให้ใช้งานง่าย รวดเร็ว และสามารถปรับแต่งหมวดหมู่ได้ตามความต้องการ มาพร้อมกับมุมมองการวิเคราะห์ที่หลากหลาย ทั้งแบบกราฟ, ปฏิทิน และตารางข้อมูล (Project นี้ Vibe Code 100%)

## ✨ ฟีเจอร์หลัก (Key Features)

- 📊 **Dashboard (หน้าวิเคราะห์):** สรุปภาพรวมทางการเงินรายเดือน/ปี พร้อมกราฟและสถิติที่เข้าใจง่าย (Chart.js)
- 📅 **Calendar View (หน้าปฏิทิน):** ดูภาพรวมรายวัน สามารถกำหนดประเภทวัน (เช่น วันทำงาน, วันหยุด, ลาป่วย, OT) และเพิ่มรายการได้ทันที
- 🗄️ **Ledger (หน้าฐานข้อมูล):** ดูรายการบัญชีทั้งหมดในรูปแบบตาราง (Data Grid) ค้นหา กรองข้อมูลขั้นสูง และแก้ไขรายการได้สะดวก
- ⚙️ **Settings (หน้าตั้งค่า):** 
  - จัดการ **คอลัมน์ Cashflow** (จัดกลุ่มรายรับ/รายจ่ายหลัก)
  - จัดการ **หมวดหมู่** (Categories) แยกสี ไอคอน และสามารถกำหนดเป็น "รายจ่ายคงที่" (Fixed Expense) ได้
  - จัดการ **ชนิดวันบนปฏิทิน** (Day Types) เช่น เพิ่มวันลา หรือปรับแต่งสี
  - ฟีเจอร์ **ล้างข้อมูลทั้งหมด** (Factory Reset)
- 📤 **Import & Export:** รองรับการนำเข้าข้อมูลผ่านไฟล์ CSV และ Export ข้อมูลออกไปใช้งานต่อ
- 🎨 **UI/UX:** รองรับ Dark Mode เต็มรูปแบบ, มี Animation นุ่มนวล (Framer Motion), และปรับแต่งสีสันได้

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### 💻 Frontend (Client-side)
- **Core:** `React v18.2.0` (รันบน `Vite v5.0.8`)
- **Styling:** `Tailwind CSS v3.4.1`, `PostCSS`, `Autoprefixer`
- **Charts:** `Chart.js v4.4.1` และ `react-chartjs-2 v5.2.0`
- **Icons:** `Lucide React v0.312.0`
- **Animations:** `Framer Motion v12.38.0`
- **Context Management:** React Context API (Theme & Toast)

### 🖥️ Backend (Server-side)
- **Runtime:** `Node.js v20 (LTS)` (Alpine-based Docker Image)
- **Framework:** `Express.js v4.18.2`
- **Database:** `better-sqlite3 v12.9.0` (SQLite3 with synchronous/high-performance binding)
- **Validation:** `Zod v4.4.2` (Schema declaration and type safety)
- **Middleware:** `CORS v2.8.5`

### 🐳 Infrastructure
- **Containerization:** `Docker v20.x+` & `Docker Compose v3.8`
- **OS Support:** Alpine Linux (Lightweight containers)
- **Timezone:** Asia/Bangkok (Configured at OS and DB level)

## 🚀 การติดตั้งและรันโปรเจกต์ (Installation & Running)

โปรเจกต์นี้ถูกตั้งค่าให้รันผ่าน Docker เพื่อความง่ายในการติดตั้ง โดยไม่ต้องตั้งค่า Environment บนเครื่องหลัก

### สิ่งที่ต้องมี
- [Docker](https://www.docker.com/) และ [Docker Compose](https://docs.docker.com/compose/)

### ขั้นตอนการรัน
1. Clone หรือเปิดโปรเจกต์นี้ใน Terminal
2. รันคำสั่งด้านล่างเพื่อเริ่มการทำงาน:
   ```bash
   docker-compose up -d
   ```
3. รอจนกว่า Container จะทำการสร้างและรันเสร็จ (ครั้งแรกอาจใช้เวลาโหลด Dependency เล็กน้อย)
4. เปิดเบราว์เซอร์ไปที่:
   - **Frontend:** [http://localhost:5173](http://localhost:5173)
   - **Backend API:** [http://localhost:3000](http://localhost:3000)

### การหยุดการทำงาน
```bash
docker-compose down
```

## 📁 โครงสร้างโฟลเดอร์ (Directory Structure)

```text
Cashflow-Analytics/
├── backend/                  # Node.js API + SQLite
│   ├── data/                 # SQLite Database (cashflow.db)
│   ├── src/
│   │   ├── config/           # DB Configuration (better-sqlite3)
│   │   ├── controllers/      # Request handling logic
│   │   ├── models/           # DB Schema & Seeding
│   │   ├── routes/           # API Routing (api.js)
│   │   ├── services/         # Business logic & DB queries
│   │   └── validations/      # Zod validation schemas
│   ├── server.js             # Entry point
│   └── package.json          
├── frontend/                 # React + Vite
│   ├── src/
│   │   ├── components/       # UI Components & Modals
│   │   ├── hooks/            # Custom Hooks (Data & Analytics)
│   │   ├── services/         # Frontend API Clients
│   │   ├── utils/            # Formatters & Analytics Helpers
│   │   └── views/            # Main Pages (Dashboard, Ledger, etc.)
│   ├── index.html
│   └── package.json
└── docker-compose.yml        # Multi-container orchestration
```

## 🐞 การ Debug (สำหรับนักพัฒนา)

- **ดู Log API:**
  ```bash
  docker logs -f expense_api
  ```
- **เข้าถึงฐานข้อมูลใน Container:**
  ```bash
  docker exec -it expense_api sh -c "sqlite3 /app/data/cashflow.db"
  ```
