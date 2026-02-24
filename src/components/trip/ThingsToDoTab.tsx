import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivitySuggestion, TripEvent } from "@/types/database";
import {
  RefreshCw, Star, MapPin, ChevronLeft, ChevronRight,
  Plus, Pin, PinOff, Trash2, Calendar,
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Events (user-created)
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
      const { data, error } = await supabase
        .from("activity_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ActivitySuggestion[];
    },
  });

  const generateActivities = async () => {
    setGeneratingActivities(true);
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
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="glass-card rounded-xl min-w-[280px] max-w-[300px] shrink-0 hover:shadow-champagne transition-all duration-300 overflow-hidden"
                style={{ scrollSnapAlign: "start" }}
              >
                {activity.image_url && (
                  <div className="w-full h-36 overflow-hidden bg-secondary">
                    <img src={activity.image_url} alt={activity.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading text-base leading-tight">{activity.name}</h3>
                    {activity.rating && (
                      <span className="flex items-center gap-1 text-xs text-primary shrink-0">
                        <Star size={10} className="fill-primary" />
                        {activity.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-body tracking-wider uppercase ${categoryColors[activity.category || ""] || "text-muted-foreground"}`}>
                      {activity.category}
                    </span>
                    {activity.price_level && (
                      <span className="text-xs text-muted-foreground font-body">{activity.price_level}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-body leading-relaxed line-clamp-3">{activity.description}</p>
                  {activity.location && (
                    <p className="text-xs text-muted-foreground/70 font-body mt-2 flex items-center gap-1 truncate">
                      <MapPin size={10} /> {activity.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* User's Planned Events */}
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
