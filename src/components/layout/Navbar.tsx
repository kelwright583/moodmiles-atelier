import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Menu, X, LogIn } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const { user } = useAuth();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-5"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-heading text-2xl tracking-tight text-foreground">
            Mood<span className="text-gradient-champagne">miles</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {user && (
            <>
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide">Dashboard</Link>
              <Link to="/create-trip" className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide">New Trip</Link>
            </>
          )}
          {isLanding && !user ? (
            <Link to="/auth">
              <Button variant="champagne" size="sm">Enter</Button>
            </Link>
          ) : user ? (
            <div className="w-8 h-8 rounded-full bg-gradient-champagne" />
          ) : (
            <Link to="/auth">
              <Button variant="champagne-outline" size="sm"><LogIn size={14} /> Sign In</Button>
            </Link>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-foreground">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden mt-4 glass-card rounded-xl p-6 mx-2">
          <div className="flex flex-col gap-4">
            {user ? (
              <>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Dashboard</Link>
                <Link to="/create-trip" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>New Trip</Link>
              </>
            ) : (
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>Sign In</Link>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
