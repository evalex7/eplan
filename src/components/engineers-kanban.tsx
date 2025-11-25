"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import type { TaskStatus, ServiceEngineer, ServiceContract, UserProfile } from '@/lib/types';
import { cn, capitalizeWords } from '@/lib/utils';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
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
import { Input } from './ui/input';
import { Label } from './ui/label';
import { PlusCircle, Mail, Phone, Pencil, Briefcase, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, addDoc } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useIsAdmin } from '@/hooks/useIsAdmin';

const AddEditEngineerDialog = ({ 
  isOpen, 
  setIsOpen, 
  onSave, 
  engineerToEdit 
}: { 
  isOpen: boolean, 
  setIsOpen: (open: boolean) => void, 
  onSave: (engineer: Omit<ServiceEngineer, 'id'>, id?: string) => void,
  engineerToEdit?: ServiceEngineer | null 
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const { toast } = useToast();
  const isEditing = !!engineerToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditing && engineerToEdit) {
        setName(engineerToEdit.name);
        setEmail(engineerToEdit.email);
        setPhone(engineerToEdit.phone || '');
      } else {
        setName('');
        setEmail('');
        setPhone('');
      }
    }
  }, [engineerToEdit, isEditing, isOpen]);


  const handleSubmit = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        toast({
            variant: 'destructive',
            title: 'Помилка валідації',
            description: 'Будь ласка, введіть коректну електронну адресу (наприклад, user@example.com).',
        });
        return;
    }

    const phoneRegex = /^\+380\d{9}$/;
    if (phone && !phoneRegex.test(phone)) {
        toast({
            variant: 'destructive',
            title: 'Помилка валідації',
            description: 'Будь ласка, введіть номер телефону у форматі +380XXXXXXXXX.',
        });
        return;
    }


    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Помилка валідації',
        description: "Будь ласка, заповніть поле 'Ім'я та прізвище'.",
      });
      return;
    }
    const finalData = { name, email, phone };
    onSave(finalData, engineerToEdit?.id);
    setIsOpen(false);
    toast({
      title: isEditing ? 'Інженера оновлено' : 'Інженера додано',
      description: `${finalData.name} було успішно ${isEditing ? 'оновлено' : 'додано'}.`,
    });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart, selectionEnd } = e.target;
    const capitalizedValue = capitalizeWords(value);

    setName(capitalizedValue);

    // Restore cursor position after state update
    setTimeout(() => {
        if (e.target && selectionStart !== null && selectionEnd !== null) {
            e.target.setSelectionRange(selectionStart, selectionEnd);
        }
    }, 0);
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редагувати дані інженера' : 'Додати нового інженера'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Змініть дані інженера.' : 'Введіть дані нового інженера для додавання до системи.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ім'я та прізвище <span className="text-destructive">*</span></Label>
            <Input 
              id="name" 
              value={name} 
              onChange={handleNameChange}
              placeholder="Введіть ім'я та прізвище"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Електронна пошта <span className="text-destructive">*</span></Label>
            <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="example@mail.com" 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Номер телефону</Label>
            <Input 
                id="phone" 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="+380XXXXXXXXX" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Скасувати</Button>
          <Button onClick={handleSubmit}>{isEditing ? 'Зберегти зміни' : 'Додати'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const customEngineerSortOrder = [
  'Роман Романченко',
  'Олександр Адамчик',
  'Олексій Козачок',
  'Євгеній Олексієнко',
  'Віталій Лешковят',
  'Сергій Мусієнко',
  'Артем Полішевський',
  'Дмитро Лялько',
  'Ілля Олексієнко'
];

export default function EngineersKanban() {
  const [isAddEditDialogOpen, setAddEditDialogOpen] = useState(false);
  const [engineerToEdit, setEngineerToEdit] = useState<ServiceEngineer | null>(null);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [engineerToDelete, setEngineerToDelete] = useState<ServiceEngineer | null>(null);

  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isAdmin = useIsAdmin();
  
  const engineersRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceEngineers') : null, [firestore]);
  const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
  
  const { data: allEngineers, isLoading: isLoadingEngineers } = useCollection<ServiceEngineer>(engineersRef);
  const { data: maintenanceTasks, isLoading: isLoadingContracts } = useCollection<ServiceContract>(contractsRef);

  const engineers = useMemo(() => {
    if (!allEngineers) return [];
    return [...allEngineers].sort((a, b) => {
      const indexA = customEngineerSortOrder.indexOf(a.name);
      const indexB = customEngineerSortOrder.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allEngineers]);

  const handleSaveEngineer = (newEngineerData: Omit<ServiceEngineer, 'id'>, id?: string) => {
    if (!engineersRef || !firestore) return;
    const finalData = { ...newEngineerData, name: capitalizeWords(newEngineerData.name) };

    if (id) {
      const docRef = doc(firestore, 'serviceEngineers', id);
      updateDocumentNonBlocking(docRef, finalData);
    } else {
        addDocumentNonBlocking(engineersRef, finalData);
    }
  };

  const handleOpenDialog = (engineer: ServiceEngineer | null = null) => {
    setEngineerToEdit(engineer);
    setAddEditDialogOpen(true);
  };
  
  const handleDeleteClick = (engineer: ServiceEngineer) => {
    setEngineerToDelete(engineer);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!engineerToDelete || !firestore) return;

    // TODO: Add logic to check if engineer is assigned to any active tasks
    // For now, we will just delete

    const docRef = doc(firestore, 'serviceEngineers', engineerToDelete.id);
    deleteDocumentNonBlocking(docRef);

    toast({
      title: 'Інженера видалено',
      description: `${engineerToDelete.name} було видалено з системи.`,
    });

    setDeleteDialogOpen(false);
    setEngineerToDelete(null);
  };


  const isLoading = isLoadingEngineers || isLoadingContracts;

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };
  
  const engineerColors = [
    'bg-blue-100 text-blue-800',
    'bg-green-100 text-green-800',
    'bg-orange-100 text-orange-800',
    'bg-purple-100 text-purple-800',
    'bg-pink-100 text-pink-800',
    'bg-indigo-100 text-indigo-800',
    'bg-teal-100 text-teal-800',
  ];


  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">
          Сервісні інженери ({engineers?.length || 0})
        </h2>
        
        {isAdmin && (
          <Button onClick={() => handleOpenDialog()}>
            <PlusCircle suppressHydrationWarning className="mr-2 h-4 w-4" />
            Додати
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {engineers?.map((engineer, index) => {
            const colorClass = engineerColors[index % engineerColors.length];

            return (
              <Card key={engineer.id} className="shadow-sm hover:shadow-md transition-shadow rounded-xl">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                     <Avatar className={cn("h-10 w-10 text-sm font-bold", colorClass)}>
                        <AvatarFallback className="bg-transparent">{getInitials(engineer.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-base">{engineer.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                        <Phone suppressHydrationWarning className="h-4 w-4" />
                        <span className="text-sm">{engineer.phone}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg bg-gray-100 hover:bg-gray-200" onClick={() => handleOpenDialog(engineer)}>
                        <Pencil suppressHydrationWarning className="h-5 w-5 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg bg-red-50 hover:bg-red-100" onClick={() => handleDeleteClick(engineer)}>
                        <Trash2 suppressHydrationWarning className="h-5 w-5 text-red-600" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      
      {isAdmin && (
        <AddEditEngineerDialog 
          isOpen={isAddEditDialogOpen} 
          setIsOpen={setAddEditDialogOpen} 
          onSave={handleSaveEngineer}
          engineerToEdit={engineerToEdit}
        />
      )}
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ви впевнені?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія видалить інженера {engineerToDelete?.name} з системи. Цю дію неможливо буде скасувати.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Видалити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
