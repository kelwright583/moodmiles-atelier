import { motion, AnimatePresence } from "framer-motion";
import { Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface UpgradeCelebrationProps {
  open: boolean;
  tier: string;
  onClose: () => void;
}

export const UpgradeCelebration = ({ open, tier, onClose }: UpgradeCelebrationProps) => {
  const navigate = useNavigate();
  const tierLabel = tier === "atelier" ? "Atelier" : "Luxe";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm"
        >
          {/* Animated champagne particles */}
          {Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 0, x: 0, scale: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [0, -120 - Math.random() * 80],
                x: [(Math.random() - 0.5) * 200],
                scale: [0, 1, 0.5],
              }}
              transition={{ duration: 1.8, delay: i * 0.08, ease: "easeOut" }}
              className="absolute w-2 h-2 rounded-full bg-gradient-champagne pointer-events-none"
              style={{
                left: `${40 + Math.random() * 20}%`,
                top: "50%",
              }}
            />
          ))}

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="glass-card rounded-3xl p-10 max-w-sm w-full text-center relative shadow-champagne border border-primary/30"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={18} />
            </button>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="w-16 h-16 rounded-full bg-gradient-champagne flex items-center justify-center mx-auto mb-6"
            >
              <Crown size={28} className="text-background" />
            </motion.div>

            <p className="text-[10px] tracking-[0.3em] uppercase text-primary mb-3 font-body">
              Welcome to {tierLabel}
            </p>
            <h2 className="text-3xl font-heading mb-3">
              You&apos;re now impeccably equipped.
            </h2>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-8">
              Your {tierLabel} membership is active. Every feature, every destination,
              every outfit — yours.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                variant="champagne"
                className="w-full"
                onClick={() => {
                  onClose();
                  navigate("/dashboard");
                }}
              >
                Start Planning
              </Button>
              <button
                onClick={onClose}
                className="text-xs text-muted-foreground hover:text-foreground font-body transition-colors"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
