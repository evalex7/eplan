"use client";

import React, { useMemo } from 'react';
import type { MaintenancePeriod, ServiceContract, SubdivisionType } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Badge } from './ui/badge';
import { TaskCard, type KanbanTask } from './maintenance-kanban-board';

interface MaintenanceKanbanBoardBySubdivisionProps {
    tasks: KanbanTask[];
    selectedSubdivision: SubdivisionType | 'all';
}

const allSubdivisionColumns: { id: SubdivisionType, name: string }[] = [
    { id: 'КОНД', name: 'Кондиціонування' },
    { id: 'ДБЖ', name: 'ДБЖ' },
    { id: 'ДГУ', name: 'ДГУ' },
];

export default function MaintenanceKanbanBoardBySubdivision({ tasks, selectedSubdivision }: MaintenanceKanbanBoardBySubdivisionProps) {
    
    const tasksBySubdivision = useMemo(() => {
        const board: { [key in SubdivisionType]?: KanbanTask[] } = {};
        
        allSubdivisionColumns.forEach(column => {
            board[column.id] = [];
        });

        tasks.forEach(task => {
            if (board[task.subdivision]) {
                board[task.subdivision]!.push(task);
            }
        });
        
        return board;
    }, [tasks]);

    const subdivisionColumns = useMemo(() => {
        let columns = allSubdivisionColumns;

        if (selectedSubdivision !== 'all') {
            columns = columns.filter(col => col.id === selectedSubdivision);
        } else {
            // If filtering by something else (like an engineer), hide empty columns
             columns = columns.filter(col => (tasksBySubdivision[col.id]?.length ?? 0) > 0);
        }
        
        return columns;
    }, [selectedSubdivision, tasksBySubdivision]);


    return (
        <ScrollArea className="w-full">
            <div className="flex gap-4 pb-4">
                {subdivisionColumns.map(column => {
                    const columnTasks = tasksBySubdivision[column.id] || [];
                    
                    return (
                        <div key={column.id} className="w-72 flex-shrink-0">
                            <Card className="h-full bg-muted/50 flex flex-col">
                                <CardHeader className="p-3 border-b">
                                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                                        <span className="truncate">{column.name}</span>
                                        <Badge variant="secondary">{columnTasks.length}</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-2 flex-1 overflow-y-auto">
                                    {columnTasks.length > 0 ? (
                                        columnTasks.map(task => (
                                            <TaskCard key={`${task.id}-${column.id}`} task={task} />
                                        ))
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                                            Немає завдань
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    );
                })}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
    );
}
