"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Force Demo Mode BEFORE requiring any modules
process.env.USE_DEMO_DB = 'true';
const db_1 = __importDefault(require("../config/db"));
const schema_1 = require("../models/schema");
const crypto_1 = __importDefault(require("crypto"));
console.log('🚀 Starting Mockup Database Generation...');
// Ensure schema is fully initialized on the demo database
(0, schema_1.initSchema)();
// Function to generate random integer between min and max (cryptographically secure)
const getRandomInt = (min, max) => crypto_1.default.randomInt(min, max + 1);
const generateMockupData = () => {
    // 1. Clean existing data
    db_1.default.exec("DELETE FROM transactions");
    db_1.default.exec("DELETE FROM calendar_days");
    db_1.default.exec("DELETE FROM transactions_fts");
    console.log('🧹 Cleared existing demo data.');
    // 2. Fetch required reference data
    const categories = db_1.default.prepare("SELECT c.id as cat_id, c.name as cat_name, cg.name as group_name, cg.type as group_type FROM categories c JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id").all();
    // Build category maps for quick access
    const catMap = {
        salary: categories.find(c => c.group_name === 'รายได้หลัก' || c.group_type === 'income')?.cat_id,
        food: categories.find(c => c.cat_name.includes('อาหาร') || c.cat_name === 'ค่าอาหาร')?.cat_id,
        transport: categories.find(c => c.cat_name.includes('เดินทาง') || c.cat_name.includes('BTS'))?.cat_id,
        shopping: categories.find(c => c.cat_name.includes('ช้อปปิ้ง'))?.cat_id,
        entertainment: categories.find(c => c.cat_name.includes('บันเทิง'))?.cat_id,
        rent: categories.find(c => c.cat_name.includes('เช่า') || c.cat_name.includes('หอพัก'))?.cat_id,
        internet: categories.find(c => c.cat_name.includes('อินเทอร์เน็ต') || c.cat_name.includes('เน็ต'))?.cat_id,
        water_elec: categories.find(c => c.cat_name.includes('น้ำ') || c.cat_name.includes('ไฟ'))?.cat_id,
        coffee: categories.find(c => c.cat_name.includes('กาแฟ') || c.cat_name.includes('เครื่องดื่ม'))?.cat_id,
    };
    // Use a generic expense category if specific ones aren't found
    const genericExpenseCat = categories.find(c => c.group_type === 'expense')?.cat_id;
    // Fallback missing categories to generic
    Object.keys(catMap).forEach(key => {
        if (!catMap[key] && key !== 'salary')
            catMap[key] = genericExpenseCat;
    });
    const dayTypes = db_1.default.prepare("SELECT id, name FROM day_types").all();
    const dtMap = {
        workday: dayTypes.find(d => d.name === 'workday')?.id,
        holiday: dayTypes.find(d => d.name === 'holiday')?.id,
    };
    // 3. Generation Logic (Last 2 Years)
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    startDate.setDate(1); // Start on the 1st of the month
    const endDate = new Date(); // Today
    const transactionsToInsert = [];
    const calendarDaysToInsert = [];
    const insertTx = db_1.default.prepare(`
        INSERT INTO transactions (id, date, description, amount, category_id, allocation_type, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertCal = db_1.default.prepare(`
        INSERT INTO calendar_days (date, day_type_id, note) VALUES (?, ?, ?)
    `);
    // Prepare Bulk Insert Transaction
    const performBulkInsert = db_1.default.transaction((txs, cals) => {
        for (const tx of txs) {
            insertTx.run(tx.id, tx.date, tx.description, tx.amount, tx.category_id, tx.allocation_type, tx.timestamp, tx.timestamp);
        }
        for (const cal of cals) {
            insertCal.run(cal.date, cal.day_type_id, cal.note);
        }
    });
    let currentDate = new Date(startDate);
    console.log(`⏳ Generating data from ${currentDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);
    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isStartOfMonth = currentDate.getDate() === 1;
        const isEndOfMonth = currentDate.getDate() === new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        // 3.1 Assign Day Type
        calendarDaysToInsert.push({
            date: dateStr,
            day_type_id: (isWeekend ? dtMap.holiday : dtMap.workday) || '',
            note: isWeekend ? 'วันหยุดสุดสัปดาห์' : ''
        });
        // 3.2 Add Income (Salary at end of month)
        if (isEndOfMonth && catMap.salary) {
            transactionsToInsert.push({
                id: crypto_1.default.randomUUID(),
                date: dateStr,
                description: 'เงินเดือน',
                amount: getRandomInt(45000, 55000) * 100, // 45k-55k Baht in Satang
                category_id: catMap.salary,
                allocation_type: null,
                timestamp: `${dateStr} 08:00:00`
            });
        }
        // 3.3 Add Fixed Expenses (1st of month)
        if (isStartOfMonth) {
            if (catMap.rent) {
                transactionsToInsert.push({
                    id: crypto_1.default.randomUUID(), date: dateStr, description: 'ค่าเช่าคอนโด',
                    amount: 12000 * 100, category_id: catMap.rent, allocation_type: 'need', timestamp: `${dateStr} 10:00:00`
                });
            }
            if (catMap.internet) {
                transactionsToInsert.push({
                    id: crypto_1.default.randomUUID(), date: dateStr, description: 'ค่าเน็ตบ้าน AIS',
                    amount: 699 * 100, category_id: catMap.internet, allocation_type: 'need', timestamp: `${dateStr} 10:05:00`
                });
            }
            if (catMap.water_elec) {
                transactionsToInsert.push({
                    id: crypto_1.default.randomUUID(), date: dateStr, description: 'ค่าไฟ',
                    amount: getRandomInt(1200, 2500) * 100, category_id: catMap.water_elec, allocation_type: 'need', timestamp: `${dateStr} 10:10:00`
                });
            }
            if (catMap.entertainment) {
                transactionsToInsert.push({
                    id: crypto_1.default.randomUUID(), date: dateStr, description: 'Netflix / Spotify',
                    amount: 548 * 100, category_id: catMap.entertainment, allocation_type: 'want', timestamp: `${dateStr} 10:15:00`
                });
            }
        }
        // 3.4 Add Daily Variable Expenses
        // Food (2-3 meals)
        if (catMap.food) {
            transactionsToInsert.push({
                id: crypto_1.default.randomUUID(), date: dateStr, description: 'ข้าวมื้อเที่ยง',
                amount: getRandomInt(60, 150) * 100, category_id: catMap.food, allocation_type: 'need', timestamp: `${dateStr} 12:30:00`
            });
            if (getRandomInt(1, 100) > 20) { // 80% chance of dinner expense
                transactionsToInsert.push({
                    id: crypto_1.default.randomUUID(), date: dateStr, description: isWeekend ? 'ชาบู/ปิ้งย่าง' : 'มื้อเย็น',
                    amount: isWeekend ? getRandomInt(500, 1500) * 100 : getRandomInt(80, 200) * 100,
                    category_id: catMap.food, allocation_type: isWeekend ? 'want' : 'need', timestamp: `${dateStr} 19:00:00`
                });
            }
        }
        // Transport (Workdays mostly)
        if (!isWeekend && catMap.transport) {
            transactionsToInsert.push({
                id: crypto_1.default.randomUUID(), date: dateStr, description: 'BTS ไปกลับ',
                amount: getRandomInt(88, 120) * 100, category_id: catMap.transport, allocation_type: 'need', timestamp: `${dateStr} 08:30:00`
            });
        }
        // Coffee (Random)
        if (catMap.coffee && getRandomInt(1, 100) > 40) { // 60% chance
            transactionsToInsert.push({
                id: crypto_1.default.randomUUID(), date: dateStr, description: 'กาแฟสด',
                amount: getRandomInt(50, 150) * 100, category_id: catMap.coffee, allocation_type: 'want', timestamp: `${dateStr} 09:00:00`
            });
        }
        // Shopping (Weekends mostly)
        if (isWeekend && catMap.shopping && getRandomInt(1, 100) > 50) { // 50% chance on weekends
            transactionsToInsert.push({
                id: crypto_1.default.randomUUID(), date: dateStr, description: 'ซื้อของใช้ / Shopee',
                amount: getRandomInt(500, 3500) * 100, category_id: catMap.shopping, allocation_type: 'want', timestamp: `${dateStr} 15:00:00`
            });
        }
        currentDate.setDate(currentDate.getDate() + 1); // Next day
    }
    console.log(`📦 Prepared ${transactionsToInsert.length} transactions and ${calendarDaysToInsert.length} calendar days.`);
    // Execute Bulk Insert
    console.time('BulkInsert');
    performBulkInsert(transactionsToInsert, calendarDaysToInsert);
    console.timeEnd('BulkInsert');
    console.log('✅ Mockup Data Seeded Successfully!');
};
try {
    generateMockupData();
}
catch (e) {
    console.error('❌ Error generating mockup data:', e);
}
finally {
    db_1.default.close();
}
