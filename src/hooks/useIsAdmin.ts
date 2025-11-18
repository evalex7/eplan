"use client";

import { useUser } from '@/firebase';
import { useMemo } from 'react';

// This is a simple, client-side-only check for admin privileges.
// It is NOT a substitute for proper Firestore Security Rules.
// Use this for UI purposes only, like hiding admin-specific controls.
export function useIsAdmin() {
  const { user, isUserLoading } = useUser();

  const isAdmin = useMemo(() => {
    if (isUserLoading) {
      return false; // Assume not admin while loading
    }
    // Only the specified email has admin rights.
    return user?.email === 'evalex.work@gmail.com';
  }, [user, isUserLoading]);

  return isAdmin;
}
