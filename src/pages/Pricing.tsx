import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Crown, Sparkles, Zap, ArrowRight, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const features = {
  free: [
    "1 active trip",
    "AI outfit suggestions (text only)",
    "1 outfit regeneration per trip",
    "Basic packing list",
    "5 mood board uploads per trip",
    "Destination briefing",
    "Weather forecast",
  ],
  luxe: [
    "Unlimited trips",
    "AI outfit suggestions with images",
    "5 outfit regenerations per trip",
    "Fashion search (3 searches/trip)",
    "Unlimited mood board uploads",
    "Group collaboration",
    "Public trip sharing",
    "Destination briefing",
    "Weather forecast",
    "Spotify playlist creation",
  ],
  atelier: [
    "Everything in Luxe",
    "Unlimited outfit regenerations",
    "Fashion search (10 searches/trip)",
    "PDF lookbook export",
    "Priority AI generation",
    "Advanced collaboration tools",
    "Expenses & bill splitting",
    "Trip memories carousel",
    "Early access to new features",
  ],
};

const faqs = [
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your Settings page at any time. You'll keep access until the end of your billing period.",
  },
  {
    q: "What happens when I hit the free plan limits?",
    a: "You'll see an upgrade prompt. Your existing data is never deleted — you simply can't add more until you upgrade.",
  },
  {
    q: "Is my trip data private?",
    a: "Completely. Your trips are private by default. You choose if and when to share them.",
  },
  {
    q: "Do you offer refunds?",
    a: "Monthly plans: cancel anytime, no refund for the current period. Annual plans: full refund within 14 days of purchase.",
  },
  {
    q: "What AI model powers the outfit suggestions?",
    a: "GPT-4o for text suggestions, DALL-E 3 for outfit images (Luxe and Atelier plans).",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. Upgrade or downgrade from your Settings page. Changes take effect immediately on upgrade, or at the next billing cycle on downgrade.",
  },
];

const Pricing = () => {
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");

  const luxeMonthlyDisplay = isAnnual ? (119 / 12).toFixed(2) : "14.99";
  const atelierMonthlyDisplay = isAnnual ? (249 / 12).toFixed(2) : "29.99";

  const handleCheckout = async (plan: "luxe" | "atelier") => {
    if (!user) {
      window.location.href = "/auth";
      return;
    }
    setLoadingPlan(plan);
    try {
      const body: Record<string, string> = { plan, billing: isAnnual ? "annual" : "monthly" };
      if (promoCode.trim()) body.promo_code = promoCode.trim().toUpperCase();
      const { data, error } = await supabase.functions.invoke("create-checkout", { body });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err: unknown) {
      toast({
        title: "Checkout unavailable",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-24 px-4 md:px-6">
        {/* Hero */}
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="eyebrow mb-3"
          >
            Membership
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-heading font-normal mb-5"
          >
            Travel,{" "}
            <em className="font-heading italic">Styled.</em>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm font-body font-light text-parchment-dim leading-relaxed max-w-md mx-auto mb-10"
          >
            Choose the membership that fits your journey. Upgrade or downgrade anytime.
          </motion.p>

          {/* Annual toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-6"
          >
            <button
              onClick={() => setIsAnnual(false)}
              className={`pb-1 text-sm font-body font-medium transition-all ${
                !isAnnual ? "border-b border-gold text-parchment" : "text-parchment-faint hover:text-parchment-dim"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`pb-1 text-sm font-body font-medium transition-all flex items-center gap-2 ${
                isAnnual ? "border-b border-gold text-parchment" : "text-parchment-faint hover:text-parchment-dim"
              }`}
            >
              Annual
              <span className="text-gold text-[10px] font-body">
                Save 33%
              </span>
            </button>
          </motion.div>
        </div>

        {/* Promo code */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center justify-center"
        >
          <details className="mt-4">
            <summary className="text-xs text-parchment-faint cursor-pointer hover:text-parchment-dim font-body">Have a promo code?</summary>
            <div className="mt-3 flex items-center gap-2">
              <div className="relative">
                <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-parchment-faint pointer-events-none" />
                <Input
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Promo code"
                  className="pl-8 h-9 w-40 bg-ink-raised border-ink-border text-sm font-body placeholder:text-parchment-faint/50 text-center tracking-wider"
                  maxLength={20}
                />
              </div>
              {promoCode && (
                <span className="text-xs text-gold font-body">Applied at checkout</span>
              )}
            </div>
          </details>
        </motion.div>

        {/* Tier cards */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-20 mt-8">
          {/* Free */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="surface rounded-sm p-8 flex flex-col"
          >
            <div className="mb-6">
              <div className="w-10 h-10 rounded-sm bg-ink-raised border border-ink-border flex items-center justify-center mb-4">
                <Zap size={18} className="text-parchment-dim" />
              </div>
              <p className="eyebrow mb-1">Complimentary</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-heading font-normal"><em className="font-heading italic">Free</em></span>
              </div>
              <p className="text-xs font-body font-light text-parchment-dim mt-2">No credit card required</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {features.free.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-body font-light text-parchment-dim">
                  <Check size={12} className="text-gold flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              to="/auth"
              className="w-full inline-flex items-center justify-center h-11 px-6 rounded-sm border border-ink-border text-sm font-body font-medium text-parchment hover:bg-ink-raised transition-colors"
            >
              Get started free
            </Link>
          </motion.div>

          {/* Luxe */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative bg-ink-raised border border-gold/30 rounded-sm p-8 flex flex-col glow-gold"
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="eyebrow bg-ink-raised border border-gold/30 px-4 py-1">
                Most Popular
              </span>
            </div>

            <div className="mb-6">
              <div className="w-10 h-10 rounded-sm bg-gold/10 border border-gold/20 flex items-center justify-center mb-4">
                <Sparkles size={18} className="text-gold" />
              </div>
              <p className="eyebrow mb-1">Luxe</p>
              <div className="flex items-baseline gap-1">
                <span className="text-6xl font-heading italic">${luxeMonthlyDisplay}</span>
                <span className="text-parchment-dim text-sm font-body">/ month</span>
              </div>
              {isAnnual && (
                <p className="text-xs text-gold font-body mt-1">Billed annually ($119/yr)</p>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {features.luxe.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-body font-light text-parchment-dim">
                  <Check size={12} className="text-gold flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="default"
              className="w-full"
              onClick={() => handleCheckout("luxe")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "luxe" ? "Opening..." : "Upgrade to Luxe"}
              {loadingPlan !== "luxe" && <ArrowRight size={14} className="ml-2" />}
            </Button>
          </motion.div>

          {/* Atelier */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="surface rounded-sm p-8 flex flex-col"
          >
            <div className="mb-6">
              <div className="w-10 h-10 rounded-sm bg-ink-raised border border-ink-border flex items-center justify-center mb-4">
                <Crown size={18} className="text-gold" />
              </div>
              <p className="eyebrow mb-1">Atelier</p>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-heading italic">${atelierMonthlyDisplay}</span>
                <span className="text-parchment-dim text-sm font-body">/ month</span>
              </div>
              {isAnnual && (
                <p className="text-xs text-gold font-body mt-1">Billed annually ($249/yr)</p>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {features.atelier.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm font-body font-light text-parchment-dim">
                  <Check size={12} className="text-gold flex-shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleCheckout("atelier")}
              disabled={loadingPlan !== null}
            >
              {loadingPlan === "atelier" ? "Opening..." : "Upgrade to Atelier"}
              {loadingPlan !== "atelier" && <ArrowRight size={14} className="ml-2" />}
            </Button>
          </motion.div>
        </div>

        {/* Feature comparison table */}
        <div className="max-w-4xl mx-auto mb-24">
          <h2 className="text-2xl font-heading text-center mb-10">Compare plans</h2>
          <div className="glass rounded-sm overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-5 text-muted-foreground font-normal">Feature</th>
                  <th className="p-5 text-center text-muted-foreground font-normal">Free</th>
                  <th className="p-5 text-center text-primary font-medium">Luxe</th>
                  <th className="p-5 text-center text-muted-foreground font-normal">Atelier</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Active trips", free: "1", luxe: "Unlimited", atelier: "Unlimited" },
                  { feature: "Outfit suggestions", free: "Text only", luxe: "Text + Images", atelier: "Text + Images" },
                  { feature: "Outfit regenerations", free: "1 / trip", luxe: "5 / trip", atelier: "Unlimited" },
                  { feature: "Fashion search", free: "—", luxe: "3 / trip", atelier: "10 / trip" },
                  { feature: "Mood board uploads", free: "5 / trip", luxe: "Unlimited", atelier: "Unlimited" },
                  { feature: "Group collaboration", free: "—", luxe: "✓", atelier: "✓" },
                  { feature: "Public trip sharing", free: "—", luxe: "✓", atelier: "✓" },
                  { feature: "PDF lookbook export", free: "—", luxe: "—", atelier: "✓" },
                  { feature: "Expenses & splitting", free: "—", luxe: "✓", atelier: "✓" },
                  { feature: "Memories carousel", free: "—", luxe: "✓", atelier: "✓" },
                ].map((row, i) => (
                  <tr key={row.feature} className={i % 2 === 0 ? "bg-secondary/30" : ""}>
                    <td className="p-4 pl-5 text-foreground">{row.feature}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.free}</td>
                    <td className="p-4 text-center text-foreground font-medium">{row.luxe}</td>
                    <td className="p-4 text-center text-muted-foreground">{row.atelier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-heading text-center mb-10">Questions</h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <div key={faq.q} className="glass rounded-sm p-6">
                <h3 className="font-heading text-base mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground font-body leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 text-center">
        <p className="text-xs text-muted-foreground font-body">
          © 2026 Concierge Styled. All rights reserved.{" "}
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          {" · "}
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </p>
      </footer>
    </div>
  );
};

export default Pricing;
