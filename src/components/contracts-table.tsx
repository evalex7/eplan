"use client";

import { useState, useMemo } from 'react';
import {
  Plus,
  Archive,
  Search,
  FileText,
  Calendar,
  User,
  MapPin,
  Wrench,
  Trash2,
  Undo2,
  Pencil,
  View,
  Send,
  ChevronDown,
  CheckCircle,
  Bot,
  Building2,
  Phone,
} from 'lucide-react';
import { format, isPast, isWithinInterval, startOfMonth, endOfMonth, isSameMonth } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ServiceContract, ServiceEngineer, SubdivisionType, UserProfile, TaskStatus } from '@/lib/types';
import AddEditContractDialog from '@/components/add-contract-dialog';
import { cn, cleanAddressForNavigation, capitalizeWords } from '@/lib/utils';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Skeleton } from './ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import EquipmentList from './equipment-list';
import { Separator } from './ui/separator';

const ContractCard = ({ 
  task,
  onArchiveClick,
  onRestore,
  isArchived,
  isExpanded,
  onToggleExpand,
  onEdit,
  engineers
}: { 
  task: ServiceContract; 
  onArchiveClick: (task: ServiceContract) => void;
  onRestore: (taskId: string) => void;
  onReschedule: (task: ServiceContract) => void;
  isArchived: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: (task: ServiceContract) => void;
  engineers: ServiceEngineer[];
}) => {
  const isAdmin = useIsAdmin();
  const subdivisionColors: Record<string, string> = {
    'КОНД': 'text-blue-600',
    'ДБЖ': 'text-red-600',
    'ДГУ': 'text-amber-700',
  };

  const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    if (date instanceof Date) return date; // Already a Date object
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed; // String or number
  };
  
  const sortedMaintenancePeriods = useMemo(() => {
    if (!task.maintenancePeriods) {
      return [];
    }
    return [...task.maintenancePeriods].sort((a, b) => {
        const dateA = safeGetDate(a.startDate);
        const dateB = safeGetDate(b.startDate);
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
    });
  }, [task.maintenancePeriods]);


  const getTotalPeriods = () => task.maintenancePeriods.length;

  const contractStartDate = safeGetDate(task.contractStartDate);
  const contractEndDate = safeGetDate(task.contractEndDate);
  
  const getStatusBadge = (status: TaskStatus, contract: ServiceContract) => {
    const baseClasses = "h-8 inline-flex items-center flex-shrink-0";
    
    // "Пролонгація" has the highest priority
    const contractEndDate = safeGetDate(contract.contractEndDate);
    if (contractEndDate && (isPast(contractEndDate) || isSameMonth(contractEndDate, new Date()))) {
        return <Badge variant="destructive" className={baseClasses}>Пролонгація</Badge>;
    }
  
    // Check for "Крайні роботи"
    const scheduledPeriods = contract.maintenancePeriods.filter(p => p.status === 'Заплановано');
    if (scheduledPeriods.length > 0) {
        const uniqueStartDates = new Set(
            scheduledPeriods.map(p => safeGetDate(p.startDate)?.toISOString().split('T')[0])
        );
        if (uniqueStartDates.size === 1) {
             return <Badge className={cn("bg-orange-100 text-orange-800 hover:bg-orange-100/80", baseClasses)}>Крайні роботи</Badge>;
        }
    } else {
        // If there are NO scheduled periods left at all
         return <Badge className={cn("bg-orange-100 text-orange-800 hover:bg-orange-100/80", baseClasses)}>Крайні роботи</Badge>;
    }
    
    // Default to "Заплановано" if there are multiple unique scheduled dates
    return <Badge className={cn("bg-green-100 text-green-800 hover:bg-green-100/80", baseClasses)}>Заплановано</Badge>;
  };

  return (
    <Card 
      className={cn("shadow-md hover:shadow-lg transition-shadow duration-300 relative", isArchived && "bg-muted/50")}
      onClick={onToggleExpand}
    >
      <CardContent className="p-3 md:p-4 cursor-pointer pb-3">
        <div className="flex items-start gap-2 pr-10">
          <div className="flex-shrink-0 pt-1">
              <FileText suppressHydrationWarning className="h-5 w-5 text-gray-500"/>
          </div>
          <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <h3 className={cn("font-bold text-base md:text-lg flex-1", !isExpanded && "truncate")}>
                    {task.objectName}
                </h3>
                {getStatusBadge(task.status, task)}
              </div>
              <div className="space-y-1 text-muted-foreground text-xs md:text-sm mt-2">
                {!isExpanded && (
                  <>
                      <div className="flex items-center gap-2">
                          <span className="truncate">
                              № {task.contractNumber} від {contractStartDate ? format(contractStartDate, 'dd.MM.yy') : '??.??.??'}
                          </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4" />
                        <span className="truncate">{task.address}</span>
                      </div>
                  </>
                )}
              </div>
          </div>
        </div>

        {isExpanded && (
          <div className="space-y-1 text-muted-foreground text-xs md:text-sm mt-2 ml-7">
            <div className="flex items-center gap-2">
                <MapPin suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">{task.address}</span>
            </div>
            <div className="flex items-center gap-2">
                <Phone suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">
                  {task.contactPerson ? `${task.contactPerson}${task.contactPhone ? ` (${task.contactPhone})` : ''}` : 'Контактна особа не вказана'}
                </span>
            </div>
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground mt-1">
                <User suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4" />
                <span>Контрагент: {task.counterparty}</span>
            </div>
            <div className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground mt-2">
              <Calendar suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-foreground">Договір: {task.contractNumber}</p>
                <p>{contractStartDate ? format(contractStartDate, 'dd.MM.yy') : ''} - {contractEndDate ? format(contractEndDate, 'dd.MM.yy') : ''}</p>
              </div>
            </div>
             <Separator className="my-3"/>
             <div className="space-y-2">
                <h4 className="font-semibold text-muted-foreground">Обладнання:</h4>
                {(task.equipment || []).map(equip => (
                  <div key={equip.id} className="text-xs">
                    <span className="font-medium">{equip.name} {equip.groupNumber && `(№${equip.groupNumber})`}</span>
                    <span className="text-muted-foreground"> - {equip.model} (S/N: {equip.serialNumber || 'б/н'})</span>
                  </div>
                ))}
             </div>
          </div>
        )}
        
          {isAdmin && (
            <div className="absolute top-3 right-2 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 bg-blue-100 border-blue-200 hover:bg-blue-200" onClick={() => onEdit(task)}>
                  <Pencil suppressHydrationWarning className="h-5 w-5 text-blue-700" />
                </Button>
                {isArchived ? (
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-green-100 border-green-200 hover:bg-green-200" onClick={() => onRestore(task.id)}>
                      <Undo2 suppressHydrationWarning className="h-5 w-5 text-green-700" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" className="h-8 w-8 bg-yellow-100 border-yellow-200 hover:bg-yellow-200" onClick={() => onArchiveClick(task)}>
                      <Trash2 suppressHydrationWarning className="h-5 w-5 text-yellow-700" />
                  </Button>
                )}
            </div>
          )}
        
        {isExpanded && (
          <>
             <div className="space-y-1 text-muted-foreground text-xs md:text-sm mb-3 md:mb-4 mt-2">
                {task.workDescription && (
                    <div className="flex items-center gap-2">
                        <Wrench suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4" />
                        <span>{task.workDescription}</span>
                    </div>
                 )}
                 <div className="flex items-center gap-2">
                    <Wrench suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4" />
                    <span>ТО: {getTotalPeriods()} періодів</span>
                </div>
            </div>
            
            <Separator className="my-3"/>

            <div className="my-3 md:my-4 pl-4 md:pl-6 border-l-2 border-dashed border-gray-300">
                {sortedMaintenancePeriods.map((period, index) => {
                    const periodStartDate = safeGetDate(period.startDate);
                    const periodEndDate = safeGetDate(period.endDate);
                    const isCompleted = period.status === 'Виконано';

                    return (
                     <div key={period.id} className={cn("relative mb-2", isCompleted && "text-gray-400")}>
                        <div className="flex items-center gap-2 text-xs md:text-sm">
                            {isCompleted ? (
                                <CheckCircle suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4 text-green-600"/>
                            ) : (
                                <Calendar suppressHydrationWarning className="h-3 w-3 md:h-4 md:w-4 text-blue-600"/>
                            )}
                            <span className={cn(isCompleted && "line-through")}>
                                {`Період ТО №${index + 1}`}: {periodStartDate ? format(periodStartDate, 'dd.MM.yy') : ''} - {periodEndDate ? format(periodEndDate, 'dd.MM.yy') : ''}
                            </span>
                        </div>
                        { (period.assignedEngineerIds.length > 0) &&
                          <p className="text-xs ml-6">{engineers.filter(e => period.assignedEngineerIds.includes(e.id)).map(e => e.name).join(', ')}</p>
                        }
                    </div>
                )})}
            </div>
          </>
        )}

         {isArchived && (
            <div className="text-center p-2 rounded-lg bg-muted text-muted-foreground text-xs font-medium border-t">
              В архіві
            </div>
          )}
      </CardContent>
    </Card>
  );
};

export default function ContractsTable({ onReschedule }: { onReschedule: (task: ServiceContract) => void; }) {
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [isArchiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [taskToArchiveId, setTaskToArchiveId] = useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<ServiceContract | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [areAllExpanded, setAreAllExpanded] = useState(false);

  const { firestore } = useFirebase();
  const { toast } = useToast();
  const isAdmin = useIsAdmin();

  const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
  const { data: allTasks, isLoading: isLoadingContracts } = useCollection<ServiceContract>(contractsRef);

  const engineersRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceEngineers') : null, [firestore]);
  const { data: engineers, isLoading: isLoadingEngineers } = useCollection<ServiceEngineer>(engineersRef);
  
  const handleToggleExpand = (taskId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const handleOpenDialog = (task: ServiceContract | null = null) => {
    setTaskToEdit(task);
    setDialogOpen(true);
  }

  const handleSaveTask = (taskData: Omit<ServiceContract, 'id' | 'archived'>, id?: string) => {
    if (!firestore || !contractsRef) return;

    // Helper to safely convert to Date, returns null if invalid
    const toDateOrNull = (date: any): Date | null => {
        if (!date) return null;
        if (date instanceof Date) return date;
        const parsed = new Date(date);
        return isNaN(parsed.getTime()) ? null : parsed;
    }

    const dataToSave = {
      ...taskData,
      contractStartDate: toDateOrNull(taskData.contractStartDate),
      contractEndDate: toDateOrNull(taskData.contractEndDate),
      scheduledDate: toDateOrNull(taskData.scheduledDate) || new Date(),
      maintenancePeriods: taskData.maintenancePeriods.map(p => ({
        ...p,
        startDate: toDateOrNull(p.startDate),
        endDate: toDateOrNull(p.endDate),
      }))
    };

    try {
      if (id) {
          const docRef = doc(firestore, 'serviceContracts', id);
          updateDocumentNonBlocking(docRef, dataToSave);
          toast({ title: "Договір оновлено" });
      } else {
          addDocumentNonBlocking(contractsRef, {...dataToSave, archived: false});
          toast({ title: "Договір додано" });
      }
      setDialogOpen(false);
    } catch (error) {
        console.error("Error saving task:", error);
        toast({
            variant: "destructive",
            title: "Помилка збереження",
            description: "Не вдалося зберегти договір. Перевірте консоль для деталей.",
        });
    }
  };

  const handleArchiveClick = (task: ServiceContract) => {
    const contractEndDate = task.contractEndDate ? (task.contractEndDate as any).toDate ? (task.contractEndDate as any).toDate() : new Date(task.contractEndDate) : null;

    if (task.status !== 'Виконано' && contractEndDate && !isPast(contractEndDate)) {
        toast({
            variant: "destructive",
            title: "Помилка архівування",
            description: "Неможливо заархівувати активний договір. Спочатку позначте всі періоди ТО як 'Виконано'.",
        });
        return;
    }

    setTaskToArchiveId(task.id);
    setArchiveDialogOpen(true);
  };
  
  const confirmArchiveTask = () => {
    if (taskToArchiveId && firestore) {
      const docRef = doc(firestore, 'serviceContracts', taskToArchiveId);
      updateDocumentNonBlocking(docRef, { archived: true });
    }
    setArchiveDialogOpen(false);
    setTaskToArchiveId(null);
  };

  const handleRestoreTask = (taskId: string) => {
    if (firestore) {
      const docRef = doc(firestore, 'serviceContracts', taskId);
      updateDocumentNonBlocking(docRef, { archived: false });
    }
  };

  const filteredTasks = useMemo(() => {
    if (!allTasks) return { activeTasks: [], archivedTasks: [] };

    const lowercasedQuery = searchQuery.toLowerCase();

    const filtered = allTasks.filter(task => {
      const { objectName, address, contractNumber, counterparty, contactPerson } = task;
      return (
        objectName?.toLowerCase().includes(lowercasedQuery) ||
        address?.toLowerCase().includes(lowercasedQuery) ||
        contractNumber?.toLowerCase().includes(lowercasedQuery) ||
        counterparty?.toLowerCase().includes(lowercasedQuery) ||
        contactPerson?.toLowerCase().includes(lowercasedQuery)
      );
    });
    
    const sortedFiltered = filtered.sort((a, b) => a.objectName.localeCompare(b.objectName));

    const active: ServiceContract[] = [];
    const archived: ServiceContract[] = [];
    sortedFiltered.forEach(task => {
      if (task.archived) {
        archived.push(task);
      } else {
        active.push(task);
      }
    });

    return { activeTasks: active, archivedTasks: archived };
  }, [allTasks, searchQuery]);

  const { activeTasks, archivedTasks } = filteredTasks;

  const tasksToDisplay = showArchived ? archivedTasks : activeTasks;

  const toggleAllCards = () => {
    if (areAllExpanded) {
      setExpandedCards(new Set());
    } else {
      const allTaskIds = new Set(tasksToDisplay.map(task => task.id));
      setExpandedCards(allTaskIds);
    }
    setAreAllExpanded(!areAllExpanded);
  };

  const isLoading = isLoadingContracts || isLoadingEngineers;
  const totalArchivedCount = useMemo(() => allTasks?.filter(t => t.archived).length || 0, [allTasks]);


  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          
            {isAdmin && (
              <Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                  <Plus suppressHydrationWarning className="mr-2 h-4 w-4" />
                  Додати договір
              </Button>
            )}
            
            <div className="grid grid-cols-2 gap-2">
                 <Button 
                    variant={showArchived ? "secondary" : "outline"} 
                    onClick={() => setShowArchived(!showArchived)} 
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                    <Archive suppressHydrationWarning className="mr-2 h-4 w-4" />
                    {showArchived ? `Активні (${activeTasks.length})` : `Архів (${totalArchivedCount})`}
                </Button>
                <Button variant="outline" onClick={toggleAllCards} className="bg-gray-500 hover:bg-gray-600 text-white">
                    <View suppressHydrationWarning className="mr-2 h-4 w-4" />
                    {areAllExpanded ? 'Згорнути' : 'Розгорнути'}
                </Button>
            </div>
        </div>

        <div className="relative">
          <Search suppressHydrationWarning className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Пошук за назвою, адресою, номером..."
            className="pl-10 w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <h2 className="text-xl font-bold">{showArchived ? `Архів договорів (${archivedTasks.length})` : `Активні договори (${activeTasks.length})`}</h2>
        {isLoading && (
          <div className="space-y-3">
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-24 w-full" />
             <Skeleton className="h-24 w-full" />
          </div>
        )}
        {!isLoading && (
          <div className="space-y-3">
            {tasksToDisplay.length > 0 ? (
              tasksToDisplay.map(task => (
                <ContractCard
                  key={task.id}
                  task={task}
                  onArchiveClick={handleArchiveClick}
                  onRestore={handleRestoreTask}
                  onReschedule={onReschedule}
                  isArchived={showArchived}
                  isExpanded={expandedCards.has(task.id)}
                  onToggleExpand={() => handleToggleExpand(task.id)}
                  onEdit={() => handleOpenDialog(task)}
                  engineers={engineers || []}
                />
              ))
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                 {searchQuery ? (
                  <p>Не знайдено договорів за вашим запитом.</p>
                ) : (
                  <p>Немає {showArchived ? 'архівних' : 'активних'} договорів.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <AddEditContractDialog
          isOpen={isDialogOpen}
          setIsOpen={setDialogOpen}
          onSave={handleSaveTask}
          taskToEdit={taskToEdit}
          engineers={engineers || []}
          allContracts={allTasks || []}
        />
      )}

      <AlertDialog open={isArchiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ви впевнені?</AlertDialogTitle>
            <AlertDialogDescription>
              Ця дія перемістить договір до архіву. Ви зможете відновити його пізніше.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Скасувати</AlertDialogCancel>
            <AlertDialogAction onClick={confirmArchiveTask}>Продовжити</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    