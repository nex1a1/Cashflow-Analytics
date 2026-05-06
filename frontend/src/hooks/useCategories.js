// src/hooks/useCategories.js
import { useState, useCallback } from 'react';
import { CATEGORIES_KEY } from '../constants';
import { useToast } from '../context/ToastContext';
import { categoryService, groupService } from '../services/api';

export default function useCategories(initialCategories, saveSettingToDb, saveToDb, setCashflowGroups) {
  const [categories, setCategories] = useState(initialCategories);
  const { showToast } = useToast();

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoryService.getAll();
      const mapped = data.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        isFixed: !!c.is_fixed,
        cashflowGroup: c.cashflow_group_id,
        type: c.group_type
      }));
      setCategories(mapped);
    } catch (err) { console.error('Failed to reload categories:', err); }
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      const groups = await groupService.getAll();
      if (setCashflowGroups) setCashflowGroups(groups);
    } catch (err) { console.error('Failed to reload groups:', err); }
  }, [setCashflowGroups]);

  const handleCategoryChange = async (catId, field, value, transactions) => {
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    
    const updatedCat = { 
      ...cat, 
      [field]: value,
      // Map frontend names back to backend names if necessary
      is_fixed: field === 'isFixed' ? (value ? 1 : 0) : (cat.isFixed ? 1 : 0),
      cashflow_group_id: field === 'cashflowGroup' ? value : cat.cashflowGroup
    };

    try {
      await categoryService.save(updatedCat);
      await loadCategories();
      showToast('อัปเดตหมวดหมู่สำเร็จ', 'success');
    } catch (err) {
      showToast('ไม่สามารถอัปเดตหมวดหมู่ได้: ' + err.message, 'error');
    }
  };

  const handleAddCategory = async (type) => {
    const isIncome = type === 'income';
    
    // Find a default group for this type
    try {
      const groups = await groupService.getAll();
      const defaultGroup = groups.find(g => g.type === type) || groups[0];
      
      const newCat = {
        id: crypto.randomUUID(),
        name: isIncome ? 'รายรับใหม่' : 'หมวดหมู่ใหม่',
        icon: isIncome ? '💰' : '📌',
        color: isIncome ? '#10B981' : '#64748B',
        is_fixed: 0,
        cashflow_group_id: defaultGroup ? defaultGroup.id : 1,
      };
      
      await categoryService.save(newCat);
      await loadCategories();
      showToast('เพิ่มหมวดหมู่สำเร็จ', 'success');
    } catch (err) {
      showToast('ไม่สามารถเพิ่มหมวดหมู่ได้: ' + err.message, 'error');
    }
  };

  const handleDeleteCategory = async (id, transactions) => {
    const catToDelete = categories.find(c => c.id === id);
    if (!catToDelete) return;
    
    // 1. ตรวจสอบรายการที่ "ยังไม่ถูกลบ" (Active transactions)
    if (transactions.some(t => t.category_id === id || t.category === catToDelete.name)) {
      showToast('ไม่สามารถลบได้: มีรายการบัญชีที่กำลังใช้งานหมวดหมู่นี้อยู่ กรุณาลบรายการเหล่านั้นก่อน', 'error');
      return;
    }

    if (!window.confirm(`ยืนยันการลบหมวดหมู่ "${catToDelete.name}"?\n(หากมีรายการที่เคยลบไปแล้วในถังขยะที่อ้างอิงหมวดหมู่นี้ รายการเหล่านั้นจะถูกลบถาวร)`)) return;

    try {
      // แจ้ง Backend ให้จัดการลบรายการที่ค้างอยู่ในถังขยะ (is_deleted=1) ก่อนลบ Category
      await categoryService.deleteById(id);
      await loadCategories();
      showToast('ลบหมวดหมู่สำเร็จ', 'success');
    } catch (err) {
      if (err.message.includes('FOREIGN KEY')) {
        showToast('ลบไม่สำเร็จ: ยังมีข้อมูลเก่าอ้างอิงหมวดหมู่นี้อยู่', 'error');
      } else {
        showToast('ไม่สามารถลบหมวดหมู่ได้: ' + err.message, 'error');
      }
    }
  };

  const handleMoveCategory = async (id, direction) => {
    const index = categories.findIndex(c => c.id === id);
    if (index === -1) return;
    
    const newCategories = [...categories];
    const dir = direction.toLowerCase();
    let targetIndex = -1;
    
    if (dir === 'up' && index > 0) targetIndex = index - 1;
    else if (dir === 'down' && index < newCategories.length - 1) targetIndex = index + 1;
    
    if (targetIndex !== -1) {
      [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
      
      // Update order_index for all categories
      const updatedWithOrder = newCategories.map((c, i) => ({
        ...c,
        order_index: i + 1,
        // Map back to backend fields
        is_fixed: c.isFixed ? 1 : 0,
        cashflow_group_id: c.cashflowGroup
      }));
      
      setCategories(newCategories); // Optimistic UI update

      try {
        // Save all updated categories
        for (const cat of updatedWithOrder) {
          await categoryService.save(cat);
        }
        await loadCategories();
      } catch (err) {
        showToast('ไม่สามารถเปลี่ยนลำดับหมวดหมู่ได้: ' + err.message, 'error');
      }
    }
  };

  return { 
    categories, setCategories, 
    handleCategoryChange, handleAddCategory, 
    handleDeleteCategory, handleMoveCategory,
    loadCategories, loadGroups
  };
}
