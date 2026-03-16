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
        className="fixed z-40 w-14 h-14 rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-transform right-6"
        style={{ backgroundColor: "#cc8638", bottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
        aria-label="New Trip"
      >
        <Plus size={24} className="text-primary-foreground" />
      </motion.button>
    </Link>
  );
};

export default FloatingActionButton;
