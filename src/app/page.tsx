
"use client";

import { useState, useEffect } from 'react';
import MobileAppLayout from '@/components/layout/mobile-app-layout';
import { useUser } from '@/firebase';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export const dynamic = "force-dynamic";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'tasks';

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const { user, isUserLoading } = useUser();
  

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // Update URL when tab changes
    const newParams = new URLSearchParams(window.location.search);
    if (activeTab) {
      newParams.set('tab', activeTab);
    } else {
      newParams.delete('tab');
    }
    router.replace(`${pathname}?${newParams.toString()}`, { scroll: false });
  }, [activeTab, pathname, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <MobileAppLayout 
        activeTab={activeTab}
        onTabChange={setActiveTab}
    />
  );
}
