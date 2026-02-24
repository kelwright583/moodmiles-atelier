import { Link, useLocation } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

const FloatingActionButton = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Don't show on landing, auth, or create-trip pages
  if (!user || location.pathname === "/" || location.pathname === "/auth" || location.pathname === "/create-trip") {
    return null;
  }

  return (
    <Link to="/create-trip">
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-gradient-champagne shadow-champagne flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
        aria-label="New Trip"
      >
        <Plus size={24} className="text-primary-foreground" />
      </motion.button>
    </Link>
  );
};

export default FloatingActionButton;
