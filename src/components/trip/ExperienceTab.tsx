import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivitySuggestion, TripEvent } from "@/types/database";
import {
  X, ChevronLeft, ChevronRight, Globe, MapPin, Star, Bookmark,
  BookmarkCheck, Ticket, CalendarPlus, ArrowRight,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const categoryColors: Record<string, string> = {
  Culture: "text-purple-400",
  Dining: "text-orange-400",
  Nightlife: "text-pink-400",
  Shopping: "text-live-text",
  Outdoor: "text-sky-400",
  Experience: "text-amber-400",
};

interface ExperienceTabProps {
  tripId: string;
  trip: {
    destination: string;
    country: string | null;
    trip_type: string | null;
    latitude: number | null;
    longitude: number | null;
    start_date: string;
    end_date: string;
    user_id: string;
  };
  onNavigateToEvents?: () => void;
}

const ExperienceTab = ({ tripId, trip, onNavigateToEvents }: ExperienceTabProps) => {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const { data: activities = [] } = useQuery({
    queryKey: ["activity-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ActivitySuggestion[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["trip-events", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_events")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data as TripEvent[];
    },
  });

  const generateActivities = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("suggest-activities", {
        body: {
          trip_id: tripId,
          destination: trip.destination,
          country: trip.country,
          trip_type: trip.trip_type,
          latitude: trip.latitude,
          longitude: trip.longitude,
        },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["activity-suggestions", tripId] });
      toast({ title: "Experiences found!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not discover experiences.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const addToEvents = async (activity: ActivitySuggestion) => {
    const existing = events.find((e) => e.event_name === activity.name);
    if (existing) {
      toast({ title: "Already in your events", description: activity.name });
      return;
    }
    const { error } = await supabase.from("trip_events").insert({
      trip_id: tripId,
      event_name: activity.name,
      event_type: activity.category || null,
      location: activity.location || null,
      notes: activity.booking_url ? `Book: ${activity.booking_url}` : (activity.source_url || null),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
    toast({ title: "Added to Events", description: activity.name });
  };

  const isInEvents = (name: string) => events.some((e) => e.event_name === name);
  const scroll = (dir: "left" | "right") =>
    scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="eyebrow text-muted-foreground flex items-center gap-2">
            <MapPin size={14} className="text-primary" /> Curated Experiences
          </h2>
          <p className="text-xs text-muted-foreground/60 font-body mt-1">
            Discover things to do in {trip.destination} — then add them to your Events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activities.length > 0 && (
            <>
              <button onClick={() => scroll("left")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ChevronLeft size={16} className="text-muted-foreground" />
              </button>
              <button onClick={() => scroll("right")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </>
          )}
          <Button variant="champagne-outline" size="sm" onClick={generateActivities} disabled={generating}>
            <Globe size={14} className={generating ? "animate-spin" : ""} />
            {generating ? "Finding…" : activities.length > 0 ? "Refresh" : "Discover"}
          </Button>
        </div>
      </div>

      {/* Cards or empty state */}
      {activities.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <Globe size={40} className="text-primary mx-auto mb-4 opacity-40" />
          <p className="text-muted-foreground font-body text-sm mb-2">
            Curated restaurants, sights and experiences in {trip.destination}.
          </p>
          <p className="text-xs text-muted-foreground/50 font-body mb-6">
            Tap any experience to add it directly to your Events tab.
          </p>
          <Button variant="champagne" size="sm" onClick={generateActivities} disabled={generating}>
            {generating ? "Discovering…" : "Find Experiences"}
          </Button>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {activities.map((a, i) => (
              <div
                key={a.id}
                onClick={() => { setStartIndex(i); setFeedOpen(true); }}
                className="relative min-w-[260px] max-w-[280px] shrink-0 rounded-2xl overflow-hidden cursor-pointer group hover:glow-gold transition-all duration-500"
                style={{ scrollSnapAlign: "start" }}
              >
                <div className="group-hover:[&_img]:scale-105 transition-transform duration-700">
                  <ImageWithFallback
                    src={a.image_url}
                    alt={a.name}
                    fallbackIcon={MapPin}
                    aspectClass="aspect-[4/5]"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className={`eyebrow ${categoryColors[a.category || ""] || "text-primary"}`}>
                    {a.category}
                  </span>
                  <h3 className="font-heading text-2xl leading-tight text-foreground">{a.name}</h3>
                  {isInEvents(a.name) && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-primary font-body">
                      <BookmarkCheck size={10} /> In your events
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/50 font-body text-center">
            Tap to explore · Add to Events to include in your itinerary
          </p>
        </>
      )}

      {/* Full-screen feed */}
      <AnimatePresence>
        {feedOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="eyebrow text-muted-foreground flex items-center gap-2">
                <MapPin size={12} className="text-primary" /> Experiences in {trip.destination}
              </h3>
              <button onClick={() => setFeedOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="max-w-lg mx-auto pb-20 pt-4">
              {activities
                .slice(startIndex)
                .concat(activities.slice(0, startIndex))
                .map((a) => (
                  <ActivityCard
                    key={a.id}
                    activity={a}
                    isInEvents={isInEvents(a.name)}
                    onAddToEvents={() => addToEvents(a)}
                    onNavigateToEvents={() => { setFeedOpen(false); onNavigateToEvents?.(); }}
                  />
                ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const ActivityCard = ({
  activity,
  isInEvents,
  onAddToEvents,
  onNavigateToEvents,
}: {
  activity: ActivitySuggestion;
  isInEvents: boolean;
  onAddToEvents: () => void;
  onNavigateToEvents: () => void;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    className="rounded-2xl overflow-hidden bg-card mx-4 mb-5"
  >
    <ImageWithFallback
      src={activity.image_url}
      alt={activity.name}
      fallbackIcon={MapPin}
      aspectClass="w-full aspect-[4/5]"
    />

    {/* Action bar */}
    <div className="px-4 pt-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isInEvents ? (
          <button
            onClick={onNavigateToEvents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-body"
          >
            <BookmarkCheck size={12} /> In Events <ArrowRight size={12} />
          </button>
        ) : (
          <button
            onClick={onAddToEvents}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground text-xs font-body transition-colors"
          >
            <CalendarPlus size={12} /> Add to Events
          </button>
        )}
      </div>
      {activity.booking_url && (
        <a
          href={activity.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gold text-primary-foreground text-xs font-body"
        >
          <Ticket size={12} /> Book
        </a>
      )}
    </div>

    {/* Info */}
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`eyebrow ${categoryColors[activity.category || ""] || "text-primary"}`}>
          {activity.category}
        </span>
        {activity.rating && (
          <span className="text-xs text-primary flex items-center gap-0.5">
            <Star size={10} className="fill-primary" /> {activity.rating.toFixed(1)}
          </span>
        )}
        {activity.price_from && (
          <span className="text-xs text-muted-foreground font-body ml-auto">{activity.price_from}</span>
        )}
      </div>
      <h3 className="font-heading text-2xl leading-tight mb-1">{activity.name}</h3>
      <p className="text-sm text-muted-foreground font-body leading-relaxed">{activity.description}</p>
      {activity.location && (
        <p className="text-xs text-muted-foreground font-body mt-2 flex items-center gap-1">
          <MapPin size={10} /> {activity.location}
        </p>
      )}
    </div>
  </motion.div>
);

export default ExperienceTab;
