

"use client";

import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { ServiceContract, MaintenancePeriod, ServiceEngineer, SubdivisionType, ServiceReport, EquipmentModel, TaskStatus, MaintenanceViewMode } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar as CalendarIcon, Wrench, MapPin, User, Building2, ClipboardList, Send, Download, Phone, ChevronDown, LayoutGrid, List, FileText, Plus, Pencil, Checkbox as CheckboxIcon, AlertTriangle, Users } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cleanAddressForNavigation, cn, getDaysString } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import MaintenanceKanbanBoard, { type KanbanTask } from './maintenance-kanban-board';
import MaintenanceKanbanBoardBySubdivision from './maintenance-kanban-board-by-subdivision';
import { defaultSettings } from '@/hooks/display-settings-context';
import CompletePeriodDialog from './complete-period-dialog';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Calendar } from './ui/calendar';


const LOCAL_STORAGE_KEY_EQUIPMENT = 'equipmentModels';

const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed;
};

const subdivisionColors: Record<string, string> = {
  'КОНД': 'bg-blue-100 text-blue-800',
  'ДБЖ': 'bg-red-100 text-red-800',
  'ДГУ': 'bg-amber-100 text-amber-800',
};

const subdivisionBorderColors: Record<string, string> = {
  'КОНД': 'border-blue-200',
  'ДБЖ': 'border-red-200',
  'ДГУ': 'border-amber-200',
}

function MaintenancePeriodManager({ contract, engineers, periodsToShow, onFinalize, onAssign, onEditDates }: { contract: ServiceContract; engineers: ServiceEngineer[]; periodsToShow: MaintenancePeriod[], onFinalize: (period: MaintenancePeriod) => void; onAssign: (period: MaintenancePeriod) => void; onEditDates: (period: MaintenancePeriod) => void; }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [confirmation, setConfirmation] = useState<{periodId: string, newStatus: 'Заплановано' | 'Виконано'} | null>(null);

    const handleCheckboxClick = (period: MaintenancePeriod, isChecked: boolean) => {
        if (isChecked) {
            onFinalize(period);
        } else {
             setConfirmation({ periodId: period.id, newStatus: 'Заплановано' });
        }
    };
    
    const confirmStatusChange = () => {
        if (confirmation && firestore) {
            const { periodId, newStatus } = confirmation;
            const contractDocRef = doc(firestore, 'serviceContracts', contract.id);

            const updatedPeriods = contract.maintenancePeriods.map(p => 
                p.id === periodId ? { ...p, status: newStatus } : p
            );

            // Determine the new overall contract status
            const allPeriodsCompleted = updatedPeriods.every(p => p.status === 'Виконано');
            
            let newContractStatus: TaskStatus;
            
            if (allPeriodsCompleted) {
                newContractStatus = 'Виконано';
            } else {
                newContractStatus = 'Заплановано';
            }

            updateDocumentNonBlocking(contractDocRef, { 
                maintenancePeriods: updatedPeriods,
                status: newContractStatus 
            });

            toast({ title: 'Статус оновлено' });
        }
        setConfirmation(null);
    };


    return (
        <>
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wrench className="h-4 w-4" />
                    <span>{periodsToShow.length} {getDaysString(periodsToShow.length).replace('день', 'період').replace('дні', 'періоди').replace('днів', 'періодів')}</span>
                </div>
                {periodsToShow.map(period => {
                    const isCompleted = period.status === 'Виконано';
                    const periodDate = safeGetDate(period.startDate);
                    const equipmentNames = (period.equipmentIds || [])
                        .map(id => contract.equipment.find(e => e.id === id)?.name)
                        .filter(Boolean)
                        .join(', ');
                    
                    const assignedEngineers = engineers.filter(e => period.assignedEngineerIds.includes(e.id));

                    return (
                        <div 
                            key={period.id}
                            className={cn(
                                "p-3 rounded-lg border transition-colors space-y-3",
                                isCompleted ? "bg-secondary border-green-200 dark:border-green-800" : "bg-muted/50"
                            )}
                        >
                           <div className="flex items-start gap-3">
                            <Checkbox 
                                id={`period-manager-${period.id}`}
                                checked={isCompleted}
                                onCheckedChange={(checked) => handleCheckboxClick(period, checked as boolean)}
                                className="h-5 w-5 mt-0.5"
                            />
                            <div className="flex-grow">
                                <div className="flex justify-between items-center">
                                    <label htmlFor={`period-manager-${period.id}`} className="font-medium cursor-pointer">
                                        {period.name.replace('#', '№')}
                                    </label>
                                     <Badge className={cn(subdivisionColors[period.subdivision], subdivisionBorderColors[period.subdivision])}>
                                        {period.subdivision}
                                    </Badge>
                                </div>
                                <p className={cn("text-sm", isCompleted ? "text-muted-foreground/80 line-through" : "text-muted-foreground")}>
                                    {periodDate ? format(periodDate, 'dd MMMM yyyy', { locale: uk }) : 'Дата не вказана'}
                                </p>
                                {equipmentNames && (
                                    <p className="text-xs text-muted-foreground pt-1">{equipmentNames}</p>
                                )}
                                {assignedEngineers.length > 0 && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                        <Users className="h-3 w-3" />
                                        <span>{assignedEngineers.map(e => e.name).join(', ')}</span>
                                    </div>
                                )}
                            </div>
                           </div>
                           {!isCompleted && (
                                <div className="grid grid-cols-2 gap-2">
                                   <Button size="sm" variant="outline" className="w-full" onClick={() => onEditDates(period)}>
                                       <CalendarIcon className="mr-2 h-4 w-4" />
                                       Змінити дати
                                   </Button>
                                   <Button size="sm" variant="outline" className="w-full" onClick={() => onAssign(period)}>
                                       <Users className="mr-2 h-4 w-4" />
                                       {assignedEngineers.length > 0 ? 'Виконавці' : 'Призначити'}
                                   </Button>
                               </div>
                           )}
                        </div>
                    );
                })}
            </div>
            
            <AlertDialog open={!!confirmation} onOpenChange={() => setConfirmation(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Підтвердження дії</AlertDialogTitle>
                        <AlertDialogDescription>
                            Ви впевнені, що хочете змінити статус цього періоду ТО на "{confirmation?.newStatus}"?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setConfirmation(null)}>Скасувати</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmStatusChange}>Продовжити</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
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


export default function MaintenanceTasksList() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const settings = defaultSettings; // Using default settings
    const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
    
    const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
    const { data: contracts, isLoading: isLoadingContracts } = useCollection<ServiceContract>(contractsRef);

    const engineersRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceEngineers') : null, [firestore]);
    const { data: allEngineers, isLoading: isLoadingEngineers } = useCollection<ServiceEngineer>(engineersRef);

    const [selectedPeriodToFinalize, setSelectedPeriodToFinalize] = useState<MaintenancePeriod | null>(null);
    const [contractForFinalization, setContractForFinalization] = useState<ServiceContract | null>(null);

    const [periodToAssign, setPeriodToAssign] = useState<MaintenancePeriod | null>(null);
    const [contractForAssignment, setContractForAssignment] = useState<ServiceContract | null>(null);
    const [assignEngineersOpen, setAssignEngineersOpen] = useState(false);

    const [periodToEditDates, setPeriodToEditDates] = useState<MaintenancePeriod | null>(null);
    const [contractForDateEdit, setContractForDateEdit] = useState<ServiceContract | null>(null);
    const [editDatesOpen, setEditDatesOpen] = useState(false);
    
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    const [selectedSubdivision, setSelectedSubdivision] = useState<SubdivisionType | 'all'>('all');
    const [selectedEngineerId, setSelectedEngineerId] = useState<string>('all');


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


    const availableMonths = useMemo(() => {
        if (!contracts) return [];
        const months = new Set<string>();
        contracts.forEach(contract => {
            if (contract.archived) return;
            contract.maintenancePeriods.forEach(period => {
                const startDate = safeGetDate(period.startDate);
                if (startDate) {
                    months.add(format(startDate, 'yyyy-MM'));
                }
            });
        });
        return Array.from(months).sort((a, b) => b.localeCompare(a));
    }, [contracts]);

    const filteredTasks = useMemo(() => {
        if (!contracts || !allEngineers) return [];

        const isAllMonths = selectedMonth === 'all';
        const targetDate = !isAllMonths ? new Date(selectedMonth) : new Date();
        const monthStart = !isAllMonths ? startOfMonth(targetDate) : new Date();
        const monthEnd = !isAllMonths ? endOfMonth(targetDate) : new Date();

        return contracts
            .filter(c => !c.archived)
            .flatMap(contract => 
                contract.maintenancePeriods
                    .filter(period => {
                        const isCompleted = period.status === 'Виконано';
                        if (!settings.showCompletedTasks && isCompleted) return false;

                        const startDate = safeGetDate(period.startDate);
                        const isInMonth = isAllMonths || (startDate && isWithinInterval(startDate, { start: monthStart, end: monthEnd }));
                        const isInSubdivision = selectedSubdivision === 'all' || period.subdivision === selectedSubdivision;
                        const isForEngineer = selectedEngineerId === 'all' || period.assignedEngineerIds.includes(selectedEngineerId);
                        
                        return isInMonth && isInSubdivision && isForEngineer;
                    })
                    .map(period => {
                        return {
                            ...period,
                            contract, // Attach parent contract info
                            assignedEngineers: allEngineers.filter(e => period.assignedEngineerIds.includes(e.id)),
                        }
                    })
            )
            .sort((a, b) => {
                const dateA = safeGetDate(a.startDate);
                const dateB = safeGetDate(b.startDate);
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateA.getTime() - dateB.getTime();
            });

    }, [contracts, allEngineers, selectedMonth, selectedSubdivision, selectedEngineerId, settings.showCompletedTasks]);

    const isLoading = isLoadingContracts || isLoadingEngineers;

    const handleToggleExpand = (taskId: string) => {
        setExpandedTasks(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });
    };

    const generatePlanContent = (formatType: 'html' | 'txt') => {
        const isAllMonths = selectedMonth === 'all';
        const targetDate = !isAllMonths ? new Date(selectedMonth) : new Date();
        let monthYearTitle = isAllMonths ? 'План на весь період' : format(startOfMonth(targetDate), 'LLLL yyyy', { locale: uk });
        if (!isAllMonths) {
            monthYearTitle = monthYearTitle.charAt(0).toUpperCase() + monthYearTitle.slice(1);
        }
    
        const tasksForMonth = filteredTasks;
    
        if (tasksForMonth.length === 0) {
            toast({ variant: 'destructive', title: 'Немає даних', description: `Не знайдено жодного ТО для обраних фільтрів.` });
            return null;
        }

        const tasksByContract = tasksForMonth.reduce((acc, task) => {
            if (!acc[task.contract.id]) {
                acc[task.contract.id] = { contract: task.contract, periods: [] };
            }
            acc[task.contract.id].periods.push(task);
            return acc;
        }, {} as Record<string, { contract: ServiceContract; periods: any[] }>);
    
        let content = '';
        if (formatType === 'html') {
            content += `<html><head><meta charset="UTF-8"><title>${monthYearTitle}</title>`;
            content += `<style>body{font-family:Arial,sans-serif; font-size: 16px;} h1{font-size:24px; text-align:center;} h2{font-size:20px;} p{font-size:16px;} ul{list-style-type:none; padding-left:20px;} li{font-size:16px;}</style></head><body>`;
            content += `<h1>${monthYearTitle}</h1>`;
        } else {
            content += `${monthYearTitle}\n\n`;
        }
    
        Object.values(tasksByContract).forEach(({ contract, periods }) => {
            const contractStart = safeGetDate(contract.contractStartDate);
            const contractEnd = safeGetDate(contract.contractEndDate);
            const contractDateString = contractStart && contractEnd ? ` (${format(contractStart, 'dd.MM.yyyy')} - ${format(contractEnd, 'dd.MM.yyyy')})` : '';
            
            if (formatType === 'html') {
                content += `<hr><h2>Договір № ${contract.contractNumber}${contractDateString}</h2>`;
                content += `<p><b>Контрагент:</b> ${contract.counterparty}<br/><b>Об'єкт:</b> ${contract.objectName}<br/><b>Адреса:</b> ${contract.address}</p><ul>`;
            } else {
                content += `--------------------------------------------------\n`;
                content += `Договір № ${contract.contractNumber}${contractDateString}\n`;
                content += `Контрагент: ${contract.counterparty}\n`;
                content += `Об'єкт: ${contract.objectName}\nАдреса: ${contract.address}\n\n`;
            }

            periods.forEach(period => {
                 const periodStartDate = safeGetDate(period.startDate);
                 const periodEndDate = safeGetDate(period.endDate);
                 const monthName = periodStartDate ? format(periodStartDate, 'LLLL', { locale: uk }) : '';
                 const startDateString = periodStartDate ? format(periodStartDate, 'dd.MM.yyyy') : '??.??.????';
                 const endDateString = periodEndDate ? format(periodEndDate, 'dd.MM.yyyy') : '??.??.????';
                 const equipmentNames = (period.equipmentIds || [])
                    .map(id => contract.equipment.find(e => e.id === id)?.name)
                    .filter(Boolean)
                    .join(', ');
                 const line = `${monthName} ${startDateString} - ${endDateString} - ${equipmentNames || 'Обладнання не вказано'}`;

                 if (formatType === 'html') {
                    content += `<li>- ${line}</li>`;
                 } else {
                    content += `\t- ${line}\n`;
                 }
            });

             if (formatType === 'html') {
                content += `</ul>`;
             } else {
                content += `\n`;
             }
        });
        
        if (formatType === 'html') content += `</body></html>`;
        return content;
    };

    const handleExportPlan = async (formatType: 'doc' | 'html' | 'txt') => {
        const isAllMonths = selectedMonth === 'all';
        const targetDate = !isAllMonths ? new Date(selectedMonth) : new Date();
        const fileName = `plan_${isAllMonths ? 'all_time' : format(targetDate, 'MM_yyyy')}.${formatType}`;
        let mimeType = 'text/plain';

        let content: string | null = null;
        
        if (formatType === 'txt') {
            content = generatePlanContent('txt');
            mimeType = 'text/plain';
        } else {
            content = generatePlanContent('html');
            if (content === null) return;
            mimeType = formatType === 'doc' ? 'application/vnd.ms-word' : 'text/html';
            if(formatType === 'doc') {
                content = `
                    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
                    <head><meta charset="utf-8"><title>Вивантаження в Word</title></head>
                    <body>${content}</body>
                    </html>`;
             }
        }
        
        if (content === null) return;
        
        const dataBlob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8` });

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([dataBlob], fileName, { type: mimeType })] })) {
            try {
                await navigator.share({
                    title: 'План робіт',
                    files: [new File([dataBlob], fileName, { type: mimeType })],
                });
                 toast({
                    title: 'Експорт ініційовано',
                    description: `Оберіть, куди зберегти файл ${fileName}.`,
                });
            } catch(error) {
                console.log("Share API cancelled", error);
                toast({ title: 'Експорт скасовано' });
            }
        } else {
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({
                title: 'Експорт успішний',
                description: `План робіт збережено.`,
            });
        }
    };
      
    const engineersForKanban = useMemo(() => {
        if (!allEngineers) return [];
        return allEngineers;
    }, [allEngineers]);
    
    const tasksByContractId = useMemo(() => {
        return filteredTasks.reduce((acc, task) => {
            if (!acc[task.contract.id]) {
                acc[task.contract.id] = {
                    ...task.contract,
                    maintenancePeriods: []
                };
            }
            acc[task.contract.id].maintenancePeriods.push(task);
            return acc;
        }, {} as Record<string, ServiceContract & { maintenancePeriods: any[] }>);
    }, [filteredTasks]);

    const taskContracts = Object.values(tasksByContractId).sort((a,b) => a.objectName.localeCompare(b.objectName));
    
    const handleOpenFinalizeDialog = (period: MaintenancePeriod, contract: ServiceContract) => {
        setSelectedPeriodToFinalize(period);
        setContractForFinalization(contract);
    };

    const handleSaveFinalization = (finalizedPeriod: MaintenancePeriod) => {
        if (!firestore || !contractForFinalization) return;

        const updatedPeriods = contractForFinalization.maintenancePeriods.map(p =>
            p.id === finalizedPeriod.id ? finalizedPeriod : p
        );

        // Determine new contract status
        const allPeriodsCompleted = updatedPeriods.every(p => p.status === 'Виконано');
        const newContractStatus: TaskStatus = allPeriodsCompleted ? 'Виконано' : 'Заплановано';
        
        const contractDocRef = doc(firestore, 'serviceContracts', contractForFinalization.id);
        updateDocumentNonBlocking(contractDocRef, { 
            maintenancePeriods: updatedPeriods,
            status: newContractStatus
        });
        
        toast({
            title: 'Період ТО завершено',
            description: `Дані для "${finalizedPeriod.name}" було оновлено.`,
        });
        setSelectedPeriodToFinalize(null);
        setContractForFinalization(null);
    };

    const handleOpenAssignDialog = (period: MaintenancePeriod, contract: ServiceContract) => {
        setPeriodToAssign(period);
        setContractForAssignment(contract);
        setAssignEngineersOpen(true);
    };

    const handleOpenEditDatesDialog = (period: MaintenancePeriod, contract: ServiceContract) => {
        setPeriodToEditDates(period);
        setContractForDateEdit(contract);
        setEditDatesOpen(true);
    };
    
    const handleSaveDates = (newStartDate: Date, newEndDate: Date) => {
        if (!firestore || !contractForDateEdit || !periodToEditDates) return;

        const updatedPeriods = contractForDateEdit.maintenancePeriods.map(p =>
            p.id === periodToEditDates.id ? { ...p, startDate: newStartDate, endDate: newEndDate } : p
        );

        const contractDocRef = doc(firestore, 'serviceContracts', contractForDateEdit.id);
        updateDocumentNonBlocking(contractDocRef, { maintenancePeriods: updatedPeriods });
        
        toast({
            title: 'Дати оновлено',
        });
        
        setEditDatesOpen(false);
        setPeriodToEditDates(null);
        setContractForDateEdit(null);
    };

    const handleAssignEngineers = (newEngineerIds: string[]) => {
        if (!firestore || !contractForAssignment || !periodToAssign) return;

        const updatedPeriods = contractForAssignment.maintenancePeriods.map(p =>
            p.id === periodToAssign.id ? { ...p, assignedEngineerIds: newEngineerIds } : p
        );

        const contractDocRef = doc(firestore, 'serviceContracts', contractForAssignment.id);
        updateDocumentNonBlocking(contractDocRef, { maintenancePeriods: updatedPeriods });
        
        toast({
            title: 'Виконавців оновлено',
        });
        
        setAssignEngineersOpen(false);
        setPeriodToAssign(null);
        setContractForAssignment(null);
    };


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Планові ТО</h2>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Download className="mr-2 h-4 w-4" />
                                Експорт
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleExportPlan('doc')}>Експорт в .doc (Word)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportPlan('html')}>Експорт в .html</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportPlan('txt')}>Експорт в .txt</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>


            <div className="grid grid-cols-3 gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger>
                        <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                        <SelectValue placeholder="Оберіть місяць..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Увесь період</SelectItem>
                        {availableMonths.map(month => (
                            <SelectItem key={month} value={month}>
                                {format(new Date(month), 'LLLL yyyy', { locale: uk })}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={selectedSubdivision} onValueChange={(value) => setSelectedSubdivision(value as SubdivisionType | 'all')}>
                    <SelectTrigger>
                        <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                        <SelectValue placeholder="Підрозділи" />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Всі підрозділи</SelectItem>
                        <SelectItem value="КОНД">КОНД</SelectItem>
                        <SelectItem value="ДБЖ">ДБЖ</SelectItem>
                        <SelectItem value="ДГУ">ДГУ</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={selectedEngineerId} onValueChange={setSelectedEngineerId}>
                    <SelectTrigger>
                        <div className="overflow-hidden whitespace-nowrap text-ellipsis">
                            <SelectValue placeholder="Оберіть інженера..." />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Всі інженери</SelectItem>
                        {engineers?.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                                {e.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading && (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
                </div>
            )}

            {!isLoading && filteredTasks.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    <ClipboardList className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">Немає завдань</h3>
                    <p className="mt-2 text-sm">На обраний місяць та/або для обраного фільтру не заплановано жодного ТО.</p>
                </div>
            )}

            {!isLoading && filteredTasks.length > 0 && settings.maintenanceViewMode === 'list' && (
                 <div className="space-y-3">
                    {taskContracts.map(contract => {
                        const isExpanded = expandedTasks.has(contract.id);
                        
                        return (
                            <Collapsible open={isExpanded} onOpenChange={() => handleToggleExpand(contract.id)} key={contract.id}>
                                <Card className="shadow-md relative">
                                    <div className="p-3">
                                      <div className="flex justify-between items-start gap-2">
                                        <CollapsibleTrigger asChild className="w-full">
                                            <div className="flex items-start gap-2 cursor-pointer flex-grow min-w-0">
                                              <Building2 className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5"/>
                                              <div className="flex-1 space-y-2">
                                                  <h3 className="font-bold text-base text-left">
                                                      {contract.objectName}
                                                  </h3>
                                                  <div className="text-sm text-muted-foreground space-y-1 text-left">
                                                      <div className="flex items-center gap-2">
                                                          <MapPin className="h-4 w-4" />
                                                          <span>{contract.address}</span>
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                          <Phone className="h-4 w-4" />
                                                          <span>{contract.contactPerson ? `${contract.contactPerson}${contract.contactPhone ? ` (${contract.contactPhone})` : ''}` : 'Контактна особа не вказана'}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                            </div>
                                        </CollapsibleTrigger>
                                        <CollapsibleTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                                                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                                            </Button>
                                        </CollapsibleTrigger>
                                      </div>
                                    </div>
                                    
                                     <CollapsibleContent>
                                        <div className="px-3 pb-3 pt-2 border-t mt-2">
                                          {engineers && (
                                            <MaintenancePeriodManager 
                                                contract={contract} 
                                                engineers={engineers} 
                                                periodsToShow={contract.maintenancePeriods}
                                                onFinalize={(period) => handleOpenFinalizeDialog(period, contract)}
                                                onAssign={(period) => handleOpenAssignDialog(period, contract)}
                                                onEditDates={(period) => handleOpenEditDatesDialog(period, contract)}
                                            />
                                          )}
                                        </div>
                                    </CollapsibleContent>
                                </Card>
                            </Collapsible>
                        )
                    })}
                 </div>
            )}
            
            {!isLoading && filteredTasks.length > 0 && settings.maintenanceViewMode === 'kanban-engineer' && (
                <MaintenanceKanbanBoard 
                    tasks={filteredTasks} 
                    engineers={engineersForKanban} 
                    selectedEngineerId={selectedEngineerId}
                    showEditControls={true}
                    onFinalize={(period, contract) => handleOpenFinalizeDialog(period, contract)}
                    onAssign={(period, contract) => handleOpenAssignDialog(period, contract)}
                    onEditDates={(period, contract) => handleOpenEditDatesDialog(period, contract)}
                />
            )}
            
            {!isLoading && filteredTasks.length > 0 && settings.maintenanceViewMode === 'kanban-subdivision' && (
                <MaintenanceKanbanBoardBySubdivision tasks={filteredTasks} selectedSubdivision={selectedSubdivision} />
            )}

            {contractForFinalization && selectedPeriodToFinalize && (
                <CompletePeriodDialog
                    isOpen={!!selectedPeriodToFinalize}
                    setIsOpen={() => {
                        setSelectedPeriodToFinalize(null);
                        setContractForFinalization(null);
                    }}
                    period={selectedPeriodToFinalize}
                    engineers={allEngineers || []}
                    onSave={handleSaveFinalization}
                />
            )}

            {contractForAssignment && periodToAssign && (
                 <AssignEngineersDialog
                    isOpen={assignEngineersOpen}
                    setIsOpen={setAssignEngineersOpen}
                    period={periodToAssign}
                    engineers={allEngineers || []}
                    onSave={handleAssignEngineers}
                 />
            )}

            {contractForDateEdit && periodToEditDates && (
                <EditPeriodDatesDialog
                    isOpen={editDatesOpen}
                    setIsOpen={setEditDatesOpen}
                    period={periodToEditDates}
                    onSave={handleSaveDates}
                />
            )}
        </div>
    );
}

function AssignEngineersDialog({
    isOpen,
    setIsOpen,
    period,
    engineers,
    onSave,
}: {
    isOpen: boolean,
    setIsOpen: (open: boolean) => void,
    period: MaintenancePeriod,
    engineers: ServiceEngineer[],
    onSave: (newEngineerIds: string[]) => void,
}) {
    const [assignedIds, setAssignedIds] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if(isOpen) {
            setAssignedIds(period.assignedEngineerIds);
            setSearchTerm('');
        }
    }, [isOpen, period]);

    const toggleEngineer = (id: string) => {
        setAssignedIds(prev => prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]);
    }

    const filteredEngineers = useMemo(() => {
        if (!searchTerm) return engineers;
        return engineers.filter((e) =>
          e.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }, [engineers, searchTerm]);
    
    const handleSubmit = () => {
        onSave(assignedIds);
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Призначити виконавців</DialogTitle>
                    <DialogDescription>
                        Оберіть інженерів для періоду "{period.name}".
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                     <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Пошук інженера..."
                    />
                    <ScrollArea className="h-64 border rounded-md">
                        <ul className="p-2 space-y-1">
                            {filteredEngineers.map(engineer => (
                                <li key={engineer.id}>
                                     <div
                                        onClick={() => toggleEngineer(engineer.id)}
                                        className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted cursor-pointer"
                                    >
                                        <Checkbox
                                            checked={assignedIds.includes(engineer.id)}
                                            onCheckedChange={() => toggleEngineer(engineer.id)}
                                            id={`assign-eng-${engineer.id}`}
                                        />
                                        <label htmlFor={`assign-eng-${engineer.id}`} className={cn("flex-1 cursor-pointer", assignedIds.includes(engineer.id) ? "font-semibold" : "text-muted-foreground")}>
                                            {engineer.name}
                                        </label>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </ScrollArea>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Скасувати</Button>
                    <Button onClick={handleSubmit}>Зберегти</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )

}

function EditPeriodDatesDialog({
    isOpen,
    setIsOpen,
    period,
    onSave,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
    period: MaintenancePeriod;
    onSave: (startDate: Date, endDate: Date) => void;
}) {
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen && period) {
            setStartDate(safeGetDate(period.startDate) ?? undefined);
            setEndDate(safeGetDate(period.endDate) ?? undefined);
        }
    }, [isOpen, period]);

    const handleSubmit = () => {
        if (!startDate || !endDate) {
            toast({
                variant: 'destructive',
                title: 'Помилка валідації',
                description: 'Обидві дати, початку та закінчення, повинні бути вказані.',
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
        onSave(startDate, endDate);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Редагувати дати періоду</DialogTitle>
                    <DialogDescription>
                        Змініть дати початку та закінчення для "{period.name}".
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label>Дата початку</Label>
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
                        <Label>Дата закінчення</Label>
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
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsOpen(false)}>Скасувати</Button>
                    <Button onClick={handleSubmit}>Зберегти зміни</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

    

    
