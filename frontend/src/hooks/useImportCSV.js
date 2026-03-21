// src/hooks/useImportCSV.js
// ─────────────────────────────────────────────────────────────
// รับผิดชอบทุกอย่างที่เกี่ยวกับการ import CSV
// แยกออกจาก App.jsx (~150 บรรทัด)
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useCallback } from 'react';
import { CALENDAR_API_URL, CATEGORIES_KEY, DAY_TYPE_CONFIG_KEY } from '../constants';
import { autoCategorize, parseCSV, cleanNumber } from '../utils/csvParser';
import { settingsService } from '../services/api';

export default function useImportCSV({
  categories,
  dayTypes,
  setDayTypes,
  dayTypeConfig,
  setDayTypeConfig,
  setCategories,
  saveToDb,
}) {
  const [importPreview, setImportPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const processCSVText = useCallback(async (rawText) => {
    try {
      const rawTrimmed = rawText.trim();
      if (!rawTrimmed) {
        alert('ไม่พบข้อมูล');
        setIsProcessing(false);
        return;
      }

      let newList = [];
      let batchId = Date.now();
      let newDayTypes = { ...dayTypes };
      let updatedDayTypeConfig = [...dayTypeConfig];
      let updatedCategories = [...categories];
      let isConfigChanged = false;
      let isCategoryChanged = false;

      const getOrCreateDayType = (label) => {
        if (!label || label.trim() === '') return null;
        label = label.trim();
        let found = updatedDayTypeConfig.find(dt => dt.label === label);
        if (!found) {
          found = {
            id: `dt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            label,
            color: '#64748B',
          };
          updatedDayTypeConfig.push(found);
          isConfigChanged = true;
        }
        return found.id;
      };

      const getOrCreateCategory = (name, typeStr = 'รายจ่าย') => {
        if (!name || name.trim() === '') {
          return updatedCategories.filter(c => c.type === 'expense')[0]?.name || 'อื่นๆ';
        }
        name = name.trim();
        let found = updatedCategories.find(c => c.name === name);
        if (!found) {
          const isIncome = typeStr === 'รายรับ' || typeStr === 'income';
          found = {
            id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            name,
            icon: '📌',
            color: isIncome ? '#10B981' : '#64748B',
            type: isIncome ? 'income' : 'expense',
            cashflowGroup: isIncome ? 'bonus' : 'variable',
            isFixed: false,
          };
          updatedCategories.push(found);
          isCategoryChanged = true;
        }
        return found.name;
      };

      const parsedRows = parseCSV(rawTrimmed);
      if (parsedRows.length < 2) {
        alert('ข้อมูลไม่ถูกต้อง หรือมีน้อยกว่า 2 บรรทัด');
        setIsProcessing(false);
        return;
      }

      const headers = parsedRows[0];
      const dateColIndex = 0;
      const noteColIndex = headers.length - 1;
      const excludeCategories = ['date', 'วันที่', 'notes', 'หมายเหตุ', 'รวม', 'total'];
      const isCsvLong =
        headers.length >= 4 &&
        (headers[1] === 'ประเภท' || headers[1] === 'หมวดหมู่' || headers[1] === 'ชนิดวัน');

      for (let i = 1; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        if (row.length < 2) continue;
        const dateStr = row[dateColIndex];
        if (!dateStr || !dateStr.includes('/')) continue;

        if (isCsvLong) {
          let catName, desc, amtStr, typeStr = 'รายจ่าย';

          if (headers[1] === 'ชนิดวัน' && row.length >= 6) {
            const typeId = getOrCreateDayType(row[1]);
            if (typeId) newDayTypes[dateStr] = typeId;
            typeStr = row[2]; catName = row[3]; desc = row[4]; amtStr = row[5];
          } else if (headers[1] === 'ประเภท' && row.length >= 5) {
            typeStr = row[1]; catName = row[2]; desc = row[3]; amtStr = row[4];
          } else {
            catName = row[1]; desc = row[2]; amtStr = row[3];
          }

          const finalCatName = getOrCreateCategory(catName, typeStr);
          const amount = cleanNumber(amtStr);
          if (amount !== 0) {
            newList.push({
              id: `csv_${batchId}_${i}`,
              date: dateStr,
              category: finalCatName,
              description: desc || finalCatName,
              amount: Math.abs(amount),
              dayNote: '',
            });
          }
          continue;
        }

        const note = row.length === headers.length ? row[noteColIndex] || '' : '';
        for (let j = 1; j < Math.min(row.length, headers.length); j++) {
          if (j === noteColIndex) continue;
          const rawHeader = headers[j];
          if (!rawHeader || excludeCategories.some(exc => rawHeader.toLowerCase().includes(exc))) continue;

          const amount = cleanNumber(row[j]);
          if (amount !== 0) {
            let cleanStr = rawHeader.replace(/\n|\r/g, ' ').trim();
            let catName = cleanStr.split('(')[0].trim().replace(/[A-Za-z]+.*$/, '').trim() || cleanStr;
            let description = note?.trim() ? `${catName} · ${note.trim()}` : catName;
            if (!note && catName === 'อื่นๆ') description = catName;

            const autoCat = autoCategorize(catName, catName, updatedCategories);
            const finalCatName = autoCat !== 'อื่นๆ' ? autoCat : getOrCreateCategory(catName, 'รายจ่าย');

            newList.push({
              id: `csv_${batchId}_${i}_${j}`,
              date: dateStr,
              category: finalCatName,
              description,
              amount: Math.abs(amount),
              dayNote: note,
            });
          }
        }
      }

      if (newList.length > 0) {
        setImportPreview({ items: newList, updatedDayTypeConfig, updatedCategories, isConfigChanged, isCategoryChanged, newDayTypes });
      } else {
        alert('ไม่พบข้อมูลที่จะบันทึก ตรวจสอบรูปแบบข้อมูลอีกครั้ง');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการประมวลผลไฟล์: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [categories, dayTypes, dayTypeConfig]);

  const confirmImport = useCallback(async ({ onSuccess }) => {
    if (!importPreview) return;
    setIsProcessing(true);
    const { items, updatedDayTypeConfig, updatedCategories, isConfigChanged, isCategoryChanged, newDayTypes } = importPreview;

    try {
      await saveToDb(items);

      setDayTypes(prev => ({ ...prev, ...newDayTypes }));
      try {
        for (const [date, type_id] of Object.entries(newDayTypes)) {
          await fetch(CALENDAR_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, type_id }),
          });
        }
      } catch (e) { console.error('Calendar sync failed:', e); }

      if (isConfigChanged) {
        setDayTypeConfig(updatedDayTypeConfig);
        await settingsService.save(DAY_TYPE_CONFIG_KEY, updatedDayTypeConfig);
      }
      if (isCategoryChanged) {
        setCategories(updatedCategories);
        await settingsService.save(CATEGORIES_KEY, updatedCategories);
      }

      setImportPreview(null);
      onSuccess?.();
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [importPreview, saveToDb, setDayTypes, setDayTypeConfig, setCategories]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      await processCSVText(evt.target.result);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => { alert('เกิดข้อผิดพลาดในการอ่านไฟล์'); setIsProcessing(false); };
    reader.readAsText(file);
  }, [processCSVText]);

  return {
    importPreview,
    setImportPreview,
    isProcessing,
    fileInputRef,
    handleFileUpload,
    confirmImport,
  };
}