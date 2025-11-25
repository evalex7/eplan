"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ServiceContract, ClientObject, MaintenancePeriod, TaskStatus, SubdivisionType } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { cn } from '@/lib/utils';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  format,
  differenceInDays,
  addDays,
  addMonths,
  addYears,
  subYears,
  isSaturday,
  isSunday,
  isToday as isTodayDate,
} from 'date-fns';
import { uk } from 'date-fns/locale';
import { CalendarIcon, Minus, Plus, Wrench } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { defaultSettings } from '@/hooks/display-settings-context';


type ViewMode = 'День' | 'Тиждень' | 'Місяць' | 'Квартал' | 'Півроку' | 'Рік';

const subdivisionColors: Record<SubdivisionType, string> = {
  'КОНД': 'bg-blue-500',
  'ДБЖ': 'bg-red-500',
  'ДГУ': 'bg-amber-700',
};

interface ScheduleGanttProps {
  isParentCollapsed: boolean;
  onCollapseChange: (isCollapsed: boolean) => void;
}

export default function ScheduleGantt({ isParentCollapsed, onCollapseChange }: ScheduleGanttProps) {
  const { firestore } = useFirebase();
  const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
  const { data: allTasks, isLoading } = useCollection<ServiceContract>(contractsRef);
  const isMobile = useIsMobile();
  const settings = defaultSettings; // Using default settings

  const [viewMode, setViewMode] = useState<ViewMode>('Рік');
  const [zoom, setZoom] = useState(100);
  const [currentDate, setCurrentDate] = useState(new Date());

  const ganttContainerRef = useRef<HTMLDivElement>(null);
  
  const ROW_HEIGHT = 40;
  const TASK_BAR_HEIGHT = 28;
  const SIDEBAR_WIDTH = isMobile ? 120 : 250;

  const getDayWidth = useCallback(() => {
    const baseWidth = (() => {
      switch (viewMode) {
        case 'Рік': return isMobile ? 1 : 2;
        case 'Півроку': return isMobile ? 2 : 4;
        case 'Квартал': return isMobile ? 5 : 10;
        case 'Місяць': return isMobile ? 20 : 40;
        case 'Тиждень': return isMobile ? 40 : 80;
        case 'День': return 1200;
        default: return 30;
      }
    })();
    return baseWidth * (zoom / 100);
  }, [viewMode, isMobile, zoom]);


  const fullDateRange = useMemo(() => {
    if (!allTasks || allTasks.length === 0) {
      return { start: startOfYear(new Date()), end: endOfYear(new Date()) };
    }

    const allTaskDates = allTasks.flatMap(task => 
      task.maintenancePeriods.flatMap(p => {
        const startDate = p.startDate ? (p.startDate as any).toDate ? (p.startDate as any).toDate() : new Date(p.startDate) : null;
        const endDate = p.endDate ? (p.endDate as any).toDate ? (p.endDate as any).toDate() : new Date(p.endDate) : null;
        return [startDate, endDate];
      }).filter((d): d is Date => d !== null)
    );
    
    if (allTaskDates.length > 0) {
      const minDate = new Date(Math.min(...allTaskDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...allTaskDates.map(d => d.getTime())));
      return { start: startOfYear(minDate), end: endOfYear(maxDate) };
    }

    return { start: startOfYear(new Date()), end: endOfYear(new Date()) };
  }, [allTasks]);

  const { primaryHeaders, secondaryHeaders, timelineWidth, timelineStart } = useMemo(() => {
    let start = fullDateRange.start;
    let end = fullDateRange.end;
    
    if (viewMode !== 'Рік') {
        start = startOfYear(subYears(currentDate, 1));
        end = endOfYear(addYears(currentDate, 1));
    }

    const primary: { label: string, start: Date, end: Date }[] = [];
    const secondary: { label: string, start: Date, end: Date, isWeekend?: boolean }[] = [];

    const dayWidth = getDayWidth();

    switch (viewMode) {
      case 'Рік':
        primary.push(...eachYearOfInterval({ start, end }).map(year => ({ label: format(year, 'yyyy'), start: year, end: endOfYear(year) })));
        secondary.push(...eachMonthOfInterval({ start, end }).map(month => ({ label: format(month, 'LLL', { locale: uk }), start: month, end: endOfMonth(month) })));
        break;
      case 'Півроку':
        eachMonthOfInterval({ start, end }).forEach(month => {
          const year = format(month, 'yyyy');
          const half = Math.floor(month.getMonth() / 6) + 1;
          const label = `${half} півріччя ${year}`;
          if (!primary.find(h => h.label === label)) {
            const halfStart = new Date(month.getFullYear(), (half - 1) * 6, 1);
            const halfEnd = endOfMonth(addMonths(halfStart, 5));
            primary.push({ label, start: halfStart, end: halfEnd });
          }
        });
        secondary.push(...eachMonthOfInterval({ start, end }).map(month => ({ label: format(month, 'LLL', { locale: uk }), start: month, end: endOfMonth(month) })));
        break;
      case 'Квартал':
         eachMonthOfInterval({ start, end }).forEach(month => {
          const year = format(month, 'yyyy');
          const quarter = Math.floor(month.getMonth() / 3) + 1;
          const label = `${quarter}-й квартал ${year}`;
          if (!primary.find(h => h.label === label)) {
            const quarterStart = new Date(month.getFullYear(), (quarter - 1) * 3, 1);
            const quarterEnd = endOfMonth(addMonths(quarterStart, 2));
            primary.push({ label, start: quarterStart, end: quarterEnd });
          }
        });
        secondary.push(...eachMonthOfInterval({ start, end }).map(month => ({ label: format(month, 'LLL', { locale: uk }), start: month, end: endOfMonth(month) })));
        break;
      case 'Місяць':
        primary.push(...eachMonthOfInterval({ start, end }).map(month => ({ label: format(month, 'LLLL yyyy', { locale: uk }), start: month, end: endOfMonth(month) })));
        secondary.push(...eachDayOfInterval({ start, end }).map(day => ({ label: format(day, 'd'), start: day, end: day, isWeekend: isSaturday(day) || isSunday(day) })));
        break;
      case 'Тиждень':
        primary.push(...eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(weekStart => ({ label: `${format(weekStart, 'd MMM', { locale: uk })} - ${format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'd MMM yyyy', { locale: uk })}`, start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 1 }) })));
        secondary.push(...eachDayOfInterval({ start, end }).map(day => ({ label: format(day, 'E', { locale: uk }), start: day, end: day, isWeekend: isSaturday(day) || isSunday(day) })));
        break;
      case 'День':
        primary.push(...eachDayOfInterval({ start, end }).map(day => ({ label: format(day, 'eeee, d LLLL yyyy', { locale: uk }), start: day, end: day })));
        secondary.push(...Array.from({length: 24}, (_, i) => ({label: `${i}:00`, start: new Date(), end: new Date()}))); // Placeholder for hours
        break;
    }
    
    const totalDays = Math.max(1, differenceInDays(end, start) + 1);
    const calculatedWidth = totalDays * dayWidth;

    return { primaryHeaders: primary, secondaryHeaders: secondary, timelineWidth: calculatedWidth, timelineStart: start };
  }, [fullDateRange, viewMode, currentDate, getDayWidth]);

  const ganttData = useMemo(() => {
    if (!allTasks) return [];
    
    const map = new Map<string, { client: ClientObject; periods: (MaintenancePeriod & {objectName: string; status: TaskStatus; contract: ServiceContract;})[] }>();
      allTasks.forEach(task => {
        if (task.archived) return;

        if (!map.has(task.clientObjectId)) {
          map.set(task.clientObjectId, {
            client: { id: task.clientObjectId, name: task.objectName, address: task.address },
            periods: [],
          });
        }
        
        const periodsForTask = task.maintenancePeriods.map(p => ({
          ...p,
          objectName: task.objectName,
          status: p.status as TaskStatus,
          contract: task,
        }));
        
        map.get(task.clientObjectId)!.periods.push(...periodsForTask);
      });
    
    return Array.from(map.values()).sort((a, b) => a.client.name.localeCompare(b.client.name));
  }, [allTasks]);

  const getTaskPosition = (period: MaintenancePeriod, dayWidth: number, startOfTimeline: Date) => {
    const periodStartDate = period.startDate ? (period.startDate as any).toDate ? (period.startDate as any).toDate() : new Date(period.startDate) : null;
    const periodEndDate = period.endDate ? (period.endDate as any).toDate ? (period.endDate as any).toDate() : new Date(period.endDate) : null;
    
    if (!periodStartDate || !periodEndDate || periodEndDate < periodStartDate) {
      return { left: 0, width: 0, outOfView: true };
    }

    const startOffsetDays = differenceInDays(periodStartDate, startOfTimeline);
    const durationDays = differenceInDays(periodEndDate, periodStartDate) + 1;

    const left = startOffsetDays * dayWidth;
    const width = Math.max(dayWidth * 0.8, durationDays * dayWidth - (dayWidth * 0.2));

    return { left, width, outOfView: false };
  };

  const stats = useMemo(() => {
    const activeContracts = allTasks?.filter(t => !t.archived) || [];
    return {
      objects: ganttData.length,
      tasks: ganttData.reduce((acc, curr) => acc + curr.periods.length, 0),
      contracts: activeContracts.length,
    }
  }, [allTasks, ganttData]);

  const handleScrollToToday = () => {
    const dayWidthVal = getDayWidth();
    const container = ganttContainerRef.current;
    
    if (container) {
        const startOffsetDays = differenceInDays(new Date(), timelineStart);
        const scrollPosition = (startOffsetDays * dayWidthVal) - (container.clientWidth / 2);
        container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }

  useEffect(() => {
    handleScrollToToday();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, allTasks, zoom]);
  
  const todayLeftPosition = useMemo(() => {
    const dayWidthVal = getDayWidth();
    const startOffsetDays = differenceInDays(new Date(), timelineStart);
    return startOffsetDays * dayWidthVal + (new Date().getHours() / 24) * dayWidthVal;
  }, [getDayWidth, timelineStart]);


  return (
    <div className="flex flex-col h-full bg-card text-card-foreground overflow-hidden">
      <CardHeader className={cn("flex-shrink-0 border-b z-30 p-4 md:p-6 transition-all duration-300")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
                <CardTitle className="text-lg md:text-2xl">Лінія часу</CardTitle>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {stats.objects} об'єктів • {stats.tasks} завдань • {stats.contracts} договорів
                </p>
            </div>
            <div className="flex items-center gap-2">
                 <div className="flex items-center border rounded-lg p-1 bg-muted">
                    <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={() => setZoom(z => Math.max(20, z - 10))}><Minus suppressHydrationWarning className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium w-10 md:w-12 text-center">{zoom}%</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" onClick={() => setZoom(z => Math.min(200, z + 10))}><Plus suppressHydrationWarning className="h-4 w-4" /></Button>
                 </div>
                <Button variant="outline" size="sm" onClick={handleScrollToToday}>Сьогодні</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <CalendarIcon suppressHydrationWarning className="mr-2 h-4 w-4" />
                        {viewMode}
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                    <DropdownMenuRadioGroup value={viewMode} onValueChange={(v) => {
                        setViewMode(v as ViewMode);
                        setCurrentDate(new Date());
                    }}>
                        <DropdownMenuRadioItem value="День">День</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Тиждень">Тиждень</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Місяць">Місяць</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Квартал">Квартал</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Півроку">Півроку</DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="Рік">Рік</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </CardHeader>
      
       <div
        ref={ganttContainerRef}
        className="flex-1 overflow-auto"
        id="gantt-container"
      >
        <div className="relative" style={{ minWidth: `${SIDEBAR_WIDTH + timelineWidth}px`}}>
          {/* Header */}
          <div
            className="sticky top-0 z-20 h-[50px] bg-card flex"
          >
            <div
              className="sticky left-0 top-0 z-10 border-b border-r bg-muted font-semibold text-xs md:text-sm text-muted-foreground flex items-center justify-center p-2"
              style={{ width: `${SIDEBAR_WIDTH}px`, height: '50px' }}
            >
              НАЗВА ОБ'ЄКТУ
            </div>
            <div
              className="relative"
              style={{
                width: `${timelineWidth}px`,
                height: '50px',
              }}
            >
              {/* Primary and Secondary Headers */}
              <div className="relative h-full border-b">
                 <div className="relative flex h-[25px] border-b">
                  {primaryHeaders.map((header, index) => {
                    const dayWidth = getDayWidth();
                    const leftPosition = (differenceInDays(header.start, timelineStart)) * dayWidth;
                    const headerWidth = (differenceInDays(header.end, header.start) + 1) * dayWidth;
                    return (
                      <div key={index} className="absolute top-0 flex items-center justify-center p-1 md:p-2 border-r h-full" style={{ left: `${leftPosition}px`, width: `${headerWidth}px` }}>
                        <span className="font-medium text-[10px] md:text-xs text-foreground capitalize whitespace-nowrap">{header.label}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="relative flex h-[25px]">
                  {secondaryHeaders.map((header, index) => {
                    const dayWidth = getDayWidth();
                    const leftPosition = (differenceInDays(header.start, timelineStart)) * dayWidth;
                    const width = (differenceInDays(header.end, header.start) + 1) * dayWidth;

                    return (
                        <div key={index} className={cn("relative absolute top-0 flex flex-col justify-center items-center border-r h-full", header.isWeekend && "bg-muted/50")} style={{ left: `${leftPosition}px`, width: `${width}px` }}>
                            <span className="text-[10px] md:text-xs text-muted-foreground capitalize">{header.label}</span>
                        </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          
          {/* Today line (fixed vertically, повна висота таблиці) */}
            <div
              className="absolute z-20 w-0.5 bg-red-500 pointer-events-none"
              style={{
                left: `${SIDEBAR_WIDTH + todayLeftPosition}px`,
                top: 0,
                height: `${(ganttData.length + 2) * ROW_HEIGHT + 50}px`,
              }}
            ></div>

          {/* Body */}
          <div className="relative" style={{ height: `${(ganttData.length + 1) * ROW_HEIGHT}px`, minWidth: `${timelineWidth}px` }}>
            {isLoading ? (
                <>
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="flex" style={{ height: `${ROW_HEIGHT}px` }}>
                        <div className="sticky left-0 z-10 h-full border-b border-r bg-muted" style={{ width: `${SIDEBAR_WIDTH}px` }}><Skeleton className="w-full h-full" /></div>
                        <div className="h-full border-b flex-1" ><Skeleton className="w-full h-full" /></div>
                    </div>
                  ))}
                </>
            ) : (
                <TooltipProvider>
                  {ganttData.map(({ client, periods }, rowIndex) => {
                     const dayWidth = getDayWidth();
                    return(
                      <div key={client.id} className="flex" style={{ height: `${ROW_HEIGHT}px`}}>
                        <div className="sticky left-0 z-10 flex items-center px-2 py-1.5 border-b border-r bg-muted" style={{ width: `${SIDEBAR_WIDTH}px` }}>
                            <p className="font-medium text-xs md:text-sm truncate">{client.name}</p>
                        </div>
                        <div className="relative border-b" style={{ width: `${timelineWidth}px` }}>
                            {/* Background grid for days/weeks */}
                            {secondaryHeaders.map((header, index) => {
                                  const leftPosition = (differenceInDays(header.start, timelineStart)) * dayWidth;
                                  const width = (differenceInDays(header.end, header.start) + 1) * dayWidth;
                                  return (
                                      <div key={index} className={cn("absolute top-0 h-full border-r", header.isWeekend && "bg-muted/30")} style={{ left: `${leftPosition}px`, width: `${width}px` }} />
                                  );
                            })}
                            
                            {/* Task bars */}
                            {periods.map((period) => {
                              const { left, width, outOfView } = getTaskPosition(period, dayWidth, timelineStart);
                              if (outOfView || width <= 0) return null;
                              const periodStartDate = period.startDate ? (period.startDate as any).toDate ? (period.startDate as any).toDate() : new Date(period.startDate) : null;
                              const periodEndDate = period.endDate ? (period.endDate as any).toDate ? (period.endDate as any).toDate() : new Date(period.endDate) : null;
                              const workDescriptionString = period.subdivision as SubdivisionType;
                              const periodColor = subdivisionColors[workDescriptionString] || 'bg-gray-400';
                              return (
                                <Tooltip key={period.id}>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn(
                                        "absolute flex items-center px-2 text-white font-medium text-[10px] md:text-xs",
                                        "rounded-lg shadow-sm transition-all duration-200 cursor-pointer",
                                        "hover:brightness-110 hover:scale-[1.02]",
                                        periodColor
                                      )}
                                      style={{
                                        left: `${left}px`,
                                        width: `${width}px`,
                                        top: `calc(50% - ${TASK_BAR_HEIGHT / 2}px)`,
                                        height: `${TASK_BAR_HEIGHT}px`,
                                      }}
                                    >
                                      <span className="truncate">{workDescriptionString}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-bold">{period.objectName}</p>
                                    <div className="flex items-center gap-2"><Wrench suppressHydrationWarning className="h-4 w-4" /><span>{period.name}</span></div>
                                    <p>Статус: {period.status}</p>
                                    {periodStartDate && periodEndDate && <p>{format(periodStartDate, 'dd.MM.yy')} - {format(periodEndDate, 'dd.MM.yy')}</p>}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                        </div>
                      </div>
                  )})}
                </TooltipProvider>
            )}
            {/* Empty strip for scrolling */}
            <div className="flex" style={{ height: `${ROW_HEIGHT * 2}px`}}>
                <div className="sticky left-0 z-10 h-full border-r bg-muted" style={{ width: `${SIDEBAR_WIDTH}px` }}></div>
                <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>
                    {secondaryHeaders.map((header, index) => {
                        const dayWidth = getDayWidth();
                        const leftPosition = (differenceInDays(header.start, timelineStart)) * dayWidth;
                        const width = (differenceInDays(header.end, header.start) + 1) * dayWidth;
                        return <div key={index} className={cn("absolute top-0 h-full border-r", header.isWeekend && "bg-muted/30")} style={{ left: `${leftPosition}px`, width: `${width}px` }} />;
                    })}
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
