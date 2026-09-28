# Cashflow Shark

[![Vibe Coding](https://img.shields.io/badge/Vibe_Coding-100%25_AI_Built-ff69b4?style=for-the-badge&logo=probot)](https://github.com/)
[![Platform](https://img.shields.io/badge/Platform-PC--First_/_Desktop-blue?style=for-the-badge&logo=windows)](https://github.com/)
[![Tech Stack](https://img.shields.io/badge/Stack-React_TS_|_Node_TS_|_SQLite-3178C6?style=for-the-badge&logo=typescript)](https://github.com/)
[![Tests](https://img.shields.io/badge/Tests-Vitest-6E9F18?style=for-the-badge&logo=vitest)](https://github.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

Cashflow Shark เป็นแอปจดรายรับรายจ่ายส่วนตัว (ใช้กับธุรกิจเล็กๆ ได้ด้วย) ที่บันทึกวันทำงานควบคู่ไปด้วย ออกแบบมาให้ใช้บนคอมพิวเตอร์เท่านั้น หน้าจอจึงอัดข้อมูลได้แน่นกว่าแอปมือถือ ส่วนหน้าตาใช้ธีมมืดโทน Ferrari (พื้นเกือบดำกับแดง Rosso Corsa)

> *"Keep swimming or drown."* ฉลามต้องว่ายน้ำตลอดเวลาถึงจะมีชีวิตรอด เรื่องเงินก็เหมือนกัน ถ้าอยากเป็นอิสระทางการเงินก็ต้องไม่หยุด

## สร้างด้วย AI ทั้งหมด

โค้ดทั้งโปรเจกต์เขียนโดย AI ไม่มีส่วนไหนที่คนพิมพ์เอง เครื่องมือที่ใช้มีสามตัว:

- Antigravity (Google DeepMind) วางโครงสร้างโปรเจกต์ จัดไฟล์ รันคำสั่ง และคุมภาพรวม
- Gemini (Flash / Pro) ทำฝั่งตรรกะ: สูตรการเงิน ฐานข้อมูล และคำสั่ง SQL / analytical views
- Claude ขัดเกลา UI/UX: ปรับ component ให้ละเอียด ทำธีม Ferrari มุมเหลี่ยม 0px และระบบ UI แบบไม่มี animation

ทั้ง SQLite schema, Express API และหน้า React สร้างผ่าน prompt และ agentic workflow

## ฟีเจอร์

### 1. การ์ดสรุปสามคอลัมน์
- การ์ดแบ่งเป็นสามกลุ่มตามหน้าที่: `VitalsDomainCard`, `StrategicDomainCard`, `ForecastingDomainCard`
- การ์ดใบเดียวแสดงทั้งกระแสเงินสดสุทธิและอัตราการออม (สูตรแบบ CPA) พร้อมเกรด A-F
- พยากรณ์ยอดถึงสิ้นเดือนจากพฤติกรรมการจ่ายจริง และบอกว่าวันละใช้ได้อีกเท่าไร (Safe-to-Spend Per Day)
- การ์ดสัดส่วนรายจ่ายมีสองโหมด (ตามหมวดหมู่ / ตามการจัดสรร) วางซ้อนกันในช่อง grid เดียว (`[grid-area:1/1]`) การ์ดจึงสูงเท่าเดิมไม่ว่าจะสลับโหมดไหน โดยไม่ต้องมี scrollbar หรือกำหนดความสูงตายตัว ถ้าเดือนนั้นไม่มีรายรับจะขึ้นป้ายเตือน

### 2. แผนภาพ Sankey และกราฟหลัก
- Sankey 5 คอลัมน์ แสดงเงินไหลจาก `Income Groups` → `Total Cash` → `Expenses & Savings Groups` → `Categories` → `Detailed Segments`
- ตำแหน่ง node ถูกล็อกด้วย priority และ column ตอนกรองข้อมูลแผนภาพจึงไม่สลับตำแหน่ง
- กราฟหลักแยกเป็น component ย่อย (`MainChartHeader`, `MainChartToolbar`, `MainChartLegend`, `MainChartCategoryFilter`) ส่วน logic อยู่ใน hook (`useSankeyEngine`, `useChartDataEngine`, `useChartOptions`) ไฟล์หลักเล็กลงกว่า 85%

### 3. ตารางกระแสเงินสดรายเดือน
- ตารางแยกเป็น component ย่อย (`CashflowTableHeader`, `CashflowTableRow`, `CashflowTableGroupCells`, `CashflowTableSummaryCells`, `CashflowTableFooter`, `FilterToolbar`, `GroupTooltip`) และคำนวณผ่าน hook `useFilteredMaps`
- หมวดหมู่ที่มีข้อมูลจริง (`activeCatsByGroup`) คำนวณครั้งเดียวต่อการเปลี่ยนข้อมูล แต่ละเซลล์ไม่ต้องสแกนซ้ำ
- หัวกลุ่มแตกเป็นคอลัมน์ย่อยของแต่ละหมวดให้อัตโนมัติ และซ่อนคอลัมน์ที่ยอดเป็น 0 ตอนกรอง

### 4. ตารางบัญชีแนวนอน (heatmap)
- ชี้เมาส์แล้วแถวกับคอลัมน์จะไฮไลต์เป็นกากบาทด้วย CSS ล้วน (`.heatmap-cell:hover::after`) ได้ 60fps เพราะ React ไม่ต้อง re-render
- คอลัมน์แรก (วันที่) และคอลัมน์สุดท้าย (ยอดรวมรายวัน) ตรึงไว้ด้วย `position: sticky` เลื่อนแนวนอนได้เหมือน spreadsheet
- ในมุมมองรายการ คลิกแก้ยอดเงินและคำอธิบายได้ทันที

### 5. ปฏิทินและบันทึกวันทำงาน
- บันทึกสถานะวัน (ทำงาน, วันหยุด, ลาป่วย, ลากิจ, ลาพักร้อน, OT ฯลฯ) คู่กับรายการเงิน เพื่อดูว่าวันหยุดใช้เงินมากกว่าปกติแค่ไหน
- ไทม์ไลน์ 12 เดือนสลับได้สองแบบ คือแถบแนวนอนกับ grid จัดกึ่งกลาง เซลล์ล็อกไว้ที่ 118px เพื่อกันปัญหา subpixel ของเบราว์เซอร์
- ในมุมมอง GitHub ใช้ clone ที่อยู่นอกจอ (`hiddenLegendCloneRef`) วัดความสูงของ legend rail ไว้ก่อน สลับระหว่างโหมดประเภทวันกับ heatmap แล้วความสูงจึงไม่กระโดด และตารางอยู่กึ่งกลาง (`justify-[safe_center]`)

### 6. ไอคอน Lucide 327 ตัว
- ห้ามใช้อิโมจิที่พิมพ์เอง ไอคอนทุกตัวในระบบเป็น Lucide สีเดียว
- ตัวเลือกไอคอนแบ่งหมวด (ไลฟ์สไตล์ เทคโนโลยี การเงิน ฯลฯ) ค้นหาได้ทันที และมีไอคอนสำรองมาตรฐาน (`coins`, `piggy-bank`, `tag`)

### 7. ค้นหาและเพิ่มรายการ
- ค้นหารายการย้อนหลังหลายปีได้ในระดับมิลลิวินาทีด้วย SQLite FTS5
- หน้าต่างเดียวเพิ่มได้หลายรายการ และแนะนำรายการจากประวัติที่เคยจด
- ส่งออก CSV/JSON โดยดึงจากฐานข้อมูลตรง ตัวกรองบนหน้าจอจึงไม่ทำให้ข้อมูลหาย

### 8. ตัวกรองและการวิเคราะห์
- ปุ่มซ่อน WANT ตัดรายจ่ายตามใจออกจากการคำนวณ เหลือแค่ส่วนจำเป็น (Needs) กับเงินออม (Savings)
- บริการรายเดือนถูกจัดเข้ากลุ่ม 'ซอฟต์แวร์ & AI', 'สมาชิกช้อปปิ้ง' และ 'ความบันเทิง & สตรีมมิ่ง' ให้อัตโนมัติ

### 9. สำรองข้อมูลและ log
- สำรองฐานข้อมูลลง `/backups/` ทุกครั้งที่เปิดเซิร์ฟเวอร์
- กด `[B]` ใน terminal หรือเรียก `/api/backup` เพื่อสำรองเมื่อไรก็ได้
- ทุกการเพิ่ม/แก้ไข/ลบ พิมพ์ log ภาษาไทยลง terminal ทันที

### 10. ความปลอดภัย
- `helmet v8.3.0` ใส่ HTTP security headers ให้ (กัน XSS, clickjacking, MIME sniffing)
- CORS อนุญาตเฉพาะ `localhost:5173`, `127.0.0.1:5173`, `localhost:3000` และเปลี่ยนได้ผ่าน env `ALLOWED_ORIGINS`
- ตอนปิดเซิร์ฟเวอร์จะปิด HTTP server รอ request ค้างให้เสร็จ แล้วปิด SQLite ก่อนออก ถ้าเกิน 5 วินาทีจะบังคับปิด
- ทุกตารางใช้ SQLite `STRICT` ตารางเก่าที่ยังไม่เป็น STRICT จะถูก migrate ให้อัตโนมัติ
- ทั้ง payload ที่แก้ข้อมูลและ query parameter ผ่าน Zod ก่อนถึง service

## Tech stack

| ชั้น | เทคโนโลยีและเวอร์ชัน | หมายเหตุ |
| :--- | :--- | :--- |
| Frontend | `React v18.2.0`, `TypeScript v5.3.3`, `Vite v5.0.8` | SPA, strict types, HMR |
| Styling | `Tailwind CSS v3.4.1`, `@fontsource/inter`, `@fontsource/bai-jamjuree` | ธีม Ferrari (`#181818`, `#da291c`), `.tabular-nums` |
| กราฟ | `Chart.js v4.4.1`, `react-chartjs-2 v5.2.0`, `chartjs-chart-sankey v0.14.0` | Sankey 5 คอลัมน์, กราฟหลายแกน |
| ฟอร์ม | `react-hook-form v7.75.0`, `zod v4.4.3`, `@hookform/resolvers v5.2.2` | ตรวจค่าฝั่ง client และแปลงเป็นสตางค์ |
| Backend runtime | `Node.js v20 (LTS)` | |
| API | `Express.js v4.18.2`, `TypeScript v5.3.3`, `tsx v4.7.1` | REST API, controller และ service มี type |
| ฐานข้อมูล | `better-sqlite3 ^9.4.3` | SQLite แบบ synchronous, FTS5, STRICT mode |
| ความปลอดภัย | `helmet v8.3.0`, `cors v2.8.5` | security headers, CORS whitelist |
| เทสต์ | `Vitest v4.1.11` (backend), `Vitest v2.1.9` (frontend) | 100+ unit tests ครอบคลุมสูตรการเงิน, formatter, CRUD, FTS และ UI component |

## ฐานข้อมูล

เงินทุกจำนวนเก็บและคำนวณเป็นสตางค์ (จำนวนเต็ม) เพื่อไม่ให้ทศนิยมแบบ floating-point คลาดเคลื่อน แปลงเป็นบาทตอนแสดงบนหน้าจอเท่านั้น

ทุกตารางใช้ SQLite `STRICT` ตารางเก่าที่ยังไม่เป็น STRICT จะถูก migrate ตอนเปิดเซิร์ฟเวอร์ ทำใน transaction เดียว รันซ้ำได้ และไม่ทำข้อมูลหาย

```
┌──────────────────────────────────────────────────────────────────────┐
│                    SQLite Database Engine (STRICT Mode)              │
│  PRAGMA journal_mode = DELETE  │  PRAGMA foreign_keys = ON          │
│  PRAGMA synchronous = FULL     │  PRAGMA busy_timeout = 5000        │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
       ┌────────────────────────┼────────────────────────┐
       ▼                        ▼                        ▼
┌──────────────┐       ┌──────────────┐         ┌─────────────────┐
│ cashflow_    │ 1   * │ categories   │ 1     * │ transactions    │
│ groups       ├───────┤              ├─────────┤ (Amount Satang) │
│   STRICT     │       │   STRICT     │         │    STRICT       │
└──────────────┘       └──────────────┘         └────────┬────────┘
                                                         │ Triggers
       ┌─────────────────────────────────────────────────┤
       ▼                        ▼                        ▼
┌──────────────┐       ┌──────────────┐         ┌─────────────────┐
│ day_types    │ 1   * │calendar_days │         │transactions_fts │
│   STRICT     ├───────┤   STRICT     │         │ (FTS5 Search)   │
└──────────────┘       └──────────────┘         └─────────────────┘
```

### ตาราง
- `cashflow_groups`: กลุ่มใหญ่ (`income`, `expense`, `savings`) พร้อมประเภทการจัดสรร (`need`, `want`, `savings`) สี และไอคอน
- `categories`: หมวดหมู่ย่อยที่ผูกกับกลุ่ม (`order_index`, `icon`, `color`)
- `transactions`: รายการจริง ยอดเงินเป็นสตางค์ มีคอลัมน์ `allocation_type` และลบแบบ soft delete (`is_deleted`) ประวัติจึงยังตรวจย้อนหลังได้
- `day_types`: ประเภทวัน (ทำงาน, วันหยุด, ลาป่วย, OT ฯลฯ) พร้อมสีและไอคอน
- `calendar_days`: ประเภทวันและโน้ตของแต่ละวัน (`date` เป็น PK รูปแบบ `YYYY-MM-DD`)
- `settings`: ค่าตั้งค่าแบบ key-value
- `transactions_fts`: FTS5 virtual table สำหรับค้นหาคำอธิบายรายการ

### Views และ triggers
- `v_monthly_summary`: ยอดรายรับ (`income_satang`) รายจ่าย (`expense_satang`) และเงินออม (`savings_satang`) รายเดือน
- `v_daily_burn`: รายจ่ายรายวัน (`daily_expense_satang`) คู่กับประเภทวัน ใช้ดูพฤติกรรมการจ่าย
- `v_category_monthly`: ยอดของแต่ละหมวดในแต่ละเดือน
- triggers: `trg_transactions_updated_at` อัปเดต timestamp ให้เอง และ `trg_transactions_ai/au/ad` ซิงค์ดัชนี FTS5 ทุกครั้งที่เพิ่ม/แก้/ลบรายการ
- ใช้ `PRAGMA journal_mode = DELETE` เพราะเสถียรกว่าบน Docker bind mount และ filesystem ของ Windows

## เริ่มใช้งาน

รันได้สามแบบ

### แบบที่ 1: Local development

ต้องมี [Node.js v20 (LTS)](https://nodejs.org/) ขึ้นไป และ `npm` หรือ `yarn`

```bash
# 1. ติดตั้ง Dependencies และสตาร์ท Backend API (Port 3000)
cd backend
npm install
npm run dev

# 2. เปิดอีกหนึ่ง Terminal แล้วติดตั้ง Dependencies และสตาร์ท Frontend Web UI (Port 5173)
cd frontend
npm install
npm run dev
```

- Frontend: [http://localhost:5173](http://localhost:5173) (มี Vite HMR)
- Backend API: [http://localhost:3000](http://localhost:3000)

### แบบที่ 2: รันแบบ production พอร์ตเดียว

ใช้จริงบนเครื่องตัวเองได้โดยไม่ต้องเปิด terminal สองหน้าต่าง

```bash
# 1. บิลด์ Frontend เป็น Static Assets
cd frontend
npm install
npm run build

# 2. บิลด์และสตาร์ท Backend Server เพื่อเสิร์ฟทั้ง Web UI และ REST API พร้อมกัน
cd ../backend
npm install
npm run build
npm start
```

- ทั้งหน้าเว็บและ API: [http://localhost:3000](http://localhost:3000)

### แบบที่ 3: Docker Compose

ไม่ต้องลง Node.js บนเครื่อง

```bash
# สตาร์ท Container ในโหมด Background
docker-compose up -d

# ดูบันทึกการทำงาน (Logs) ของระบบ
docker-compose logs -f

# ปิดการทำงานของระบบ
docker-compose down
```

- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend API: [http://localhost:3000](http://localhost:3000)

## เทสต์

ใช้ Vitest ทั้ง frontend และ backend

```bash
# รันเทสต์ Backend (CRUD, FTS Search, Satang Math, STRICT Mode)
cd backend
npm test

# รันเทสต์ Frontend (Formatters, Analytics Helpers, Thai Date Utils)
cd frontend
npm test
```

### ไฟล์เทสต์ (100+ tests)
| ไฟล์ | ทดสอบอะไร |
| :--- | :--- |
| `transactionService.test.ts` (Backend) | Upsert, Delete, DeleteByMonth (index-friendly range), FTS5 Search, STRICT schema verification |
| `formatters.test.ts` (Frontend) | Satang↔Baht conversion, `formatMoney`, Thai months/days, `hexToRgb`, Period-over-Period delta |
| `analyticsHelpers.test.ts` (Frontend) | `createCategoryMap`, `extractYearMonth`, `generateCashflowMap` (income/expense/savings aggregation), `calculateDayTypeCounts` |
| `ExpenseProportion.test.ts` (Frontend) | การคำนวณสัดส่วนรายจ่าย, การจำลองปิดหมวดหมู่, ลำดับการเรียง และการจัดสรรงบ |
| `ActivityTimeline.test.ts` (Frontend) | การนับประเภทวัน, เกณฑ์ความเข้มของ heatmap, โหมด GitHub และโหมดปฏิทิน |
| `exportUtils.test.ts` (Frontend) | การแปลงรายการเป็น CSV/JSON โดยไม่ติดตัวกรองบนหน้าจอ |
| `datePickerHelpers.test.ts` (Frontend) | ขอบเขตวันที่, การแปลงปี พ.ศ./ค.ศ. และการอ่านวันที่ภาษาไทย |
| `ledgerHelpers.test.ts` (Frontend) | การสร้าง pivot matrix ของตารางบัญชีแนวนอน และผลรวมรายวัน/รายหมวด |
| `categoryIcons.test.ts` (Frontend) | ความถูกต้องของการแมปไอคอน Lucide 327 ตัว |
| `categorySelectHelpers.test.ts` (Frontend) | การจัดกลุ่มหมวดหมู่ย่อยและการค้นหาหมวดหมู่ |
| `guideUtils.test.ts` (Frontend) | ตัวช่วยของคู่มือนำเข้า และการตรวจโครงสร้างไฟล์ที่นำเข้า |

## ความปลอดภัย

| ชั้น | ใช้อะไร | รายละเอียด |
| :--- | :--- | :--- |
| HTTP headers | `helmet v8.3.0` | กัน XSS, clickjacking, MIME sniffing (ปิด CSP ไว้เพราะกราฟใช้ inline) |
| CORS | Origin whitelist | เฉพาะ `localhost:5173`, `127.0.0.1:5173`, `localhost:3000` และ override ได้ด้วย env `ALLOWED_ORIGINS` |
| ตรวจ input | Zod | ทั้ง mutation payload และ query parameter ผ่าน schema |
| SQL injection | Parameterized queries | ทุก query ใช้ `db.prepare()` ไม่ต่อ string |
| ความถูกต้องของข้อมูล | SQLite STRICT | บังคับชนิดข้อมูลที่ระดับ storage กัน type ถูกแปลงเงียบๆ |
| การปิดเซิร์ฟเวอร์ | Graceful shutdown | ปิด HTTP → รอ request ค้าง → ปิด SQLite → ออก (timeout 5 วินาที) |

## License

MIT License ดูรายละเอียดที่ [LICENSE](LICENSE)

> สร้างโดย Cashflow Shark ร่วมกับ Antigravity, Gemini และ Claude
