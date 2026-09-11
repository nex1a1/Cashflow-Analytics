import db from '../config/db';
import { Item, ItemCategory, ItemStatus, ItemWithDetails } from '../types';

export interface CreateItemDTO {
  category_id: number;
  name: string;
  brand_model?: string | null;
  source?: string | null;
  status?: ItemStatus;
  price?: number | null; // Baht
  price_satang?: number | null; // Satang
  purchased_at?: string | null;
  broken_at?: string | null;
  warranty_until?: string | null;
  priority?: number;
  description?: string | null;
}

export interface UpdateItemDTO {
  category_id?: number;
  name?: string;
  brand_model?: string | null;
  source?: string | null;
  status?: ItemStatus;
  price?: number | null; // Baht
  price_satang?: number | null; // Satang
  purchased_at?: string | null;
  broken_at?: string | null;
  warranty_until?: string | null;
  priority?: number;
  description?: string | null;
}

export interface LinkedTransactionInfo {
  id: string;
  date: string;
  description: string | null;
  amount: number; // Baht
  amount_satang: number;
  category_id: string;
  category_name: string;
  group_name: string;
  group_type: string;
}

class ItemService {
  /**
   * Get all items with calculated pricing and linked transactions summary.
   */
  getAll(filters?: { status?: string; categoryId?: number; includeCancelled?: boolean }): ItemWithDetails[] {
    let query = `
      SELECT 
        i.id,
        i.category_id,
        i.name,
        i.brand_model,
        i.source,
        i.status,
        i.price_satang,
        i.purchased_at,
        i.broken_at,
        i.warranty_until,
        i.priority,
        i.description,
        i.created_at,
        i.updated_at,
        ic.name as category_name,
        COALESCE(COUNT(DISTINCT CASE WHEN t.is_deleted = 0 THEN t.id END), 0) as linked_count,
        COALESCE(SUM(CASE WHEN t.is_deleted = 0 THEN t.amount ELSE 0 END), 0) as linked_satang
      FROM items i
      JOIN item_categories ic ON i.category_id = ic.id
      LEFT JOIN item_transactions it ON i.id = it.item_id
      LEFT JOIN transactions t ON it.transaction_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters?.status) {
      query += ` AND i.status = ?`;
      params.push(filters.status);
    } else if (!filters?.includeCancelled) {
      query += ` AND i.status != 'cancelled'`;
    }

    if (filters?.categoryId) {
      query += ` AND i.category_id = ?`;
      params.push(filters.categoryId);
    }

    query += `
      GROUP BY i.id
      ORDER BY i.priority DESC, i.purchased_at DESC, i.created_at DESC
    `;

    const rows = db.prepare(query).all(...params) as Array<Item & {
      category_name: string;
      linked_count: number;
      linked_satang: number;
    }>;

    return rows.map(row => {
      const linked_count = Number(row.linked_count) || 0;
      const linked_satang = Number(row.linked_satang) || 0;
      const display_price_satang = linked_count > 0 ? linked_satang : (row.price_satang || 0);

      return {
        ...row,
        linked_count,
        linked_satang,
        display_price_satang,
        display_price: display_price_satang / 100,
        price: row.price_satang != null ? row.price_satang / 100 : null,
      };
    });
  }

  /**
   * Get single item by ID with list of all linked transactions.
   */
  getById(id: number): (ItemWithDetails & { linked_transactions: LinkedTransactionInfo[] }) | null {
    const itemQuery = `
      SELECT 
        i.id,
        i.category_id,
        i.name,
        i.brand_model,
        i.source,
        i.status,
        i.price_satang,
        i.purchased_at,
        i.broken_at,
        i.warranty_until,
        i.priority,
        i.description,
        i.created_at,
        i.updated_at,
        ic.name as category_name,
        COALESCE(COUNT(DISTINCT CASE WHEN t.is_deleted = 0 THEN t.id END), 0) as linked_count,
        COALESCE(SUM(CASE WHEN t.is_deleted = 0 THEN t.amount ELSE 0 END), 0) as linked_satang
      FROM items i
      JOIN item_categories ic ON i.category_id = ic.id
      LEFT JOIN item_transactions it ON i.id = it.item_id
      LEFT JOIN transactions t ON it.transaction_id = t.id
      WHERE i.id = ?
      GROUP BY i.id
    `;
    const row = db.prepare(itemQuery).get(id) as (Item & {
      category_name: string;
      linked_count: number;
      linked_satang: number;
    }) | undefined;

    if (!row) return null;

    const txQuery = `
      SELECT 
        t.id, 
        t.date, 
        t.description, 
        t.amount / 100.0 as amount,
        t.amount as amount_satang,
        t.category_id,
        c.name as category_name,
        cg.name as group_name,
        cg.type as group_type
      FROM item_transactions it
      JOIN transactions t ON it.transaction_id = t.id
      JOIN categories c ON t.category_id = c.id
      JOIN cashflow_groups cg ON c.cashflow_group_id = cg.id
      WHERE it.item_id = ? AND t.is_deleted = 0
      ORDER BY t.date DESC, t.created_at DESC
    `;
    const linked_transactions = db.prepare(txQuery).all(id) as LinkedTransactionInfo[];

    const linked_count = Number(row.linked_count) || 0;
    const linked_satang = Number(row.linked_satang) || 0;
    const display_price_satang = linked_count > 0 ? linked_satang : (row.price_satang || 0);

    return {
      ...row,
      linked_count,
      linked_satang,
      display_price_satang,
      display_price: display_price_satang / 100,
      price: row.price_satang != null ? row.price_satang / 100 : null,
      linked_transactions
    };
  }

  /**
   * Create a new item.
   */
  create(data: CreateItemDTO): ItemWithDetails {
    // Resolve price_satang: convert Baht to Satang if price is given, or use price_satang directly
    let price_satang: number | null = null;
    if (data.price_satang != null) {
      price_satang = data.price_satang;
    } else if (data.price != null) {
      price_satang = Math.round(data.price * 100);
    }

    const stmt = db.prepare(`
      INSERT INTO items (
        category_id, name, brand_model, source, status, price_satang,
        purchased_at, broken_at, warranty_until, priority, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      data.category_id,
      data.name,
      data.brand_model || null,
      data.source || null,
      data.status || 'planned',
      price_satang,
      data.purchased_at || null,
      data.broken_at || null,
      data.warranty_until || null,
      data.priority ?? 0,
      data.description || null
    );

    const insertedId = Number(result.lastInsertRowid);
    const item = this.getById(insertedId);
    if (!item) throw new Error('Failed to retrieve newly created item');

    const priceText = item.display_price != null
      ? `฿${item.display_price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'ไม่ระบุราคา';
    console.log(`📦 [Service: Item Create] บันทึกสิ่งของใหม่สำเร็จ | ID: ${item.id} | "${item.name}" | สถานะ: ${item.status} | ${priceText} | หมวดหมู่: "${item.category_name}"`);

    return item;
  }

  /**
   * Update an existing item.
   */
  update(id: number, data: UpdateItemDTO): ItemWithDetails {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Item with id ${id} not found`);
    }

    let price_satang = existing.price_satang;
    if (data.price_satang !== undefined) {
      price_satang = data.price_satang;
    } else if (data.price !== undefined) {
      price_satang = data.price != null ? Math.round(data.price * 100) : null;
    }

    const stmt = db.prepare(`
      UPDATE items SET
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        brand_model = ?,
        source = ?,
        status = COALESCE(?, status),
        price_satang = ?,
        purchased_at = ?,
        broken_at = ?,
        warranty_until = ?,
        priority = COALESCE(?, priority),
        description = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      data.category_id ?? null,
      data.name ?? null,
      data.brand_model !== undefined ? data.brand_model : existing.brand_model,
      data.source !== undefined ? data.source : existing.source,
      data.status ?? null,
      price_satang,
      data.purchased_at !== undefined ? data.purchased_at : existing.purchased_at,
      data.broken_at !== undefined ? data.broken_at : existing.broken_at,
      data.warranty_until !== undefined ? data.warranty_until : existing.warranty_until,
      data.priority ?? null,
      data.description !== undefined ? data.description : existing.description,
      id
    );

    const updated = this.getById(id);
    if (!updated) throw new Error('Failed to retrieve updated item');

    const priceText = updated.display_price != null
      ? `฿${updated.display_price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'ไม่ระบุราคา';
    console.log(`📦 [Service: Item Update] แก้ไขข้อมูลสิ่งของสำเร็จ | ID: ${updated.id} | "${updated.name}" | สถานะ: ${updated.status} | ${priceText}`);

    return updated;
  }

  /**
   * Quick status transition for an item.
   */
  updateStatus(id: number, status: ItemStatus, options?: { purchased_at?: string | null; broken_at?: string | null }): ItemWithDetails {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Item with id ${id} not found`);
    }

    let purchased_at = existing.purchased_at;
    if (options?.purchased_at !== undefined) {
      purchased_at = options.purchased_at;
    } else if (status === 'purchased' && !purchased_at) {
      purchased_at = new Date().toISOString().split('T')[0];
    }

    let broken_at = existing.broken_at;
    if (options?.broken_at !== undefined) {
      broken_at = options.broken_at;
    } else if (status === 'broken' && !broken_at) {
      broken_at = new Date().toISOString().split('T')[0];
    }

    db.prepare(`
      UPDATE items SET
        status = ?,
        purchased_at = ?,
        broken_at = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, purchased_at, broken_at, id);

    const updated = this.getById(id);
    if (!updated) throw new Error('Failed to retrieve updated item');

    console.log(`📦 [Service: Item Status] เปลี่ยนสถานะสิ่งของ | ID: ${updated.id} | "${updated.name}" -> สถานะ: ${updated.status}`);

    return updated;
  }

  /**
   * Delete an item (hard delete).
   */
  delete(id: number): boolean {
    const existing = this.getById(id);
    const result = db.prepare(`DELETE FROM items WHERE id = ?`).run(id);
    const success = result.changes > 0;
    if (success) {
      console.log(`🗑️ [Service: Item Delete] ลบสิ่งของสำเร็จ | ID: ${id}${existing ? ` | "${existing.name}"` : ''}`);
    }
    return success;
  }

  /**
   * Link one or more transactions to an item.
   */
  linkTransactions(itemId: number, transactionIds: string[]): void {
    const checkItem = db.prepare(`SELECT id, name FROM items WHERE id = ?`).get(itemId) as { id: number; name: string } | undefined;
    if (!checkItem) {
      throw new Error(`Item with id ${itemId} not found`);
    }

    const insert = db.prepare(`
      INSERT OR IGNORE INTO item_transactions (item_id, transaction_id)
      VALUES (?, ?)
    `);

    const linkBatch = db.transaction((txIds: string[]) => {
      for (const txId of txIds) {
        insert.run(itemId, txId);
      }
    });

    linkBatch(transactionIds);
    console.log(`🔗 [Service: Link Transactions] ผูกธุรกรรมกับสิ่งของสำเร็จ | Item ID: ${itemId} | "${checkItem.name}" | จำนวนธุรกรรมที่ผูก: ${transactionIds.length} รายการ`);
  }

  /**
   * Unlink a transaction from an item.
   */
  unlinkTransaction(itemId: number, transactionId: string): boolean {
    const result = db.prepare(`
      DELETE FROM item_transactions
      WHERE item_id = ? AND transaction_id = ?
    `).run(itemId, transactionId);

    const success = result.changes > 0;
    if (success) {
      console.log(`🔗 [Service: Unlink Transaction] ยกเลิกการผูกธุรกรรม | Item ID: ${itemId} | Transaction ID: ${transactionId}`);
    }
    return success;
  }

  /**
   * Get all item categories with item counts ordered by order_index.
   */
  getCategories(): Array<ItemCategory & { item_count: number }> {
    return db.prepare(`
      SELECT 
        ic.id,
        ic.name,
        COALESCE(ic.order_index, ic.id) as order_index,
        ic.created_at,
        COUNT(i.id) as item_count
      FROM item_categories ic
      LEFT JOIN items i ON ic.id = i.category_id AND i.status != 'cancelled'
      GROUP BY ic.id
      ORDER BY COALESCE(ic.order_index, ic.id) ASC, ic.id ASC
    `).all() as Array<ItemCategory & { item_count: number }>;
  }

  /**
   * Reorder item categories by an ordered array of category IDs.
   */
  reorderCategories(orderedIds: number[]): void {
    const updateStmt = db.prepare(`UPDATE item_categories SET order_index = ? WHERE id = ?`);
    const runTransaction = db.transaction((ids: number[]) => {
      ids.forEach((id, index) => {
        updateStmt.run(index + 1, id);
      });
    });
    runTransaction(orderedIds);
    console.log(`🏷️ [Service: Category Reorder] จัดลำดับหมวดหมู่สิ่งของใหม่สำเร็จ (${orderedIds.length} หมวดหมู่)`);
  }

  /**
   * Create an item category.
   */
  createCategory(name: string): ItemCategory {
    const maxOrder = (db.prepare(`SELECT MAX(order_index) as max_order FROM item_categories`).get() as { max_order: number | null })?.max_order ?? 0;
    const nextOrder = maxOrder + 1;

    const result = db.prepare(`
      INSERT INTO item_categories (name, order_index) VALUES (?, ?)
    `).run(name, nextOrder);

    const category = {
      id: Number(result.lastInsertRowid),
      name,
      order_index: nextOrder,
      created_at: new Date().toISOString()
    };
    console.log(`🏷️ [Service: Category Create] สร้างหมวดหมู่สิ่งของสำเร็จ | ID: ${category.id} | "${category.name}" (ลำดับ ${nextOrder})`);
    return category;
  }

  /**
   * Update an item category name.
   */
  updateCategory(id: number, name: string): ItemCategory {
    const check = db.prepare(`SELECT id, created_at FROM item_categories WHERE id = ?`).get(id) as { id: number; created_at: string } | undefined;
    if (!check) {
      throw new Error(`Category with id ${id} not found`);
    }

    db.prepare(`UPDATE item_categories SET name = ? WHERE id = ?`).run(name, id);
    console.log(`🏷️ [Service: Category Update] แก้ไขชื่อหมวดหมู่สิ่งของ | ID: ${id} | "${name}"`);

    return {
      id,
      name,
      created_at: check.created_at
    };
  }

  /**
   * Delete an item category if not in use.
   */
  deleteCategory(id: number): boolean {
    const itemCount = (db.prepare(`SELECT COUNT(*) as count FROM items WHERE category_id = ?`).get(id) as { count: number }).count;
    if (itemCount > 0) {
      throw new Error('Cannot delete category with associated items');
    }

    const result = db.prepare(`DELETE FROM item_categories WHERE id = ?`).run(id);
    const success = result.changes > 0;
    if (success) {
      console.log(`🗑️ [Service: Category Delete] ลบหมวดหมู่สิ่งของสำเร็จ | ID: ${id}`);
    }
    return success;
  }
}

export default new ItemService();
