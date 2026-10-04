import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Resets window scroll to top (0, 0) upon route transitions,
 * preventing old scroll offset from corrupting layout on mobile screens.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      try {
        window.scrollTo(0, 0);
      } catch {
        // Ignore fallback
      }
    }
  }, [pathname]);

  return null;
};
