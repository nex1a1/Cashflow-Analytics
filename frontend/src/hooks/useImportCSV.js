import { useState, useRef, useCallback } from 'react';
import { CALENDAR_API_URL, PREDICT_API_URL } from '../constants';
import { autoCategorize, parseCSV, cleanNumber } from '../utils/csvParser';
import { useToast } from '../context/ToastContext';

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
  const { showToast } = useToast();
  const fileInputRef = useRef(null);

  const processCSVText = useCallback(async (rawText) => {
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

      // 1. Collect all descriptions to predict categories from backend
      const headers = parsedRows[0];
      const isCsvLong = headers.length >= 4 && (headers[1] === 'ประเภท' || headers[1] === 'หมวดหมู่' || headers[1] === 'ชนิดวัน');
      
      const uniqueDescriptions = new Set();
      for (let i = 1; i < parsedRows.length; i++) {
        const row = parsedRows[i];
        if (row.length < 2) continue;
        
        let desc = '';
        if (isCsvLong) {
          // Date, [DayType], [Type], Category, Description, Amount
          if (headers[1] === 'ชนิดวัน' && row.length >= 6) desc = row[4];
          else if (headers[1] === 'ประเภท' && row.length >= 5) desc = row[3];
          else desc = row[2];
        } else {
          // Wide Format: Date, Cat1, Cat2..., Notes
          desc = row[row.length - 1]; // Notes
        }
        if (desc) uniqueDescriptions.add(desc);
      }

      // 2. Fetch Predictions from Shark Brain (Backend)
      let predictions = {};
      try {
        const res = await fetch(PREDICT_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ descriptions: Array.from(uniqueDescriptions) }),
        });
        if (res.ok) predictions = await res.json();
      } catch (e) {
        console.warn('Shark Brain Prediction failed, falling back to local logic:', e);
      }

      let newList = [];
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
            id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
            name,
            icon: '📌',
            color: isIncome ? '#10B981' : '#64748B',
            type: isIncome ? 'income' : 'expense',
            cashflowGroup: isIncome ? 'bonus' : 'variable',
            allocation_type: isIncome ? 'savings' : 'want',
          };
          updatedCategories.push(found);
          isCategoryChanged = true;
        }
        return found.name;
      };

      const dateColIndex = 0;
      const noteColIndex = headers.length - 1;
      const excludeCategories = ['date', 'วันที่', 'notes', 'หมายเหตุ', 'รวม', 'total'];

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

          // Use Prediction if category is generic or missing
          if ((!catName || catName === 'อื่นๆ') && predictions[desc]) {
            catName = predictions[desc].name;
          }

          const finalCatName = getOrCreateCategory(catName, typeStr);
          const amount = cleanNumber(amtStr);
          if (amount !== 0) {
            newList.push({
              id: crypto.randomUUID(),
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
            let catName = cleanStr.split('(')[0].trim().replace(/[a-zA-Z].*$/, '').trim() || cleanStr;
            let description = note?.trim() ? `${catName} · ${note.trim()}` : catName;
            
            // Intelligence Sync: Try backend prediction first for Wide Format too
            const predicted = predictions[description] || predictions[note?.trim()];
            const finalCatName = predicted ? getOrCreateCategory(predicted.name, 'รายจ่าย') : autoCategorize(description, catName, updatedCategories);

            newList.push({
              id: crypto.randomUUID(),
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
        showToast('ไม่พบข้อมูลที่จะบันทึก ตรวจสอบรูปแบบข้อมูลอีกครั้ง', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('เกิดข้อผิดพลาดในการประมวลผลไฟล์: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [categories, dayTypes, dayTypeConfig, showToast]);

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
      }
      if (isCategoryChanged) {
        setCategories(updatedCategories);
      }

      setImportPreview(null);
      showToast(`นำเข้าข้อมูล ${items.length} รายการสำเร็จ`, 'success');
      onSuccess?.();
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [importPreview, saveToDb, setDayTypes, setDayTypeConfig, setCategories, showToast]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      await processCSVText(evt.target.result);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => { showToast('เกิดข้อผิดพลาดในการอ่านไฟล์', 'error'); setIsProcessing(false); };
    reader.readAsText(file);
  }, [processCSVText, showToast]);

  return {
    importPreview,
    setImportPreview,
    isProcessing,
    fileInputRef,
    handleFileUpload,
    confirmImport,
  };
}