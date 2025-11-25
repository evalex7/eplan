
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Users, Palette, Database, LifeBuoy, Info, BookOpen, ChevronRight, Briefcase, Bell, LayoutGrid, RefreshCw, Code, Text, EyeOff, Maximize, Sun, Moon, Laptop, Check, CalendarCheck2, CalendarX2, CalendarRange, ChevronLeft, Mail, Loader2, LogOut, Pencil } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from 'next-themes';
import ImportExportDialog from './import-export-dialog';
import { useFirebase, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ServiceContract, ServiceEngineer, EquipmentModel, MaintenanceViewMode, UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { defaultSettings, useDisplaySettings } from '@/hooks/display-settings-context';
import HelpDialog from './help-dialog';
import { initialEquipmentModels } from '@/lib/equipment-models';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import FontSizeDialog from './font-size-dialog';
import { Avatar, AvatarFallback } from './ui/avatar';
import EngineersKanban from './engineers-kanban';
import EquipmentModelsDirectory from './equipment-models-directory';
import { signOut, updateProfile } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import EditFieldDialog from './dialogs/edit-field-dialog';
import { Skeleton } from './ui/skeleton';


const LOCAL_STORAGE_KEY_EQUIPMENT = 'equipmentModels';

const SettingItem = React.forwardRef<HTMLDivElement, { icon: React.ReactNode, title: string, children?: React.ReactNode, onClick?: () => void, as?: React.ElementType, [key: string]: any }>(({ icon, title, children, onClick, as: Component = 'div', ...props }, ref) => (
    <Component
        ref={ref}
        onClick={onClick}
        className={cn(
            "flex items-center p-4 h-16",
            onClick && !props.disabled && "cursor-pointer hover:bg-muted/50 transition-colors",
            props.disabled && "opacity-50 cursor-not-allowed"
        )}
        {...props}
    >
        <div className="flex items-center gap-4 flex-1">
            <div className="text-primary">{icon}</div>
            <p className="font-medium text-foreground">{title}</p>
        </div>
        {children ? children : onClick ? <ChevronRight className="h-5 w-5 text-muted-foreground" /> : null}
    </Component>
));
SettingItem.displayName = 'SettingItem';


export default function SettingsPage() {
    const [isImportExportOpen, setImportExportOpen] = useState(false);
    const [isHelpOpen, setHelpOpen] = useState(false);
    const [isFontSizeOpen, setFontSizeOpen] = useState(false);
    const [activeSubPage, setActiveSubPage] = useState<string | null>(null);
    
    const { firestore, auth } = useFirebase();
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const { toast } = useToast();
    const { settings, setSettings, isLoading: isLoadingSettings } = useDisplaySettings();
    const isAdmin = useIsAdmin();
    const [equipmentModels, setEquipmentModels] = useState<EquipmentModel[]>([]);
    const { theme, setTheme, resolvedTheme } = useTheme();
    const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '2.8.9';

    // State for editing dialog
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [editingField, setEditingField] = useState<{ field: string, value: string | null, label: string } | null>(null);
    

    useEffect(() => {
        try {
            const storedModels = localStorage.getItem(LOCAL_STORAGE_KEY_EQUIPMENT);
            if (storedModels) {
                setEquipmentModels(JSON.parse(storedModels));
            } else {
                setEquipmentModels(initialEquipmentModels);
            }
        } catch (error) {
            console.error("Failed to load equipment models from localStorage", error);
            setEquipmentModels(initialEquipmentModels);
        }
    }, []);


    const contractsRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceContracts') : null, [firestore]);
    const { data: allTasks } = useCollection<ServiceContract>(contractsRef);

    const engineersRef = useMemoFirebase(() => firestore ? collection(firestore, 'serviceEngineers') : null, [firestore]);
    const { data: engineers } = useCollection<ServiceEngineer>(engineersRef);

    const handleImport = async (importedData: { contracts?: ServiceContract[], engineers?: ServiceEngineer[], equipmentModels?: EquipmentModel[] }) => {
        if (!firestore) return;

        const { contracts: importedContracts, engineers: importedEngineers, equipmentModels: importedEquipmentModels } = importedData;
        let contractsAdded = 0;
        let engineersAdded = 0;
        let modelsAdded = 0;
        
        const batch = writeBatch(firestore);

        if (importedEquipmentModels) {
            try {
                const existingModelNames = new Set(equipmentModels.map(m => m.name.toLowerCase()));
                const modelsToImport = importedEquipmentModels.filter(m => !existingModelNames.has(m.name.toLowerCase()));

                if (modelsToImport.length > 0) {
                    const newModels = [...equipmentModels, ...modelsToImport.map(m => ({...m, id: `model-${Date.now()}-${Math.random()}`}))];
                    setEquipmentModels(newModels);
                    localStorage.setItem(LOCAL_STORAGE_KEY_EQUIPMENT, JSON.stringify(newModels));
                    modelsAdded = modelsToImport.length;
                }
            } catch(e) {
                console.error("Error importing equipment models", e);
                 toast({
                    variant: 'destructive',
                    title: 'Помилка імпорту довідника',
                });
            }
        }

        if (importedContracts && allTasks) {
            const existingContractNumbers = new Set(allTasks.map(c => c.contractNumber));
            const contractsToImport = importedContracts.filter(c => !existingContractNumbers.has(c.contractNumber));
            
            contractsToImport.forEach(contract => {
                const docRef = doc(collection(firestore, 'serviceContracts'));
                const sanitizedContract = { ...contract, id: undefined, contractStartDate: contract.contractStartDate ? new Date(contract.contractStartDate) : null, contractEndDate: contract.contractEndDate ? new Date(contract.contractEndDate) : null, scheduledDate: contract.scheduledDate ? new Date(contract.scheduledDate) : null, maintenancePeriods: contract.maintenancePeriods.map(p => ({ ...p, startDate: p.startDate ? new Date(p.startDate) : null, endDate: p.endDate ? new Date(p.endDate) : null })) };
                delete sanitizedContract.id;
                batch.set(docRef, sanitizedContract);
            });
            contractsAdded = contractsToImport.length;
        }

        if (importedEngineers && engineers) {
            const existingEngineerEmails = new Set(engineers.map(e => e.email));
            const engineersToImport = importedEngineers.filter(e => !existingEngineerEmails.has(e.email));
            
            engineersToImport.forEach(engineer => {
                const docRef = doc(collection(firestore, 'serviceEngineers'));
                const sanitizedEngineer = { ...engineer, id: undefined };
                delete sanitizedEngineer.id;
                batch.set(docRef, sanitizedEngineer);
            });
            engineersAdded = engineersToImport.length;
        }

        if (contractsAdded > 0 || engineersAdded > 0) {
            await batch.commit();
        }

        if (contractsAdded > 0 || engineersAdded > 0 || modelsAdded > 0) {
            toast({ title: 'Імпорт успішний', description: `Додано ${contractsAdded} договорів, ${engineersAdded} інженерів, та ${modelsAdded} моделей до довідника.`, });
        } else {
            toast({ title: 'Імпорт не потрібен', description: 'Всі дані з файлу вже існують у базі даних та довіднику.', });
        }
    };
    
    const handleSupportClick = () => {
        window.location.href = "mailto:support@example.com?subject=Підтримка AirControl";
    };
    
    const handleLogout = async () => {
      if (auth) {
        await signOut(auth);
        router.push("/login");
      }
    };

    const handleOpenEditDialog = (field: 'displayName', label: string, value: string | null | undefined) => {
        setEditingField({ field, label, value: value ?? '' });
        setEditDialogOpen(true);
    };

    const handleSaveField = async (newValue: string | Date | null) => {
        if (!auth?.currentUser || !editingField) return;

        const valueToSave = typeof newValue === 'string' ? newValue.trim() : '';

        if (editingField.field === 'displayName') {
            try {
                await updateProfile(auth.currentUser, { displayName: valueToSave });
                const userDocRef = doc(firestore, 'users', auth.currentUser.uid);
                updateDocumentNonBlocking(userDocRef, { displayName: valueToSave });

                toast({
                    title: `Ім'я оновлено.`,
                });
            } catch (error) {
                console.error("Error updating profile:", error);
                toast({
                    variant: "destructive",
                    title: "Помилка",
                    description: "Не вдалося оновити ім'я."
                });
            }
        }
        
        setEditDialogOpen(false);
    };
    
    const getInitials = (name: string) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };
    
    
    const renderSubPage = () => {
        switch (activeSubPage) {
            case 'directory':
                return <EquipmentModelsDirectory />;
            case 'engineers':
                return <EngineersKanban />;
            default:
                return null;
        }
    };

    if (activeSubPage) {
        return (
            <div className="space-y-4">
                <Button variant="ghost" onClick={() => setActiveSubPage(null)} className="mb-4">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Назад до налаштувань
                </Button>
                {renderSubPage()}
            </div>
        );
    }
    
    const displayName = user?.displayName || user?.email || 'Користувач';

    return (
        <>
            <div className="space-y-4 pb-20">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-4 rounded-lg shadow-lg">
                    <div className="flex items-start gap-4">
                        <Avatar className="h-16 w-16 border-2 border-white/50">
                             <AvatarFallback className="bg-white/20 text-xl font-bold">{getInitials(displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                           {isUserLoading ? (
                                <>
                                    <Skeleton className="h-6 w-32 bg-white/30" />
                                    <Skeleton className="h-5 w-48 bg-white/20" />
                                </>
                           ) : (
                            <>
                                <div 
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => handleOpenEditDialog('displayName', "Ім'я", user?.displayName)}
                                >
                                    <p className="font-bold text-lg hover:underline">
                                        {displayName}
                                    </p>
                                    <Pencil className="h-4 w-4 opacity-60" />
                                </div>
                                <p className="text-sm opacity-80">{user?.email}</p>
                            </>
                           )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white self-center" onClick={handleLogout}>
                          <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground px-4 pt-4">ЗАГАЛЬНІ</h3>
                <div className="bg-card rounded-lg border divide-y">
                   <SettingItem icon={<Palette className="h-5 w-5" />} title="Зовнішній вигляд">
                         <Select value={theme} onValueChange={setTheme}>
                            <SelectTrigger className="w-auto px-3 border-none shadow-none focus:ring-0">
                                <SelectValue asChild>
                                  <div className="flex items-center gap-2">
                                      {resolvedTheme === 'dark' ? <Moon className="h-4 w-4 text-muted-foreground" /> : <Sun className="h-4 w-4 text-muted-foreground" />}
                                  </div>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light"><div className="flex items-center gap-2"><Sun className="h-4 w-4" /><span>Світла</span></div></SelectItem>
                                <SelectItem value="dark"><div className="flex items-center gap-2"><Moon className="h-4 w-4" /><span>Темна</span></div></SelectItem>
                                <SelectItem value="system"><div className="flex items-center gap-2"><Laptop className="h-4 w-4" /><span>Системна</span></div></SelectItem>
                            </SelectContent>
                        </Select>
                   </SettingItem>
                   <SettingItem icon={<Text className="h-5 w-5" />} title="Масштаб тексту" onClick={() => setFontSizeOpen(true)}>
                         <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-8 text-center">{settings.baseFontSize}px</span>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                   </SettingItem>
                   <SettingItem as="label" icon={<Maximize className="h-5 w-5" />} title="Широкий режим">
                       <Switch id="wide-mode" checked={settings.isWideMode} onCheckedChange={(checked) => setSettings({ isWideMode: checked })} />
                   </SettingItem>
                   <SettingItem as="label" icon={<EyeOff className="h-5 w-5" />} title="Авто-приховування панелей">
                       <Switch id="auto-hide-panels" checked={settings.autoHidePanels} onCheckedChange={(checked) => setSettings({ autoHidePanels: checked })} />
                   </SettingItem>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground px-4 pt-4">ЗАВДАННЯ</h3>
                <div className="bg-card rounded-lg border divide-y">
                    <SettingItem icon={<LayoutGrid className="h-5 w-5" />} title="Вигляд списку ТО">
                         <Select value={settings.maintenanceViewMode} onValueChange={(value: MaintenanceViewMode) => setSettings({ maintenanceViewMode: value })}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="list">Список</SelectItem><SelectItem value="kanban-engineer">Канбан (інженери)</SelectItem><SelectItem value="kanban-subdivision">Канбан (підрозділи)</SelectItem></SelectContent>
                        </Select>
                    </SettingItem>
                    <SettingItem as="label" icon={<CalendarCheck2 className="h-5 w-5" />} title="Показувати виконані ТО">
                       <Switch id="show-completed-tasks" checked={settings.showCompletedTasks} onCheckedChange={(checked) => setSettings({ showCompletedTasks: checked })}/>
                    </SettingItem>
                </div>

                <h3 className="text-sm font-semibold text-muted-foreground px-4 pt-4">СПОВІЩЕННЯ</h3>
                <div className="bg-card rounded-lg border divide-y">
                    <CardHeader className="h-auto">
                        <CardTitle className="text-base">Відображення в інтерфейсі</CardTitle>
                    </CardHeader>
                    <SettingItem as="label" icon={<CalendarX2 className="h-5 w-5" />} title="Показувати прострочені">
                        <Switch id="show-overdue" checked={settings.showOverdue} onCheckedChange={(checked) => setSettings({ showOverdue: checked })}/>
                    </SettingItem>
                    <SettingItem as="label" icon={<CalendarCheck2 className="h-5 w-5" />} title="Показувати майбутні">
                        <Switch id="show-upcoming" checked={settings.showUpcoming} onCheckedChange={(checked) => setSettings({ showUpcoming: checked })}/>
                    </SettingItem>
                    <SettingItem icon={<CalendarRange className="h-5 w-5" />} title="Горизонт планування">
                         <Select value={String(settings.upcomingDays)} onValueChange={(value) => setSettings({ upcomingDays: value === "endOfMonth" ? "endOfMonth" : Number(value) })}>
                            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="endOfMonth">До кінця місяця</SelectItem><SelectItem value="7">7 днів</SelectItem><SelectItem value="14">14 днів</SelectItem><SelectItem value="30">30 днів</SelectItem><SelectItem value="45">45 днів</SelectItem><SelectItem value="60">60 днів</SelectItem><SelectItem value="90">90 днів</SelectItem></SelectContent>
                        </Select>
                    </SettingItem>
                </div>
                 
                
                 <h3 className="text-sm font-semibold text-muted-foreground px-4 pt-4">ДАНІ ТА ПІДТРИМКА</h3>
                 <div className="bg-card rounded-lg border divide-y">
                   <SettingItem icon={<BookOpen className="h-5 w-5" />} title="Довідник обладнання" onClick={() => setActiveSubPage('directory')} />
                   <SettingItem icon={<Users className="h-5 w-5" />} title="Виконавці" onClick={() => setActiveSubPage('engineers')} />
                   <SettingItem icon={<Database className="h-5 w-5" />} title="Керування даними" onClick={() => isAdmin && setImportExportOpen(true)} disabled={!isAdmin} />
                   <SettingItem icon={<BookOpen className="h-5 w-5" />} title="Довідка" onClick={() => setHelpOpen(true)} />
                   <SettingItem icon={<LifeBuoy className="h-5 w-5" />} title="Підтримка" onClick={handleSupportClick} />
                   <SettingItem icon={<RefreshCw className="h-5 w-5" />} title="Перевірка оновлення" onClick={() => toast({ title: 'Остання версія', description: 'У вас встановлено останню версію застосунку.'})} />
                   <SettingItem icon={<Info className="h-5 w-5" />} title={`Версія: ${appVersion} (від 21.11.2025)`} />
                   <SettingItem icon={<Code className="h-5 w-5" />} title="Виробник: evalex" />
                </div>
            </div>
            
            {isAdmin && (
              <ImportExportDialog
                  isOpen={isImportExportOpen}
                  setIsOpen={setImportExportOpen}
                  contracts={allTasks || []}
                  engineers={engineers || []}
                  equipmentModels={equipmentModels || []}
                  onImport={handleImport}
              />
            )}
            <HelpDialog isOpen={isHelpOpen} setIsOpen={setHelpOpen} />
            <FontSizeDialog 
                isOpen={isFontSizeOpen}
                setIsOpen={setFontSizeOpen}
                currentSize={settings.baseFontSize}
                onSizeChange={(size) => setSettings({ baseFontSize: size })}
            />
            {editingField && (
                <EditFieldDialog
                    open={isEditDialogOpen}
                    onOpenChange={setEditDialogOpen}
                    field={editingField.label}
                    value={editingField.value}
                    onSave={handleSaveField}
                />
            )}
        </>
    );
}
