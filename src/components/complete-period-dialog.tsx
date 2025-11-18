
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
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import type { MaintenancePeriod, ServiceEngineer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CalendarIcon, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

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

interface CompletePeriodDialogProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    period: MaintenancePeriod;
    engineers: ServiceEngineer[];
    onSave: (period: MaintenancePeriod) => void;
}

export default function CompletePeriodDialog({
  isOpen,
  setIsOpen,
  period,
  engineers: allEngineers,
  onSave,
}: CompletePeriodDialogProps) {
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [assignedEngineerIds, setAssignedEngineerIds] = useState<string[]>([]);
  const [engineerPickerOpen, setEngineerPickerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const safeGetDate = (date: any): Date | undefined => {
    if (!date) return undefined;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  };

  useEffect(() => {
    if (isOpen && period) {
      setStartDate(safeGetDate(period.startDate) || new Date());
      setEndDate(safeGetDate(period.endDate) || safeGetDate(period.startDate) || new Date());
      setAssignedEngineerIds(period.assignedEngineerIds || []);
      setSearchTerm("");
    }
  }, [isOpen, period]);

  const engineers = useMemo(() => {
    if (!allEngineers) return [];
    return [...allEngineers].sort((a, b) => {
      const indexA = customEngineerSortOrder.indexOf(a.name);
      const indexB = customEngineerSortOrder.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allEngineers]);
  
  const filteredEngineers = useMemo(() => {
      if (!searchTerm) return engineers;
      return engineers.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [engineers, searchTerm]);

  const toggleEngineer = (engineerId: string) => {
    setAssignedEngineerIds(prev =>
      prev.includes(engineerId)
        ? prev.filter(id => id !== engineerId)
        : [...prev, engineerId]
    );
  };
  
  const handleSubmit = () => {
    if (!startDate || !endDate) {
        toast({
            variant: 'destructive',
            title: 'Помилка валідації',
            description: 'Будь ласка, вкажіть дати виконання робіт.',
        });
        return;
    }
    if (startDate > endDate) {
        toast({
            variant: 'destructive',
            title: 'Помилка валідації',
            description: 'Дата початку не може бути пізніше дати закінчення.',
        });
        return;
    }
    if (assignedEngineerIds.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Помилка валідації',
            description: 'Будь ласка, оберіть хоча б одного виконавця.',
        });
        return;
    }

    const finalizedPeriod: MaintenancePeriod = {
        ...period,
        startDate,
        endDate,
        assignedEngineerIds,
        status: 'Виконано',
    };

    onSave(finalizedPeriod);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Завершити період ТО</DialogTitle>
            <DialogDescription>
              Вкажіть остаточні дати та виконавців для "{period.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>Фактична дата початку</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {startDate ? format(startDate, "dd.MM.yyyy") : <span>Оберіть дату</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                          </PopoverContent>
                      </Popover>
                  </div>
                   <div className="space-y-2">
                      <Label>Фактична дата закінчення</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {endDate ? format(endDate, "dd.MM.yyyy") : <span>Оберіть дату</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                              <Calendar mode="single" selected={endDate} onSelect={setEndDate} month={startDate} initialFocus />
                          </PopoverContent>
                      </Popover>
                  </div>
              </div>
               <div className="space-y-2">
                  <Label>Фактичні виконавці</Label>
                    <Popover open={engineerPickerOpen} onOpenChange={setEngineerPickerOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start" onClick={() => setEngineerPickerOpen(true)}>
                                <Users className="mr-2 h-4 w-4" />
                                {assignedEngineerIds.length > 0 ? `${assignedEngineerIds.length} обрано` : "Призначити виконавців"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          align="start"
                          className="w-[--radix-popover-trigger-width] p-2 bg-background text-foreground border shadow-lg"
                        >
                            <div className="px-2 pb-2">
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Пошук інженера..."
                                />
                            </div>
                            <ScrollArea className="h-48">
                                <ul className="space-y-1 p-1">
                                    {filteredEngineers.length === 0 && (
                                        <li className="text-sm text-muted-foreground px-2 py-3">Не знайдено.</li>
                                    )}
                                    {filteredEngineers.map((engineer) => {
                                        const checked = assignedEngineerIds.includes(engineer.id);
                                        return (
                                            <li key={engineer.id}>
                                                <div
                                                    onClick={() => toggleEngineer(engineer.id)}
                                                    onPointerDown={(e) => e.preventDefault()}
                                                    className="w-full text-left flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                                                >
                                                    <div onPointerDown={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={checked}
                                                            onCheckedChange={() => toggleEngineer(engineer.id)}
                                                        />
                                                    </div>
                                                    <span className={cn("flex-1", checked ? "font-medium" : "text-muted-foreground")}>
                                                        {engineer.name}
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                  <div className="flex flex-wrap gap-1 mt-2">
                      {engineers.filter(e => assignedEngineerIds.includes(e.id)).map(e => (
                          <Badge key={e.id} variant="secondary">{e.name}</Badge>
                      ))}
                  </div>
              </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSubmit}>Підтвердити виконання</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
