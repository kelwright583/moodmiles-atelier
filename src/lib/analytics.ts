// Analytics — PostHog, gated by cookie consent
// Uses window.posthog (loaded via CDN snippet) — no npm package required

declare global {
  interface Window {
    posthog?: {
      init: (key: string, options: Record<string, unknown>) => void;
      capture: (event: string, properties?: Record<string, unknown>) => void;
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      __loaded?: boolean;
    };
  }
}

let initialized = false;

export const initAnalytics = () => {
  const consent = localStorage.getItem("cookie_consent");
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (consent !== "all" || !key || initialized || !window.posthog) return;

  window.posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com",
    capture_pageview: true,
    persistence: "localStorage",
  });
  initialized = true;
};

export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  if (window.posthog?.__loaded) {
    window.posthog.capture(event, properties);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, unknown>) => {
  if (window.posthog?.__loaded) {
    window.posthog.identify(userId, properties);
  }
};
