// src/hooks/useReschedule.tsx
"use client";

import { useState } from "react";
import RescheduleModal from "@/components/ai/reschedule-modal";
import { format } from "date-fns";

type MaintenancePeriodFull = {
  id: string;
  name: string;
  startDate?: any;
  endDate?: any;
  subdivision: string;
  assignedEngineerIds: string[];
  equipmentIds: string[];
  contract?: any;
};

function safeToISO(d: any) {
  if (!d) return undefined;
  if (d?.toDate) return d.toDate().toISOString();
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}

export default function useReschedule(periodsSource: MaintenancePeriodFull[], currentTabIsTO: boolean) {
  const [open, setOpen] = useState(false);
  const [preparedPeriods, setPreparedPeriods] = useState<any[]>([]);

  const isActive = currentTabIsTO && periodsSource && periodsSource.length > 0;

  const onRescheduleClick = () => {
    // підготовка масиву SimplePeriod
    const simple = periodsSource.map(p => ({
      id: p.id,
      name: p.name,
      startDate: safeToISO(p.startDate),
      endDate: safeToISO(p.endDate),
      subdivision: p.subdivision,
      assignedEngineerIds: p.assignedEngineerIds || [],
      equipmentIds: p.equipmentIds || [],
      contractId: p.contract?.id,
      contractName: p.contract?.objectName || p.contract?.contractNumber || "",
      address: p.contract?.address || ""
    }));

    setPreparedPeriods(simple);
    setOpen(true);
  };

  const Modal = () => (
    <RescheduleModal open={open} onClose={() => setOpen(false)} periods={preparedPeriods} />
  );

  return { onRescheduleClick, isActive, Modal };
}
