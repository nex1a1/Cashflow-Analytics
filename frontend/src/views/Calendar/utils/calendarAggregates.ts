import { CashflowGroup, Category, TransactionDisplay, AllocationType, GroupType } from '../../../types';

export interface CalendarDayData {
  inc: number;
  exp: number;
  items: TransactionDisplay[];
  incItems: TransactionDisplay[];
}

export interface CategoryAllocationAmount {
  need: number;
  want: number;
  savings: number;
}

/** tExp ไม่รวมแถวลงทุน/ออม (กฎเดียวกับ Dashboard) — tSav คือซื้อ − ขายสุทธิ */
export interface CalendarTotals {
  tInc: number;
  tExp: number;
  tNeed: number;
  tWant: number;
  tSav: number;
}

/** ประเภทตามกลุ่มก่อน ตกมาที่ประเภทของหมวด — ตรงกับ resolveCashflowContext ของ Dashboard */
function groupTypeOf(catObj: Category | undefined, cashflowGroups: CashflowGroup[]): GroupType {
  const groupId = catObj?.cashflowGroup || catObj?.cashflow_group_id;
  return cashflowGroups.find(g => g.id === groupId)?.type || catObj?.type || 'expense';
}

export function resolveAllocationType(
  t: TransactionDisplay,
  catObj: Category | undefined,
  cashflowGroups: CashflowGroup[]
): AllocationType {
  if (t.allocation_type) return t.allocation_type;
  const groupId = catObj?.cashflowGroup || catObj?.cashflow_group_id;
  if (!groupId) return 'want';
  // แถวกลุ่มลงทุน/ออมไม่มาถึงตรงนี้ (processCalendarTransaction ออกไปก่อน)
  return cashflowGroups.find(g => g.id === groupId)?.allocation_type || 'want';
}

export function processCalendarTransaction(
  t: TransactionDisplay,
  findCategory: (t: TransactionDisplay) => Category | undefined,
  cashflowGroups: CashflowGroup[],
  excludedCategoryIds: Set<string>,
  dayData: Record<number, CalendarDayData>,
  catAllocAmounts: Record<string, CategoryAllocationAmount>,
  totals: CalendarTotals
) {
  if (!t.date) return;
  const txD = Number.parseInt(t.date.split('-')[2], 10);
  if (!dayData[txD]) return; // also catches a malformed date (NaN)

  const catObj = findCategory(t);
  const catId = catObj ? catObj.id : (t.category_id || t.category || 'other');
  if (excludedCategoryIds.has(catId)) return;

  const amt = typeof t.amount === 'number' ? t.amount : (Number.parseFloat(String(t.amount)) || 0);
  const groupType = groupTypeOf(catObj, cashflowGroups);

  if (groupType === 'income') {
    dayData[txD].inc += amt;
    dayData[txD].incItems.push({ ...t, _catObj: catObj });
    totals.tInc += amt;
    return;
  }

  dayData[txD].items.push({ ...t, _catObj: catObj, group_type: groupType });

  if (groupType === 'savings') {
    totals.tSav += amt;
    if (!catAllocAmounts[catId]) catAllocAmounts[catId] = { need: 0, want: 0, savings: 0 };
    catAllocAmounts[catId].savings += amt;
    return;
  }

  dayData[txD].exp += amt;
  totals.tExp += amt;

  const aType = resolveAllocationType(t, catObj, cashflowGroups);
  if (!catAllocAmounts[catId]) catAllocAmounts[catId] = { need: 0, want: 0, savings: 0 };
  catAllocAmounts[catId][aType] += amt;

  if (aType === 'need') totals.tNeed += amt;
  else if (aType === 'want') totals.tWant += amt;
}
