import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasRecoverySession(!!session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "Password updated", description: "You can now sign in with your new password." });
      navigate("/auth");
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to update password", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (hasRecoverySession === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gradient-champagne animate-pulse" />
      </div>
    );
  }

  if (!hasRecoverySession) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-32 pb-20 px-6 flex items-center justify-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
            <p className="text-muted-foreground font-body mb-4">This link has expired or is invalid.</p>
            <Button variant="champagne" onClick={() => navigate("/auth")}>Return to sign in</Button>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 px-6 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="text-center mb-10">
            <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">Reset Password</p>
            <h1 className="text-3xl md:text-4xl font-heading">Set your new password</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">New password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body"
              />
            </div>
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Confirm password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body"
              />
            </div>
            <Button variant="champagne" size="xl" type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        </motion.div>
      </main>
    </div>
  );
};

export default ResetPassword;
