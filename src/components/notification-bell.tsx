"use client";

import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ServiceContract, MaintenancePeriod } from '@/lib/types';
import { differenceInDays, startOfDay } from 'date-fns';
import { Bell, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

type OverdueTask = MaintenancePeriod & {
    contract: ServiceContract;
};

const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (date.toDate) return date.toDate();
    const d = new Date(date);
    return isNaN(d.getTime()) ? null : d;
};

export default function NotificationBell() {
    const { firestore } = useFirebase();
    const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
    const { data: contracts, isLoading } = useCollection<ServiceContract>(contractsRef);

    const overdueTasks = useMemo(() => {
        if (!contracts) return [];

        const today = startOfDay(new Date());

        const allOverdue: OverdueTask[] = contracts
            .filter(c => !c.archived)
            .flatMap(contract =>
                contract.maintenancePeriods
                    .filter(period => {
                        if (period.status !== 'Заплановано') return false;
                        const startDate = safeGetDate(period.startDate);
                        if (!startDate) return false;
                        return differenceInDays(startDate, today) < 0;
                    })
                    .map(period => ({
                        ...period,
                        contract,
                    }))
            )
            .sort((a, b) => (safeGetDate(a.startDate)?.getTime() ?? 0) - (safeGetDate(b.startDate)?.getTime() ?? 0));

        return allOverdue;
    }, [contracts]);

    const hasOverdueTasks = overdueTasks.length > 0;

    const handleNavigateToNotifications = () => {
        // This provides a more reliable navigation by forcing a page load with the correct query parameter.
        window.location.href = '/?tab=tasks';
    };
    
    if (isLoading) {
        return (
             <Button variant="ghost" size="icon" className="h-9 w-9" disabled>
                <Bell className="h-5 w-5" />
            </Button>
        );
    }
    
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                    {hasOverdueTasks && 
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-6 w-6 animate-bell-glow rounded-full" />
                    }
                    <Bell className={cn("h-5 w-5 transition-colors relative", hasOverdueTasks && "text-white")} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Прострочені завдання</span>
                    <Badge variant={hasOverdueTasks ? "destructive" : "secondary"}>{overdueTasks.length}</Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {hasOverdueTasks ? (
                    <div className="max-h-60 overflow-y-auto">
                        {overdueTasks.map(task => (
                            <DropdownMenuItem key={task.id} className="flex flex-col items-start gap-1 cursor-pointer" onSelect={handleNavigateToNotifications}>
                                <span className="font-semibold">{task.contract.objectName}</span>
                                <span className="text-xs text-muted-foreground">{task.name}</span>
                            </DropdownMenuItem>
                        ))}
                    </div>
                ) : (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        <p>Немає прострочених завдань.</p>
                    </div>
                )}
                 <DropdownMenuSeparator />
                 <DropdownMenuItem onSelect={handleNavigateToNotifications} className="cursor-pointer">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>Перейти до сповіщень</span>
                 </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
