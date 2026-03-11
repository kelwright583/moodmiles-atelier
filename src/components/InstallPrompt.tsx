import { useState, useEffect, useCallback } from "react";
import { X, Share, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "cs_install_dismissed";
const SESSION_KEY = "cs_session_count";

const isIOS = () => {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as any).standalone === true;

export default function InstallPrompt() {
  const [showIOS, setShowIOS] = useState(false);
  const [showAndroid, setShowAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const dismiss = useCallback(() => {
    setShowIOS(false);
    setShowAndroid(false);
    localStorage.setItem(DISMISS_KEY, "true");
  }, []);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "true") return;

    // Track sessions for iOS prompt
    const count = parseInt(localStorage.getItem(SESSION_KEY) || "0", 10) + 1;
    localStorage.setItem(SESSION_KEY, String(count));

    if (isIOS() && count >= 2) {
      setShowIOS(true);
      return;
    }

    // Android / Chrome install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show Android banner after 10 seconds on dashboard
    const timer = setTimeout(() => {
      if (deferredPrompt) setShowAndroid(true);
    }, 10_000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  // Also trigger Android banner when deferred prompt becomes available
  useEffect(() => {
    if (!deferredPrompt || isStandalone() || localStorage.getItem(DISMISS_KEY) === "true") return;
    const timer = setTimeout(() => setShowAndroid(true), 10_000);
    return () => clearTimeout(timer);
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  };

  return (
    <AnimatePresence>
      {/* iOS install sheet */}
      {showIOS && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-[60] bg-card border-t border-border rounded-t-2xl shadow-xl"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-body font-medium text-foreground">Install Concierge Styled</p>
                <p className="text-xs text-muted-foreground font-body mt-1">
                  Add to your home screen for the best experience
                </p>
              </div>
              <button onClick={dismiss} className="p-1.5 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
                <X size={16} className="text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-3 bg-secondary rounded-xl p-3">
              <Share size={18} className="text-primary shrink-0" />
              <p className="text-xs font-body text-muted-foreground">
                Tap the <span className="text-foreground font-medium">Share</span> button in Safari, then select <span className="text-foreground font-medium">Add to Home Screen</span>
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Android / Chrome install banner */}
      {showAndroid && deferredPrompt && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 z-[60] bg-card border border-primary/30 rounded-2xl shadow-xl"
          style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          <div className="flex items-center gap-3 px-4 py-3">
            <Download size={18} className="text-primary shrink-0" />
            <p className="text-sm font-body text-foreground flex-1">Install app for the best experience</p>
            <Button variant="champagne" size="sm" onClick={handleInstall} className="shrink-0 min-h-[44px]">
              Install
            </Button>
            <button onClick={dismiss} className="p-1.5 rounded-full hover:bg-secondary min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
