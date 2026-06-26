/**
 * Safe utility to track GA4 custom events.
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    try {
      (window as any).gtag("event", eventName, params);
      console.log(`[GA4] Tracked Event: ${eventName}`, params);
    } catch (err) {
      console.error("[GA4] Failed to track event", err);
    }
  }
}
