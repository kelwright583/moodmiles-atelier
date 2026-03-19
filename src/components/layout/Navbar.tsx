import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import { motion } from "framer-motion";
import { Menu, X, LogIn, User, Settings, LogOut } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";

interface NavbarProps {
  transparent?: boolean;
}

const Navbar = ({ transparent = false }: NavbarProps) => {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const isLanding = location.pathname === "/";
  const { user, signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name, avatar_url").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = profile?.name
    ? profile.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "?";

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 transition-colors duration-300 ${
        transparent ? "bg-transparent" : "bg-ink/90 backdrop-blur-md border-b border-ink-border"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Logo size="md" />

        <div className="hidden md:flex items-center gap-8">
          {user && (
            <Link to="/dashboard" className="text-xs font-body font-medium tracking-[0.14em] uppercase text-parchment-dim hover:text-parchment transition-colors">My Suite</Link>
          )}
          {isLanding && !user ? (
            <Link to="/auth">
              <Button variant="outline" size="sm">Enter</Button>
            </Link>
          ) : user ? (
            <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-transparent hover:border-gold/50 transition-colors flex items-center justify-center bg-ink-raised"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-body font-medium text-parchment-dim">{initials}</span>
                )}
              </button>

              {profileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className="absolute right-0 top-full mt-2 bg-ink-raised border border-ink-border rounded-sm shadow-xl min-w-[200px] overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-ink-border">
                    <p className="text-sm font-body font-medium text-parchment truncate">{profile?.name || "Traveller"}</p>
                    <p className="text-xs text-parchment-dim font-body truncate">{user.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button
                      onClick={() => { setProfileOpen(false); navigate("/settings"); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-body text-parchment hover:bg-ink-border rounded-sm transition-colors"
                    >
                      <Settings size={14} className="text-parchment-dim" /> Settings
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); signOut(); }}
                      className="flex items-center gap-2.5 w-full px-3 py-2 text-sm font-body text-parchment-dim hover:bg-ink-border rounded-sm transition-colors"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm"><LogIn size={14} /> Sign In</Button>
            </Link>
          )}
        </div>

        <button onClick={() => setOpen(!open)} className="md:hidden text-parchment-dim hover:text-parchment transition-colors">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden mt-4 mx-2">
          <div className="flex flex-col gap-1">
            {user ? (
              <>
                <Link to="/dashboard" className="text-xs font-body font-medium tracking-[0.14em] uppercase text-parchment-dim hover:text-parchment py-3 px-2 transition-colors" onClick={() => setOpen(false)}>My Suite</Link>
                <Link to="/settings" className="text-xs font-body font-medium tracking-[0.14em] uppercase text-parchment-dim hover:text-parchment py-3 px-2 transition-colors" onClick={() => setOpen(false)}>Settings</Link>
              </>
            ) : (
              <Link to="/auth" className="text-xs font-body font-medium tracking-[0.14em] uppercase text-parchment-dim hover:text-parchment py-3 px-2 transition-colors" onClick={() => setOpen(false)}>Sign In</Link>
            )}
          </div>
        </motion.div>
      )}
    </motion.nav>
  );
};

export default Navbar;
