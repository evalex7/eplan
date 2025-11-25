'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import type { UserRole } from '@/lib/types';

/**
 * A simplified hook to determine user role.
 * This hook no longer fetches a user profile from Firestore to determine the role.
 * It now defaults all users to the 'engineer' role to prevent permission errors.
 */
export const useRole = () => {
  const { isUserLoading } = useUser();

  const role = useMemo(() => {
    // Default all users to 'engineer' role.
    // This avoids the need to fetch a profile from Firestore, which was causing errors.
    return 'engineer';
  }, []);

  return {
    role: role as UserRole,
    isLoading: isUserLoading,
  };
};
