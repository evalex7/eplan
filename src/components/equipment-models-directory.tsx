"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { EquipmentModel } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, BookOpen, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { initialEquipmentModels } from '@/lib/equipment-models';

const LOCAL_STORAGE_KEY = 'equipmentModels';

// Dialog for adding or editing a model
const AddEditModelDialog = ({
  isOpen,
  setIsOpen,
  onSave,
  modelToEdit,
  existingCategories
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onSave: (model: Omit<EquipmentModel, 'id'>, id?: string) => void;
  modelToEdit?: EquipmentModel | null;
  existingCategories: string[];
}) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const { toast } = useToast();
  const isEditing = !!modelToEdit;

  React.useEffect(() => {
    if (isOpen) {
      if (isEditing && modelToEdit) {
        setName(modelToEdit.name);
        setCategory(modelToEdit.category);
        setIsAddingNewCategory(!existingCategories.includes(modelToEdit.category));
      } else {
        setName('');
        setCategory('');
        setIsAddingNewCategory(false);
      }
    }
  }, [modelToEdit, isEditing, isOpen, existingCategories]);


  const handleSubmit = () => {
    if (!name || !category) {
      toast({
        variant: "destructive",
        title: "Помилка валідації",
        description: "Будь ласка, заповніть назву та категорію."
      })
      return;
    }
    const finalData: Omit<EquipmentModel, 'id'> = {
        name: name.trim(),
        category: category.trim()
    };
    onSave(finalData, modelToEdit?.id);
    setIsOpen(false);
  };

  const handleSelectCategory = (value: string) => {
    if (value === 'add-new') {
        setIsAddingNewCategory(true);
        setCategory('');
    } else {
        setIsAddingNewCategory(false);
        setCategory(value);
    }
  }


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редагувати модель' : 'Додати нову модель'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Змініть дані моделі обладнання.' : 'Введіть назву та категорію нової моделі.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="category">Категорія <span className="text-destructive">*</span></Label>
            {!isAddingNewCategory ? (
                 <Select onValueChange={handleSelectCategory} value={category}>
                    <SelectTrigger>
                        <SelectValue placeholder="Оберіть категорію..." />
                    </SelectTrigger>
                    <SelectContent>
                        {existingCategories.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                        <SelectItem value="add-new">Додати нову...</SelectItem>
                    </SelectContent>
                </Select>
            ) : (
                <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Напр., Кондиціонер" autoFocus />
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Назва моделі <span className="text-destructive">*</span></Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр., Cooper&Hunter CH-S09FTXQ" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Скасувати</Button>
          <Button onClick={handleSubmit}>Зберегти</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function EquipmentModelsDirectory() {
  const [models, setModels] = useState<EquipmentModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const isAdmin = useIsAdmin();

  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [modelToEdit, setModelToEdit] = useState<EquipmentModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<EquipmentModel | null>(null);

  useEffect(() => {
    try {
      const storedModels = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedModels) {
        setModels(JSON.parse(storedModels));
      } else {
        setModels(initialEquipmentModels);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialEquipmentModels));
      }
    } catch (error) {
      console.error("Failed to access localStorage", error);
      setModels(initialEquipmentModels); // Fallback to initial models
    } finally {
        setIsLoading(false);
    }
  }, []);

  const handleSaveModel = (modelData: Omit<EquipmentModel, 'id'>, id?: string) => {
    let updatedModels;
    if (id) {
        updatedModels = models.map(m => m.id === id ? { ...m, ...modelData } : m);
        toast({ title: 'Модель оновлено' });
    } else {
        const newModel: EquipmentModel = { id: `model-${Date.now()}`, ...modelData };
        updatedModels = [...models, newModel];
        toast({ title: 'Модель додано' });
    }
    setModels(updatedModels);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedModels));
  };

  const handleOpenDialog = (model: EquipmentModel | null = null) => {
    setModelToEdit(model);
    setAddEditDialogOpen(true);
  };

  const handleDeleteClick = (model: EquipmentModel) => {
    setModelToDelete(model);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!modelToDelete) return;
    const updatedModels = models.filter(m => m.id !== modelToDelete.id);
    setModels(updatedModels);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedModels));

    toast({
        title: 'Модель видалено',
        description: `Модель "${modelToDelete.name}" було успішно видалено.`,
    });

    setDeleteDialogOpen(false);
    setModelToDelete(null);
  };

  const filteredModels = useMemo(() => {
    if (!models) return [];
    const lowercasedQuery = searchQuery.toLowerCase();
    
    return models.filter(model => {
      const matchesCategory = selectedCategory === 'all' || model.category === selectedCategory;
      const matchesSearch =
        model.name.toLowerCase().includes(lowercasedQuery) ||
        model.category.toLowerCase().includes(lowercasedQuery);
      return matchesCategory && matchesSearch;
    });
  }, [models, searchQuery, selectedCategory]);

  const modelsByCategory = useMemo(() => {
    return filteredModels.reduce((acc, model) => {
      const { category } = model;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(model);
      return acc;
    }, {} as Record<string, EquipmentModel[]>);
  }, [filteredModels]);

  const existingCategories = useMemo(() => {
    if (!models) return [];
    return [...new Set(models.map(m => m.category))].sort((a,b) => a.localeCompare(b));
  }, [models]);
  
  const finalIsLoading = isLoading;


  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center gap-4 mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2 flex-shrink-0">
                <BookOpen className="h-6 w-6" />
                Довідник
            </h2>

              {isAdmin && (
                <div className="flex items-center gap-2 w-full justify-end">
                    <Button onClick={() => handleOpenDialog()} className="flex-shrink-0">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Додати
                    </Button>
                </div>
              )}

        </div>

       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Пошук за назвою моделі..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                  <SelectValue placeholder="Фільтрувати за категорією..." />
              </SelectTrigger>
              <SelectContent>
                  <SelectItem value="all">Всі категорії</SelectItem>
                  {existingCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
              </SelectContent>
          </Select>
        </div>

      {finalIsLoading && (
         <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
         </div>
      )}

      {!finalIsLoading && models && models.length === 0 && (
         <div className="text-center py-10 text-muted-foreground">
            <BookOpen className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">Довідник порожній</h3>
            <p className="mt-2 text-sm">Додайте першу модель обладнання, щоб почати.</p>
        </div>
      )}

      {!finalIsLoading && models && models.length > 0 && Object.keys(modelsByCategory).length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
            <p>Не знайдено моделей за вашим запитом.</p>
        </div>
      )}

      {!finalIsLoading && Object.keys(modelsByCategory).length > 0 && (
        <div className="space-y-4">
          {Object.entries(modelsByCategory).sort(([catA], [catB]) => catA.localeCompare(catB)).map(([category, modelList]) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="text-lg">{category}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                    {modelList.sort((a,b) => a.name.localeCompare(b.name)).map(model => (
                        <div key={model.id} className="flex justify-between items-center p-2 rounded-md hover:bg-muted/50">
                        <span className="font-medium text-sm">{model.name}</span>

                          {isAdmin && (
                            <div className="flex items-center">
                              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => handleOpenDialog(model)}>
                                  <Pencil className="h-5 w-5 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => handleDeleteClick(model)}>
                                  <Trash2 className="h-5 w-5 text-destructive" />
                              </Button>
                            </div>
                          )}

                        </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isAdmin && (
        <AddEditModelDialog
          isOpen={isAddEditDialogOpen}
          setIsOpen={setAddEditDialogOpen}
          onSave={handleSaveModel}
          modelToEdit={modelToEdit}
          existingCategories={existingCategories}
        />
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ви впевнені?</AlertDialogTitle>
            <AlertDialogDescription>
               Ця дія видалить модель "{modelToDelete?.name}". Ви не зможете скасувати цю дію.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
