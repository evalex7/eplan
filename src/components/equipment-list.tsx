"use client";

import { useState } from 'react';
import type { Equipment, ServiceReport, ServiceEngineer, ServiceContract } from '@/lib/types';
import { Card, CardContent } from './ui/card';
import { Wrench, Plus, FileText, Badge } from 'lucide-react';
import { Button } from './ui/button';
import AddMaintenanceReportDialog from './add-maintenance-report-dialog';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { initialEquipmentModels } from '@/lib/equipment-models';

export default function EquipmentList({ 
    contractId,
    equipment, 
    engineers 
}: { 
    contractId: string,
    equipment: Equipment[], 
    engineers: ServiceEngineer[]
}) {
    const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
    const [reportToEdit, setReportToEdit] = useState<ServiceReport | null>(null);
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const isAdmin = useIsAdmin();

    const handleOpenReportDialog = (equip: Equipment, report: ServiceReport | null = null) => {
        setSelectedEquipment(equip);
        setReportToEdit(report);
    };

    const handleSaveReport = (reportData: Omit<ServiceReport, 'id'>, reportId?: string) => {
        if (!firestore || !selectedEquipment) return;

        let updatedReports: ServiceReport[];
        if (reportId) { // Editing existing report
            updatedReports = (selectedEquipment.reports || []).map(r => 
                r.id === reportId ? { ...r, ...reportData, id: reportId } as ServiceReport : r
            );
        } else { // Adding new report
            const newReport: ServiceReport = { ...reportData, id: `report-${Date.now()}` };
            updatedReports = [...(selectedEquipment.reports || []), newReport];
        }

        const updatedEquipmentList = equipment.map(e => 
            e.id === selectedEquipment.id ? { ...e, reports: updatedReports } : e
        );

        const contractDocRef = doc(firestore, 'serviceContracts', contractId);
        updateDocumentNonBlocking(contractDocRef, { equipment: updatedEquipmentList });

        toast({
            title: reportId ? 'Звіт оновлено' : 'Звіт додано',
            description: `Звіт для "${selectedEquipment.name}" було збережено.`,
        });

        setSelectedEquipment(null);
        setReportToEdit(null);
    };
    
    if (!equipment || equipment.length === 0) {
        return (
            <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg">
                <Wrench suppressHydrationWarning className="mx-auto h-8 w-8" />
                <p className="mt-2 text-sm">Для цього договору ще не додано жодного обладнання.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {equipment.map((item) => (
                <Card key={item.id} className="shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h4 className="font-semibold">{item.name}</h4>
                                <p className="text-sm text-muted-foreground">Модель: {item.model}</p>
                                <p className="text-xs text-muted-foreground">S/N: {item.serialNumber}</p>
                                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                                    <FileText suppressHydrationWarning className="h-4 w-4" />
                                    <span>Звіти: {item.reports?.length || 0}</span>
                                </div>
                            </div>
                            {isAdmin && (
                              <Button size="sm" onClick={() => handleOpenReportDialog(item)}>
                                  <Plus suppressHydrationWarning className="mr-2 h-4 w-4" />
                                  Додати звіт
                              </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}

            {isAdmin && selectedEquipment && (
                <AddMaintenanceReportDialog
                    isOpen={!!selectedEquipment}
                    setIsOpen={() => {
                        setSelectedEquipment(null);
                        setReportToEdit(null);
                    }}
                    onSave={handleSaveReport}
                    equipment={selectedEquipment}
                    engineers={engineers}
                    reportToEdit={reportToEdit}
                    equipmentModels={initialEquipmentModels}
                />
            )}
        </div>
    );
}
