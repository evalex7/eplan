"use client";

import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { DisplaySettingsProvider } from "@/hooks/display-settings-context";

export default function AppBody({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <FirebaseClientProvider>
        <DisplaySettingsProvider>
          {children}
        </DisplaySettingsProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
