import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setVisible(true);
    }
  }, []);

  const accept = (level: "all" | "necessary") => {
    localStorage.setItem("cookie_consent", level);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-4 left-4 right-4 z-50 md:bottom-6 md:left-6 md:right-auto md:max-w-md"
        >
          <div className="glass-card rounded-2xl p-5 border border-border shadow-champagne">
            <p className="text-sm font-body text-muted-foreground mb-1 leading-relaxed">
              We use cookies for essential functionality and analytics to improve your experience.{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => accept("necessary")}
                className="flex-1 border-border text-xs"
              >
                Necessary only
              </Button>
              <Button
                variant="champagne"
                size="sm"
                onClick={() => accept("all")}
                className="flex-1 text-xs"
              >
                Accept all
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
