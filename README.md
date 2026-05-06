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

### Frontend (ฝั่งผู้ใช้งาน)
- **Framework:** React 18 (รันด้วย Vite เพื่อความรวดเร็ว)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Charts:** Chart.js / react-chartjs-2
- **Animations:** Framer Motion

### Backend (ฝั่งเซิร์ฟเวอร์ & API)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite3 (ใช้แพ็กเกจ `better-sqlite3` เพื่อประสิทธิภาพสูงบนระบบ Local)
- **Validation:** Zod (สำหรับการตรวจสอบข้อมูล API)

### Infrastructure
- **Docker:** ใช้ Docker Compose ในการแพ็กเกจและรันทั้ง Frontend และ Backend ให้ทำงานประสานกันอย่างราบรื่น

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
   - **Backend API:** [http://localhost:3000](http://localhost:3000) (ไม่จำเป็นต้องเปิดตรงๆ)

### การหยุดการทำงาน
```bash
docker-compose down
```

## 📁 โครงสร้างโฟลเดอร์ (Directory Structure)

```text
Cashflow-Analytics/
├── backend/                  # โค้ดฝั่ง Node.js API และ Database
│   ├── data/                 # ที่เก็บไฟล์ฐานข้อมูล cashflow.db (ออโต้เมานท์ผ่าน Docker)
│   ├── src/
│   │   ├── config/           # การตั้งค่าต่างๆ เช่น db.js
│   │   ├── controllers/      # ควบคุม Logic ของ API แต่ละส่วน
│   │   ├── models/           # สร้างและจัดการ Schema ฐานข้อมูล
│   │   ├── routes/           # กำหนดเส้นทาง (Routes) ของ API
│   │   └── services/         # จัดการการดึง/บันทึกข้อมูล Database
│   ├── server.js             # ไฟล์หลักในการเริ่มการทำงานของ Express
│   └── package.json          
├── frontend/                 # โค้ดฝั่ง React + Vite
│   ├── src/
│   │   ├── components/       # UI Components ย่อยๆ
│   │   ├── constants/        # ค่าคงที่ (Constants) และ Default Config
│   │   ├── context/          # React Context (Theme, Toast)
│   │   ├── hooks/            # Custom React Hooks
│   │   ├── services/         # API Service (ดึงข้อมูลจาก Backend)
│   │   ├── styles/           # CSS พิเศษ
│   │   ├── utils/            # ฟังก์ชันตัวช่วย (Helpers)
│   │   └── views/            # หน้าจอหลัก (Dashboard, Calendar, Ledger, Settings)
│   ├── index.html
│   └── package.json
├── docker-compose.yml        # ตั้งค่าการรันโปรเจกต์ผ่าน Docker
└── .gitignore                # จัดการไฟล์ที่ไม่ต้องการนำขึ้น Git (มีโฟลเดอร์ debug_scripts/)
```

## 🐞 การ Debug (สำหรับนักพัฒนา)

- **ดู Log ฐานข้อมูล:** ตัว Backend มีการตั้งค่าเปิด Log สำหรับติดตามคำสั่งที่มีการแก้ไขข้อมูล (`INSERT`, `UPDATE`, `DELETE`) คุณสามารถดูได้ผ่าน Docker logs:
  ```bash
  docker logs --tail 50 -f expense_api
  ```
- **สคริปต์ทดสอบ:** ไฟล์สคริปต์ที่ใช้สำหรับทดสอบ API และทดสอบเขียน Database ต่างๆ จะถูกแยกเก็บไว้ในโฟลเดอร์ `debug_scripts/` (โฟลเดอร์นี้ถูกตั้ง ignore ไว้ไม่ให้นำขึ้น Git)
