"use client";

import React, { useMemo } from 'react';
import type { ServiceEngineer, MaintenancePeriod, ServiceContract, ServiceReport, EquipmentModel } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Badge } from './ui/badge';
import { Building2, Wrench, MapPin, Users, Calendar as CalendarIcon, Send } from 'lucide-react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from './ui/dropdown-menu';
import { cleanAddressForNavigation } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { uk } from 'date-fns/locale';

export type KanbanTask = MaintenancePeriod & {
    contract: ServiceContract;
    assignedEngineers: ServiceEngineer[];
};

interface MaintenanceKanbanBoardProps {
    tasks: KanbanTask[];
    engineers: ServiceEngineer[];
    selectedEngineerId: string;
    showEditControls?: boolean;
    onFinalize?: (period: MaintenancePeriod, contract: ServiceContract) => void;
    onAssign?: (period: MaintenancePeriod, contract: ServiceContract) => void;
    onEditDates?: (period: MaintenancePeriod, contract: ServiceContract) => void;
}

const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (typeof date.toDate === 'function') return date.toDate();
    const d = new Date(date);
    return !isNaN(d.getTime()) ? d : null;
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

const handleNavigate = (e: React.MouseEvent, task: KanbanTask) => {
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


export const TaskCard = ({ task, showEditControls, onFinalize, onAssign, onEditDates }: { 
    task: KanbanTask, 
    showEditControls?: boolean,
    onFinalize?: (period: MaintenancePeriod, contract: ServiceContract) => void;
    onAssign?: (period: MaintenancePeriod, contract: ServiceContract) => void;
    onEditDates?: (period: MaintenancePeriod, contract: ServiceContract) => void;
}) => {
    const startDate = safeGetDate(task.startDate);
    const endDate = safeGetDate(task.endDate);
    const { firestore } = useFirebase();
    const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
    const { data: contracts } = useCollection<ServiceContract>(contractsRef);
    const isCompleted = task.status === 'Виконано';

    const getEquipmentDetailsText = () => {
        if (!task.equipmentIds || task.equipmentIds.length === 0) return 'Обладнання не вказано';
        const contract = contracts?.find(c => c.id === task.contract.id);
        if (!contract) return 'Обладнання не знайдено';

        return task.equipmentIds
            .map(id => {
                const equip = contract.equipment?.find(e => e.id === id);
                if (!equip) return null;
                return `${equip.name}${equip.groupNumber ? ` (№${equip.groupNumber})` : ''}`;
            })
            .filter(Boolean)
            .join(', ');
    };

    return (
        <Card className={cn(
            "mb-2 shadow-sm hover:shadow-md transition-shadow",
            isCompleted ? "bg-secondary border-green-200 dark:border-green-800" : "bg-card"
        )}>
            <CardContent className="p-3 space-y-3">
                <div className="flex items-start gap-3">
                    {showEditControls && onFinalize && (
                        <Checkbox 
                            id={`kanban-task-${task.id}`}
                            checked={isCompleted}
                            onCheckedChange={(checked) => onFinalize(task, task.contract)}
                            className="h-5 w-5 mt-0.5 flex-shrink-0"
                        />
                    )}
                    <div className="flex-1">
                        <label htmlFor={`kanban-task-${task.id}`} className={cn("font-semibold text-sm cursor-pointer", isCompleted && "line-through")}>{task.contract.objectName}</label>
                         <p className={cn("text-xs", isCompleted ? "text-muted-foreground/80 line-through" : "text-muted-foreground")}>
                            {task.name.replace('#', '№')}
                         </p>
                    </div>
                     {!showEditControls && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 -mr-1 -mt-1">
                                    <Send className="h-4 w-4 text-muted-foreground" />
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
                    )}
                </div>

                <div className={cn("text-xs text-muted-foreground space-y-1.5", showEditControls && "pl-8")}>
                     {startDate && (
                        <div className="flex items-start gap-2">
                             <CalendarIcon className="h-3 w-3 mt-0.5 shrink-0" />
                             <span>{format(startDate, 'dd MMMM yyyy', { locale: uk })}</span>
                        </div>
                     )}
                    <div className="flex items-start gap-2">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{task.contract.address}</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Wrench className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="truncate">{getEquipmentDetailsText()}</span>
                    </div>
                     <div className="flex items-start gap-2">
                        <Users className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{task.assignedEngineers.length > 0 ? task.assignedEngineers.map(e => e.name).join(', ') : 'Не призначено'}</span>
                    </div>
                </div>
                 <div className={cn("flex justify-end items-center pt-1.5", showEditControls && "pl-8")}>
                    <Badge className={`${subdivisionColors[task.subdivision] || ''} ${subdivisionBorderColors[task.subdivision] || 'border-gray-200'}`}>
                        {task.subdivision}
                    </Badge>
                </div>
                {showEditControls && !isCompleted && onAssign && onEditDates && (
                    <div className="grid grid-cols-2 gap-2 pt-2 pl-8">
                        <Button size="sm" variant="outline" className="w-full" onClick={() => onEditDates(task, task.contract)}>
                            <CalendarIcon className="mr-2 h-4 w-4" /> Дати
                        </Button>
                        <Button size="sm" variant="outline" className="w-full" onClick={() => onAssign(task, task.contract)}>
                            <Users className="mr-2 h-4 w-4" /> Виконавці
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function MaintenanceKanbanBoard({ tasks, engineers, selectedEngineerId, showEditControls, onFinalize, onAssign, onEditDates }: MaintenanceKanbanBoardProps) {
    
    const tasksByEngineer = useMemo(() => {
        const board: { [key: string]: KanbanTask[] } = {};
        engineers.forEach(engineer => { board[engineer.id] = []; });
        board['unassigned'] = [];

        tasks.forEach(task => {
            if (task.assignedEngineerIds && task.assignedEngineerIds.length > 0) {
                task.assignedEngineerIds.forEach(engineerId => {
                    if (board[engineerId]) {
                        board[engineerId].push(task);
                    }
                });
            } else {
                 board['unassigned'].push(task);
            }
        });
        return board;
    }, [tasks, engineers]);

    const engineerColumns = useMemo(() => {
        if (selectedEngineerId === 'all') {
            const engineerIdsWithTasks = new Set(tasks.flatMap(t => t.assignedEngineerIds));
            return engineers.filter(e => engineerIdsWithTasks.has(e.id));
        }
        return engineers.filter(e => e.id === selectedEngineerId);
    }, [engineers, tasks, selectedEngineerId]);
    
    const unassignedTasks = tasksByEngineer['unassigned'] || [];
    const unassignedColumn = { id: 'unassigned', name: 'Не призначено', tasks: unassignedTasks };

    const allColumns = [ ...engineerColumns.map(engineer => ({ id: engineer.id, name: engineer.name, tasks: tasksByEngineer[engineer.id] || [] })), ];
    if (selectedEngineerId === 'all' && unassignedTasks.length > 0) {
        allColumns.push(unassignedColumn);
    }

    return (
        <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
                {allColumns.map(column => (
                    <div key={column.id} className="w-72 flex-shrink-0">
                        <Card className="h-full bg-muted/50 flex flex-col">
                            <CardHeader className="p-3 border-b">
                                <CardTitle className="text-base font-semibold flex items-center justify-between">
                                    <span className="truncate">{column.name}</span>
                                    <Badge variant="secondary">{column.tasks.length}</Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-2 flex-1 overflow-y-auto">
                                {column.tasks.length > 0 ? (
                                    column.tasks.map(task => (
                                        <TaskCard 
                                            key={`${task.id}-${column.id}`} 
                                            task={task} 
                                            showEditControls={showEditControls}
                                            onFinalize={onFinalize}
                                            onAssign={onAssign}
                                            onEditDates={onEditDates}
                                        />
                                    ))
                                ) : (
                                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                        Немає завдань
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}
