// services/userActivityService.ts

// Make gtag available on the window object
declare global {
  interface Window {
    gtag?: (command: string, action: string, params?: Record<string, any>) => void;
  }
}

/**
 * Tracks a custom event using Google Analytics.
 * @param eventName The name of the event (e.g., 'add_to_cart').
 * @param eventData An object containing event parameters.
 */
export const trackEvent = (eventName: string, eventData: Record<string, any>): void => {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, eventData);
  } else {
    // Fallback for development or if gtag fails to load
    console.log(`[Analytics Event (gtag not found)] Name: ${eventName}`, eventData);
  }
};

/**
 * Tracks a page view event. This should be called on every route change.
 * @param pagePath The path of the page being viewed (e.g., '/product/123').
 * @param pageTitle The title of the page.
 */
export const trackPageView = (pagePath: string, pageTitle: string): void => {
   if (typeof window.gtag === 'function') {
    // GA4 automatically tracks page views with browser history changes in many cases,
    // but manual tracking provides more precise control for SPAs.
    // We send a page_view event with specific parameters.
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: pageTitle,
      page_location: window.location.href
    });
  } else {
     console.log(`[Analytics PageView (gtag not found)] Path: ${pagePath}, Title: ${pageTitle}`);
  }
};
