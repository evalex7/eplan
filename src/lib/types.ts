// src/lib/types.ts

export interface ServiceReport {
  id: string;
  reportDate: Date | string;
  engineerId: string;
  workDescription: string;
  partsUsed: { name: string; quantity: number }[];
}

export interface Equipment {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  groupNumber?: string;
  reports?: ServiceReport[];
}

export interface EquipmentModel {
  id: string;
  name: string;
  category: string;
}

export interface ServiceEngineer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface ClientObject {
  id: string;
  name: string;
  address: string;
}

export type ServiceType = 'Щоквартальне' | 'Піврічне' | 'Щорічне';
export type TaskStatus = 'Заплановано' | 'Виконано' | 'Пролонгація';
export type MaintenancePeriodStatus = 'Заплановано' | 'Виконано';
export type SubdivisionType = 'КОНД' | 'ДБЖ' | 'ДГУ';

export interface MaintenancePeriod {
  id: string;
  name: string;
  startDate?: Date | string;
  endDate?: Date | string;
  subdivision: SubdivisionType;
  assignedEngineerIds: string[];
  equipmentIds: string[];
  status: MaintenancePeriodStatus;
}

export interface ServiceContract {
  id: string;
  contractNumber: string;
  clientObjectId: string; 
  objectName: string;
  counterparty: string;
  address: string;
  coordinates?: string;
  contactPerson?: string;
  contactPhone?: string;
  contractStartDate?: Date | string;
  contractEndDate?: Date | string;
  serviceType: ServiceType;
  scheduledDate: Date | string;
  status: TaskStatus;
  workDescription?: string;
  maintenancePeriods: MaintenancePeriod[];
  equipment: Equipment[];
  archived: boolean;
}

export interface ServiceHistory {
  id: string;
  taskId: string;
  completionDate: Date;
  notes: string;
}

export interface EquipmentRequirement {
  taskType: ServiceType;
  equipment: string[];
}

export type UserRole = 'admin' | 'engineer';
export type MaintenanceViewMode = 'list' | 'kanban-engineer' | 'kanban-subdivision';

export interface DisplaySettings {
  autoHidePanels: boolean;
  isWideMode: boolean;
  showOverdue: boolean;
  showUpcoming: boolean;
  upcomingDays: number | "endOfMonth";
  maintenanceViewMode: MaintenanceViewMode;
  baseFontSize: number;
  showCompletedTasks: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string | null;
  position?: string | null;
  role: UserRole;
  disabled?: boolean | null;
  displaySettings?: Partial<DisplaySettings>;
}
