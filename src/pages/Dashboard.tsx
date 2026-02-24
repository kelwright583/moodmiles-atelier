import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, TrendingUp, MapPin, Sparkles, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Trip } from "@/types/database";

const fallbackTrending = [
  { city: "Milan", trend: "Quiet luxury & structured tailoring", category: "Fashion" },
  { city: "Paris", trend: "Layered neutrals & statement coats", category: "Style" },
  { city: "Amalfi", trend: "Linen resort & gold accessories", category: "Destination" },
  { city: "Tokyo", trend: "Streetwear meets minimalist travel", category: "Style" },
  { city: "Marrakech", trend: "Earthy tones & artisan textiles", category: "Experience" },
  { city: "Santorini", trend: "Breezy whites & statement swim", category: "Destination" },
];

const categoryColors: Record<string, string> = {
  Style: "bg-primary/10 text-primary",
  Fashion: "bg-accent/20 text-accent-foreground",
  Destination: "bg-secondary text-muted-foreground",
  Experience: "bg-primary/5 text-primary",
};

const Dashboard = () => {
  const [showTrendingFeed, setShowTrendingFeed] = useState(false);

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

  const { data: trending = fallbackTrending } = useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("fetch-trends");
      if (error) throw error;
      return data.trends?.length > 0 ? data.trends : fallbackTrending;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
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
            <div>
              <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">My Suite</p>
              <h1 className="text-3xl md:text-5xl font-heading">Welcome back</h1>
            </div>
          </motion.div>

          {/* Trips */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-20">
            <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-8 font-body">Upcoming Journeys</h2>
            {isLoading ? (
              <div className="grid md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <div key={i} className="glass-card rounded-2xl h-72 animate-pulse" />
                ))}
              </div>
            ) : trips.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center">
                <p className="text-muted-foreground font-body mb-4">No trips yet. Start planning your next journey.</p>
                <Link to="/create-trip">
                  <Button variant="champagne">Create Your First Trip</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                {trips.map((trip) => (
                  <Link to={`/trip/${trip.id}`} key={trip.id}>
                    <div className="group glass-card rounded-2xl overflow-hidden hover:shadow-champagne transition-all duration-500 cursor-pointer">
                      <div className="relative h-48 overflow-hidden bg-secondary">
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
                            <h3 className="text-xl font-heading">{trip.destination}</h3>
                            <p className="text-sm text-muted-foreground font-body">{trip.country}</p>
                          </div>
                          <ArrowRight size={18} className="text-primary mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground font-body">
                          <span className="flex items-center gap-1.5">
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
                <motion.button
                  key={`${t.city}-${i}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  onClick={() => setShowTrendingFeed(true)}
                  className="glass-card rounded-xl p-5 hover:shadow-champagne transition-all duration-500 text-left w-full"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <MapPin size={16} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-heading">{t.city}</p>
                        <span className={`text-[10px] tracking-[0.1em] uppercase px-2 py-0.5 rounded-full ${categoryColors[t.category] || "bg-secondary text-muted-foreground"}`}>
                          {t.category}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-body leading-relaxed">{t.trend}</p>
                </motion.button>
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
                      {/* Colored header strip */}
                      <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent flex items-center justify-center">
                        <MapPin size={28} className="text-primary/40" />
                      </div>
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-heading">{t.city}</h3>
                          <span className={`text-[10px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full ${categoryColors[t.category] || "bg-secondary text-muted-foreground"}`}>
                            {t.category}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground font-body leading-relaxed">{t.trend}</p>
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
