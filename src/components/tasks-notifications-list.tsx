

"use client";

import { useMemo, useState } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ServiceContract, MaintenancePeriod, ServiceEngineer, MaintenanceViewMode } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Bell, AlertTriangle, Building2, Wrench, Users, Send, MapPin, User, Phone, Mail, Loader2 } from 'lucide-react';
import { differenceInDays, startOfDay, endOfMonth } from 'date-fns';
import { getDaysString, cn, cleanAddressForNavigation } from '@/lib/utils';
import { defaultSettings } from '@/hooks/display-settings-context';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import MaintenanceKanbanBoard from './maintenance-kanban-board';
import MaintenanceKanbanBoardBySubdivision from './maintenance-kanban-board-by-subdivision';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useIsAdmin';


type NotificationTask = MaintenancePeriod & {
    contract: ServiceContract;
    daysDiff: number;
    isOverdue: boolean;
    assignedEngineers: ServiceEngineer[];
};

const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
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

const handleNavigate = (e: React.MouseEvent, task: NotificationTask) => {
    e.stopPropagation();
    const navigator = (e.currentTarget as HTMLElement).dataset.navigator as 'google' | 'waze';
    let url: string;
    const { coordinates, address } = task.contract;

    if (coordinates) {
        if (navigator === 'google') {
            url = `https://www.google.com/maps/search/?api=1&query=${coordinates.replace(/\s/g, '')}`;
        } else {
            url = `https://waze.com/ul?ll=${coordinates.replace(/\s/g, '')}&navigate=yes`;
        }
    } else if (address) {
        const cleanedAddress = cleanAddressForNavigation(address);
        const encodedAddress = encodeURIComponent(cleanedAddress);
        if (navigator === 'google') {
            url = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        } else {
            url = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
        }
    } else {
        return;
    }
    window.open(url, '_blank');
};


export default function NotificationsList() {
    const { firestore } = useFirebase();
    const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
    const { data: contracts, isLoading: isLoadingContracts } = useCollection<ServiceContract>(contractsRef);
    
    const engineersRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceEngineers') : null, [firestore]);
    const { data: engineers, isLoading: isLoadingEngineers } = useCollection<ServiceEngineer>(engineersRef);

    const settings = defaultSettings; // Using default settings

    const notificationTasks = useMemo(() => {
        if (!contracts || !engineers) return { overdue: [], upcoming: [] };

        const today = startOfDay(new Date());

        const allPeriods: NotificationTask[] = contracts
            .filter(c => !c.archived)
            .flatMap(contract =>
                contract.maintenancePeriods
                    .filter(period => period.status === 'Заплановано')
                    .map(period => {
                        const startDate = safeGetDate(period.startDate);
                        if (!startDate) return null;

                        const daysDiff = differenceInDays(startOfDay(startDate), today);
                        return {
                            ...period,
                            contract,
                            daysDiff,
                            isOverdue: daysDiff < 0,
                            assignedEngineers: engineers.filter(e => period.assignedEngineerIds.includes(e.id)),
                        };
                    })
                    .filter((p): p is NotificationTask => p !== null)
            );

        const overdue = allPeriods
            .filter(p => p.isOverdue)
            .sort((a, b) => (safeGetDate(a.startDate)?.getTime() ?? 0) - (safeGetDate(b.startDate)?.getTime() ?? 0));

        const upcoming = allPeriods
            .filter(p => {
                if (p.isOverdue) return false;
                if (settings.upcomingDays === 'endOfMonth') {
                    const monthEnd = endOfMonth(today);
                    return p.daysDiff <= differenceInDays(monthEnd, today);
                }
                return p.daysDiff <= settings.upcomingDays;
            })
            .sort((a, b) => a.daysDiff - b.daysDiff);

        return { overdue, upcoming };

    }, [contracts, settings, engineers]);
    
    const getAssignedEngineersText = (task: NotificationTask) => {
        if (task.assignedEngineers.length === 0) {
            return 'Виконавці не призначені';
        }
        return task.assignedEngineers
            .map(e => e.name)
            .filter(Boolean)
            .join(', ');
    };
    
    const allNotificationTasks = useMemo(() => {
        return [...notificationTasks.overdue, ...notificationTasks.upcoming].map(t => ({...t, contract: t.contract, assignedEngineers: t.assignedEngineers}));
    }, [notificationTasks]);


    if (isLoadingContracts || isLoadingEngineers) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        );
    }

    const { overdue, upcoming } = notificationTasks;
    const showOverdue = settings.showOverdue && overdue.length > 0;
    const showUpcoming = settings.showUpcoming && upcoming.length > 0;


    if (!showOverdue && !showUpcoming) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <Bell className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Все спокійно</h3>
                <p className="mt-2 text-sm">Немає сповіщень для відображення згідно з вашими налаштуваннями.</p>
            </div>
        );
    }

    if (settings.maintenanceViewMode.startsWith('kanban')) {
        return (
            <div className="space-y-4">
                 {settings.maintenanceViewMode === 'kanban-engineer' && (
                    <MaintenanceKanbanBoard 
                        tasks={allNotificationTasks} 
                        engineers={engineers || []} 
                        selectedEngineerId="all" 
                    />
                )}
                {settings.maintenanceViewMode === 'kanban-subdivision' && (
                    <MaintenanceKanbanBoardBySubdivision 
                        tasks={allNotificationTasks} 
                        selectedSubdivision="all"
                    />
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {showOverdue && (
                <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-destructive flex items-center gap-2">
                             <AlertTriangle />
                             Прострочені завдання ({overdue.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {overdue.map(task => (
                                <div key={task.id} className="p-3 rounded-lg border border-destructive/20 bg-background/50">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <p className="font-bold text-destructive text-sm">Прострочено на {Math.abs(task.daysDiff)} {getDaysString(Math.abs(task.daysDiff))}</p>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-semibold">{task.contract.objectName}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <span className="text-sm text-muted-foreground">{task.contract.address}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {task.contract.contactPerson ? `${task.contract.contactPerson}${task.contract.contactPhone ? ` (${task.contract.contactPhone})` : ''}` : 'Контактна особа не вказана'}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                    <span className="text-sm text-muted-foreground">{getAssignedEngineersText(task)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <Badge className={cn("self-end", subdivisionColors[task.subdivision], subdivisionBorderColors[task.subdivision])}>
                                                {task.subdivision}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-indigo-100 border-indigo-200 hover:bg-indigo-200">
                                                        <Send suppressHydrationWarning className="h-5 w-5 text-indigo-700" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem data-navigator="google" onClick={(e) => handleNavigate(e, task)}>
                                                        Google Карти
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem data-navigator="waze" onClick={(e) => handleNavigate(e, task)}>
                                                        Waze
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {showUpcoming && (
                 <Card className="border-green-600/50 bg-green-500/5">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold text-green-700 flex items-center gap-2">
                            <Bell />
                            Майбутні завдання ({upcoming.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {upcoming.map(task => (
                                <div key={task.id} className="p-3 rounded-lg border border-green-600/20 bg-background/50">
                                     <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <p className="font-bold text-primary text-sm">
                                                {task.daysDiff === 0 ? 'Сьогодні' : `Через ${task.daysDiff} ${getDaysString(task.daysDiff)}`}
                                            </p>
                                            <div className="mt-2 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="font-semibold">{task.contract.objectName}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <span className="text-sm text-muted-foreground">{task.contract.address}</span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                    <span className="text-sm text-muted-foreground">
                                                        {task.contract.contactPerson ? `${task.contract.contactPerson}${task.contract.contactPhone ? ` (${task.contract.contactPhone})` : ''}` : 'Контактна особа не вказана'}
                                                    </span>
                                                </div>
                                                <div className="flex items-start gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                    <span className="text-sm text-muted-foreground">{getAssignedEngineersText(task)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                             <Badge className={cn("self-end", subdivisionColors[task.subdivision], subdivisionBorderColors[task.subdivision])}>
                                                {task.subdivision}
                                            </Badge>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-indigo-100 border-indigo-200 hover:bg-indigo-200">
                                                        <Send suppressHydrationWarning className="h-5 w-5 text-indigo-700" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem data-navigator="google" onClick={(e) => handleNavigate(e, task)}>
                                                        Google Карти
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem data-navigator="waze" onClick={(e) => handleNavigate(e, task)}>
                                                        Waze
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                 </Card>
            )}
        </div>
    );
}
