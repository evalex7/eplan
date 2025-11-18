
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import MaintenanceTasksList from "./tasks-maintenance-list";
import NotificationsList from "./tasks-notifications-list";
import EquipmentPage from "./equipment-page";

export default function TasksPage({ onSubTabChange }: { onSubTabChange: (tab: string) => void }) {
    return (
        <Tabs defaultValue="notifications" className="w-full" onValueChange={onSubTabChange}>
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="notifications">Сповіщення</TabsTrigger>
                <TabsTrigger value="maintenance">ТО</TabsTrigger>
                <TabsTrigger value="reports">Звіти</TabsTrigger>
            </TabsList>
            <TabsContent value="notifications" className="mt-4">
                <NotificationsList />
            </TabsContent>
            <TabsContent value="maintenance" className="mt-4">
                <MaintenanceTasksList />
            </TabsContent>
            <TabsContent value="reports" className="mt-4">
                <EquipmentPage />
            </TabsContent>
        </Tabs>
    )
}
