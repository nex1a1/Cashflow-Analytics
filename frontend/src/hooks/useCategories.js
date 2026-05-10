// src/hooks/useCategories.js
import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import { categoryService, groupService } from '../services/api';

export default function useCategories(initialCategories, setCashflowGroups) {
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

  const handleCategoryChange = async (catId, field, value) => {
    // 1. Update local state immediately for smooth UI
    setCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return { ...c, [field]: value };
    }));

    // 2. Prepare data for backend
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;
    
    const toSave = {
      id: cat.id,
      name: field === 'name' ? value : cat.name,
      icon: field === 'icon' ? value : cat.icon,
      color: field === 'color' ? value : cat.color,
      is_fixed: field === 'isFixed' ? (value ? 1 : 0) : (cat.isFixed ? 1 : 0),
      cashflow_group_id: field === 'cashflowGroup' ? value : cat.cashflowGroup,
      order_index: cat.order_index
    };

    // 3. Only save if name is not empty to avoid 400 errors
    if (!toSave.name || toSave.name.trim() === '') return;

    try {
      await categoryService.save(toSave);
      // We don't call loadCategories() here to prevent the UI from jumping while typing
    } catch (err) {
      console.error('Failed to save category:', err);
    }
  };

  const handleAddCategory = async (type) => {
    try {
      const groups = await groupService.getAll();
      const defaultGroup = groups.find(g => g.type === type) || groups[0];
      
      if (!defaultGroup) {
        showToast('กรุณาสร้างกลุ่มก่อนเพิ่มหมวดหมู่', 'error');
        return;
      }

      const sameTypeCategories = categories.filter(c => c.type === type);
      const maxOrder = sameTypeCategories.length > 0 
        ? Math.max(...sameTypeCategories.map(c => c.order_index || 0)) 
        : 0;

      const newId = crypto.randomUUID();
      const newCatBackend = {
        id: newId,
        name: type === 'income' ? 'รายรับใหม่' : 'หมวดหมู่ใหม่',
        icon: type === 'income' ? '💰' : '📌',
        color: type === 'income' ? '#10B981' : '#64748B',
        is_fixed: 0,
        cashflow_group_id: defaultGroup.id,
        order_index: maxOrder + 1
      };
      
      await categoryService.save(newCatBackend);
      await loadCategories(); // Reload to get the correct group_type from server
      showToast('เพิ่มหมวดหมู่สำเร็จ', 'success');
      return newId; // Return ID so the view can focus it
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
