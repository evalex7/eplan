

"use client";

import { useRef, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ServiceContract, ServiceEngineer, EquipmentModel } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface ImportExportDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  contracts: ServiceContract[];
  engineers: ServiceEngineer[];
  equipmentModels: EquipmentModel[];
  onImport: (data: { contracts?: ServiceContract[], engineers?: ServiceEngineer[], equipmentModels?: EquipmentModel[] }) => Promise<void>;
}

export default function ImportExportDialog({
  isOpen,
  setIsOpen,
  contracts,
  engineers,
  equipmentModels,
  onImport,
}: ImportExportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('contracts');
  
  const handleExportJson = async (exportType: 'contracts' | 'engineers' | 'equipmentModels' | 'all') => {
    let dataToExport: any;
    let fileName = `aircontrol_export_${new Date().toISOString().slice(0, 10)}.json`;
    let mimeType = 'application/json';

    switch (exportType) {
      case 'contracts':
        if (contracts.length === 0) {
          toast({ variant: 'destructive', title: 'Немає даних для експорту'});
          return;
        }
        dataToExport = contracts;
        fileName = `aircontrol_contracts_${new Date().toISOString().slice(0, 10)}.json`;
        break;
      case 'engineers':
        if (engineers.length === 0) {
          toast({ variant: 'destructive', title: 'Немає даних для експорту'});
          return;
        }
        dataToExport = engineers;
        fileName = `aircontrol_engineers_${new Date().toISOString().slice(0, 10)}.json`;
        break;
      case 'equipmentModels':
        if (equipmentModels.length === 0) {
          toast({ variant: 'destructive', title: 'Немає даних для експорту'});
          return;
        }
        dataToExport = equipmentModels;
        fileName = `aircontrol_directory_${new Date().toISOString().slice(0, 10)}.json`;
        break;
      case 'all':
        if (contracts.length === 0 && engineers.length === 0 && equipmentModels.length === 0) {
            toast({ variant: 'destructive', title: 'Немає даних для експорту'});
            return;
        }
        dataToExport = { contracts, engineers, equipmentModels };
        fileName = `aircontrol_backup_${new Date().toISOString().slice(0, 10)}.json`;
        break;
    }

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: mimeType });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [new File([dataBlob], fileName, { type: mimeType })] })) {
        try {
            await navigator.share({
                title: 'Експорт даних',
                text: `Файл даних: ${fileName}`,
                files: [new File([dataBlob], fileName, { type: mimeType })],
            });
            toast({
                title: 'Експорт ініційовано',
                description: `Оберіть, куди зберегти файл ${fileName}.`,
            });
        } catch (error) {
            console.log('Share API was cancelled or failed', error);
            toast({
                variant: 'default',
                title: 'Експорт скасовано',
            });
        }
    } else {
        const dataUri = URL.createObjectURL(dataBlob);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
        URL.revokeObjectURL(dataUri);
        toast({
          title: 'Експорт JSON успішний',
          description: `Дані було збережено у файл ${fileName}.`,
        });
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('Не вдалося прочитати файл.');
        }
        const parsedData = JSON.parse(text);
        
        let dataToImport: { contracts?: ServiceContract[], engineers?: ServiceEngineer[], equipmentModels?: EquipmentModel[] } = {};

        if (Array.isArray(parsedData)) {
            if (parsedData.length > 0) {
                if ('contractNumber' in parsedData[0]) {
                    dataToImport.contracts = parsedData;
                } else if ('email' in parsedData[0] && 'name' in parsedData[0]) {
                    dataToImport.engineers = parsedData;
                } else if ('category' in parsedData[0] && 'name' in parsedData[0]) {
                    dataToImport.equipmentModels = parsedData;
                }
            }
        } else if (typeof parsedData === 'object' && parsedData !== null) {
            if ('contracts' in parsedData || 'engineers' in parsedData || 'equipmentModels' in parsedData) {
                dataToImport = parsedData;
            }
        }

        if (!dataToImport.contracts && !dataToImport.engineers && !dataToImport.equipmentModels) {
             throw new Error('Файл має невірний формат або порожній.');
        }

        setIsImporting(true);
        await onImport(dataToImport);
        setIsOpen(false);

      } catch (error) {
        console.error('Помилка імпорту:', error);
        toast({
          variant: 'destructive',
          title: 'Помилка імпорту',
          description: error instanceof Error ? error.message : 'Не вдалося обробити файл. Перевірте його формат.',
        });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Експорт та Імпорт Даних</DialogTitle>
          <DialogDescription>
            Збережіть резервну копію або завантажте дані у форматі JSON.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="contracts">Договори</TabsTrigger>
                <TabsTrigger value="engineers">Інженери</TabsTrigger>
                <TabsTrigger value="directory">Довідник</TabsTrigger>
                <TabsTrigger value="all">Все разом</TabsTrigger>
            </TabsList>
            <div className="py-4 space-y-4 min-h-[180px]">
                <TabsContent value="contracts" className="m-0">
                    <div className="flex flex-col space-y-4">
                        <Button onClick={() => handleExportJson('contracts')} className="w-full" variant="outline">
                            <Download suppressHydrationWarning className="mr-2 h-4 w-4" />
                            Експорт договорів (JSON)
                        </Button>
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Експорт договорів</AlertTitle>
                            <AlertDescription>
                                Ця дія створить JSON-файл з усіма договорами, що є в системі.
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>
                <TabsContent value="engineers" className="m-0">
                     <div className="flex flex-col space-y-4">
                        <Button onClick={() => handleExportJson('engineers')} className="w-full" variant="outline">
                            <Download suppressHydrationWarning className="mr-2 h-4 w-4" />
                            Експорт інженерів (JSON)
                        </Button>
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Експорт інженерів</AlertTitle>
                            <AlertDescription>
                               Ця дія створить JSON-файл з усіма інженерами, що є в системі.
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>
                <TabsContent value="directory" className="m-0">
                     <div className="flex flex-col space-y-4">
                        <Button onClick={() => handleExportJson('equipmentModels')} className="w-full" variant="outline">
                            <Download suppressHydrationWarning className="mr-2 h-4 w-4" />
                            Експорт довідника (JSON)
                        </Button>
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Експорт довідника</AlertTitle>
                            <AlertDescription>
                               Ця дія створить JSON-файл з довідником моделей обладнання.
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>
                <TabsContent value="all" className="m-0">
                    <div className="flex flex-col space-y-4">
                        <Button onClick={() => handleExportJson('all')} className="w-full" variant="outline">
                            <Download suppressHydrationWarning className="mr-2 h-4 w-4" />
                            Експорт всіх даних (JSON)
                        </Button>
                        <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Резервна копія</AlertTitle>
                            <AlertDescription>
                                Ця дія створить єдиний JSON-файл з договорами, інженерами та довідником.
                            </AlertDescription>
                        </Alert>
                    </div>
                </TabsContent>
            </div>
        </Tabs>

        <div className="border-t pt-4 space-y-4">
            <Button onClick={handleImportClick} className="w-full" disabled={isImporting}>
                {isImporting ? (
                    <Loader2 suppressHydrationWarning className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Upload suppressHydrationWarning className="mr-2 h-4 w-4" />
                )}
                Імпортувати дані з JSON
            </Button>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json,application/json"
                className="hidden"
            />

            <Alert variant="destructive" className="bg-yellow-50 border-yellow-300 text-yellow-800">
                <AlertTriangle suppressHydrationWarning className="h-4 w-4 !text-yellow-600" />
                <AlertTitle className="font-semibold">Увага щодо імпорту!</AlertTitle>
                <AlertDescription>
                Імпорт додасть лише нові дані. Існуючі записи (за номером договору, email інженера або назвою моделі) не будуть змінені чи продубльовані.
                </AlertDescription>
            </Alert>
        </div>
        

        <DialogFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Закрити
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
