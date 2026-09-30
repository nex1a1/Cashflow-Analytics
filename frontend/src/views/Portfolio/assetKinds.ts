import { Coins, Gem, TrendingUp, BarChart3, Bitcoin, PieChart, Package, type LucideIcon } from 'lucide-react';
import { AssetKind } from '@/types';

export interface KindMeta {
  icon: LucideIcon;
  /** ราคาดึงอัตโนมัติได้ไหม (ตรงกับ AUTO_PRICE_KINDS ฝั่ง backend) */
  auto: boolean;
  /** ต้องกรอกสัญลักษณ์เพื่อดึงราคา */
  needsSymbol: boolean;
  blurb: string;
  /** สัญลักษณ์ตัวอย่างให้กดเติม */
  examples: string[];
}

export const KIND_META: Record<AssetKind, KindMeta> = {
  gold_bar: { icon: Coins, auto: true, needsSymbol: false, blurb: 'ทองคำแท่ง 96.5% ราคารับซื้อจากสมาคมค้าทองคำ', examples: [] },
  gold_ornament: { icon: Gem, auto: true, needsSymbol: false, blurb: 'ทองรูปพรรณ ราคารับซื้อจากสมาคมค้าทองคำ', examples: [] },
  us_stock: { icon: TrendingUp, auto: true, needsSymbol: true, blurb: 'หุ้นและ ETF สหรัฐ แปลงจากดอลลาร์เป็นบาทให้', examples: ['AAPL', 'MSFT', 'NVDA', 'VOO', 'XOM', 'KO'] },
  th_stock: { icon: BarChart3, auto: true, needsSymbol: true, blurb: 'หุ้นในตลาดหลักทรัพย์ไทย พิมพ์ชื่อย่อได้เลย', examples: ['PTT', 'AOT', 'CPALL', 'KBANK', 'SCB'] },
  crypto: { icon: Bitcoin, auto: true, needsSymbol: true, blurb: 'เหรียญคริปโต ใช้ id ตาม CoinGecko (ตัวพิมพ์เล็ก)', examples: ['bitcoin', 'ethereum', 'solana', 'ripple'] },
  fund: { icon: PieChart, auto: false, needsSymbol: false, blurb: 'กองทุนรวม ไม่มีแหล่งราคาฟรี กรอกราคา (NAV) เอง', examples: [] },
  other: { icon: Package, auto: false, needsSymbol: false, blurb: 'สินทรัพย์อื่นๆ เช่น พันธบัตร ที่ดิน กรอกราคาเอง', examples: [] },
};
