"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from "@/firebase/client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { DisplaySettingsProvider } from "@/hooks/display-settings-context";

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <head>
        <title>e-plan</title>
        <meta
          name="description"
          content="Планування технічного обслуговування промислових кондиціонерів за допомогою ШІ."
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2172e2" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="icon" href="/icons/icon-192x192.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <DisplaySettingsProvider>{children}</DisplaySettingsProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
        <Toaster />
        <div id="dialog-container"></div>
      </body>
    </html>
  );
}
