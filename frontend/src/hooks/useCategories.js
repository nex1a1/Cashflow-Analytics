// src/hooks/useCategories.js
import { useState } from 'react';
import { CATEGORIES_KEY } from '../constants';

export default function useCategories(initialCategories, saveSettingToDb, saveToDb) {
  const [categories, setCategories] = useState(initialCategories);

  const handleCategoryChange = async (catId, field, value, transactions) => {
    const oldCat = categories.find(c => c.id === catId);
    if (!oldCat) return;
    const updatedCats = categories.map(c => c.id === catId ? { ...c, [field]: value } : c);
    setCategories(updatedCats);
    await saveSettingToDb(CATEGORIES_KEY, updatedCats);

    if (field === 'name' && value !== oldCat.name) {
      const txToUpdate = transactions
        .filter(t => t.category === oldCat.name)
        .map(t => ({ ...t, category: value }));
      if (txToUpdate.length > 0) await saveToDb(txToUpdate);
    }
  };

  const handleAddCategory = async (type) => {
    const isIncome = type === 'income';
    const newCat = {
      id: `c_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: isIncome ? 'รายรับใหม่' : 'หมวดหมู่ใหม่',
      icon: isIncome ? '💰' : '📌',
      color: isIncome ? '#10B981' : '#64748B',
      type,
      cashflowGroup: isIncome ? 'cg_bonus' : 'cg_variable',
      isFixed: false,
    };
    const updated = [...categories, newCat];
    setCategories(updated);
    await saveSettingToDb(CATEGORIES_KEY, updated);
  };

  const handleDeleteCategory = async (id, transactions) => {
    const catToDelete = categories.find(c => c.id === id);
    if (!catToDelete) return;
    if (transactions.some(t => t.category === catToDelete.name)) {
      alert('ไม่สามารถลบหมวดหมู่ที่มีรายการบัญชีใช้งานอยู่ได้');
      return;
    }
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    await saveSettingToDb(CATEGORIES_KEY, updated);
  };

  const handleMoveCategory = async (id, direction) => {
    const newCategories = [...categories];
    const index = newCategories.findIndex(c => c.id === id);
    if (index === -1) return;
    const dir = direction.toLowerCase();
    if (dir === 'up' && index > 0) {
      [newCategories[index - 1], newCategories[index]] = [newCategories[index], newCategories[index - 1]];
    } else if (dir === 'down' && index < newCategories.length - 1) {
      [newCategories[index + 1], newCategories[index]] = [newCategories[index], newCategories[index + 1]];
    }
    setCategories(newCategories);
    await saveSettingToDb(CATEGORIES_KEY, newCategories);
  };

  return { categories, setCategories, handleCategoryChange, handleAddCategory, handleDeleteCategory, handleMoveCategory };
}