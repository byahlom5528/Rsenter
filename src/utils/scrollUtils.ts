/**
 * Safe scrolling utility for cross-platform and mobile web compatibility.
 * Prevents iOS Safari & Android Chrome layout crashes and freezing when calling scrollIntoView
 * on elements alongside fixed bottom navigation or sticky top headers.
 */
export function safeScrollIntoView(element: HTMLElement | null, offset = 75) {
  if (!element || typeof window === 'undefined') return;

  try {
    const isMobile =
      window.innerWidth < 768 ||
      (typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent));

    if (isMobile) {
      // Avoid WebKit/Blink smooth-scroll freeze or infinite layout recursion during page transitions
      const rect = element.getBoundingClientRect();
      const currentScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      const targetY = Math.max(0, currentScrollY + rect.top - offset);

      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    } else {
      if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch {
    try {
      if (element && typeof element.scrollIntoView === 'function') {
        element.scrollIntoView();
      }
    } catch {
      // Fail silently without crashing the app
    }
  }
}
