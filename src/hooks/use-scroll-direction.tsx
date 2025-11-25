"use client";

import { useState, useEffect, useRef } from 'react';

type ScrollDirection = 'up' | 'down' | null;

// This hook is no longer used, but kept for reference or future use.
// The logic has been simplified and moved directly into MobileAppLayout.
export function useScrollDirection(enabled: boolean): ScrollDirection {
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !enabled) {
      setScrollDirection(null);
      return;
    }
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (Math.abs(currentScrollY - lastScrollY.current) < 20) {
        return;
      }
      
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) { 
        setScrollDirection('down');
      } else {
        setScrollDirection('up');
      }
      
      lastScrollY.current = currentScrollY > 0 ? currentScrollY : 0;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [enabled]);

  return scrollDirection;
}
