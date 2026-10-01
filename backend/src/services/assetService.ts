import db from '../config/db';
import crypto from 'node:crypto';
import { ApiError } from '../middleware/ApiError';
import { computePosition, marketValueSatang, pickQuote, PriceQuote, Trade } from './portfolioMath';
import { AUTO_PRICE_KINDS, AssetKind, fetchPrice } from './priceProviders';

interface AssetRow {
  id: string;
  name: string;
  kind: AssetKind;
  symbol: string | null;
  unit_label: string | null;
  manual_price: number | null;
  manual_price_at: string | null;
}

interface TradeRow {
  id: string;
  date: string;
  created_at: string | null;
  description: string | null;
  amount: number; // สตางค์ (ค่าสัมบูรณ์)
  units: number | null;
  trade_side: 'buy' | 'sell';
  asset_id: string;
}

export interface PortfolioTrade {
  id: string;
  date: string;
  side: 'buy' | 'sell';
  units: number;
  amount: number; // บาท (ค่าสัมบูรณ์)
  pricePerUnit: number; // บาทต่อหน่วย ณ วันที่ซื้อ/ขาย
  description: string;
}

export interface PortfolioAsset {
  id: string;
  name: string;
  kind: AssetKind;
  symbol: string | null;
  unitLabel: string | null;
  autoPrice: boolean;
  units: number;
  cost: number; // บาท (ต้นทุนของที่ยังถือ)
  avgCostPerUnit: number | null;
  price: number | null; // บาทต่อหน่วย
  priceAt: string | null;
  priceSource: string | null;
  marketValue: number | null; // บาท
  unrealized: number | null; // บาท
  unrealizedPct: number | null;
  realized: number; // บาท
  oversold: boolean;
  trades: PortfolioTrade[];
}

export interface PortfolioSnapshot {
  date: string; // YYYY-MM-DD
  marketValue: number; // บาท
  cost: number; // บาท (ต้นทุนของสินทรัพย์ที่มีราคา ณ วันนั้น)
}

export interface Portfolio {
  assets: PortfolioAsset[];
  totals: {
    cost: number; // ต้นทุนที่ถืออยู่ของสินทรัพย์ที่มีราคา (เทียบกับ marketValue ได้ตรงๆ)
    marketValue: number;
    unrealized: number;
    realized: number;
    /** เงินที่ซื้อสะสมทั้งหมด (ก่อนหักที่ขาย) ของสินทรัพย์ที่นับในกำไร/ขาดทุน — ฐานของ % ผลตอบแทนรวม */
    bought: number;
    unpricedCount: number; // ถือของอยู่แต่ยังไม่มีราคา → ไม่นับใน marketValue
    unpricedCost: number; // ต้นทุนของสินทรัพย์กลุ่มนั้น (ไม่นับใน cost / marketValue)
    oldestPriceAt: string | null; // ราคาเก่าที่สุดที่ใช้คำนวณ — ให้ UI เขียนกำกับ "ข้อมูล ณ ..."
  };
  /** เงินออมทั่วไป (แถวหมวดลงทุน/ออมที่ไม่ผูกสินทรัพย์) — นับเป็นต้นทุน ไม่มีมูลค่าตลาด */
  generalSavings: number;
  /** มูลค่าพอร์ตรายวันที่จดไว้ (เก่า → ใหม่) */
  history: PortfolioSnapshot[];
}

export interface RefreshResult {
  assetId: string;
  ok: boolean;
  message?: string;
}

const baht = (satang: number) => satang / 100;

const localIsoDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

class AssetService {
  getAll(): AssetRow[] {
    return db.prepare('SELECT id, name, kind, symbol, unit_label, manual_price, manual_price_at FROM assets ORDER BY created_at ASC, name ASC').all() as AssetRow[];
  }

  upsert(input: { id?: string; name: string; kind: AssetKind; symbol?: string | null; unit_label?: string | null }): string {
    const id = input.id || crypto.randomUUID();
    const prev = db.prepare('SELECT kind, symbol FROM assets WHERE id = ?').get(id) as { kind: string; symbol: string | null } | undefined;
    const symbol = input.symbol?.trim() || null;
    db.transaction(() => {
      db.prepare(`
        INSERT INTO assets (id, name, kind, symbol, unit_label) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET name = excluded.name, kind = excluded.kind, symbol = excluded.symbol, unit_label = excluded.unit_label
      `).run(id, input.name, input.kind, symbol, input.unit_label?.trim() || null);
      // เปลี่ยนประเภท/สัญลักษณ์ = ราคาที่แคชไว้เป็นของอีกตัว
      if (prev && (prev.kind !== input.kind || prev.symbol !== symbol)) {
        db.prepare('DELETE FROM price_cache WHERE asset_id = ?').run(id);
      }
    })();
    return id;
  }

  delete(id: string): void {
    const used = (db.prepare('SELECT COUNT(*) AS c FROM transactions WHERE asset_id = ?').get(id) as { c: number }).c;
    if (used > 0) throw new ApiError(409, `ลบไม่ได้: มี ${used} รายการซื้อขายอ้างอิงสินทรัพย์นี้อยู่`);
    db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  }

  setManualPrice(id: string, price: number): void {
    const r = db.prepare('UPDATE assets SET manual_price = ?, manual_price_at = ? WHERE id = ?').run(price, new Date().toISOString(), id);
    if (r.changes === 0) throw new ApiError(404, 'ไม่พบสินทรัพย์');
    this.recordSnapshot();
  }

  /**
   * จดมูลค่าพอร์ตของวันนี้ (วันละ 1 แถว ครั้งหลังสุดชนะ) — ยังไม่เคยมีของและพอร์ตว่างอยู่ก็ไม่ต้องจด
   * ขายหมดแล้วยังจดต่อ เพื่อให้กราฟลงไปที่ 0 แทนที่จะค้างค่าเก่า
   */
  recordSnapshot(): void {
    const { totals } = this.getPortfolio();
    const hasHistory = db.prepare('SELECT 1 FROM portfolio_snapshots LIMIT 1').get() !== undefined;
    if (!hasHistory && totals.marketValue === 0 && totals.cost === 0) return;
    db.prepare(`
      INSERT INTO portfolio_snapshots (date, market_value, cost, recorded_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET market_value = excluded.market_value, cost = excluded.cost, recorded_at = excluded.recorded_at
    `).run(localIsoDate(), Math.round(totals.marketValue * 100), Math.round(totals.cost * 100), new Date().toISOString());
  }

  /** ดึงราคาทุกสินทรัพย์ที่มีแหล่งอัตโนมัติ; ตัวที่ล้มเหลวคงราคาเดิมในแคชไว้ */
  async refreshPrices(): Promise<RefreshResult[]> {
    // ตัวที่ยังไม่ใส่สัญลักษณ์ (หุ้น/คริปโต) ยังดึงไม่ได้ตามธรรมชาติ ไม่นับเป็นความล้มเหลว
    const targets = this.getAll().filter(a => AUTO_PRICE_KINDS.has(a.kind) && (a.kind.startsWith('gold') || a.symbol));
    const save = db.prepare(`
      INSERT INTO price_cache (asset_id, price, fetched_at, source) VALUES (?, ?, ?, ?)
      ON CONFLICT(asset_id) DO UPDATE SET price = excluded.price, fetched_at = excluded.fetched_at, source = excluded.source
    `);
    const results = await Promise.all(targets.map(async (a): Promise<RefreshResult> => {
      try {
        const p = await fetchPrice(a.kind, a.symbol);
        save.run(a.id, p.price, new Date().toISOString(), p.source);
        return { assetId: a.id, ok: true };
      } catch (e) {
        return { assetId: a.id, ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    }));
    this.recordSnapshot();
    return results;
  }

  getPortfolio(): Portfolio {
    const assets = this.getAll();
    const tradeRows = db.prepare(`
      SELECT id, date, created_at, description, amount, units, trade_side, asset_id
      FROM transactions
      WHERE is_deleted = 0 AND asset_id IS NOT NULL AND trade_side IS NOT NULL AND units IS NOT NULL
      ORDER BY date ASC, created_at ASC, rowid ASC
    `).all() as TradeRow[];
    const cache = new Map(
      (db.prepare('SELECT asset_id, price, fetched_at, source FROM price_cache').all() as Array<{ asset_id: string; price: number; fetched_at: string; source: string }>)
        .map(r => [r.asset_id, { price: r.price, at: r.fetched_at, source: r.source } as PriceQuote]),
    );

    const totals = { cost: 0, marketValue: 0, unrealized: 0, realized: 0, bought: 0, unpricedCount: 0, unpricedCost: 0, oldestPriceAt: null as string | null };

    const result = assets.map((a): PortfolioAsset => {
      const rows = tradeRows.filter(t => t.asset_id === a.id);
      const trades: Trade[] = rows.map(t => ({ date: t.date, createdAt: t.created_at ?? undefined, side: t.trade_side, units: t.units as number, amountSatang: t.amount }));
      const pos = computePosition(trades);

      const manual: PriceQuote | null = a.manual_price != null && a.manual_price_at
        ? { price: a.manual_price, at: a.manual_price_at, source: 'กรอกเอง' } : null;
      const quote = pickQuote(cache.get(a.id) ?? null, manual);
      const mvSatang = marketValueSatang(pos.units, quote?.price ?? null);
      const held = pos.units > 0;

      totals.realized += pos.realizedSatang;
      const boughtSatang = trades.reduce((sum, t) => sum + (t.side === 'buy' ? t.amountSatang : 0), 0);
      if (held && mvSatang == null) {
        totals.unpricedCount += 1;
        totals.unpricedCost += pos.costSatang;
        totals.bought += boughtSatang - pos.costSatang; // ไม่มีราคา = ยังไม่รู้กำไรของที่ถือ ฐาน % จึงนับเฉพาะส่วนที่ขายไปแล้ว (คู่กับ realized)
      } else {
        totals.bought += boughtSatang;
      }
      if (held && mvSatang != null) {
        totals.cost += pos.costSatang;
        totals.marketValue += mvSatang;
        totals.unrealized += mvSatang - pos.costSatang;
        if (quote && (totals.oldestPriceAt == null || quote.at < totals.oldestPriceAt)) totals.oldestPriceAt = quote.at;
      }

      const unrealizedSatang = held && mvSatang != null ? mvSatang - pos.costSatang : null;
      return {
        id: a.id, name: a.name, kind: a.kind, symbol: a.symbol, unitLabel: a.unit_label,
        autoPrice: AUTO_PRICE_KINDS.has(a.kind),
        units: pos.units,
        cost: baht(pos.costSatang),
        avgCostPerUnit: held ? baht(pos.costSatang) / pos.units : null,
        price: quote?.price ?? null,
        priceAt: quote?.at ?? null,
        priceSource: quote?.source ?? null,
        marketValue: held && mvSatang != null ? baht(mvSatang) : null,
        unrealized: unrealizedSatang == null ? null : baht(unrealizedSatang),
        unrealizedPct: unrealizedSatang != null && pos.costSatang > 0 ? (unrealizedSatang / pos.costSatang) * 100 : null,
        realized: baht(pos.realizedSatang),
        oversold: pos.oversold,
        trades: rows.map(t => ({
          id: t.id, date: t.date, side: t.trade_side, units: t.units as number,
          amount: baht(t.amount), pricePerUnit: baht(t.amount) / (t.units as number),
          description: t.description ?? '',
        })).reverse(), // ใหม่สุดก่อน
      };
    });

    const general = db.prepare(`
      SELECT COALESCE(SUM(CASE WHEN t.trade_side = 'sell' THEN -t.amount ELSE t.amount END), 0) AS v
      FROM transactions t
      JOIN categories c ON c.id = t.category_id
      JOIN cashflow_groups g ON g.id = c.cashflow_group_id
      WHERE t.is_deleted = 0 AND g.type = 'savings' AND t.asset_id IS NULL
    `).get() as { v: number };

    return {
      assets: result,
      totals: {
        cost: baht(totals.cost), marketValue: baht(totals.marketValue), unrealized: baht(totals.unrealized),
        realized: baht(totals.realized), bought: baht(totals.bought),
        unpricedCount: totals.unpricedCount, unpricedCost: baht(totals.unpricedCost), oldestPriceAt: totals.oldestPriceAt,
      },
      generalSavings: baht(general.v),
      history: (db.prepare('SELECT date, market_value, cost FROM portfolio_snapshots ORDER BY date ASC').all() as Array<{ date: string; market_value: number; cost: number }>)
        .map(r => ({ date: r.date, marketValue: baht(r.market_value), cost: baht(r.cost) })),
    };
  }
}

export default new AssetService();
