// Force Demo Mode BEFORE requiring any modules
process.env.USE_DEMO_DB = 'true';

import db from '../config/db';
import { initSchema } from '../models/schema';
import crypto from 'node:crypto';

console.log('🚀 Starting Mockup Database Generation...');

// Ensure schema is fully initialized on the demo database
initSchema();

// Function to generate random integer between min and max (cryptographically secure)
const getRandomInt = (min: number, max: number): number => crypto.randomInt(min, max + 1);

interface MockTx {
    id: string;
    date: string;
    description: string;
    amount: number;
    category_id: string;
    allocation_type: 'need' | 'want' | 'savings' | null;
    timestamp: string;
}

interface MockCal {
    date: string;
    day_type_id: string;
    note: string;
}

function buildCatMap(categories: Array<{ cat_id: string; cat_name: string; group_name: string; group_type: string }>): Record<string, string | undefined> {
    const catMap: Record<string, string | undefined> = {
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

    const genericExpenseCat = categories.find(c => c.group_type === 'expense')?.cat_id;
    Object.keys(catMap).forEach(key => {
        if (!catMap[key] && key !== 'salary') catMap[key] = genericExpenseCat;
    });

    return catMap;
}

function generateFixedExpenses(dateStr: string, catMap: Record<string, string | undefined>): MockTx[] {
    const txs: MockTx[] = [];
    if (catMap.rent) {
        txs.push({
            id: crypto.randomUUID(), date: dateStr, description: 'ค่าเช่าคอนโด',
            amount: 12000 * 100, category_id: catMap.rent, allocation_type: 'need', timestamp: `${dateStr} 10:00:00`
        });
    }
    if (catMap.internet) {
        txs.push({
            id: crypto.randomUUID(), date: dateStr, description: 'ค่าเน็ตบ้าน AIS',
            amount: 699 * 100, category_id: catMap.internet, allocation_type: 'need', timestamp: `${dateStr} 10:05:00`
        });
    }
    if (catMap.water_elec) {
        txs.push({
            id: crypto.randomUUID(), date: dateStr, description: 'ค่าไฟ',
            amount: getRandomInt(1200, 2500) * 100, category_id: catMap.water_elec, allocation_type: 'need', timestamp: `${dateStr} 10:10:00`
        });
    }
    if (catMap.entertainment) {
        txs.push({
            id: crypto.randomUUID(), date: dateStr, description: 'Netflix / Spotify',
            amount: 548 * 100, category_id: catMap.entertainment, allocation_type: 'want', timestamp: `${dateStr} 10:15:00`
        });
    }
    return txs;
}

function generateFoodExpenses(dateStr: string, isWeekend: boolean, foodCatId: string): MockTx[] {
    const txs: MockTx[] = [
        {
            id: crypto.randomUUID(), date: dateStr, description: 'ข้าวมื้อเที่ยง',
            amount: getRandomInt(60, 150) * 100, category_id: foodCatId, allocation_type: 'need', timestamp: `${dateStr} 12:30:00`
        }
    ];
    if (getRandomInt(1, 100) > 20) {
        txs.push({
            id: crypto.randomUUID(), date: dateStr, description: isWeekend ? 'ชาบู/ปิ้งย่าง' : 'มื้อเย็น',
            amount: isWeekend ? getRandomInt(500, 1500) * 100 : getRandomInt(80, 200) * 100,
            category_id: foodCatId, allocation_type: isWeekend ? 'want' : 'need', timestamp: `${dateStr} 19:00:00`
        });
    }
    return txs;
}

function generateTransportExpense(dateStr: string, isWeekend: boolean, transportCatId?: string): MockTx | null {
    if (isWeekend || !transportCatId) return null;
    return {
        id: crypto.randomUUID(), date: dateStr, description: 'BTS ไปกลับ',
        amount: getRandomInt(88, 120) * 100, category_id: transportCatId, allocation_type: 'need', timestamp: `${dateStr} 08:30:00`
    };
}

function generateCoffeeExpense(dateStr: string, coffeeCatId?: string): MockTx | null {
    if (!coffeeCatId || getRandomInt(1, 100) <= 40) return null;
    return {
        id: crypto.randomUUID(), date: dateStr, description: 'กาแฟสด',
        amount: getRandomInt(50, 150) * 100, category_id: coffeeCatId, allocation_type: 'want', timestamp: `${dateStr} 09:00:00`
    };
}

function generateShoppingExpense(dateStr: string, isWeekend: boolean, shoppingCatId?: string): MockTx | null {
    if (!isWeekend || !shoppingCatId || getRandomInt(1, 100) <= 50) return null;
    return {
        id: crypto.randomUUID(), date: dateStr, description: 'ซื้อของใช้ / Shopee',
        amount: getRandomInt(500, 3500) * 100, category_id: shoppingCatId, allocation_type: 'want', timestamp: `${dateStr} 15:00:00`
    };
}

function generateDailyExpenses(dateStr: string, isWeekend: boolean, catMap: Record<string, string | undefined>): MockTx[] {
    const txs: MockTx[] = [];

    if (catMap.food) {
        txs.push(...generateFoodExpenses(dateStr, isWeekend, catMap.food));
    }

    const transport = generateTransportExpense(dateStr, isWeekend, catMap.transport);
    if (transport) txs.push(transport);

    const coffee = generateCoffeeExpense(dateStr, catMap.coffee);
    if (coffee) txs.push(coffee);

    const shopping = generateShoppingExpense(dateStr, isWeekend, catMap.shopping);
    if (shopping) txs.push(shopping);

    return txs;
}

const generateMockupData = () => {
    // 1. Clean existing data
    db.exec("DELETE FROM transactions");
    db.exec("DELETE FROM calendar_days");
    db.exec("DELETE FROM transactions_fts");
    console.log('🧹 Cleared existing demo data.');

    // 2. Fetch required reference data
    const categories = db.prepare("SELECT c.id as cat_id, c.name as cat_name, cg.name as group_name, cg.type as group_type FROM categories c JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id").all() as Array<{
        cat_id: string;
        cat_name: string;
        group_name: string;
        group_type: string;
    }>;
    
    const catMap = buildCatMap(categories);

    const dayTypes = db.prepare("SELECT id, name FROM day_types").all() as Array<{ id: string; name: string }>;
    const dtMap: Record<string, string | undefined> = {
        workday: dayTypes.find(d => d.name === 'workday')?.id,
        holiday: dayTypes.find(d => d.name === 'holiday')?.id,
    };

    // 3. Generation Logic (Last 2 Years)
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 2);
    startDate.setDate(1); // Start on the 1st of the month

    const endDate = new Date(); // Today

    const transactionsToInsert: MockTx[] = [];
    const calendarDaysToInsert: MockCal[] = [];

    const insertTx = db.prepare(`
        INSERT INTO transactions (id, date, description, amount, category_id, allocation_type, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertCal = db.prepare(`
        INSERT INTO calendar_days (date, day_type_id, note) VALUES (?, ?, ?)
    `);

    // Prepare Bulk Insert Transaction
    const performBulkInsert = db.transaction((txs: MockTx[], cals: MockCal[]) => {
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
                id: crypto.randomUUID(),
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
            transactionsToInsert.push(...generateFixedExpenses(dateStr, catMap));
        }

        // 3.4 Add Daily Variable Expenses
        transactionsToInsert.push(...generateDailyExpenses(dateStr, isWeekend, catMap));

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
} catch (e) {
    console.error('❌ Error generating mockup data:', e);
} finally {
    db.close();
}
