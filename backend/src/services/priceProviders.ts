/**
 * ตัวดึงราคาสินทรัพย์ (บาทต่อหน่วย) — parser เป็นฟังก์ชันล้วนเพื่อทดสอบได้ แยกจาก fetch
 * แหล่งฟรีที่ไม่เป็นทางการอาจเปลี่ยนรูปแบบ/ล่มได้ → ผู้เรียกต้องจับ error แล้วใช้ราคาที่แคชไว้
 */
export type AssetKind = 'gold_bar' | 'gold_ornament' | 'us_stock' | 'th_stock' | 'crypto' | 'fund' | 'other';

/** ประเภทที่ดึงราคาอัตโนมัติได้ (กองทุน/อื่นๆ ไม่มีแหล่งฟรีที่เชื่อถือได้ → กรอกเอง) */
export const AUTO_PRICE_KINDS: ReadonlySet<AssetKind> = new Set(['gold_bar', 'gold_ornament', 'us_stock', 'th_stock', 'crypto']);

export interface FetchedPrice {
  price: number; // บาทต่อหน่วย
  source: string;
}

const GOLD_URL = 'https://api.chnwt.dev/thai-gold-api/latest';
const GOLD_BACKUP_URL = 'https://apicheckprice.huasengheng.com/api/values/getprice/';
const yahooUrl =(symbol: string) => `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
const coinGeckoUrl = (id: string) => `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=thb`;

const toNumber = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  if (!Number.isFinite(n) || n <= 0) throw new Error(`ราคาไม่ถูกต้อง: ${String(v)}`);
  return n;
};

/** ราคา "รับซื้อ" (ร้านซื้อคืนจากเรา) ต่อ 1 บาททอง — ใกล้เคียงมูลค่าที่ขายได้จริงที่สุด */
export function parseThaiGold(json: any, kind: 'gold_bar' | 'gold_ornament'): number {
  const node = kind === 'gold_bar' ? json?.response?.price?.gold_bar : json?.response?.price?.gold;
  return toNumber(node?.buy);
}

/**
 * แหล่งสำรองทอง: API ของฮั่วเซงเฮง — REF = ราคาสมาคมฯ (ทองแท่ง), JEWEL = ราคารับซื้อทองรูปพรรณของร้านเอง
 * ponytail: ทองรูปพรรณสำรองเป็นราคาร้านเดียว ไม่ใช่ราคาสมาคมฯ — ป้ายแหล่งที่มาใน price_cache บอกไว้
 */
export function parseHuaSengHeng(json: any, kind: 'gold_bar' | 'gold_ornament'): number {
  const type = kind === 'gold_bar' ? 'REF' : 'JEWEL';
  const row = Array.isArray(json) ? json.find((r) => r?.GoldType === type && r?.GoldCode === '96.50') : null;
  return toNumber(row?.Buy);
}

export function parseYahoo(json: any): { price: number; currency: string } {
  const meta = json?.chart?.result?.[0]?.meta;
  return { price: toNumber(meta?.regularMarketPrice), currency: String(meta?.currency ?? '') };
}

export function parseCoinGecko(json: any, id: string): number {
  return toNumber(json?.[id]?.thb);
}

async function getJson(url: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (CashflowShark)', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    // ออฟไลน์/DNS ล่ม/ตอบช้า → ข้อความไทยที่อ่านรู้เรื่อง แทน "fetch failed"
    const name = (e as { name?: string })?.name;
    throw new Error(name === 'TimeoutError' || name === 'AbortError' ? 'แหล่งราคาตอบช้าเกินไป' : 'เชื่อมต่ออินเทอร์เน็ตไม่ได้');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function yahooThb(symbol: string): Promise<number> {
  const { price, currency } = parseYahoo(await getJson(yahooUrl(symbol)));
  if (currency === 'THB') return price;
  if (currency !== 'USD') throw new Error(`สกุลเงินที่ไม่รองรับ: ${currency}`);
  const fx = parseYahoo(await getJson(yahooUrl('THB=X'))).price; // USD/THB
  return price * fx;
}

export async function fetchPrice(kind: AssetKind, symbol: string | null): Promise<FetchedPrice> {
  const sym = (symbol ?? '').trim();
  switch (kind) {
    case 'gold_bar':
    case 'gold_ornament':
      try {
        return { price: parseThaiGold(await getJson(GOLD_URL), kind), source: 'สมาคมค้าทองคำ (chnwt)' };
      } catch (primaryError) {
        // chnwt ดึงต่อจากเว็บสมาคมฯ — เว็บสมาคมล่มเมื่อไหร่ chnwt ก็ตอบ 500 ตาม → ลองแหล่งสำรอง
        try {
          const price = parseHuaSengHeng(await getJson(GOLD_BACKUP_URL), kind);
          return { price, source: kind === 'gold_bar' ? 'สมาคมค้าทองคำ (ผ่านฮั่วเซงเฮง)' : 'ฮั่วเซงเฮง (รับซื้อทองรูปพรรณ)' };
        } catch {
          throw primaryError;
        }
      }
    case 'us_stock':
      if (!sym) throw new Error('ยังไม่ได้ระบุสัญลักษณ์หุ้น');
      return { price: await yahooThb(sym.toUpperCase()), source: 'Yahoo Finance (USD→THB)' };
    case 'th_stock':
      if (!sym) throw new Error('ยังไม่ได้ระบุสัญลักษณ์หุ้น');
      return { price: await yahooThb(/\.BK$/i.test(sym) ? sym.toUpperCase() : `${sym.toUpperCase()}.BK`), source: 'Yahoo Finance (SET)' };
    case 'crypto':
      if (!sym) throw new Error('ยังไม่ได้ระบุ CoinGecko id (เช่น bitcoin)');
      return { price: parseCoinGecko(await getJson(coinGeckoUrl(sym.toLowerCase())), sym.toLowerCase()), source: 'CoinGecko' };
    default:
      throw new Error('ประเภทนี้ไม่มีแหล่งราคาอัตโนมัติ — กรอกราคาเอง');
  }
}
