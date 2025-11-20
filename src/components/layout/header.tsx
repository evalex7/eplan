"use client";

import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import NotificationBell from "../notification-bell";
import { EplanLogoIcon } from "../icons/eplan-logo-icon";

interface HeaderProps {
  onRescheduleClick: () => void;
  onSettingsClick: () => void;
  isRescheduleActive: boolean;
  className?: string;
  isCollapsed: boolean;
}

export default function Header({
  onRescheduleClick,
  onSettingsClick,
  isRescheduleActive,
  className,
  isCollapsed,
}: HeaderProps) {
  const isAdmin = useIsAdmin();

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm transition-transform duration-300 ease-in-out md:px-6",
        className,
        isCollapsed && "-translate-y-full"
      )}
    >
      <div className="flex-1 flex justify-start">
        <div className="flex items-center gap-2">
          <button
            onClick={onSettingsClick}
            className="p-1 rounded-md transition-colors hover:bg-muted"
          >
            <EplanLogoIcon className="h-8 w-8" />
            <span className="sr-only">Параметри</span>
          </button>
          <h1 className="font-logo text-xl font-bold tracking-wider text-foreground whitespace-nowrap">
            <span className="bg-gradient-to-r from-blue-500 to-cyan-400 text-transparent bg-clip-text">
              e-plan
            </span>
          </h1>
        </div>
      </div>

      <div className="flex-1 flex justify-center">
        {isAdmin && (
          <Button
            onClick={onRescheduleClick}
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            disabled={!isRescheduleActive}
          >
            <Bot className="h-5 w-5" />
            <span className="sr-only">Асистент коригування дати</span>
          </Button>
        )}
      </div>

      <div className="flex-1 flex justify-end">
        <NotificationBell />
      </div>
    </header>
  );
}
