import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const needsVerification = searchParams.get("verify") === "1";
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Enter your email", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Check your email",
        description: "We've sent you a link to reset your password.",
      });
      setIsForgotPassword(false);
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Failed to send reset email", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) throw error;
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Sign in failed", variant: "destructive" });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We've sent you a verification link to confirm your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-32 pb-20 px-6 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {needsVerification && (
            <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-sm font-body text-foreground">
                Please verify your email address. We've sent you a confirmation link — check your inbox.
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-body">
                Already verified? Try signing in again.
              </p>
            </div>
          )}
          <div className="text-center mb-10">
            <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">
              {isForgotPassword ? "Reset Password" : isLogin ? "Welcome Back" : "Join Concierge Global"}
            </p>
            <h1 className="text-3xl md:text-4xl font-heading">
              {isForgotPassword ? "Forgot your password?" : isLogin ? "Sign In" : "Create Account"}
            </h1>
          </div>

          {isForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-5">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body"
                />
              </div>
              <Button variant="champagne" size="xl" type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-muted-foreground font-body">
                <button type="button" onClick={() => setIsForgotPassword(false)} className="text-primary hover:underline">
                  Back to sign in
                </button>
              </p>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body"
                />
              </div>
            )}
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body"
              />
            </div>
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Password</label>
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
            <Button
              variant="champagne"
              size="xl"
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            </Button>

            {isLogin && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground font-body">or</span>
                </div>
              </div>
            )}
            {isLogin && (
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="w-full border-border hover:bg-secondary"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>
            )}
          </form>
          )}

          {!isForgotPassword && (
          <p className="text-center text-sm text-muted-foreground mt-6 font-body">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
            {isLogin && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </>
            )}
          </p>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default Auth;
