import { useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trip } from "@/types/database";
import { Calendar, MapPin, Pencil, Trash2 } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import OverviewTab from "@/components/trip/OverviewTab";
import ThingsToDoTab from "@/components/trip/ThingsToDoTab";
import InspirationTab from "@/components/trip/InspirationTab";
import PackingTab from "@/components/trip/PackingTab";
import BoardTab from "@/components/trip/BoardTab";
import TripEditDialog from "@/components/trip/TripEditDialog";
import TripDeleteDialog from "@/components/trip/TripDeleteDialog";
import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";

const tabs = ["Overview", "Things to Do", "Inspiration", "Packing", "Board"] as const;
type Tab = typeof tabs[number];

const TripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 md:pt-28 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <ShimmerSkeleton variant="card" className="h-56 rounded-2xl mb-8" />
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <ShimmerSkeleton key={i} variant="text" className="h-10 flex-1 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
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
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
            <div>
              <span className="text-xs tracking-[0.2em] uppercase text-primary font-body">{trip.trip_type || "Trip"}</span>
              <h1 className="text-3xl md:text-5xl font-heading mt-1">{trip.destination}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
                <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" /> {formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
                {trip.country && <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {trip.country}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEditOpen(true)} className="w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-colors" aria-label="Edit trip">
                <Pencil size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => setDeleteOpen(true)} className="w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/20 transition-colors" aria-label="Delete trip">
                <Trash2 size={14} className="text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-1 mt-6 md:mt-8 mb-8 md:mb-12 border-b border-border overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 md:px-5 py-3 text-sm font-body tracking-wide transition-all duration-300 relative whitespace-nowrap ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
                {activeTab === tab && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-champagne" />}
              </button>
            ))}
          </div>

          {activeTab === "Overview" && <OverviewTab tripId={trip.id} trip={{ latitude: trip.latitude ?? undefined, longitude: trip.longitude ?? undefined, start_date: trip.start_date, end_date: trip.end_date }} />}
          {activeTab === "Things to Do" && <ThingsToDoTab tripId={trip.id} trip={{ destination: trip.destination, country: trip.country, trip_type: trip.trip_type, latitude: trip.latitude, longitude: trip.longitude }} />}
          {activeTab === "Inspiration" && <InspirationTab tripId={trip.id} trip={{ destination: trip.destination, country: trip.country, trip_type: trip.trip_type, latitude: trip.latitude, longitude: trip.longitude, start_date: trip.start_date, end_date: trip.end_date }} />}
          {activeTab === "Packing" && <PackingTab tripId={trip.id} trip={{ destination: trip.destination, country: trip.country, origin_city: trip.origin_city, origin_country: trip.origin_country, start_date: trip.start_date, end_date: trip.end_date, trip_type: trip.trip_type }} />}
          {activeTab === "Board" && <BoardTab tripId={trip.id} />}
        </div>
      </main>

      <TripEditDialog trip={trip} open={editOpen} onOpenChange={setEditOpen} />
      <TripDeleteDialog tripId={trip.id} destination={trip.destination} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
};

export default TripDetail;
