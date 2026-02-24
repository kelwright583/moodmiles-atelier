import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivitySuggestion, TripEvent } from "@/types/database";
import {
  RefreshCw, Star, MapPin, ChevronLeft, ChevronRight,
  Plus, Pin, PinOff, Trash2, Calendar, X, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface ThingsToDoTabProps {
  tripId: string;
  trip: {
    destination: string;
    country: string | null;
    trip_type: string | null;
    latitude: number | null;
    longitude: number | null;
  };
}

const categoryColors: Record<string, string> = {
  Culture: "text-purple-400",
  Dining: "text-orange-400",
  Nightlife: "text-pink-400",
  Shopping: "text-emerald-400",
  Outdoor: "text-sky-400",
  Experience: "text-amber-400",
};

const ThingsToDoTab = ({ tripId, trip }: ThingsToDoTabProps) => {
  const queryClient = useQueryClient();
  const [generatingActivities, setGeneratingActivities] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Events state
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");

  const { data: events = [] } = useQuery({
    queryKey: ["trip-events", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_events").select("*").eq("trip_id", tripId).order("event_date", { ascending: true });
      if (error) throw error;
      return data as TripEvent[];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activity-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_suggestions").select("*").eq("trip_id", tripId).order("created_at", { ascending: true });
      if (error) throw error;
      return data as ActivitySuggestion[];
    },
  });

  const generateActivities = async () => {
    setGeneratingActivities(true);
    try {
      const { error } = await supabase.functions.invoke("suggest-activities", {
        body: { trip_id: tripId, destination: trip.destination, country: trip.country, trip_type: trip.trip_type, latitude: trip.latitude, longitude: trip.longitude },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["activity-suggestions", tripId] });
      toast({ title: "Activities found!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingActivities(false);
    }
  };

  const addEvent = async () => {
    if (!name) return;
    const { error } = await supabase.from("trip_events").insert({ trip_id: tripId, event_name: name, event_type: type || null, event_date: date || null, location: location || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
    setOpen(false);
    setName(""); setType(""); setDate(""); setLocation("");
  };

  const togglePin = async (event: TripEvent) => {
    await supabase.from("trip_events").update({ is_pinned: !event.is_pinned }).eq("id", event.id);
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("trip_events").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
  };

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    }
  };

  const pinnedEvents = events.filter((e) => e.is_pinned);
  const otherEvents = events.filter((e) => !e.is_pinned);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 md:space-y-12">
      {/* AI-Suggested Activities - Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <MapPin size={14} className="text-primary" /> Suggested Experiences
          </h2>
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
            <Button variant="champagne-outline" size="sm" onClick={generateActivities} disabled={generatingActivities}>
              <RefreshCw size={14} className={generatingActivities ? "animate-spin" : ""} />
              {generatingActivities ? "Finding..." : activities.length > 0 ? "Refresh" : "Discover"}
            </Button>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <MapPin size={32} className="text-primary mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-body text-sm mb-4">
              Discover curated experiences, restaurants, and hidden gems in {trip.destination}.
            </p>
            <Button variant="champagne" size="sm" onClick={generateActivities} disabled={generatingActivities}>
              {generatingActivities ? "Discovering..." : "Find Things to Do"}
            </Button>
          </div>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
              style={{ scrollSnapType: "x mandatory" }}
            >
              {activities.map((activity, i) => (
                <div
                  key={activity.id}
                  onClick={() => { setStartIndex(i); setFeedOpen(true); }}
                  className="relative min-w-[260px] max-w-[280px] shrink-0 rounded-2xl overflow-hidden cursor-pointer group hover:shadow-champagne transition-all duration-500"
                  style={{ scrollSnapAlign: "start" }}
                >
                  {activity.image_url ? (
                    <div className="aspect-[4/5] bg-secondary overflow-hidden">
                      <img src={activity.image_url} alt={activity.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                  ) : (
                    <div className="aspect-[4/5] bg-secondary flex items-center justify-center">
                      <MapPin size={32} className="text-muted-foreground/20" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] tracking-[0.2em] uppercase font-body ${categoryColors[activity.category || ""] || "text-primary"}`}>
                        {activity.category}
                      </span>
                      {activity.rating && (
                        <span className="flex items-center gap-0.5 text-xs text-primary">
                          <Star size={10} className="fill-primary" /> {activity.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-heading text-lg leading-tight text-foreground">{activity.name}</h3>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/50 font-body text-center">
              Tap to explore · Scroll for more
            </p>
          </>
        )}
      </section>

      {/* Instagram-style Vertical Feed Overlay */}
      <AnimatePresence>
        {feedOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto"
          >
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm tracking-[0.15em] uppercase text-muted-foreground font-body flex items-center gap-2">
                <MapPin size={12} className="text-primary" /> Experiences
              </h3>
              <button onClick={() => setFeedOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X size={18} className="text-foreground" />
              </button>
            </div>

            <div className="max-w-lg mx-auto pb-20">
              {activities.slice(startIndex).concat(activities.slice(0, startIndex)).map((activity) => (
                <ActivityFeedCard key={activity.id} activity={activity} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pinned Events */}
      {pinnedEvents.length > 0 && (
        <section>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 font-body flex items-center gap-2">
            <Pin size={14} className="text-primary" /> Pinned Events
          </h2>
          <div className="space-y-3">
            {pinnedEvents.map((e) => (
              <EventRow key={e.id} event={e} onTogglePin={togglePin} onDelete={deleteEvent} />
            ))}
          </div>
        </section>
      )}

      {/* User's Events */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Calendar size={14} className="text-primary" /> Your Events
          </h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Event</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-heading">Add Event</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
                <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (Fashion, Cultural, etc.)" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border h-11 text-foreground font-body" />
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
                <Button variant="champagne" onClick={addEvent} className="w-full">Add Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {otherEvents.length === 0 && pinnedEvents.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-body text-sm">No events yet. Add your own events or discover suggestions above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {otherEvents.map((e) => (
              <EventRow key={e.id} event={e} onTogglePin={togglePin} onDelete={deleteEvent} />
            ))}
          </div>
        )}
      </section>
    </motion.div>
  );
};

/* ── Activity Feed Card ── */

const ActivityFeedCard = ({ activity }: { activity: ActivitySuggestion }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    className="border-b border-border"
  >
    {activity.image_url ? (
      <div className="w-full aspect-[4/5] bg-secondary overflow-hidden">
        <img src={activity.image_url} alt={activity.name} className="w-full h-full object-cover" />
      </div>
    ) : (
      <div className="w-full aspect-[4/5] bg-secondary flex items-center justify-center">
        <MapPin size={40} className="text-muted-foreground/20" />
      </div>
    )}

    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] tracking-[0.2em] uppercase font-body ${categoryColors[activity.category || ""] || "text-primary"}`}>
          {activity.category}
        </span>
        {activity.rating && (
          <span className="flex items-center gap-0.5 text-xs text-primary">
            <Star size={10} className="fill-primary" /> {activity.rating.toFixed(1)}
          </span>
        )}
        {activity.price_level && (
          <span className="text-xs text-muted-foreground font-body">{activity.price_level}</span>
        )}
      </div>
      <h3 className="font-heading text-xl leading-tight mb-1">{activity.name}</h3>
      <p className="text-sm text-muted-foreground font-body leading-relaxed">{activity.description}</p>
      {activity.location && (
        <p className="text-xs text-muted-foreground/70 font-body mt-2 flex items-center gap-1">
          <MapPin size={10} /> {activity.location}
        </p>
      )}
      {activity.source_url && (
        <a
          href={activity.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary font-body hover:underline"
        >
          <ExternalLink size={12} /> Explore this
        </a>
      )}
    </div>
  </motion.div>
);

/* ── Event Row ── */

const EventRow = ({ event, onTogglePin, onDelete }: { event: TripEvent; onTogglePin: (e: TripEvent) => void; onDelete: (id: string) => void }) => (
  <div className="glass-card rounded-xl p-4 md:p-5 flex items-center justify-between hover:shadow-champagne transition-all duration-300">
    <div className="min-w-0 flex-1">
      <h3 className="font-heading text-base truncate">{event.event_name}</h3>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-body">
        {event.event_date && <span>{new Date(event.event_date).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>}
        {event.location && <span className="flex items-center gap-1 truncate"><MapPin size={10} />{event.location}</span>}
      </div>
    </div>
    <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
      {event.event_type && <span className="hidden sm:inline text-xs tracking-[0.15em] uppercase text-primary font-body bg-secondary px-3 py-1 rounded-full">{event.event_type}</span>}
      <button onClick={() => onTogglePin(event)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
        {event.is_pinned ? <PinOff size={14} className="text-primary" /> : <Pin size={14} className="text-muted-foreground" />}
      </button>
      <button onClick={() => onDelete(event.id)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
        <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  </div>
);

export default ThingsToDoTab;
