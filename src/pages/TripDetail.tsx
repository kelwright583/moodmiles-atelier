import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trip } from "@/types/database";
import { Calendar, MapPin } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import OverviewTab from "@/components/trip/OverviewTab";
import CapsuleTab from "@/components/trip/CapsuleTab";
import PackingTab from "@/components/trip/PackingTab";
import BoardTab from "@/components/trip/BoardTab";

const tabs = ["Overview", "Capsule", "Packing", "Board"] as const;
type Tab = typeof tabs[number];

const TripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Trip;
    },
    enabled: !!id,
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gradient-champagne animate-pulse" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-body">Trip not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <div className="relative h-44 md:h-56 overflow-hidden bg-secondary">
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        <div className="absolute bottom-6 left-4 right-4 md:bottom-8 md:left-8 md:right-8 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs tracking-[0.2em] uppercase text-primary font-body">{trip.trip_type || "Trip"}</span>
            <h1 className="text-3xl md:text-5xl font-heading mt-1">{trip.destination}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
              <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" /> {formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
              {trip.country && <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {trip.country}</span>}
            </div>
          </motion.div>
        </div>
      </div>

      <main className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-1 mt-6 md:mt-8 mb-8 md:mb-12 border-b border-border overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-3 text-sm font-body tracking-wide transition-all duration-300 relative ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
                {activeTab === tab && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-champagne" />}
              </button>
            ))}
          </div>

          {activeTab === "Overview" && <OverviewTab tripId={trip.id} trip={{ latitude: (trip as any).latitude, longitude: (trip as any).longitude, start_date: trip.start_date, end_date: trip.end_date }} />}
          {activeTab === "Capsule" && <CapsuleTab tripId={trip.id} />}
          {activeTab === "Packing" && <PackingTab tripId={trip.id} />}
          {activeTab === "Board" && <BoardTab tripId={trip.id} />}
        </div>
      </main>
    </div>
  );
};

export default TripDetail;
