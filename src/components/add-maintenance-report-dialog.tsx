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
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ServiceReport, ServiceEngineer, EquipmentModel, Equipment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';

interface AddMaintenanceReportDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (report: Omit<ServiceReport, 'id'>, reportId?: string) => void;
  equipment: Equipment;
  reportToEdit?: ServiceReport | null;
  engineers: ServiceEngineer[];
  equipmentModels: EquipmentModel[];
}

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

export default function AddMaintenanceReportDialog({
  isOpen,
  setIsOpen,
  onSave,
  equipment,
  reportToEdit,
  engineers: allEngineers,
  equipmentModels,
}: AddMaintenanceReportDialogProps) {
  const [reportDate, setReportDate] = useState<Date | undefined>(new Date());
  const [engineerId, setEngineerId] = useState<string>('');
  const [workDescription, setWorkDescription] = useState('');
  const [partsUsed, setPartsUsed] = useState<{ name: string; quantity: number }[]>([]);
  const { toast } = useToast();
  const isEditing = !!reportToEdit;

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

  const safeGetDate = (date: any): Date | undefined => {
    if (!date) return undefined;
    if (typeof date.toDate === 'function') return date.toDate();
    const d = new Date(date);
    return isNaN(d.getTime()) ? undefined : d;
  }

  const resetForm = () => {
    setReportDate(new Date());
    setEngineerId('');
    setWorkDescription('');
    setPartsUsed([]);
  }

  useEffect(() => {
    if (isOpen) {
        if (isEditing && reportToEdit) {
            setReportDate(safeGetDate(reportToEdit.reportDate));
            setEngineerId(reportToEdit.engineerId);
            setWorkDescription(reportToEdit.workDescription);
            setPartsUsed(reportToEdit.partsUsed || []);
        } else {
            resetForm();
        }
    }
  }, [isOpen, isEditing, reportToEdit, equipment]);

  const handleAddPart = () => {
    setPartsUsed([...partsUsed, { name: '', quantity: 1 }]);
  };

  const handleRemovePart = (index: number) => {
    setPartsUsed(partsUsed.filter((_, i) => i !== index));
  };

  const handlePartChange = (index: number, field: 'name' | 'quantity', value: string | number) => {
    const newParts = [...partsUsed];
    if(field === 'quantity' && typeof value === 'string') {
        const parsedValue = parseInt(value, 10);
        newParts[index][field] = isNaN(parsedValue) || parsedValue < 1 ? 1 : parsedValue;
    } else {
        newParts[index][field] = value as any;
    }
    setPartsUsed(newParts);
  };
  

  const handleSubmit = () => {
    if (!reportDate || !engineerId || !workDescription) {
      toast({
        variant: 'destructive',
        title: 'Помилка валідації',
        description: 'Будь ласка, заповніть дату, виберіть виконавця та опишіть виконані роботи.',
      });
      return;
    }
    
    const finalPartsUsed = partsUsed.filter(p => p.name.trim() !== '' && p.quantity > 0);

    onSave({
      reportDate,
      engineerId,
      workDescription,
      partsUsed: finalPartsUsed,
    }, reportToEdit?.id);

    setIsOpen(false);
  };
  
  const handleClose = () => {
      setIsOpen(false);
  }
  
  const sortedEquipmentModels = useMemo(() => 
    [...equipmentModels].sort((a,b) => a.name.localeCompare(b.name)), 
  [equipmentModels]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Редагувати звіт' : 'Новий звіт'} для: {equipment.name}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Змініть деталі про виконане обслуговування.' : 'Заповніть деталі про виконане обслуговування.'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow pr-6 -mr-6">
            <div className="grid gap-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Дата виконання <span className="text-destructive">*</span></Label>
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !reportDate && "text-muted-foreground")}>
                            <CalendarIcon suppressHydrationWarning className="mr-2 h-4 w-4" />
                            {reportDate ? format(reportDate, "dd.MM.yyyy") : <span>Оберіть дату</span>}
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={reportDate} onSelect={setReportDate} initialFocus /></PopoverContent>
                    </Popover>
                </div>
                <div className="space-y-2">
                    <Label>Виконавець <span className="text-destructive">*</span></Label>
                    <Select onValueChange={setEngineerId} value={engineerId}>
                        <SelectTrigger>
                            <SelectValue placeholder="Оберіть інженера" />
                        </SelectTrigger>
                        <SelectContent>
                            {engineers.map(e => (
                                <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="workDescription">Опис виконаних робіт <span className="text-destructive">*</span></Label>
                <Textarea 
                    id="workDescription" 
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                    placeholder="Опишіть, що було зроблено, які виникли проблеми, що було замінено..."
                    rows={5}
                />
            </div>

            <div>
                <Label>Використані запчастини / матеріали</Label>
                <div className="space-y-2 mt-2">
                    {partsUsed.map((part, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <Select
                              value={part.name}
                              onValueChange={(value) => handlePartChange(index, 'name', value)}
                            >
                                <SelectTrigger className="flex-grow">
                                    <SelectValue placeholder="Оберіть запчастину з довідника..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sortedEquipmentModels.map(model => (
                                        <SelectItem key={model.id} value={model.name}>{model.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Input 
                                type="number"
                                placeholder="К-сть"
                                value={part.quantity > 0 ? part.quantity : ''}
                                onChange={e => handlePartChange(index, 'quantity', e.target.value)}
                                className="w-24"
                                min="1"
                            />
                            <Button variant="ghost" size="icon" onClick={() => handleRemovePart(index)}>
                                <Trash2 suppressHydrationWarning className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={handleAddPart} className="w-full">
                        <PlusCircle suppressHydrationWarning className="mr-2 h-4 w-4" />
                        Додати запчастину
                    </Button>
                </div>
            </div>
            </div>
        </ScrollArea>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={handleClose}>
            Скасувати
          </Button>
          <Button onClick={handleSubmit}>Зберегти звіт</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
