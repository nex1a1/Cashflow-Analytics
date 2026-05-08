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
        type: c.group_type,
        order_index: c.order_index || 0
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
      cashflow_group_id: field === 'cashflowGroup' ? value : cat.cashflowGroup,
      order_index: cat.order_index
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
    
    try {
      const groups = await groupService.getAll();
      const defaultGroup = groups.find(g => g.type === type) || groups[0];
      
      if (!defaultGroup) {
        showToast('กรุณาสร้างกลุ่มก่อนเพิ่มหมวดหมู่', 'error');
        return;
      }

      // Get max order_index WITHIN this type
      const sameTypeCategories = categories.filter(c => c.type === type);
      const maxOrder = sameTypeCategories.length > 0 
        ? Math.max(...sameTypeCategories.map(c => c.order_index || 0)) 
        : 0;

      const newCat = {
        id: crypto.randomUUID(),
        name: isIncome ? 'รายรับใหม่' : 'หมวดหมู่ใหม่',
        icon: isIncome ? '💰' : '📌',
        color: isIncome ? '#10B981' : '#64748B',
        is_fixed: 0,
        cashflow_group_id: defaultGroup.id,
        order_index: maxOrder + 1
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
    
    if (transactions.some(t => t.category_id === id || t.category === catToDelete.name)) {
      showToast('ไม่สามารถลบได้: มีรายการบัญชีที่กำลังใช้งานหมวดหมู่นี้อยู่ กรุณาลบรายการเหล่านั้นก่อน', 'error');
      return;
    }

    if (!window.confirm(`ยืนยันการลบหมวดหมู่ "${catToDelete.name}"?\n(หากมีรายการที่เคยลบไปแล้วในถังขยะที่อ้างอิงหมวดหมู่นี้ รายการเหล่านั้นจะถูกลบถาวร)`)) return;

    try {
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
    const targetCat = categories.find(c => c.id === id);
    if (!targetCat) return;

    // Filter categories WITHIN the same type
    const sameTypeCategories = categories
      .filter(c => c.type === targetCat.type)
      .sort((a, b) => a.order_index - b.order_index);
    
    const index = sameTypeCategories.findIndex(c => c.id === id);
    if (index === -1) return;
    
    const dir = direction.toLowerCase();
    let swapIndex = -1;
    
    if (dir === 'up' && index > 0) swapIndex = index - 1;
    else if (dir === 'down' && index < sameTypeCategories.length - 1) swapIndex = index + 1;
    
    if (swapIndex !== -1) {
      const otherCat = sameTypeCategories[swapIndex];
      
      const updatedTarget = { ...targetCat, order_index: otherCat.order_index };
      const updatedOther = { ...otherCat, order_index: targetCat.order_index };

      const toBackend = (c) => ({
        ...c,
        is_fixed: c.isFixed ? 1 : 0,
        cashflow_group_id: c.cashflowGroup,
        order_index: c.order_index
      });

      try {
        await categoryService.save(toBackend(updatedTarget));
        await categoryService.save(toBackend(updatedOther));
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
