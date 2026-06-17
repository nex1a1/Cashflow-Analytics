// src/hooks/useCategories.js
import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '../context/ToastContext';
import { categoryService, groupService } from '../services/api';

export default function useCategories(initialCategories, setCashflowGroups) {
  const [categories, setCategories] = useState(initialCategories);
  const { showToast } = useToast();

  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoryService.getAll();
      const mapped = data.map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        cashflowGroup: c.cashflow_group_id,
        type: c.group_type,
        allocation_type: c.allocation_type,
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

  const handleCategoryChange = useCallback(async (catId, field, value) => {
    // 1. Update local state immediately for smooth UI
    setCategories(prev => prev.map(c => {
      if (c.id !== catId) return c;
      return { ...c, [field]: value };
    }));

    // 2. Retrieve current category and prepare the updated version
    const cat = categoriesRef.current.find(c => c.id === catId);
    if (!cat) return;

    const updatedCat = { ...cat, [field]: value };

    // 3. Only save if name is not empty to avoid 400 errors
    if (updatedCat.name && updatedCat.name.trim() !== '') {
      const toSave = {
        id: updatedCat.id,
        name: updatedCat.name,
        icon: updatedCat.icon,
        color: updatedCat.color,
        cashflow_group_id: updatedCat.cashflowGroup,
        order_index: updatedCat.order_index
      };

      try {
        await categoryService.save(toSave);
      } catch (err) {
        console.error('Failed to save category:', err);
      }
    }
  }, []);

  const handleAddCategory = useCallback(async (type) => {
    try {
      const groups = await groupService.getAll();
      const defaultGroup = groups.find(g => g.type === type) || groups[0];
      
      if (!defaultGroup) {
        showToast('กรุณาสร้างกลุ่มก่อนเพิ่มหมวดหมู่', 'error');
        return;
      }

      const sameTypeCategories = categoriesRef.current.filter(c => c.type === type);
      const maxOrder = sameTypeCategories.length > 0 
        ? Math.max(...sameTypeCategories.map(c => c.order_index || 0)) 
        : 0;

      const newId = crypto.randomUUID();
      const newCatBackend = {
        id: newId,
        name: type === 'income' ? 'รายรับใหม่' : 'หมวดหมู่ใหม่',
        icon: type === 'income' ? '💰' : '📌',
        color: type === 'income' ? '#10B981' : '#64748B',
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
  }, [loadCategories, showToast]);

  const handleDeleteCategory = useCallback(async (id, transactions) => {
    const catToDelete = categoriesRef.current.find(c => c.id === id);
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
  }, [loadCategories, showToast]);

  const handleMoveCategory = useCallback(async (id, direction) => {
    const currentCategories = categoriesRef.current;
    const targetCat = currentCategories.find(c => c.id === id);
    if (!targetCat) return;

    // Filter categories WITHIN the same type
    const sameTypeCategories = currentCategories
      .filter(c => c.type === targetCat.type)
      .sort((a, b) => a.order_index - b.order_index);
    
    const index = sameTypeCategories.findIndex(c => c.id === id);
    if (index === -1) return;
    
    const dir = direction.toLowerCase();
    let swapIndex = -1;
    
    if (dir === 'up' && index > 0) swapIndex = index - 1;
    else if (dir === 'down' && index < sameTypeCategories.length - 1) swapIndex = index + 1;
    
    if (swapIndex !== -1) {
      // Create a new array with swapped elements
      const updatedList = [...sameTypeCategories];
      [updatedList[index], updatedList[swapIndex]] = [updatedList[swapIndex], updatedList[index]];
      
      // Map to set clean sequential indices (1, 2, 3...) to heal any duplicates/gaps
      const finalUpdated = updatedList.map((c, i) => ({
        ...c,
        order_index: i + 1
      }));

      const toBackend = (c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        cashflow_group_id: c.cashflowGroup,
        order_index: c.order_index
      });

      try {
        for (const cat of finalUpdated) {
          const original = currentCategories.find(c => c.id === cat.id);
          if (!original || original.order_index !== cat.order_index) {
            await categoryService.save(toBackend(cat));
          }
        }
        await loadCategories();
      } catch (err) {
        showToast('ไม่สามารถเปลี่ยนลำดับหมวดหมู่ได้: ' + err.message, 'error');
      }
    }
  }, [loadCategories, showToast]);

  return { 
    categories, setCategories, 
    handleCategoryChange, handleAddCategory, 
    handleDeleteCategory, handleMoveCategory,
    loadCategories, loadGroups
  };
}
