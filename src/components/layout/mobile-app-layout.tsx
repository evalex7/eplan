
"use client";

import { useState, useEffect, useRef } from "react";
import Header from "@/components/layout/header";
import ContractsTable from "@/components/contracts-table";
import ScheduleGantt from "@/components/schedule-gantt";
import RescheduleDialog from "@/components/reschedule-dialog";
import type { ServiceContract } from "@/lib/types";
import ReportsAndDataPage from "@/components/reports-and-data-page";
import { FileText, GanttChartSquare, BarChart3, Settings, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import SettingsPage from "../settings-page";
import TasksPage from "../tasks-page";
import { useDisplaySettings } from "@/hooks/display-settings-context";

const navLinks = [
  { id: "tasks", label: "Завдання", icon: <ClipboardList strokeWidth={1.5} /> },
  { id: "contracts", label: "Договори", icon: <FileText strokeWidth={1.5} /> },
  { id: "reports", label: "Графіки", icon: <BarChart3 strokeWidth={1.5} /> },
  { id: "schedule", label: "Лінія часу", icon: <GanttChartSquare strokeWidth={1.5} /> },
];

function BottomNav({ activeId, onNavigate, isCollapsed }: { activeId: string; onNavigate: (id: string) => void; isCollapsed: boolean }) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const handleNavigate = (id: string) => {
    onNavigate(id);
    setHighlightedId(id);
    setTimeout(() => setHighlightedId(null), 600); // Duration of the animation
  };

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm transition-all duration-300 ease-in-out transform",
        !isCollapsed ? "opacity-100 translate-y-0 scale-100 shadow-lg" : "opacity-0 translate-y-full scale-95 shadow-none"
      )}
    >
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${navLinks.length}, 1fr)` }}>
        {navLinks.map((link) => {
          const isActive = activeId === link.id;
          const isHighlighted = highlightedId === link.id;

          return (
            <button
              key={link.id}
              onClick={() => handleNavigate(link.id)}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary",
                isActive && "text-primary"
              )}
            >
              {isHighlighted && (
                  <div className="absolute inset-x-2 inset-y-1 animate-click-highlight rounded-lg" />
              )}
              <div className="relative z-10 h-6 w-6">{link.icon}</div>
              <span className={cn("relative z-10 text-xs font-medium", isActive && "font-bold")}>{link.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default function MobileAppLayout({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) {
  const [isRescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedTaskForReschedule, setSelectedTaskForReschedule] = useState<ServiceContract | null>(null);
  const [activeSubTab, setActiveSubTab] = useState("notifications");
  const { settings } = useDisplaySettings();

  const mainRef = useRef<HTMLElement>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const [isScrollCollapsed, setIsScrollCollapsed] = useState(false);

  // --- Smooth auto-hide panels with easing ---
  useEffect(() => {
    let scrollContainer: HTMLElement | null = mainRef.current;
    if (activeTab === "schedule") scrollContainer = ganttRef.current;

    if (!scrollContainer) return;

    const handleScroll = () => {
      const currentScrollY = scrollContainer!.scrollTop;
      const maxScroll = scrollContainer!.scrollHeight - scrollContainer!.clientHeight;
      const atTop = currentScrollY < 10;
      const atBottom = currentScrollY >= maxScroll - 10;

      if (atTop) {
        if (isScrollCollapsed) setIsScrollCollapsed(false);
        if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      } else if (!atBottom) {
        const scrollDiff = currentScrollY - lastScrollY.current;

        if (Math.abs(scrollDiff) > 30) {
          if (scrollDiff > 0) {
            // Scroll down → hide menu with delay
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            scrollTimeout.current = setTimeout(() => setIsScrollCollapsed(true), 150);
          } else {
            // Scroll up → show menu immediately
            if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
            setIsScrollCollapsed(false);
          }
          lastScrollY.current = currentScrollY;
        }
      }

      lastScrollY.current = currentScrollY;
    };

    if (settings.autoHidePanels) scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    lastScrollY.current = scrollContainer.scrollTop;

    return () => {
      scrollContainer?.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    };
  }, [activeTab, settings.autoHidePanels, isScrollCollapsed]);

  const finalIsCollapsed = isScrollCollapsed;
  
  const handleSettingsClick = () => {
    onTabChange(activeTab === 'settings' ? 'tasks' : 'settings');
  };

  const renderContent = () => {
    switch (activeTab) {
      case "tasks":
        return <TasksPage onSubTabChange={setActiveSubTab} />;
      case "contracts":
        return (
          <ContractsTable
            onReschedule={(task) => {
              setSelectedTaskForReschedule(task);
              setRescheduleDialogOpen(true);
            }}
          />
        );
      case "schedule":
        return (
          <div ref={ganttRef} className="h-full w-full overflow-auto">
            <ScheduleGantt
              isParentCollapsed={false}
              onCollapseChange={(collapsed) => setIsScrollCollapsed(collapsed)}
            />
          </div>
        );
      case "reports":
        return <ReportsAndDataPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <TasksPage onSubTabChange={setActiveSubTab} />;
    }
  };

  const isRescheduleActive = activeTab === "tasks" && activeSubTab === "maintenance";

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      <Header
        onRescheduleClick={() => setRescheduleDialogOpen(true)}
        isRescheduleActive={isRescheduleActive}
        isCollapsed={finalIsCollapsed}
        onSettingsClick={handleSettingsClick}
      />

      <main
        ref={mainRef}
        className={cn(
          "flex-1 p-4 md:px-8 pt-20 pb-20",
          activeTab === "schedule" ? "overflow-hidden p-0 pt-16" : "overflow-y-auto",
          settings.isWideMode && activeTab !== "schedule" ? "px-0" : ""
        )}
      >
        {renderContent()}
      </main>
      
      <BottomNav activeId={activeTab} onNavigate={onTabChange} isCollapsed={finalIsCollapsed} />

      <RescheduleDialog
        isOpen={isRescheduleDialogOpen}
        setIsOpen={setRescheduleDialogOpen}
        initialTask={selectedTaskForReschedule}
      />
    </div>
  );
}
