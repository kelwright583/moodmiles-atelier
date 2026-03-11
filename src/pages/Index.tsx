import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/layout/Logo";
import { ArrowRight, Compass, CloudSun, Shirt } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import TrendingDestinationDrawer, {
  type TrendingDestination,
} from "@/components/landing/TrendingDestinationDrawer";

const heroImage = "/images/hero.png";

const features = [
  {
    icon: Compass,
    title: "Destination Intelligence",
    description: "Weather forecasts, local events, and cultural insights — curated before you even pack.",
  },
  {
    icon: CloudSun,
    title: "Climate-Aware Capsules",
    description: "Wardrobe suggestions that adapt to temperature shifts, rain, and evening occasions.",
  },
  {
    icon: Shirt,
    title: "Packing Optimisation",
    description: "Smart layering and rewear logic that fits your style into any luggage size.",
  },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState<TrendingDestination | null>(null);

  // Redirect logged-in users: incomplete onboarding → /onboarding, complete → /dashboard
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (!user || profileLoading) return;
    if (profile?.onboarding_completed === false) {
      navigate("/onboarding", { replace: true });
    } else if (profile?.onboarding_completed === true) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, profile, profileLoading, navigate]);

  const { data: trending } = useQuery<TrendingDestination[]>({
    queryKey: ["trending-landing"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-trends");
      if (error) return [];
      return (data?.trends || []) as TrendingDestination[];
    },
    staleTime: 1000 * 60 * 60,
    retry: 0,
  });

  const destinations = trending?.slice(0, 6) ?? [];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar transparent={!scrolled} />

      {/* Hero */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Luxury travel fashion"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto px-6">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-[11px] tracking-[0.3em] uppercase text-primary mb-4 font-body"
          >
            Travel, Styled.
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="font-heading font-medium leading-tight mb-4 md:mb-6"
          >
            <span className="block text-3xl sm:text-4xl md:text-6xl">Arrive Impeccably</span>
            <span className="block text-2xl sm:text-3xl md:text-5xl text-gradient-champagne italic mt-1">Everywhere</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground max-w-md mx-auto mb-8 font-body font-light leading-relaxed"
          >
            Styled experiences for the modern, elevated traveller.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex items-center justify-center gap-4"
          >
            <Link to="/auth" className="btn-hero-cta inline-flex items-center justify-center gap-2 font-body text-xs">
              Begin Your Journey
              <ArrowRight size={14} strokeWidth={2} />
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <div className="w-px h-16 bg-gradient-to-b from-primary/50 to-transparent" />
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-16 md:py-32 px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm tracking-[0.3em] uppercase text-primary mb-4 font-body"
          >
            The Intelligence
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-heading mb-20"
          >
            Your private stylist,
            <br />
            <span className="text-gradient-champagne italic">everywhere you go</span>
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-12">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="group"
              >
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:shadow-champagne transition-shadow duration-500">
                  <f.icon size={20} className="text-primary" />
                </div>
                <h3 className="text-lg font-heading mb-3">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed font-body">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Destinations */}
      <section className="py-16 md:py-32 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-sm tracking-[0.3em] uppercase text-primary mb-4 font-body"
          >
            Trending Now
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-heading mb-16"
          >
            Featured Destinations
          </motion.h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {destinations.length === 0 ? (
              <div className="col-span-full glass-card rounded-2xl p-12 text-center">
                <p className="text-muted-foreground font-body">Trending destinations loading…</p>
              </div>
            ) : (
              destinations.map((d, i) => (
                <motion.div
                  key={`${d.city}-${i}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => setSelectedDestination(d)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer"
                >
                  {d.image_url ? (
                    <img
                      src={d.image_url}
                      alt={d.city}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />

                  {d.vibe && (
                    <div className="absolute top-4 left-4">
                      <span className="px-2.5 py-1 rounded-full bg-background/50 backdrop-blur-md text-[10px] tracking-[0.15em] uppercase font-body text-primary">
                        {d.vibe}
                      </span>
                    </div>
                  )}

                  <div className="absolute bottom-6 left-6 right-6">
                    <h3 className="text-2xl font-heading">{d.city}</h3>
                    {d.tagline && (
                      <p className="text-xs text-muted-foreground font-body italic mt-1 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500">
                        {d.tagline}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-32 px-4 md:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-3xl md:text-5xl font-heading mb-6">
            I travel <span className="text-gradient-champagne italic">differently</span>
          </h2>
          <p className="text-muted-foreground mb-10 font-body leading-relaxed">
            Join Concierge Styled. Intelligent, beautiful, private.
          </p>
          <Link to="/auth" className="btn-hero-cta inline-flex items-center justify-center gap-3 font-body">
            Start Planning
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo size="sm" className="text-foreground" />
          <p className="text-xs text-muted-foreground font-body">
            © 2026 Concierge Styled. All rights reserved.
          </p>
        </div>
      </footer>

      <TrendingDestinationDrawer
        destination={selectedDestination}
        onClose={() => setSelectedDestination(null)}
      />
    </div>
  );
};

export default Index;
