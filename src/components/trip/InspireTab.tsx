import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivitySuggestion, BoardItem, TripEvent } from "@/types/database";
import {
  X, ChevronLeft, ChevronRight, Globe, MapPin, Star, Bookmark, BookmarkCheck, Ticket,
  Grid3X3, Plus, Trash2, ImagePlus, Copy,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SaveToOtherBoardDialog } from "./SaveToOtherBoardDialog";
import InspirationTab from "./InspirationTab";

const categoryColors: Record<string, string> = {
  Culture: "text-purple-400",
  Dining: "text-orange-400",
  Nightlife: "text-pink-400",
  Shopping: "text-emerald-400",
  Outdoor: "text-sky-400",
  Experience: "text-amber-400",
};

interface InspireTabProps {
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
    trip_theme?: string | null;
  };
  initialSearch?: string;
  initialEventId?: string;
}

const InspireTab = ({ tripId, trip, initialSearch, initialEventId }: InspireTabProps) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 md:space-y-16">
    <InspirationTab
      tripId={tripId}
      trip={trip}
      initialSearch={initialSearch}
      initialEventId={initialEventId}
    />
    <ExperiencesSection tripId={tripId} trip={trip} />
    <MoodBoardSection tripId={tripId} />
  </motion.div>
);

/* ── Experiences (curated activities) ── */
const ExperiencesSection = ({ tripId, trip }: { tripId: string; trip: InspireTabProps["trip"] }) => {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  const { data: activities = [] } = useQuery({
    queryKey: ["activity-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_suggestions").select("*").eq("trip_id", tripId).order("created_at", { ascending: true });
      if (error) throw error;
      return data as ActivitySuggestion[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["trip-events", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_events").select("*").eq("trip_id", tripId);
      if (error) throw error;
      return data as TripEvent[];
    },
  });

  const generateActivities = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("suggest-activities", {
        body: { trip_id: tripId, destination: trip.destination, country: trip.country, trip_type: trip.trip_type, latitude: trip.latitude, longitude: trip.longitude },
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

  const addToPlan = async (activity: ActivitySuggestion) => {
    const existing = events.find((e) => e.event_name === activity.name);
    if (existing) {
      toast({ title: "Already in plan", description: activity.name });
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
    } else {
      queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
      toast({ title: "Added to plan", description: activity.name });
    }
  };

  const isInPlan = (name: string) => events.some((e) => e.event_name === name);
  const scroll = (dir: "left" | "right") => scrollRef.current?.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
          <MapPin size={14} className="text-primary" /> Curated Experiences
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
          <Button variant="champagne-outline" size="sm" onClick={generateActivities} disabled={generating}>
            <Globe size={14} className={generating ? "animate-spin" : ""} />
            {generating ? "Finding…" : activities.length > 0 ? "Refresh" : "Discover"}
          </Button>
        </div>
      </div>
      {activities.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <Globe size={32} className="text-primary mx-auto mb-3 opacity-50" />
          <p className="text-muted-foreground font-body text-sm mb-4">Curated restaurants, sights, and experiences in {trip.destination}.</p>
          <Button variant="champagne" size="sm" onClick={generateActivities} disabled={generating}>
            {generating ? "Discovering…" : "Find Experiences"}
          </Button>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1" style={{ scrollSnapType: "x mandatory" }}>
            {activities.map((a, i) => (
              <div
                key={a.id}
                onClick={() => { setStartIndex(i); setFeedOpen(true); }}
                className="relative min-w-[260px] max-w-[280px] shrink-0 rounded-2xl overflow-hidden cursor-pointer group hover:shadow-champagne transition-all duration-500"
                style={{ scrollSnapAlign: "start" }}
              >
                <div className="group-hover:[&_img]:scale-105 transition-transform duration-700">
                  <ImageWithFallback src={a.image_url} alt={a.name} fallbackIcon={MapPin} aspectClass="aspect-[4/5]" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className={`text-[10px] tracking-[0.2em] uppercase font-body ${categoryColors[a.category || ""] || "text-primary"}`}>{a.category}</span>
                  <h3 className="font-heading text-2xl leading-tight text-foreground">{a.name}</h3>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground/50 font-body text-center mt-2">Tap to explore · Add to Plan to include in your itinerary</p>
        </>
      )}

      <AnimatePresence>
        {feedOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background overflow-y-auto">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm tracking-[0.15em] uppercase text-muted-foreground font-body flex items-center gap-2">
                <MapPin size={12} className="text-primary" /> Experiences in {trip.destination}
              </h3>
              <button onClick={() => setFeedOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="max-w-lg mx-auto pb-20 pt-4">
              {activities.slice(startIndex).concat(activities.slice(0, startIndex)).map((a) => (
                <ActivityCard key={a.id} activity={a} isInPlan={isInPlan(a.name)} onAddToPlan={() => addToPlan(a)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

const ActivityCard = ({ activity, isInPlan, onAddToPlan }: { activity: ActivitySuggestion; isInPlan: boolean; onAddToPlan: () => void }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} className="rounded-2xl overflow-hidden bg-card mx-4 mb-5">
    <ImageWithFallback src={activity.image_url} alt={activity.name} fallbackIcon={MapPin} aspectClass="w-full aspect-[4/5]" />
    <div className="px-4 pt-3 flex items-center justify-between">
      <button onClick={onAddToPlan} className={`p-2.5 rounded-xl transition-colors ${isInPlan ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
        {isInPlan ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
      </button>
      {activity.booking_url && (
        <a href={activity.booking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-champagne text-primary-foreground text-xs font-body">
          <Ticket size={12} /> Book
        </a>
      )}
    </div>
    <div className="px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-[10px] tracking-[0.2em] uppercase font-body ${categoryColors[activity.category || ""] || "text-primary"}`}>{activity.category}</span>
        {activity.rating && <span className="text-xs text-primary flex items-center gap-0.5"><Star size={10} className="fill-primary" /> {activity.rating.toFixed(1)}</span>}
      </div>
      <h3 className="font-heading text-2xl leading-tight mb-1">{activity.name}</h3>
      <p className="text-sm text-muted-foreground font-body leading-relaxed">{activity.description}</p>
      {activity.location && <p className="text-xs text-muted-foreground font-body mt-2 flex items-center gap-1"><MapPin size={10} /> {activity.location}</p>}
    </div>
  </motion.div>
);

/* ── Mood Board with Save to other trips ── */
const MoodBoardSection = ({ tripId }: { tripId: string }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [saveToOtherOpen, setSaveToOtherOpen] = useState(false);
  const [saveToOtherItem, setSaveToOtherItem] = useState<BoardItem | null>(null);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["board-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("board_items").select("*").eq("trip_id", tripId).order("order_index");
      if (error) throw error;
      return data as BoardItem[];
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const addItem = async () => {
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      if (file && user) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("board-images").upload(path, file, { upsert: false });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("board-images").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }
      const { error } = await supabase.from("board_items").insert({
        trip_id: tripId,
        image_url: imageUrl,
        description: description || null,
        notes: notes || null,
        order_index: items.length,
        pinned_by: user?.id || null,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
      setOpen(false);
      setDescription(""); setNotes(""); setFile(null); setPreviewUrl(null);
      toast({ title: "Added to board" });
    } catch (err: any) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (item: BoardItem) => {
    if (item.image_url && user) {
      const path = item.image_url.split("/board-images/")[1];
      if (path) await supabase.storage.from("board-images").remove([path]);
    }
    await supabase.from("board_items").delete().eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
  };

  const openSaveToOther = (item: BoardItem) => {
    setSaveToOtherItem(item);
    setSaveToOtherOpen(true);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
          <Grid3X3 size={14} className="text-primary" /> Mood Board
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-heading">Add to Board</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div onClick={() => fileRef.current?.click()} className="w-full aspect-video rounded-xl bg-secondary border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex items-center justify-center transition-colors overflow-hidden">
                {previewUrl ? <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" /> : (
                  <div className="text-center">
                    <ImagePlus size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground font-body">Click to upload image</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="bg-secondary border-border h-11" />
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes…" className="bg-secondary border-border min-h-[80px]" />
              <Button variant="champagne" onClick={addItem} className="w-full" disabled={uploading}>
                {uploading ? "Uploading…" : "Add to Board"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Grid3X3 size={32} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-body text-sm">Pin looks from above, upload your own images, or add notes. Your private scrapbook for this trip.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="break-inside-avoid glass-card rounded-xl overflow-hidden group relative hover:shadow-champagne transition-all duration-300">
              <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openSaveToOther(item)} className="p-1.5 rounded-lg bg-card/80 backdrop-blur-sm" title="Save to another trip">
                  <Copy size={14} className="text-muted-foreground hover:text-primary" />
                </button>
                <button onClick={() => deleteItem(item)} className="p-1.5 rounded-lg bg-card/80 backdrop-blur-sm">
                  <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                </button>
              </div>
              {item.image_url ? (
                <img src={item.image_url} alt={item.description || ""} className="w-full object-cover" />
              ) : (
                <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                  <Grid3X3 size={24} className="text-muted-foreground/20" />
                </div>
              )}
              {(item.description || item.notes) && (
                <div className="p-4">
                  {item.description && <p className="text-sm font-body text-foreground">{item.description}</p>}
                  {item.notes && <p className="text-xs text-muted-foreground font-body mt-1">{item.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground font-body mt-6 text-center">
        Hover items to save to another trip&apos;s board
      </p>

      {saveToOtherItem && (
        <SaveToOtherBoardDialog
          open={saveToOtherOpen}
          onOpenChange={setSaveToOtherOpen}
          currentTripId={tripId}
          item={{ image_url: saveToOtherItem.image_url, description: saveToOtherItem.description, notes: saveToOtherItem.notes }}
          onSaved={() => setSaveToOtherItem(null)}
        />
      )}
    </section>
  );
};

export default InspireTab;
