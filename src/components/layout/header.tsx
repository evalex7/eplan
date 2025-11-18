"use client";

import { Wind, Bot, User, LifeBuoy, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { cn } from "@/lib/utils";
import { useFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import NotificationBell from "../notification-bell";

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
  const { auth } = useFirebase();
  const router = useRouter();
  const isAdmin = useIsAdmin();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push("/login");
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm transition-transform duration-300 ease-in-out md:px-6",
        isCollapsed && "-translate-y-full"
      )}
    >
      <div className="flex items-center gap-2">
        <Wind className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          AirControl
        </h1>
      </div>

      <div className="flex items-center gap-2">
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
        
        <NotificationBell />

        <Button
            onClick={onSettingsClick}
            variant="ghost"
            size="icon"
            className="h-9 w-9"
        >
            <Settings className="h-5 w-5" />
            <span className="sr-only">Параметри</span>
        </Button>
      </div>
    </header>
  );
}
