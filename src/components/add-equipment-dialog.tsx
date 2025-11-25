
"use client";

import { useState, useMemo, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Equipment, EquipmentModel } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface AddEquipmentDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (equipment: Omit<Equipment, 'id' | 'reports'>, id?: string) => void;
  equipmentToEdit?: Equipment | null;
  allModels: EquipmentModel[];
}

export default function AddEquipmentDialog({
  isOpen,
  setIsOpen,
  onSave,
  equipmentToEdit,
  allModels,
}: AddEquipmentDialogProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedModelName, setSelectedModelName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [groupNumber, setGroupNumber] = useState('');
  const { toast } = useToast();
  const isEditing = !!equipmentToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && equipmentToEdit) {
        setSelectedCategory(equipmentToEdit.name);
        setSelectedModelName(equipmentToEdit.model);
        setSerialNumber(equipmentToEdit.serialNumber || '');
        setGroupNumber(equipmentToEdit.groupNumber || '');
      } else {
        resetForm();
      }
    }
  }, [isOpen, isEditing, equipmentToEdit]);
  
  const resetForm = () => {
    setSelectedCategory('');
    setSelectedModelName('');
    setSerialNumber('');
    setGroupNumber('');
  };

  const categories = useMemo(() => {
    return [...new Set(allModels.map(m => m.category))].sort((a,b) => a.localeCompare(b));
  }, [allModels]);

  const modelsForCategory = useMemo(() => {
    if (!selectedCategory) return [];
    return allModels
      .filter(m => m.category === selectedCategory)
      .sort((a,b) => a.name.localeCompare(b.name));
  }, [allModels, selectedCategory]);


  const handleSubmit = () => {
    if (!selectedCategory || !selectedModelName) {
      toast({
        variant: 'destructive',
        title: 'Помилка валідації',
        description: 'Будь ласка, заповніть обов\'язкові поля: категорію та модель.',
      });
      return;
    }
    onSave(
        { 
          name: selectedCategory, 
          model: selectedModelName, 
          serialNumber: serialNumber.trim(), 
          groupNumber: groupNumber.trim() 
        },
        equipmentToEdit?.id
    );
    // Don't call setIsOpen(false) here; let the parent handle it.
  };
  
  const handleClose = () => {
    resetForm();
    setIsOpen(false);
  }

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setSelectedModelName('');
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редагувати обладнання' : 'Додати нове обладнання'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Змініть дані про обладнання.' : 'Оберіть обладнання з довідника та введіть його серійний номер.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Категорія (назва) <span className="text-destructive">*</span></Label>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category">
                    <SelectValue placeholder="Оберіть категорію..." />
                </SelectTrigger>
                <SelectContent>
                    {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Модель <span className="text-destructive">*</span></Label>
            <Select value={selectedModelName} onValueChange={setSelectedModelName} disabled={!selectedCategory}>
                <SelectTrigger id="model">
                    <SelectValue placeholder={!selectedCategory ? "Спочатку оберіть категорію" : "Оберіть модель..."} />
                </SelectTrigger>
                <SelectContent>
                     {modelsForCategory.map(mod => (
                        <SelectItem key={mod.id} value={mod.name}>{mod.name}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupNumber">Номер у групі</Label>
            <Input
              id="groupNumber"
              value={groupNumber}
              onChange={(e) => setGroupNumber(e.target.value)}
              placeholder="Напр., A1, 1B, тощо"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="serialNumber">Серійний номер</Label>
            <Input
              id="serialNumber"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              placeholder="S/N"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Зберегти зміни' : 'Додати до договору'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
