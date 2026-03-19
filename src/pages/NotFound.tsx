import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center px-6"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
          <Compass size={28} className="text-primary" />
        </div>
        <h1 className="font-heading text-5xl mb-3">404</h1>
        <p className="text-muted-foreground font-body mb-6">
          This page doesn't exist — let's get you back on track.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-body text-background bg-gold px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
        >
          Return Home
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
