import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import db from '../config/db';
import { initSchema } from '../models/schema';
import itemService from '../services/itemService';
import transactionService from '../services/transactionService';

describe('itemService', () => {
  const testPrefix = 'test-item-';
  const testTxPrefix = 'test-item-tx-';

  const cleanup = () => {
    db.prepare(`DELETE FROM item_transactions WHERE item_id IN (SELECT id FROM items WHERE name LIKE '${testPrefix}%')`).run();
    db.prepare(`DELETE FROM items WHERE name LIKE '${testPrefix}%'`).run();
    db.prepare(`DELETE FROM transactions WHERE id LIKE '${testTxPrefix}%'`).run();
    db.prepare(`DELETE FROM item_categories WHERE name LIKE '${testPrefix}%'`).run();
  };

  beforeAll(() => {
    initSchema();
    cleanup();
  });

  afterAll(() => {
    cleanup();
  });

  it('manages item categories', () => {
    const catName = `${testPrefix}CustomCat`;
    const newCat = itemService.createCategory(catName);
    expect(newCat).toBeDefined();
    expect(newCat.name).toBe(catName);

    const categories = itemService.getCategories();
    const found = categories.find(c => c.name === catName);
    expect(found).toBeDefined();

    // Clean up test category
    itemService.deleteCategory(newCat.id);
  });

  it('creates an item without linked transactions (fallback to manual price)', () => {
    const categories = itemService.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    const categoryId = categories[0].id;

    const item = itemService.create({
      category_id: categoryId,
      name: `${testPrefix}Mechanical Keyboard`,
      brand_model: 'Keychron Q1 Pro',
      source: 'Shopee',
      status: 'purchased',
      price: 6500.50, // Baht
      purchased_at: '2026-01-15',
      warranty_until: '2027-01-15',
      priority: 2,
      description: 'Custom Red Switches'
    });

    expect(item).toBeDefined();
    expect(item.id).toBeGreaterThan(0);
    expect(item.price_satang).toBe(650050); // Stored in Satang
    expect(item.display_price_satang).toBe(650050);
    expect(item.display_price).toBe(6500.50);
    expect(item.linked_count).toBe(0);
  });

  it('calculates price from linked transactions (Single Source of Truth)', () => {
    const categories = itemService.getCategories();
    const categoryId = categories[0].id;

    // 1. Create a planned item with estimated price
    const item = itemService.create({
      category_id: categoryId,
      name: `${testPrefix}Ergonomic Chair`,
      brand_model: 'Herman Miller Aeron',
      status: 'planned',
      price: 45000, // Estimated Baht
      priority: 5
    });

    expect(item.status).toBe('planned');
    expect(item.display_price).toBe(45000);
    expect(item.linked_count).toBe(0);

    // 2. Insert mock transactions (e.g. 2 installment payments)
    const txId1 = `${testTxPrefix}1`;
    const txId2 = `${testTxPrefix}2`;

    transactionService.upsertMany([
      {
        id: txId1,
        date: '2026-03-01',
        description: 'Chair Installment 1/2',
        amount: 22000, // 22,000 Baht
        category: 'เฟอร์นิเจอร์',
      },
      {
        id: txId2,
        date: '2026-04-01',
        description: 'Chair Installment 2/2',
        amount: 22000, // 22,000 Baht
        category: 'เฟอร์นิเจอร์',
      }
    ]);

    // 3. Link transactions and update status to purchased
    itemService.linkTransactions(item.id, [txId1, txId2]);
    const updated = itemService.updateStatus(item.id, 'purchased', { purchased_at: '2026-03-01' });

    // The display price must be SUM(transactions) = 44,000 Baht, not the estimated 45,000 Baht!
    expect(updated.status).toBe('purchased');
    expect(updated.linked_count).toBe(2);
    expect(updated.display_price_satang).toBe(4400000);
    expect(updated.display_price).toBe(44000);

    // 4. Verify getById includes detailed linked transactions
    const detailed = itemService.getById(item.id);
    expect(detailed).toBeDefined();
    expect(detailed!.linked_transactions.length).toBe(2);
    expect(detailed!.linked_transactions[0].amount).toBe(22000);
  });

  it('filters out soft-deleted transactions from price calculation', () => {
    const categories = itemService.getCategories();
    const categoryId = categories[0].id;

    const item = itemService.create({
      category_id: categoryId,
      name: `${testPrefix}Headphones`,
      status: 'purchased',
      price: 0
    });

    const txId = `${testTxPrefix}deleted-tx`;
    transactionService.upsertMany([
      {
        id: txId,
        date: '2026-05-01',
        description: 'Headphones Payment',
        amount: 3500, // 3,500 Baht
        category: 'อุปกรณ์ต่อพ่วง',
      }
    ]);

    itemService.linkTransactions(item.id, [txId]);

    let current = itemService.getById(item.id)!;
    expect(current.linked_count).toBe(1);
    expect(current.display_price).toBe(3500);

    // Soft-delete the transaction
    transactionService.delete(txId);

    // Now linked_count must be 0, and display_price must fallback to manual price (0)
    current = itemService.getById(item.id)!;
    expect(current.linked_count).toBe(0);
    expect(current.display_price).toBe(0);
  });

  it('unlinks transaction cleanly', () => {
    const categories = itemService.getCategories();
    const categoryId = categories[0].id;

    const item = itemService.create({
      category_id: categoryId,
      name: `${testPrefix}Monitor`,
      status: 'purchased',
      price: 10000
    });

    const txId = `${testTxPrefix}monitor-tx`;
    transactionService.upsertMany([
      {
        id: txId,
        date: '2026-06-01',
        description: 'Monitor Purchase',
        amount: 9500,
        category: 'คอมพิวเตอร์',
      }
    ]);

    itemService.linkTransactions(item.id, [txId]);
    expect(itemService.getById(item.id)!.display_price).toBe(9500);

    // Unlink
    const unlinked = itemService.unlinkTransaction(item.id, txId);
    expect(unlinked).toBe(true);

    // Reverts to manual fallback price
    const afterUnlink = itemService.getById(item.id)!;
    expect(afterUnlink.linked_count).toBe(0);
    expect(afterUnlink.display_price).toBe(10000);
  });

  it('supports full lifecycle status transitions (planned -> purchased -> stored -> broken -> sold -> cancelled)', () => {
    const categories = itemService.getCategories();
    const categoryId = categories[0].id;

    const item = itemService.create({
      category_id: categoryId,
      name: `${testPrefix}Lifecycle Test Item`,
      status: 'planned'
    });

    expect(item.status).toBe('planned');

    // planned -> purchased
    const purchased = itemService.updateStatus(item.id, 'purchased', { purchased_at: '2026-07-01' });
    expect(purchased.status).toBe('purchased');
    expect(purchased.purchased_at).toBe('2026-07-01');

    // purchased -> stored
    const stored = itemService.updateStatus(item.id, 'stored');
    expect(stored.status).toBe('stored');

    // stored -> broken
    const broken = itemService.updateStatus(item.id, 'broken', { broken_at: '2026-08-01' });
    expect(broken.status).toBe('broken');
    expect(broken.broken_at).toBe('2026-08-01');

    // broken -> sold
    const sold = itemService.updateStatus(item.id, 'sold');
    expect(sold.status).toBe('sold');

    // sold -> cancelled (soft delete)
    const cancelled = itemService.updateStatus(item.id, 'cancelled');
    expect(cancelled.status).toBe('cancelled');

    // Standard getAll should exclude cancelled by default
    const all = itemService.getAll();
    expect(all.some(i => i.id === item.id)).toBe(false);

    // getAll with includeCancelled should include it
    const allWithCancelled = itemService.getAll({ includeCancelled: true });
    expect(allWithCancelled.some(i => i.id === item.id)).toBe(true);
  });
});
