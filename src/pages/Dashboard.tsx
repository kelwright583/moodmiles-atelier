import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, ArrowRight, TrendingUp, MapPin, Sparkles, X, ChevronRight, Crown, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Trip } from "@/types/database";

interface TrendingItem {
  city: string;
  image_url?: string | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getCountdown(startDate: string, endDate: string, destination: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const daysUntilStart = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysUntilEnd = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilStart > 0) return `${destination} in ${daysUntilStart} day${daysUntilStart === 1 ? "" : "s"}`;
  if (daysUntilEnd >= 0) return `${destination} — ${daysUntilEnd + 1} day${daysUntilEnd === 0 ? "" : "s"} left`;
  return destination;
}

const Dashboard = () => {
  const [showTrendingFeed, setShowTrendingFeed] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url, subscription_tier, style_profile")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: true });
      if (error) throw error;
      return data as Trip[];
    },
  });

  const { data: trending = [] } = useQuery<TrendingItem[]>({
    queryKey: ["trending-v2"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-trends");
      if (error) return [];
      return (data?.trends || []) as TrendingItem[];
    },
    staleTime: 1000 * 60 * 60,
    retry: 0,
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });

  const previewTrending = trending.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 md:pt-28 pb-16 md:pb-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10 md:mb-16"
          >
            <div className="flex items-center gap-4">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                />
              ) : null}
              <div>
                <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">My Suite</p>
                <h1 className="text-3xl md:text-5xl font-heading">
                  {getGreeting()}{profile?.name ? `, ${profile.name.split(" ")[0]}` : ""}
                </h1>
                {profile?.subscription_tier === "luxe" && (
                  <span className="inline-flex items-center gap-1.5 mt-2 text-xs tracking-[0.15em] uppercase text-primary font-body">
                    <Crown size={12} /> Luxe Member
                  </span>
                )}
              </div>
            </div>
          </motion.div>

          {/* Trips */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-20">
            <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-8 font-body">Upcoming Journeys</h2>
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <ShimmerSkeleton key={i} variant="card" className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 md:p-16 text-center">
                <p className="text-xl font-heading text-foreground mb-2">Your next adventure starts here</p>
                <p className="text-sm text-muted-foreground font-body mb-6 max-w-md mx-auto">
                  Where to? We&apos;ll handle the weather, the outfits, and the packing — so you can focus on arriving impeccably.
                </p>
                {(!profile?.style_profile || profile.style_profile.length === 0) && (
                  <p className="text-sm text-primary/90 font-body mb-6">
                    <Link to="/settings" className="hover:underline">Set your style</Link> for personalised outfit suggestions.
                  </p>
                )}
                <Link to="/create-trip">
                  <Button variant="champagne" size="xl">
                    Plan Your First Trip
                    <ArrowRight size={18} className="ml-2" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {trips.map((trip) => (
                  <Link to={`/trip/${trip.id}`} key={trip.id}>
                    <div className="group glass-card rounded-2xl overflow-hidden hover:shadow-champagne hover:scale-[1.01] transition-all duration-500 cursor-pointer">
                      <div className="relative h-48 overflow-hidden bg-secondary">
                        {trip.image_url ? (
                          <img
                            src={trip.image_url}
                            alt={trip.destination}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                        <div className="absolute top-4 right-4">
                          <span className="text-xs tracking-[0.15em] uppercase bg-secondary/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-primary font-body">
                            {trip.trip_type || "Trip"}
                          </span>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-2xl md:text-3xl font-heading">{trip.destination}</h3>
                            <p className="text-sm text-muted-foreground font-body">{trip.country}</p>
                          </div>
                          <ArrowRight size={18} className="text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex flex-col gap-1 text-xs font-body">
                          <span className="text-primary font-medium">
                            {getCountdown(trip.start_date, trip.end_date, trip.destination)}
                          </span>
                          <span className="text-muted-foreground flex items-center gap-1.5">
                            <Calendar size={12} className="text-primary" />
                            {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </motion.section>

          {/* Trending */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <TrendingUp size={14} className="text-primary" />
                <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body">Trending This Week</h2>
                <Sparkles size={12} className="text-primary animate-pulse" />
              </div>
              <button
                onClick={() => setShowTrendingFeed(true)}
                className="flex items-center gap-1 text-xs text-primary font-body hover:underline transition-all"
              >
                View all <ChevronRight size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {previewTrending.map((t, i) => (
                <motion.div
                  key={`${t.city}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="glass-card rounded-xl overflow-hidden hover:shadow-champagne transition-all duration-500 group/card"
                >
                  <button
                    onClick={() => setShowTrendingFeed(true)}
                    className="w-full text-left"
                  >
                    <div className="relative h-32 bg-secondary overflow-hidden">
                      {t.image_url && (
                        <img
                          src={t.image_url}
                          alt={`${t.city} trending inspiration`}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-card/20 to-transparent" />
                      <div className="absolute top-3 left-3 w-9 h-9 rounded-lg bg-secondary/80 backdrop-blur-sm flex items-center justify-center">
                        <MapPin size={14} className="text-primary" />
                      </div>
                    </div>

                    <div className="p-5">
                      <p className="text-xl font-heading">{t.city}</p>
                    </div>
                  </button>
                  <div className="px-5 pb-5 pt-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/create-trip?destination=${encodeURIComponent(t.city)}`);
                      }}
                      className="flex items-center gap-2 text-xs text-primary font-body tracking-wide hover:underline opacity-0 group-hover/card:opacity-100 transition-opacity"
                    >
                      <Plane size={12} /> Create trip to {t.city}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        </div>
      </main>

      {/* Trending Feed Overlay */}
      <AnimatePresence>
        {showTrendingFeed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm"
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-primary" />
                  <h2 className="text-lg font-heading">Trending This Week</h2>
                  <Sparkles size={14} className="text-primary" />
                </div>
                <button onClick={() => setShowTrendingFeed(false)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>

              {/* Scrollable feed */}
              <div className="flex-1 overflow-y-auto pt-4 pb-20">
                <div className="max-w-xl mx-auto space-y-5 px-4">
                  {trending.map((t, i) => (
                    <motion.div
                      key={`${t.city}-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="rounded-2xl overflow-hidden bg-card border border-border"
                    >
                      <div className="relative h-24 bg-secondary overflow-hidden flex items-center justify-center">
                        {t.image_url && (
                          <img
                            src={t.image_url}
                            alt={`${t.city} trend image`}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-card/10 to-transparent" />
                        <MapPin size={28} className="relative text-primary/70" />
                      </div>
                      <div className="p-5">
                        <h3 className="text-2xl font-heading mb-3">{t.city}</h3>
                        <button
                          onClick={() => {
                            setShowTrendingFeed(false);
                            navigate(`/create-trip?destination=${encodeURIComponent(t.city)}`);
                          }}
                          className="flex items-center gap-2 mt-3 text-xs text-primary font-body tracking-wide hover:underline"
                        >
                          <Plane size={12} /> Create trip to {t.city}
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
