
"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { DisplaySettings, UserProfile } from "@/lib/types";
import { useFirebase, useUser, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc } from "firebase/firestore";
import { debounce } from 'lodash';

export const defaultSettings: DisplaySettings = {
  autoHidePanels: true,
  isWideMode: false,
  showOverdue: true,
  showUpcoming: true,
  upcomingDays: 30,
  maintenanceViewMode: "list",
  baseFontSize: 16,
  showCompletedTasks: false,
};

const LOCAL_STORAGE_KEY = 'aircontrol_display_settings';

const DisplaySettingsContext = createContext<{
  settings: DisplaySettings;
  setSettings: (newSettings: Partial<DisplaySettings>) => void;
  isLoading: boolean;
}>({
  settings: defaultSettings,
  setSettings: () => {},
  isLoading: true,
});

export const DisplaySettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<DisplaySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from localStorage on initial mount
  useEffect(() => {
    try {
      const storedSettings = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSettings) {
        // Merge stored settings with defaults to avoid missing properties
        setSettings(prev => ({ ...prev, ...JSON.parse(storedSettings) }));
      }
    } catch (error) {
      console.error("Failed to load settings from localStorage", error);
    }
    setIsLoading(false);
  }, []);

  // Apply font size whenever it changes
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.baseFontSize}px`;
  }, [settings.baseFontSize]);

  const handleSetSettings = (newSettings: Partial<DisplaySettings>) => {
    setSettings(prev => {
        const updatedSettings = { ...prev, ...newSettings };
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSettings));
        } catch (error) {
            console.error("Failed to save settings to localStorage", error);
        }
        return updatedSettings;
    });
  };
  
  const value = {
    settings,
    setSettings: handleSetSettings,
    isLoading,
  };

  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  );
};

export function useDisplaySettings() {
  return useContext(DisplaySettingsContext);
}
