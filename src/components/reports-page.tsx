

"use client";

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart as BarChartIcon, LineChart as LineChartIcon, PieChart as PieChartIcon, Users, FileText, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Label,
  LabelList,
} from 'recharts';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { ServiceContract, ServiceEngineer, TaskStatus, SubdivisionType, ServiceReport } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { startOfMonth, format, isPast, isSameMonth } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import NotificationsList from './tasks-notifications-list';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const CHART_COLORS = {
  'Заплановано': 'hsl(var(--chart-1))',
  'В роботі': 'hsl(var(--chart-3))',
  'Виконано': 'hsl(var(--chart-4))',
  'Пролонгація': 'hsl(var(--chart-2))',
};
const SUBDIVISION_COLORS = {
  'КОНД': 'hsl(var(--chart-1))', // blue
  'ДБЖ': 'hsl(var(--chart-2))', // red
  'ДГУ': 'hsl(var(--chart-3))', // yellow
};

const ENGINEER_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))', '#1d4ed8', '#78350f', '#16a34a', '#64748b', '#9333ea', '#db2777', '#f59e0b', '#14b8a6', '#f43f5e', '#60a5fa'];


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const isWorkloadChart = payload.some((p: any) => p.dataKey === 'plan' || p.dataKey === 'fact');
      
      if (isWorkloadChart) {
        const planPayload = payload.find((p: any) => p.dataKey === 'plan');
        const factPayload = payload.find((p: any) => p.dataKey === 'fact');
        const name = payload[0].payload.name;
        const viewMode = payload[0].payload.viewMode;
  
        return (
          <div className="bg-background/90 backdrop-blur-sm p-2.5 border rounded-lg shadow-lg">
            <p className="font-bold mb-1">{name}</p>
            {(viewMode === 'plan' || viewMode === 'comparison') && planPayload && (
              <div className="flex items-center gap-2" style={{ color: planPayload.payload.color }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: planPayload.payload.color, opacity: 0.5 }}></div>
                <span>План: {planPayload.value}</span>
              </div>
            )}
            {(viewMode === 'fact' || viewMode === 'comparison') && factPayload && (
              <div className="flex items-center gap-2" style={{ color: factPayload.payload.color }}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: factPayload.payload.color }}></div>
                <span>Факт: {factPayload.value}</span>
              </div>
            )}
          </div>
        );
      }
  
      return (
        <div className="bg-background/90 backdrop-blur-sm p-2.5 border rounded-lg shadow-lg">
          <p className="font-bold mb-1">{payload[0].payload.name}</p>
          {payload.map((pld: any, index: number) => (
            <div key={index} className="flex items-center gap-2" style={{ color: pld.fill || pld.stroke }}>
               <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pld.fill || pld.stroke }}></div>
              <span>{`${pld.name}: ${pld.payload.count ?? pld.value}`}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

export default function ReportsPage() {
  const { firestore } = useFirebase();
  const isMobile = useIsMobile();
  const [workloadChartView, setWorkloadChartView] = useState<'comparison' | 'plan' | 'fact'>('comparison');


  const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
  const { data: contracts, isLoading: isLoadingContracts } = useCollection<ServiceContract>(contractsRef);

  const engineersRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceEngineers') : null, [firestore]);
  const { data: engineers, isLoading: isLoadingEngineers } = useCollection<ServiceEngineer>(engineersRef);
  
  const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    if (date instanceof Date) return date; // Already a Date object
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? null : parsed; // String or number
  };

  const stats = useMemo(() => {
    if (!contracts || !engineers) {
      return {
        attentionNeededTotal: 0,
        prolongationCount: 0,
        finalWorksCount: 0,
        contractsByStatus: [],
        contractsByStatusPercentage: [],
        maintenanceByMonth: [],
        subdivisionUsage: [],
        engineerWorkload: [],
      };
    }

    const activeContracts = contracts.filter(c => !c.archived);
    const totalActiveContracts = activeContracts.length;
    
    let prolongationCount = 0;
    let finalWorksCount = 0;

    activeContracts.forEach(c => {
        const contractEndDate = safeGetDate(c.contractEndDate);
    
        if (contractEndDate && (isPast(contractEndDate) || isSameMonth(contractEndDate, new Date()))) {
            prolongationCount++;
            return;
        }
    
        const scheduledPeriods = c.maintenancePeriods.filter(p => p.status === 'Заплановано');
        const hasScheduledPeriods = scheduledPeriods.length > 0;
    
        if (!hasScheduledPeriods) {
            finalWorksCount++;
        } else {
            const uniqueStartDates = new Set(
                scheduledPeriods.map(p => safeGetDate(p.startDate)?.toISOString().split('T')[0])
            );
            if (uniqueStartDates.size === 1) {
                finalWorksCount++;
            }
        }
    });

    // Contracts by status
    const contractsByStatus = activeContracts.reduce((acc, contract) => {
      const status = contract.status === 'Потребує перепланування' ? 'Пролонгація' : contract.status === 'Завершено' ? 'Виконано' : contract.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const statusOrder: string[] = ['Заплановано', 'Виконано', 'Пролонгація'];

    const contractsByStatusData = statusOrder
        .filter(status => contractsByStatus[status])
        .map(status => ({
            name: status,
            кількість: contractsByStatus[status],
            originalStatus: status
        }));
    
    const contractsByStatusPercentageData = statusOrder
        .filter(status => contractsByStatus[status])
        .map(status => ({
          name: status,
          value: totalActiveContracts > 0 ? (contractsByStatus[status] / totalActiveContracts) * 100 : 0,
          count: contractsByStatus[status],
          originalStatus: status
        }));
        
    // Maintenance periods by month
    const maintenanceByMonth = activeContracts.flatMap(c => c.maintenancePeriods).reduce((acc, period) => {
        const startDate = period.startDate ? (period.startDate as any).toDate ? (period.startDate as any).toDate() : new Date(period.startDate) : null;
        if(startDate) {
            const monthKey = format(startOfMonth(startDate), 'yyyy-MM');
            acc[monthKey] = (acc[monthKey] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const maintenanceByMonthData = Object.entries(maintenanceByMonth)
      .map(([month, count]) => ({
        month, // Keep the yyyy-MM key for sorting
        name: format(new Date(month), 'LLL yy', { locale: uk }),
        кількість: count,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)); // Sort chronologically
        
    // Subdivision usage
    const subdivisionUsage = activeContracts.flatMap(c => c.maintenancePeriods).reduce((acc, period) => {
        acc[period.subdivision] = (acc[period.subdivision] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const subdivisionUsageData = Object.entries(subdivisionUsage).map(([name, value]) => ({
        name,
        value,
    }));

    // Engineer Workload (Planned vs Actual)
    const workload = engineers.map(engineer => ({
      id: engineer.id,
      name: engineer.name,
      plan: 0, // Planned tasks
      fact: 0, // Actual completed tasks
    }));

    activeContracts.forEach(contract => {
        contract.maintenancePeriods.forEach(period => {
            const isCompleted = period.status === 'Виконано';
            const plannedIds = period.assignedEngineerIds || [];
            
            // Increment plan count for all initially assigned engineers
            plannedIds.forEach(engineerId => {
                 const engineerData = workload.find(e => e.id === engineerId);
                 if (engineerData) {
                    engineerData.plan++;
                 }
            });

            // Increment fact count ONLY for engineers who were assigned when task was completed
            if (isCompleted) {
                plannedIds.forEach(engineerId => {
                    const engineerData = workload.find(e => e.id === engineerId);
                    if (engineerData) {
                        engineerData.fact++;
                    }
                });
            }
        });
    });

    const engineerWorkloadData = workload.map((e, index) => ({
      ...e,
      viewMode: workloadChartView, // Add viewMode for tooltip logic
      color: ENGINEER_COLORS[index % ENGINEER_COLORS.length]
    })).sort((a,b) => {
      const totalB = b.plan + b.fact;
      const totalA = a.plan + a.fact;
      if (totalB !== totalA) {
        return totalB - totalA;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      attentionNeededTotal: prolongationCount + finalWorksCount,
      prolongationCount,
      finalWorksCount,
      contractsByStatus: contractsByStatusData,
      contractsByStatusPercentage: contractsByStatusPercentageData,
      maintenanceByMonth: maintenanceByMonthData,
      subdivisionUsage: subdivisionUsageData,
      engineerWorkload: engineerWorkloadData,
    };
  }, [contracts, engineers, workloadChartView]);

  const isLoading = isLoadingContracts || isLoadingEngineers;
  
  const engineerWorkloadChartData = stats.engineerWorkload.filter(e => e.plan > 0 || e.fact > 0);
  const totalPlannedTasks = useMemo(() => engineerWorkloadChartData.reduce((acc, curr) => acc + curr.plan, 0), [engineerWorkloadChartData]);
  const totalActualTasks = useMemo(() => engineerWorkloadChartData.reduce((acc, curr) => acc + curr.fact, 0), [engineerWorkloadChartData]);
  
  const renderPercentageLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;
      
    return (
      <text x={x + width / 2} y={y} dy={-8} fill="hsl(var(--foreground))" textAnchor="middle" dominantBaseline="middle" className="text-xs font-semibold">
        {`${Math.round(value)}%`}
      </text>
    );
  };


  return (
    <div className="space-y-6 md:space-y-8">

      {isLoading ? (
        <div className="space-y-4 md:space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-80 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
            <Skeleton className="h-80 w-full" />
        </div>
      ) : (
      <div className="space-y-4 md:space-y-6">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">Потребують уваги</CardTitle>
            <AlertTriangle suppressHydrationWarning className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-2xl font-bold text-destructive">{stats.prolongationCount}</div>
                        <p className="text-xs text-muted-foreground">Пролонгація</p>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-orange-500">{stats.finalWorksCount}</div>
                        <p className="text-xs text-muted-foreground">Крайні роботи</p>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="flex flex-col">
                <CardHeader>
                <CardTitle className="text-base font-medium">Договори за статусом (у %)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2 flex flex-col justify-end flex-1">
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={stats.contractsByStatusPercentage} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="value" fontSize={12} tickLine={false} axisLine={false} unit="%" />
                    <Tooltip content={<CustomTooltip />} cursor={false} />
                    <Bar dataKey="value" name="кількість" radius={[4, 4, 0, 0]} className="outline-none">
                        <LabelList content={renderPercentageLabel} />
                        {stats.contractsByStatusPercentage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[entry.originalStatus as keyof typeof CHART_COLORS]} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="flex flex-col">
                <CardHeader>
                <CardTitle className="text-base font-medium">Залучення підрозділів</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                    <Pie
                        data={stats.subdivisionUsage}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={isMobile ? 80 : 100}
                        fill="#8884d8"
                        dataKey="value"
                        className="outline-none"
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, value, index }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 15;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        const name = stats.subdivisionUsage[index].name;

                        return (
                            <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
                            {`${name} (${value})`}
                            </text>
                        );
                        }}
                    >
                        {stats.subdivisionUsage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={SUBDIVISION_COLORS[entry.name as keyof typeof SUBDIVISION_COLORS]} className="outline-none" />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="text-base font-medium">Розподіл ТО (План/Факт)</CardTitle>
                <Tabs value={workloadChartView} onValueChange={(value) => setWorkloadChartView(value as any)} className="w-full pt-2">
                    <TabsList className="grid w-full grid-cols-3 h-8">
                        <TabsTrigger value="comparison" className="text-xs h-6">Порівняння</TabsTrigger>
                        <TabsTrigger value="plan" className="text-xs h-6">План</TabsTrigger>
                        <TabsTrigger value="fact" className="text-xs h-6">Факт</TabsTrigger>
                    </TabsList>
                </Tabs>
            </CardHeader>
            <CardContent className="flex flex-col lg:flex-row items-center justify-center gap-4">
                <div className="relative w-full lg:w-2/3 h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip content={<CustomTooltip />} />
                            {(workloadChartView === 'fact' || workloadChartView === 'comparison') && (
                                <Pie
                                    data={engineerWorkloadChartData}
                                    dataKey="fact"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={isMobile ? 80 : 100}
                                    innerRadius={isMobile ? 60 : 70}
                                    className="outline-none"
                                    strokeWidth={2}
                                >
                                    {engineerWorkloadChartData.map((entry) => (
                                        <Cell key={`fact-${entry.id}`} fill={entry.color} stroke={entry.color}/>
                                    ))}
                                </Pie>
                            )}
                            {(workloadChartView === 'plan' || workloadChartView === 'comparison') && (
                                <Pie
                                    data={engineerWorkloadChartData}
                                    dataKey="plan"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={isMobile ? 85 : 105}
                                    outerRadius={isMobile ? 95 : 130}
                                    className="outline-none"
                                    strokeWidth={2}
                                >
                                {engineerWorkloadChartData.map((entry) => (
                                    <Cell key={`plan-${entry.id}`} fill={entry.color} stroke={entry.color} opacity={0.4}/>
                                ))}
                                </Pie>
                            )}
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    {workloadChartView === 'comparison' && (
                        <>
                            <span className="fill-foreground text-lg font-bold">{totalActualTasks} факт</span>
                            <span className="fill-muted-foreground text-sm">{totalPlannedTasks} план</span>
                        </>
                    )}
                    {workloadChartView === 'fact' && (
                        <span className="fill-foreground text-2xl font-bold">{totalActualTasks}</span>
                    )}
                    {workloadChartView === 'plan' && (
                            <span className="fill-foreground text-2xl font-bold">{totalPlannedTasks}</span>
                    )}
                    </div>
                </div>

                <div className="flex w-auto flex-col items-start justify-center space-y-1 text-xs lg:w-1/3 lg:pl-4">
                    {engineerWorkloadChartData.map(entry => {
                        let details = '';
                        if (workloadChartView === 'comparison') {
                            details = `(${entry.plan}/${entry.fact})`;
                        } else if (workloadChartView === 'plan') {
                            details = `(${entry.plan})`;
                        } else {
                            details = `(${entry.fact})`;
                        }
                        return (
                            <div key={entry.id} className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: entry.color}}></div>
                                <span className="text-foreground truncate">{entry.name} {details}</span>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
        
        <Card className="w-full">
            <CardHeader>
            <CardTitle className="text-base font-medium">Динаміка проведення ТО</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.maintenanceByMonth} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconSize={10} />
                    <Line type="monotone" dataKey="кількість" name="Кількість ТО" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} activeDot={{ r: 6, className: 'outline-none' }} />
                </LineChart>
            </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
