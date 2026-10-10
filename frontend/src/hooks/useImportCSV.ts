// src/hooks/useImportCSV.ts
import { useState, useRef, useCallback } from 'react';
import { PREDICT_API_URL } from '../constants';
import { parseCSV, cleanNumber } from '../utils/csvParser';
import { parseLooseDate } from '../utils/dateHelpers';
import { splitImportDuplicates } from '../utils/importDedupe';
import { calendarService, categoryService, dayTypeService, transactionService } from '../services/api';
import { useToast } from '../context/ToastContext';
import { CashflowGroup, Category, DayType, GroupType } from '../types';

/** Descriptions of the long table, sent to /predict so rows without a category can take the one history suggests. */
function extractUniqueDescriptions(parsedRows: string[][], headers: string[]): Set<string> {
  const uniqueDescriptions = new Set<string>();
  const h1 = (headers[1] || '').toLowerCase();
  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length < 2) continue;
    let desc: string;
    if ((headers[1] === 'ชนิดวัน' || h1 === 'daytype' || h1 === 'day_type') && row.length >= 6) desc = row[4];
    else if ((headers[1] === 'ประเภท' || h1 === 'type') && row.length >= 5) desc = row[3];
    else desc = row[2];
    if (desc) uniqueDescriptions.add(desc);
  }
  return uniqueDescriptions;
}

async function fetchSharkBrainPredictions(uniqueDescriptions: Set<string>): Promise<Record<string, any>> {
  if (!uniqueDescriptions || uniqueDescriptions.size === 0) return {};
  try {
    const res = await fetch(PREDICT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descriptions: Array.from(uniqueDescriptions) }),
    });
    if (res.ok) return await res.json();
  } catch (e) {
    console.warn('Shark Brain Prediction failed, falling back to local logic:', e);
  }
  return {};
}

function parseLongCsvRow(row: string[], headers: string[], context: any) {
  const { dateStr, predictions, getOrCreateDayType, getOrCreateCategory, newDayTypes, updatedCategories } = context;
  let catName = '';
  let desc = '';
  let amtStr = '';
  let typeStr = 'รายจ่าย';

  const h1 = (headers[1] || '').toLowerCase();
  const isDayType = headers[1] === 'ชนิดวัน' || h1 === 'daytype' || h1 === 'day_type';
  const isType = headers[1] === 'ประเภท' || h1 === 'type';

  if (isDayType && row.length >= 6) {
    const typeId = getOrCreateDayType(row[1]);
    if (typeId) newDayTypes[dateStr] = typeId;
    typeStr = row[2];
    catName = row[3];
    desc = row[4];
    amtStr = row[5];
  } else if (isType && row.length >= 5) {
    typeStr = row[1];
    catName = row[2];
    desc = row[3];
    amtStr = row[4];
  } else {
    catName = row[1];
    desc = row[2];
    amtStr = row[3];
  }

  if ((!catName || catName === 'อื่นๆ') && predictions[desc]) {
    catName = predictions[desc].name;
  }

  const finalCatName = getOrCreateCategory(catName, typeStr);
  const amount = cleanNumber(amtStr);
  if (amount === 0) return null;

  // หมวดลงทุน/ออม: ยอดติดลบ = ขาย (ส่งออกแล้วนำเข้ากลับต้องคงเครื่องหมาย) หมวดอื่นใช้ค่าสัมบูรณ์เหมือนเดิม
  const isSavingsCat = updatedCategories?.find((c: Category) => c.name === finalCatName)?.type === 'savings';

  return {
    id: crypto.randomUUID(),
    date: dateStr,
    category: finalCatName,
    description: desc || finalCatName,
    amount: isSavingsCat ? amount : Math.abs(amount),
    dayNote: '',
  };
}

const EXCLUDE_CATEGORIES = ['date', 'วันที่', 'notes', 'หมายเหตุ', 'รวม', 'total'];
const isNoteHeader = (h: string) => /note|หมายเหตุ/i.test(h || '');

// Wide table = one column per category (the Import guide's template uses the user's own category names as headers):
// the header IS the category, created like any new category of the long format when it does not exist yet.
function parseWideCsvRow(row: string[], headers: string[], context: any) {
  const { dateStr, getOrCreateCategory, updatedCategories } = context;
  const noteColIndex = headers.findIndex(isNoteHeader); // -1: the file has no notes column
  const note = noteColIndex > 0 ? row[noteColIndex] || '' : '';
  const isKnown = (name: string) => updatedCategories.some((c: Category) => c.name === name);
  const rowItems: any[] = [];

  for (let j = 1; j < Math.min(row.length, headers.length); j++) {
    if (j === noteColIndex) continue;
    const rawHeader = headers[j];
    if (!rawHeader) continue;
    const cleanStr = rawHeader.replace(/[\n\r]/g, ' ').trim();
    // the user's own category wins: "ข้าวรวมมิตร" is not the total column, "ซอฟต์แวร์ & AI" keeps its English part
    const known = isKnown(cleanStr);
    if (!known && EXCLUDE_CATEGORIES.some(exc => cleanStr.toLowerCase().includes(exc))) continue;

    const amount = cleanNumber(row[j]);
    if (amount === 0) continue;

    // old sheets wrote "ค่าอาหาร (Food)" / "ค่าอาหาร Food": an unknown header keeps only its Thai part
    const rawBase = cleanStr.split('(')[0].trim();
    const enIndex = rawBase.search(/[a-zA-Z]/);
    const catName = known ? cleanStr : ((enIndex !== -1 ? rawBase.slice(0, enIndex).trim() : rawBase) || cleanStr);
    const description = note?.trim() ? `${catName} · ${note.trim()}` : catName;

    rowItems.push({
      id: crypto.randomUUID(),
      date: dateStr,
      category: getOrCreateCategory(catName, 'รายจ่าย'),
      description,
      amount: Math.abs(amount),
      dayNote: note,
    });
  }

  return rowItems;
}

const importType = (typeStr: string): GroupType => {
  const t = (typeStr ?? '').trim().toLowerCase(); // the guide's English template writes INCOME / SAVINGS; people type "Income" in Excel
  return t === 'รายรับ' || t === 'income' ? 'income'
    : t === 'เงินออม' || t === 'savings' ? 'savings'
      : 'expense';
};

/** The group a category created by the import lives in: one of its type, preferring a catch-all named "อื่น…". */
function pickGroup(groups: CashflowGroup[], type: GroupType): CashflowGroup | undefined {
  const ofType = groups.filter(g => g.type === type).sort((a, b) => a.order_index - b.order_index);
  return ofType.find(g => g.name.includes('อื่น')) ?? ofType[0];
}

interface ImportCreations {
  newCategories: Category[];
  newDayTypeConfigs: DayType[];
  missingGroupTypes: Set<GroupType>;
}

function createConfigAndCategoryResolvers(
  updatedDayTypeConfig: DayType[],
  updatedCategories: Category[],
  groups: CashflowGroup[],
  created: ImportCreations
) {
  const getOrCreateDayType = (label: string): string | null => {
    if (!label || label.trim() === '') return null;
    const trimmed = label.trim();
    let found = updatedDayTypeConfig.find(dt => dt.label === trimmed);
    if (!found) {
      found = { id: crypto.randomUUID(), name: '', label: trimmed, color: '#64748B', order_index: updatedDayTypeConfig.length + 1 };
      updatedDayTypeConfig.push(found);
      created.newDayTypeConfigs.push(found);
    }
    return found.id;
  };

  const getOrCreateCategory = (name: string, typeStr: string = 'รายจ่าย'): string => {
    const trimmed = name?.trim() || updatedCategories.find(c => c.type === 'expense')?.name || 'อื่นๆ';
    let found = updatedCategories.find(c => c.name === trimmed);
    if (!found) {
      const type = importType(typeStr);
      const group = pickGroup(groups, type);
      if (!group) created.missingGroupTypes.add(type);
      const lastOrder = Math.max(0, ...updatedCategories.filter(c => c.type === type).map(c => c.order_index || 0));
      found = {
        id: crypto.randomUUID(),
        name: trimmed,
        icon: type === 'income' ? 'coins' : type === 'savings' ? 'piggy-bank' : 'tag',
        color: type === 'expense' ? '#64748B' : '#10B981',
        type,
        cashflowGroup: group?.id,
        cashflow_group_id: group?.id,
        allocation_type: type === 'income' ? null : type === 'savings' ? 'savings' : (group?.allocation_type ?? 'want'),
        order_index: lastOrder + 1,
      };
      updatedCategories.push(found);
      created.newCategories.push(found);
    }
    return found.name;
  };

  return { getOrCreateDayType, getOrCreateCategory };
}

function parseImportRows(parsedRows: string[][], headers: string[], isCsvLong: boolean, baseContext: any) {
  const items: any[] = [];
  let invalidDates = 0;
  for (let i = 1; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    if (row.length < 2) continue;
    const rawDate = row[0]?.trim();
    if (!rawDate) continue;
    const dateStr = parseLooseDate(rawDate);
    if (!dateStr) {
      // "รวม" / "Total" lines are not dates and stay silent; something that tried to be a date is reported
      if (/\d/.test(rawDate) && /[/-]/.test(rawDate)) invalidDates++;
      continue;
    }

    const rowContext = { ...baseContext, dateStr };

    if (isCsvLong) {
      const item = parseLongCsvRow(row, headers, rowContext);
      if (item) items.push(item);
    } else {
      items.push(...parseWideCsvRow(row, headers, rowContext));
    }
  }
  return { items, invalidDates };
}

export interface UseImportCSVProps {
  categories: Category[];
  cashflowGroups: CashflowGroup[];
  dayTypes: Record<string, string>;
  setDayTypes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  dayTypeConfig: DayType[];
  setDayTypeConfig: React.Dispatch<React.SetStateAction<DayType[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  saveToDb: (items: any) => Promise<any>;
}

export default function useImportCSV({
  categories,
  cashflowGroups,
  dayTypes,
  setDayTypes,
  dayTypeConfig,
  setDayTypeConfig,
  setCategories,
  saveToDb,
}: UseImportCSVProps) {
  const [importPreview, setImportPreview] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processCSVText = useCallback(
    async (rawText: string) => {
      try {
        const rawTrimmed = rawText.trim();
        if (!rawTrimmed) {
          showToast('ไม่พบข้อมูล', 'error');
          setIsProcessing(false);
          return;
        }

        const parsedRows = parseCSV(rawTrimmed);
        if (parsedRows.length < 2) {
          showToast('ข้อมูลไม่ถูกต้อง หรือมีน้อยกว่า 2 บรรทัด', 'error');
          setIsProcessing(false);
          return;
        }

        const headers = parsedRows[0];
        const h1 = (headers[1] || '').toLowerCase();
        const isCsvLong =
          headers.length >= 4 &&
          (headers[1] === 'ประเภท' || headers[1] === 'หมวดหมู่' || headers[1] === 'ชนิดวัน' ||
           h1 === 'daytype' || h1 === 'day_type' || h1 === 'type' || h1 === 'category');
        const predictions = isCsvLong ? await fetchSharkBrainPredictions(extractUniqueDescriptions(parsedRows, headers)) : {};

        const newDayTypes = { ...dayTypes };
        const updatedDayTypeConfig = [...dayTypeConfig];
        const updatedCategories = [...categories];
        const created: ImportCreations = { newCategories: [], newDayTypeConfigs: [], missingGroupTypes: new Set() };

        const { getOrCreateDayType, getOrCreateCategory } = createConfigAndCategoryResolvers(
          updatedDayTypeConfig,
          updatedCategories,
          cashflowGroups,
          created
        );

        const { items, invalidDates } = parseImportRows(parsedRows, headers, isCsvLong, {
          predictions,
          getOrCreateDayType,
          getOrCreateCategory,
          newDayTypes,
          updatedCategories,
        });

        if (created.missingGroupTypes.size > 0) {
          const labels = { income: 'รายรับ', expense: 'รายจ่าย', savings: 'ลงทุน/ออม' } as const;
          const missing = [...created.missingGroupTypes].map(t => labels[t]).join(', ');
          showToast(`ไฟล์มีหมวดหมู่ใหม่ แต่ยังไม่มีกลุ่ม${missing} ให้ใส่ สร้างกลุ่มในหน้าตั้งค่าก่อน`, 'error');
          return;
        }

        // Rows that are already stored (importing a file you exported, or the same file twice) are left out
        let fresh = items;
        let skippedDuplicates = 0;
        if (items.length > 0) {
          const dates = items.map(i => i.date).sort((a, b) => a.localeCompare(b));
          try {
            const existing = await transactionService.getAll(dates[0], dates[dates.length - 1]);
            ({ fresh, skipped: skippedDuplicates } = splitImportDuplicates(items, existing));
          } catch (e) {
            console.warn('Duplicate check skipped:', e);
          }
        }

        if (fresh.length > 0) {
          setImportPreview({
            items: fresh,
            updatedDayTypeConfig,
            updatedCategories,
            newCategories: created.newCategories,
            newDayTypeConfigs: created.newDayTypeConfigs,
            isConfigChanged: created.newDayTypeConfigs.length > 0,
            isCategoryChanged: created.newCategories.length > 0,
            newDayTypes,
            skippedDuplicates,
            skippedInvalid: invalidDates,
          });
        } else if (skippedDuplicates > 0) {
          showToast(`ทุกรายการในไฟล์ (${skippedDuplicates} รายการ) มีอยู่แล้ว ไม่มีข้อมูลใหม่ให้นำเข้า`, 'info');
        } else {
          showToast('ไม่พบข้อมูลที่จะบันทึก ตรวจสอบรูปแบบข้อมูลอีกครั้ง', 'error');
        }
      } catch (err: any) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการประมวลผลไฟล์: ' + err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
    },
    [categories, cashflowGroups, dayTypes, dayTypeConfig, showToast]
  );

  const confirmImport = useCallback(
    async ({ onSuccess }: { onSuccess?: () => void } = {}) => {
      if (!importPreview) return;
      setIsProcessing(true);
      const { items, updatedCategories, newCategories, newDayTypeConfigs, newDayTypes } = importPreview;

      try {
        // Persist what the file introduces BEFORE the rows that point at it. Only what the (possibly trimmed)
        // preview still uses; the server refuses a row whose category does not exist.
        const usedCategories = new Set<string>(items.map((i: any) => i.category));
        const categoriesToCreate: Category[] = newCategories.filter((c: Category) => usedCategories.has(c.name));
        for (const c of categoriesToCreate) {
          await categoryService.save({
            id: c.id, name: c.name, icon: c.icon, color: c.color, cashflow_group_id: c.cashflowGroup, order_index: c.order_index,
          });
        }
        const usedDayTypes = new Set<string>(Object.values(newDayTypes));
        const dayTypesToCreate: DayType[] = newDayTypeConfigs.filter((d: DayType) => usedDayTypes.has(d.id));
        for (const d of dayTypesToCreate) await dayTypeService.save(d);

        const idByName = new Map<string, string>(updatedCategories.map((c: Category) => [c.name, c.id]));
        // amount: the preview's number field hands back text once the user has retyped it
        await saveToDb(items.map((i: any) => ({ ...i, amount: Number(i.amount), category_id: idByName.get(i.category) })));

        // Only the days whose type actually changes (the map also holds every day that was already set)
        const savedDays: Record<string, string> = {};
        let failedDays = 0;
        for (const [date, typeId] of Object.entries<string>(newDayTypes)) {
          if (dayTypes[date] === typeId) continue;
          try {
            await calendarService.save(date, typeId);
            savedDays[date] = typeId;
          } catch (e) {
            console.error('Calendar sync failed:', e);
            failedDays++;
          }
        }
        setDayTypes(prev => ({ ...prev, ...savedDays }));
        if (dayTypesToCreate.length > 0) setDayTypeConfig([...dayTypeConfig, ...dayTypesToCreate]);
        if (categoriesToCreate.length > 0) setCategories([...categories, ...categoriesToCreate]);

        setImportPreview(null);
        if (failedDays > 0) {
          showToast(`นำเข้า ${items.length} รายการแล้ว แต่บันทึกประเภทวันไม่สำเร็จ ${failedDays} วัน`, 'error');
        } else {
          showToast(`นำเข้าข้อมูล ${items.length} รายการสำเร็จ`, 'success');
        }
        onSuccess?.();
      } catch (err: any) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      } finally {
        setIsProcessing(false);
      }
    },
    [importPreview, saveToDb, dayTypes, dayTypeConfig, categories, setDayTypes, setDayTypeConfig, setCategories, showToast]
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsProcessing(true);
      try {
        const text = await file.text();
        await processCSVText(text);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch {
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์', 'error');
        setIsProcessing(false);
      }
    },
    [processCSVText, showToast]
  );

  return {
    importPreview,
    setImportPreview,
    isProcessing,
    fileInputRef,
    handleFileUpload,
    confirmImport,
  };
}
