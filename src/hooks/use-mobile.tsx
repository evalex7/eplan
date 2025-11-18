
"use client";

import { useState, useEffect } from 'react';

export function useIsMobile(maxWidth = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // A function to check the window size and update the state
    const checkDevice = () => {
      // We need to check for window existence for SSR
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < maxWidth);
      }
    };
    
    // Run the check on mount
    checkDevice(); 

    // Add event listener for window resize
    window.addEventListener('resize', checkDevice);

    // Cleanup the event listener on component unmount
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, [maxWidth]);

  return isMobile;
}
