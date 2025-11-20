"use client";

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar, Sparkles, CheckCircle } from 'lucide-react';
import { rescheduleMaintenanceSuggestions } from '@/ai/flows/reschedule-maintenance-suggestions';
import { useToast } from '@/hooks/use-toast';
import type { ServiceContract, MaintenancePeriod } from '@/lib/types';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface RescheduleDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  initialTask: ServiceContract | null; // This can be removed or kept for other purposes, but we won't primarily use it.
}

interface Suggestion {
  newDate: string;
  reason: string;
  originalPeriodId: string;
}

type PeriodWithContract = MaintenancePeriod & { contract: ServiceContract };

const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    if (date instanceof Date && !isNaN(date.getTime())) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const toISODate = (date: any): string | undefined => {
    const validDate = safeGetDate(date);
    if (!validDate) return undefined;
    return validDate.toISOString();
}


export default function RescheduleDialog({
  isOpen,
  setIsOpen,
}: RescheduleDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodWithContract | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const { toast } = useToast();
  
  const { firestore } = useFirebase();
  const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
  const { data: allContracts, isLoading: isLoadingContracts } = useCollection<ServiceContract>(contractsRef);
  
  // These would also be fetched from Firestore in a real app
  const serviceHistory = [];
  const engineerAvailability = {};

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setSelectedPeriod(null);
        setSuggestions([]);
      }, 300);
    }
  }, [isOpen]);

  const availablePeriods = useMemo(() => {
    if (!allContracts) return [];
    const targetDate = new Date(selectedMonth);
    const monthStart = startOfMonth(targetDate);
    const monthEnd = endOfMonth(targetDate);

    return allContracts
        .filter(c => !c.archived)
        .flatMap(contract => 
            contract.maintenancePeriods
                .filter(period => {
                    const startDate = safeGetDate(period.startDate);
                    return period.status === 'Заплановано' && startDate && isWithinInterval(startDate, { start: monthStart, end: monthEnd });
                })
                .map(period => ({ ...period, contract }))
        );
  }, [allContracts, selectedMonth]);

  const availableMonths = useMemo(() => {
    if (!allContracts) return [];
    const months = new Set<string>();
    allContracts.forEach(contract => {
        if (contract.archived) return;
        contract.maintenancePeriods.forEach(period => {
            if (period.status === 'Заплановано') {
                const startDate = safeGetDate(period.startDate);
                if (startDate) {
                    months.add(format(startDate, 'yyyy-MM'));
                }
            }
        });
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [allContracts]);


  const handleGetSuggestions = async () => {
    if (!selectedPeriod || !allContracts) {
       toast({
        variant: 'destructive',
        title: 'Помилка',
        description: 'Будь ласка, оберіть період ТО для аналізу.',
      });
      return;
    }

    setIsLoading(true);
    setSuggestions([]);
    try {
      const otherPeriods = allContracts
        .filter(c => !c.archived)
        .flatMap(c => 
            c.maintenancePeriods.map(p => ({
                ...p,
                contract: c, // Attach contract for equipment lookup
            }))
        )
        .filter(p => p.id !== selectedPeriod.id && p.subdivision);

      const periodToReschedule = {
        id: selectedPeriod.id,
        name: selectedPeriod.name,
        startDate: toISODate(selectedPeriod.startDate),
        endDate: toISODate(selectedPeriod.endDate),
        subdivision: selectedPeriod.subdivision,
        assignedEngineerIds: selectedPeriod.assignedEngineerIds,
        status: selectedPeriod.status,
        equipmentDetails: (selectedPeriod.equipmentIds || [])
            .map(id => selectedPeriod.contract.equipment.find(e => e.id === id)?.name)
            .filter(Boolean)
            .join(', '),
      };


      const response = await rescheduleMaintenanceSuggestions({
        periodToReschedule: periodToReschedule,
        otherScheduledPeriods: otherPeriods.map(p => ({
            id: p.id,
            name: p.name,
            startDate: toISODate(p.startDate),
            endDate: toISODate(p.endDate),
            subdivision: p.subdivision,
            assignedEngineerIds: p.assignedEngineerIds,
            status: p.status,
             equipmentDetails: (p.equipmentIds || [])
                .map(id => p.contract.equipment.find(e => e.id === id)?.name)
                .filter(Boolean)
                .join(', '),
        })),
        serviceHistory: JSON.stringify(serviceHistory),
        engineerAvailability: JSON.stringify(engineerAvailability),
      });
      
      setSuggestions(response.suggestions || []);

    } catch (error) {
      console.error('Не вдалося отримати пропозиції:', error);
      toast({
        variant: 'destructive',
        title: 'Помилка',
        description: 'Не вдалося отримати пропозиції щодо перепланування. Будь ласка, спробуйте ще раз.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  }

  const handleSelectPeriod = (periodId: string) => {
    const period = availablePeriods.find(p => p.id === periodId);
    setSelectedPeriod(period || null);
  }

  const renderContent = () => {
    if (!selectedPeriod) {
      return (
        <div className="space-y-4">
          <p className="text-muted-foreground">Оберіть період ТО, для якого потрібно знайти альтернативні дати.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                    <SelectValue placeholder="Оберіть місяць..." />
                </SelectTrigger>
                <SelectContent>
                    {availableMonths.map(month => (
                        <SelectItem key={month} value={month}>
                            {format(new Date(month), 'LLLL yyyy', { locale: uk })}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select onValueChange={handleSelectPeriod} disabled={availablePeriods.length === 0}>
                <SelectTrigger className="w-full">
                <SelectValue placeholder={availablePeriods.length > 0 ? "Оберіть завдання..." : "Немає завдань на місяць"} />
                </SelectTrigger>
                <SelectContent>
                {isLoadingContracts ? (
                    <SelectItem value="loading" disabled>Завантаження...</SelectItem>
                ) : (
                    availablePeriods.map(period => (
                    <SelectItem key={period.id} value={period.id}>
                        {period.contract.objectName} - {period.name}
                    </SelectItem>
                    ))
                )}
                </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    const scheduledDate = safeGetDate(selectedPeriod.startDate);

    return (
      <div className="space-y-4">
        <p>
          <strong>Поточне завдання:</strong> {selectedPeriod.name} для{' '}
          <strong>{selectedPeriod.contract.objectName}</strong>
          {scheduledDate && <> на <strong>{format(scheduledDate, 'PPP', { locale: uk })}</strong></>}
          .
        </p>
        
        {suggestions.length > 0 ? (
          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
            <h4 className="font-semibold text-lg">Запропоновані нові дати:</h4>
            {suggestions.map((suggestion, index) => (
               <Alert key={index} className="bg-primary/5">
                <CheckCircle className="h-4 w-4 !text-primary" />
                 <AlertTitle className="font-bold flex justify-between items-center">
                   {format(new Date(suggestion.newDate), 'PPP', { locale: uk })}
                   <Button size="sm" variant="outline">Обрати</Button>
                 </AlertTitle>
                 <AlertDescription>
                   {suggestion.reason}
                 </AlertDescription>
               </Alert>
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center h-24">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Аналіз розкладів...</p>
              </div>
            ) : (
              <p className="text-muted-foreground">Натисніть кнопку, щоб отримати пропозиції від ШІ.</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="text-primary" />
            Перепланувати обслуговування
          </DialogTitle>
          <DialogDescription>
            Асистент на базі ШІ для пошуку найкращих альтернативних дат для вашого завдання з обслуговування.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 min-h-[150px]">
          {renderContent()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Закрити
          </Button>
          {selectedPeriod && !isLoading && (
            <Button onClick={handleGetSuggestions} disabled={isLoading}>
              <Sparkles className="mr-2 h-4 w-4" />
              { isLoading ? 'Завантаження...' : 'Отримати пропозиції' }
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
