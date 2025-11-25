
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type {
  ServiceContract,
  MaintenancePeriod,
  ServiceEngineer,
  Equipment,
  TaskStatus,
  SubdivisionType,
  EquipmentModel,
} from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { format, isPast, parseISO, isValid, isSameMonth } from "date-fns";
import {
  CalendarIcon,
  PlusCircle,
  Trash2,
  Users,
  Wrench,
  Package,
  Pencil,
} from "lucide-react";
import { cn, capitalizeWords } from "@/lib/utils";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import AddEquipmentDialog from "./add-equipment-dialog";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";

function isPeriodCompleted(period: any): boolean {
  if (!period) return false;
  return period.status === 'Виконано';
}

const getEmptyPeriod = (index: number): MaintenancePeriod => ({
  id: `period-${Date.now()}-${Math.random()}`,
  name: `Період ТО №${index}`,
  startDate: undefined,
  endDate: undefined,
  subdivision: "КОНД",
  assignedEngineerIds: [],
  equipmentIds: [],
  status: "Заплановано",
});

const getInitialState = (): Omit<
  ServiceContract,
  "id" | "status" | "archived"
> => ({
  contractNumber: "",
  objectName: "",
  counterparty: "",
  address: "",
  coordinates: "",
  contactPerson: "",
  contactPhone: "",
  contractStartDate: undefined,
  contractEndDate: undefined,
  maintenancePeriods: [],
  equipment: [],
  clientObjectId: "",
  serviceType: "Щоквартальне",
  scheduledDate: new Date(),
});

const customEngineerSortOrder = [
  "Роман Романченко",
  "Олександр Адамчик",
  "Олексій Козачок",
  "Євгеній Олексієнко",
  "Віталій Лешковят",
  "Сергій Мусієнко",
  "Артем Полішевський",
  "Дмитро Лялько",
  "Ілля Олексієнко",
];

function EngineerSelector({
  period,
  engineers,
  toggleEngineerForPeriod,
}: {
  period: MaintenancePeriod;
  engineers: ServiceEngineer[];
  toggleEngineerForPeriod: (periodId: string, engineerId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!open) setSearchTerm("");
  }, [open]);

  const filteredEngineers = useMemo(() => {
    if (!searchTerm) return engineers;
    return engineers.filter((e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [engineers, searchTerm]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full justify-start">
          <Users className="mr-2 h-4 w-4" />
          {period.assignedEngineerIds.length ? `${period.assignedEngineerIds.length} обрано` : "Призначити виконавців"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="z-50 w-72 p-2" align="start">
        <div className="px-2 pb-2">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Пошук інженера..."
          />
        </div>

        <ScrollArea className="h-48">
          <ul className="space-y-1 p-1">
            {filteredEngineers.length === 0 && (
              <li className="text-sm text-muted-foreground px-2 py-3">Не знайдено.</li>
            )}
            {filteredEngineers.map((engineer) => {
              const checked = period.assignedEngineerIds.includes(engineer.id);
              return (
                <li key={engineer.id}>
                  <div
                    onClick={() => toggleEngineerForPeriod(period.id, engineer.id)}
                    onPointerDown={(e) => e.preventDefault()}
                    className="w-full text-left flex items-center gap-2 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <div onPointerDown={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleEngineerForPeriod(period.id, engineer.id)}
                      />
                    </div>
                    <span className={cn("flex-1", checked ? "font-medium" : "text-muted-foreground")}>
                      {engineer.name}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}


const PeriodEditor = ({
  period,
  index,
  formState,
  engineers,
  removePeriod,
  handlePeriodChange,
  toggleEquipmentForPeriod,
  toggleEngineerForPeriod,
}: {
  period: MaintenancePeriod;
  index: number;
  formState: Omit<ServiceContract, "id" | "status" | "archived">;
  engineers: ServiceEngineer[];
  removePeriod: (id: string) => void;
  handlePeriodChange: (id: string, field: keyof MaintenancePeriod, value: any) => void;
  toggleEquipmentForPeriod: (pid: string, eqid: string) => void;
  toggleEngineerForPeriod: (pid: string, eid: string) => void;
}) => {

  return (
    <div className="p-4 border rounded-lg bg-muted/20 relative space-y-4">
      <div className="flex justify-between items-center">
        <div className="font-semibold text-md">{`Період ТО №${index + 1}`}</div>
        <div className="absolute top-2 right-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => removePeriod(period.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
        <div className="space-y-2">
          <Label>Підрозділи</Label>
          <Select
            value={period.subdivision}
            onValueChange={(value) =>
              handlePeriodChange(
                period.id,
                "subdivision",
                value.toUpperCase() as SubdivisionType
              )
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Оберіть підрозділ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="КОНД">КОНД</SelectItem>
              <SelectItem value="ДБЖ">ДБЖ</SelectItem>
              <SelectItem value="ДГУ">ДГУ</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div />

        <div className="space-y-2">
          <Label>Дата початку <span className="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !period.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {period.startDate ? (
                  format(new Date(period.startDate), "dd.MM.yyyy")
                ) : (
                  <span>Оберіть дату</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={period.startDate ? new Date(period.startDate) : undefined}
                onSelect={(date) =>
                  handlePeriodChange(period.id, "startDate", date)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label>Дата закінчення <span className="text-destructive">*</span></Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !period.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {period.endDate ? (
                  format(new Date(period.endDate), "dd.MM.yyyy")
                ) : (
                  <span>Оберіть дату</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={period.endDate ? new Date(period.endDate) : undefined}
                onSelect={(date) => handlePeriodChange(period.id, "endDate", date)}
                month={period.startDate ? new Date(period.startDate) : undefined}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2 col-span-full">
          <Label>Обладнання для цього ТО</Label>
          {formState.equipment.length > 0 ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <Package className="mr-2 h-4 w-4" />
                  {period.equipmentIds.length > 0
                    ? `${period.equipmentIds.length} од. обрано`
                    : "Обрати обладнання"}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
              >
                <div
                  className="max-h-[300px] overflow-y-auto touch-pan-y overscroll-contain p-2"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {formState.equipment.map((equip) => (
                    <div
                      key={equip.id}
                      className="flex items-center gap-2 p-2 rounded-md hover:bg-muted"
                    >
                      <Checkbox
                        id={`equip-${period.id}-${equip.id}`}
                        checked={period.equipmentIds.includes(equip.id)}
                        onCheckedChange={() =>
                          toggleEquipmentForPeriod(period.id, equip.id)
                        }
                      />
                      <Label
                        htmlFor={`equip-${period.id}-${equip.id}`}
                        className="text-sm font-medium leading-none flex-1"
                      >
                        {equip.name}{" "}
                        <span className="text-muted-foreground">
                          ({equip.serialNumber || "б/н"})
                        </span>
                      </Label>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Спочатку додайте обладнання до договору.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AddEditContractDialog({
  isOpen,
  setIsOpen,
  onSave,
  taskToEdit,
  engineers: allEngineers,
  equipmentModels,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (task: Omit<ServiceContract, "id" | "archived">, id?: string) => void;
  taskToEdit?: ServiceContract | null;
  engineers: ServiceEngineer[];
  equipmentModels: EquipmentModel[];
  allContracts: ServiceContract[];
}) {
  const [formState, setFormState] = useState(getInitialState());
  const { toast } = useToast();
  const isEditing = !!taskToEdit;
  const [isEquipmentDialogOpen, setEquipmentDialogOpen] = useState(false);
  const [equipmentToEdit, setEquipmentToEdit] = useState<Equipment | null>(
    null
  );

  const engineers = useMemo(() => {
    if (!allEngineers) return [];
    return [...allEngineers].sort((a, b) => {
      const indexA = customEngineerSortOrder.indexOf(a.name);
      const indexB = customEngineerSortOrder.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [allEngineers]);

  useEffect(() => {
    if (isOpen) {
      if (isEditing && taskToEdit) {
        const safeGetDate = (date: any): Date | undefined => {
          if (!date) return undefined;
          if (typeof date.toDate === "function") return date.toDate();
          const d = new Date(date);
          if (!isNaN(d.getTime())) return d;
          return undefined;
        };

        setFormState({
          ...taskToEdit,
          objectName: taskToEdit.objectName || "",
          counterparty: taskToEdit.counterparty || "",
          address: taskToEdit.address || "",
          coordinates: taskToEdit.coordinates || "",
          contactPerson: taskToEdit.contactPerson || "",
          contactPhone: taskToEdit.contactPhone || "",
          contractNumber: taskToEdit.contractNumber || "",
          contractStartDate: safeGetDate(taskToEdit.contractStartDate),
          contractEndDate: safeGetDate(taskToEdit.contractEndDate),
          maintenancePeriods: taskToEdit.maintenancePeriods.map((p) => ({
            ...p,
            startDate: safeGetDate(p.startDate),
            endDate: safeGetDate(p.endDate),
            equipmentIds: p.equipmentIds || [],
            status: p.status || "Заплановано",
          })),
          equipment: taskToEdit.equipment || [],
        });
      } else {
        setFormState({
          ...getInitialState(),
          maintenancePeriods: [getEmptyPeriod(1)],
        });
      }
    }
  }, [taskToEdit, isEditing, isOpen]);

  const handleCapitalizeChange =
    (field: keyof typeof formState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = e.target;
      setFormState((prev) => ({ ...prev, [field]: value }));
    };

  const handleBlur = (field: keyof typeof formState) => (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { value } = e.target;
    setFormState((prev) => ({ ...prev, [field]: capitalizeWords(value) }));
  };

  const handleChange = (field: keyof typeof formState, value: any) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handlePeriodChange = (
    periodId: string,
    field: keyof MaintenancePeriod,
    value: any
  ) => {
    setFormState((prev) => ({
      ...prev,
      maintenancePeriods: prev.maintenancePeriods.map((p) =>
        p.id === periodId ? { ...p, [field]: value } : p
      ),
    }));
  };

  const addPeriod = () => {
    setFormState((prev) => ({
      ...prev,
      maintenancePeriods: [
        ...prev.maintenancePeriods,
        getEmptyPeriod(prev.maintenancePeriods.length + 1),
      ],
    }));
  };

  const removePeriod = (periodId: string) => {
    if (formState.maintenancePeriods.length <= 1) {
      toast({
        variant: "destructive",
        title: "Неможливо видалити",
        description: "Повинен бути хоча б один період ТО.",
      });
      return;
    }
    setFormState((prev) => ({
      ...prev,
      maintenancePeriods: prev.maintenancePeriods.filter(
        (p) => p.id !== periodId
      ),
    }));
  };

  const handleOpenEquipmentDialog = (equipment: Equipment | null = null) => {
    setEquipmentToEdit(equipment);
    setEquipmentDialogOpen(true);
  };

  const handleSaveEquipment = (
    equipmentData: Omit<Equipment, "id" | "reports">,
    id?: string
  ) => {
    if (id) {
      setFormState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((e) => (e.id === id ? { ...e, ...equipmentData, id } : e)),
      }));
      toast({ title: "Обладнання оновлено" });
    } else {
      const newEquipment: Equipment = {
        ...equipmentData,
        id: `equip-${Date.now()}-${Math.random()}`,
        reports: [],
      };
      setFormState((prev) => ({
        ...prev,
        equipment: [...(prev.equipment || []), newEquipment],
      }));
      toast({ title: "Обладнання додано" });
    }
    setEquipmentDialogOpen(false);
  };

  const handleRemoveEquipment = (equipmentId: string) => {
    setFormState((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((e) => e.id !== equipmentId),
      // Also remove this equipment from any maintenance periods
      maintenancePeriods: prev.maintenancePeriods.map(p => ({
          ...p,
          equipmentIds: p.equipmentIds.filter(id => id !== equipmentId)
      }))
    }));
    toast({ title: "Обладнання видалено" });
  };

  const handleSubmit = () => {
    const { contractNumber, objectName, counterparty, address, contractStartDate, contractEndDate, maintenancePeriods } = formState;
  
    if (!contractNumber || !objectName || !counterparty || !address || !contractStartDate || !contractEndDate) {
      toast({
        variant: 'destructive',
        title: 'Помилка валідації',
        description: "Будь ласка, заповніть усі обов'язкові поля, позначені зірочкою (*).",
      });
      return;
    }
  
    for (const period of maintenancePeriods) {
      if (!period.startDate || !period.endDate) {
        toast({
          variant: 'destructive',
          title: 'Помилка валідації',
          description: `Будь ласка, вкажіть дати для '${period.name}'.`,
        });
        return;
      }
      if (new Date(period.startDate) > new Date(period.endDate)) {
        toast({
          variant: 'destructive',
          title: 'Помилка валідації',
          description: `Дата початку не може бути пізніше дати закінчення для '${period.name}'.`,
        });
        return;
      }
    }
  
    const clientObjectId = formState.clientObjectId || objectName.toLowerCase().replace(/\s+/g, '-');
      
    // Determine status based on the new logic
    let newStatus: TaskStatus;
    const finalContractEndDate = contractEndDate ? isValid(new Date(contractEndDate)) ? new Date(contractEndDate) : null : null;
    const hasScheduledPeriods = maintenancePeriods.some(p => p.status === 'Заплановано');

    if (finalContractEndDate && (isPast(finalContractEndDate) || isSameMonth(finalContractEndDate, new Date()))) {
        newStatus = 'Пролонгація';
    } else if (!hasScheduledPeriods) {
        // This will be interpreted as "Крайні роботи" by the badge logic.
        // The actual status in data can remain 'Виконано'
        newStatus = 'Виконано'; 
    } else {
        newStatus = 'Заплановано';
    }
  
    const finalTaskData = {
      ...formState,
      clientObjectId,
      status: newStatus,
      objectName: capitalizeWords(formState.objectName),
      counterparty: capitalizeWords(formState.counterparty),
      address: capitalizeWords(formState.address),
      contactPerson: capitalizeWords(formState.contactPerson || ''),
    };
  
    onSave(finalTaskData, taskToEdit?.id);
  };

  const toggleEngineerForPeriod = (periodId: string, engineerId: string) => {
    setFormState(prev => ({
        ...prev,
        maintenancePeriods: prev.maintenancePeriods.map(p => {
            if (p.id === periodId) {
                const newAssigned = p.assignedEngineerIds.includes(engineerId)
                    ? p.assignedEngineerIds.filter(id => id !== engineerId)
                    : [...p.assignedEngineerIds, engineerId];
                return { ...p, assignedEngineerIds: newAssigned };
            }
            return p;
        })
    }));
  };

  const toggleEquipmentForPeriod = (periodId: string, equipmentId: string) => {
    setFormState(prev => ({
        ...prev,
        maintenancePeriods: prev.maintenancePeriods.map(p => {
            if (p.id === periodId) {
                const newEquipmentIds = p.equipmentIds.includes(equipmentId)
                    ? p.equipmentIds.filter(id => id !== equipmentId)
                    : [...p.equipmentIds, equipmentId];
                return { ...p, equipmentIds: newEquipmentIds };
            }
            return p;
        })
    }));
  };
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Редагувати договір" : "Новий договір"}</DialogTitle>
            <DialogDescription>
              {isEditing ? "Змініть дані договору." : "Заповніть деталі нового сервісного договору."}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-grow overflow-y-auto pr-6 -mr-6">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractNumber">Номер договору <span className="text-destructive">*</span></Label>
                  <Input
                    id="contractNumber"
                    value={formState.contractNumber}
                    onChange={(e) => handleChange("contractNumber", e.target.value.toUpperCase())}
                    placeholder="25/07-24"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Дата початку <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formState.contractStartDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formState.contractStartDate ? (
                            format(new Date(formState.contractStartDate), "dd.MM.yyyy")
                          ) : (
                            <span>Оберіть дату</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formState.contractStartDate ? new Date(formState.contractStartDate) : undefined}
                          onSelect={(date) => handleChange("contractStartDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Дата закінчення <span className="text-destructive">*</span></Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formState.contractEndDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formState.contractEndDate ? (
                            format(new Date(formState.contractEndDate), "dd.MM.yyyy")
                          ) : (
                            <span>Оберіть дату</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formState.contractEndDate ? new Date(formState.contractEndDate) : undefined}
                          onSelect={(date) => handleChange("contractEndDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="objectName">Назва об'єкту <span className="text-destructive">*</span></Label>
                  <Input
                    id="objectName"
                    value={formState.objectName}
                    onChange={handleCapitalizeChange("objectName")}
                    onBlur={handleBlur("objectName")}
                    placeholder="Наприклад, 'Офісний центр Гуллівер'"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="counterparty">Контрагент <span className="text-destructive">*</span></Label>
                  <Input
                    id="counterparty"
                    value={formState.counterparty}
                    onChange={handleCapitalizeChange("counterparty")}
                    onBlur={handleBlur("counterparty")}
                    placeholder="Наприклад, ТОВ 'Роги та копита'"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Адреса <span className="text-destructive">*</span></Label>
                <Input
                  id="address"
                  value={formState.address}
                  onChange={handleCapitalizeChange("address")}
                  onBlur={handleBlur("address")}
                  placeholder="Наприклад, м. Київ, пл. Спортивна, 1а"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coordinates">Координати (для навігатора)</Label>
                <Input
                  id="coordinates"
                  value={formState.coordinates}
                  onChange={(e) => handleChange("coordinates", e.target.value)}
                  placeholder="Наприклад, 50.4365, 30.5218"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPerson">Контактна особа</Label>
                  <Input
                    id="contactPerson"
                    value={formState.contactPerson}
                    onChange={handleCapitalizeChange("contactPerson")}
                    onBlur={handleBlur("contactPerson")}
                    placeholder="Наприклад, Іван Іванов"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Телефон контактної особи</Label>
                  <Input
                    id="contactPhone"
                    value={formState.contactPhone}
                    onChange={(e) => handleChange("contactPhone", e.target.value)}
                    placeholder="+380501234567"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Обладнання за договором</h3>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEquipmentDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Додати
                  </Button>
                </div>

                {formState.equipment.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground bg-gray-50 rounded-lg">
                    <Wrench className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm">Для цього договору ще не додано жодного обладнання.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formState.equipment.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 rounded-md bg-muted/20">
                        <div>
                          <p className="font-semibold">{item.name} {item.groupNumber && <span className="font-normal text-muted-foreground">(№{item.groupNumber})</span>}</p>
                          <p className="text-sm text-muted-foreground">
                            Модель: {item.model} / S/N: {item.serialNumber || 'б/н'}
                          </p>
                        </div>
                        <div className="flex items-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => handleOpenEquipmentDialog(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveEquipment(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Періоди ТО</h3>
                {formState.maintenancePeriods.map((period, index) => (
                  <PeriodEditor
                    key={period.id}
                    period={period}
                    index={index}
                    formState={formState}
                    engineers={engineers}
                    removePeriod={removePeriod}
                    handlePeriodChange={handlePeriodChange}
                    toggleEquipmentForPeriod={toggleEquipmentForPeriod}
                    toggleEngineerForPeriod={toggleEngineerForPeriod}
                  />
                ))}
                <Button variant="outline" onClick={addPeriod} className="w-full">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Додати період ТО
                </Button>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Скасувати
            </Button>
            <Button onClick={handleSubmit}>Зберегти договір</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddEquipmentDialog
        isOpen={isEquipmentDialogOpen}
        setIsOpen={setEquipmentDialogOpen}
        onSave={handleSaveEquipment}
        equipmentToEdit={equipmentToEdit}
        allModels={equipmentModels}
      />
    </>
  );
}
