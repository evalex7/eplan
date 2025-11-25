

"use client";

import { useMemo, useState, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { ServiceContract, ServiceEngineer, MaintenancePeriod, MaintenancePeriodStatus, ServiceReport, EquipmentModel, Equipment } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { Wrench, FileText, Plus, Pencil, Search, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { uk } from 'date-fns/locale';
import { Button } from './ui/button';
import AddMaintenanceReportDialog from './add-maintenance-report-dialog';
import { Input } from './ui/input';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';

const safeGetDate = (date: any): Date | null => {
    if (!date) return null;
    if (typeof date.toDate === 'function') { // Firestore Timestamp
        return date.toDate();
    }
    const d = new Date(date);
    if (!isNaN(d.getTime())) { // String or Date object
        return d;
    }
    return null;
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


export default function EquipmentPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const isAdmin = useIsAdmin();

    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [contractForReport, setContractForReport] = useState<ServiceContract | null>(null);
    const [reportToEdit, setReportToEdit] = useState<ServiceReport | null>(null);
    
    const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
    const { data: contracts, isLoading: isLoadingContracts } = useCollection<ServiceContract>(contractsRef);
    
    const engineersRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceEngineers') : null, [firestore]);
    const { data: engineers, isLoading: isLoadingEngineers } = useCollection<ServiceEngineer>(engineersRef);
    
    const equipmentModelsRef = useMemoFirebase(() => firestore ? collection(firestore, 'equipmentModels') : null, [firestore]);
    const { data: equipmentModels, isLoading: isLoadingEquipmentModels } = useCollection<EquipmentModel>(equipmentModelsRef);

    const groupedObjects = useMemo(() => {
        if (!contracts) return [];
        const lowercasedQuery = searchQuery.toLowerCase();

        const filteredContracts = contracts.filter(contract => {
            if (contract.archived) return false;
            if (!searchQuery) return true;
            
            const equipmentDetailsText = (contract.equipment || []).map(e => `${e.name} ${e.model} ${e.serialNumber}`).join(' ');
            const reportDetailsText = (contract.equipment || []).flatMap(e => e.reports || []).flatMap(r => [r.workDescription, ...(r.partsUsed || []).map(part => part.name)]).join(' ');

            const searchableFields = [
                contract.objectName,
                contract.address,
                contract.counterparty,
                contract.contractNumber,
                equipmentDetailsText,
                reportDetailsText,
            ];

            return searchableFields.some(field => field?.toLowerCase().includes(lowercasedQuery));
        });
        
        const grouped = filteredContracts.reduce((acc, contract) => {
            const key = contract.objectName;
            if (!acc[key]) {
                acc[key] = {
                    objectName: contract.objectName,
                    contracts: [],
                };
            }
            acc[key].contracts.push(contract);
            return acc;
        }, {} as Record<string, { objectName: string; contracts: ServiceContract[] }>);
        
        return Object.values(grouped).sort((a, b) => a.objectName.localeCompare(b.objectName));

    }, [contracts, searchQuery]);

    const handleOpenReportDialog = (equipment: Equipment, contract: ServiceContract, report: ServiceReport | null = null) => {
        setSelectedEquipment(equipment);
        setContractForReport(contract);
        setReportToEdit(report);
    };

    const handleSaveReport = (reportData: Omit<ServiceReport, 'id'>, reportId?: string) => {
        if (!firestore || !selectedEquipment || !contractForReport) return;

        let updatedReports: ServiceReport[];

        if (reportId) { // Editing existing report
            updatedReports = (selectedEquipment.reports || []).map(r => 
                r.id === reportId ? { ...r, ...reportData, id: reportId } as ServiceReport : r
            );
        } else { // Adding new report
            const newReport: ServiceReport = { ...reportData, id: `report-${Date.now()}` };
            updatedReports = [...(selectedEquipment.reports || []), newReport];
        }
        
        const updatedEquipmentList = contractForReport.equipment.map(e => 
            e.id === selectedEquipment.id ? { ...e, reports: updatedReports } : e
        );

        const contractDocRef = doc(firestore, 'serviceContracts', contractForReport.id);
        updateDocumentNonBlocking(contractDocRef, { equipment: updatedEquipmentList });

        toast({
            title: reportId ? 'Звіт оновлено' : 'Звіт додано',
            description: `Звіт для "${selectedEquipment.name}" було збережено.`,
        });

        // Close dialog
        setSelectedEquipment(null);
        setContractForReport(null);
        setReportToEdit(null);
    };


    const isLoading = isLoadingContracts || isLoadingEngineers || isLoadingEquipmentModels;

    const findEngineerName = (id: string) => engineers?.find(e => e.id === id)?.name || 'Невідомий';

    return (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                    placeholder="Пошук за об'єктом, обладнанням, звітами..."
                    className="pl-10 w-full"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {isLoading && (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            )}
            {!isLoading && groupedObjects.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                    <Wrench suppressHydrationWarning className="mx-auto h-12 w-12" />
                     {searchQuery ? (
                        <h3 className="mt-4 text-lg font-semibold">Нічого не знайдено</h3>
                    ) : (
                        <>
                            <h3 className="mt-4 text-lg font-semibold">Немає активних договорів</h3>
                            <p className="mt-2 text-sm">Щоб додати звіт, спершу створіть договір та додайте обладнання.</p>
                        </>
                    )}
                </div>
            )}
            {!isLoading && groupedObjects.length > 0 && (
                 <Accordion type="multiple" className="w-full space-y-3">
                    {groupedObjects.map(group => {
                        return (
                            <AccordionItem value={group.objectName} key={group.objectName} className="border-none">
                                <Card>
                                <AccordionTrigger className="font-bold hover:no-underline text-base text-left p-4 data-[state=open]:border-b">
                                    <div className="grid grid-cols-[auto,1fr] items-start gap-2 w-full">
                                        <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                        <span className="text-left">{group.objectName}</span>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="p-0">
                                     <div className="space-y-4 p-4">
                                        {group.contracts.map(contract => (
                                            <div key={contract.id} className="space-y-3">
                                                <h4 className="font-semibold text-md text-muted-foreground border-b pb-2">Договір № {contract.contractNumber}</h4>
                                                {(contract.equipment || []).length === 0 ? (
                                                  <p className="text-sm text-muted-foreground text-center py-4">Немає обладнання за цим договором.</p>
                                                ) : (
                                                  (contract.equipment || []).map(equip => (
                                                    <Card key={equip.id} className="shadow-sm">
                                                      <CardContent className="p-3">
                                                        <div className="flex justify-between items-start gap-2">
                                                          <div className="flex-1 space-y-2">
                                                            <div className="flex justify-between items-start">
                                                                <div className="font-semibold flex items-center gap-2">
                                                                  {equip.name}
                                                                  {equip.groupNumber && <Badge variant="outline">{`№${equip.groupNumber}`}</Badge>}
                                                                </div>
                                                                <p className="text-xs text-muted-foreground flex-shrink-0 pl-2">{equip.serialNumber || 'б/н'}</p>
                                                            </div>
                                                            <p className="text-sm text-muted-foreground truncate">{equip.model}</p>
                                                            
                                                            <div className="space-y-2 pt-2">
                                                                {(equip.reports || []).sort((a,b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime()).map(report => (
                                                                    <div key={report.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                                                        <div>
                                                                            <span className="font-medium">{format(safeGetDate(report.reportDate)!, 'dd.MM.yyyy')}</span> - <span className="text-muted-foreground">{findEngineerName(report.engineerId)}</span>
                                                                        </div>
                                                                        {isAdmin && (
                                                                             <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpenReportDialog(equip, contract, report)}>
                                                                                <Pencil className="h-4 w-4" />
                                                                             </Button>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                          </div>
                                                        </div>
                                                         {isAdmin && (
                                                            <Button size="sm" onClick={() => handleOpenReportDialog(equip, contract)} className="w-full mt-3">
                                                                <Plus className="mr-2 h-4 w-4" />
                                                                Додати звіт
                                                            </Button>
                                                        )}
                                                      </CardContent>
                                                    </Card>
                                                  ))
                                                )}
                                            </div>
                                        ))}
                                     </div>
                                </AccordionContent>
                                </Card>
                            </AccordionItem>
                        );
                    })}
                </Accordion>
            )}

            {isAdmin && selectedEquipment && contractForReport && (
                <AddMaintenanceReportDialog
                    isOpen={!!selectedEquipment}
                    setIsOpen={() => { setSelectedEquipment(null); setContractForReport(null); setReportToEdit(null); }}
                    onSave={handleSaveReport}
                    equipment={selectedEquipment}
                    engineers={engineers || []}
                    reportToEdit={reportToEdit}
                    equipmentModels={equipmentModels || []}
                />
            )}
        </div>
    );
}
