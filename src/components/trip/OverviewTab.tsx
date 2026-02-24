import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TripEvent } from "@/types/database";
import { Calendar, MapPin, Plus, Pin, PinOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const OverviewTab = ({ tripId }: { tripId: string }) => {
  const queryClient = useQueryClient();
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

  const pinnedEvents = events.filter((e) => e.is_pinned);
  const otherEvents = events.filter((e) => !e.is_pinned);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
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

      {/* All Events */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Calendar size={14} className="text-primary" /> Events
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
            <p className="text-muted-foreground font-body text-sm">No events yet. Add events to your trip to plan outfits around them.</p>
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
  <div className="glass-card rounded-xl p-5 flex items-center justify-between hover:shadow-champagne transition-all duration-300">
    <div>
      <h3 className="font-heading text-base">{event.event_name}</h3>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-body">
        {event.event_date && <span>{new Date(event.event_date).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>}
        {event.location && <span className="flex items-center gap-1"><MapPin size={10} />{event.location}</span>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {event.event_type && <span className="text-xs tracking-[0.15em] uppercase text-primary font-body bg-secondary px-3 py-1 rounded-full">{event.event_type}</span>}
      <button onClick={() => onTogglePin(event)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
        {event.is_pinned ? <PinOff size={14} className="text-primary" /> : <Pin size={14} className="text-muted-foreground" />}
      </button>
      <button onClick={() => onDelete(event.id)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
        <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  </div>
);

export default OverviewTab;
