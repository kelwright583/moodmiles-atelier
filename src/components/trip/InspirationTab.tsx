import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OutfitSuggestion, OutfitItem, TripEvent, WeatherData } from "@/types/database";
import {
  Sparkles, RefreshCw, Pin, ExternalLink, ShoppingBag, Shirt, Footprints,
  Watch, Briefcase, Gem, Palette, X, ChevronLeft, ChevronRight, Heart, ArrowDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const categoryIcons: Record<string, any> = {
  Top: Shirt, Bottom: Palette, Outerwear: Briefcase,
  Shoes: Footprints, Accessory: Watch, Bag: Gem,
};

const retailers = [
  { name: "Amazon", url: (q: string) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}` },
  { name: "ASOS", url: (q: string) => `https://www.asos.com/search/?q=${encodeURIComponent(q)}` },
  { name: "NET-A-PORTER", url: (q: string) => `https://www.net-a-porter.com/en-us/shop/search/${encodeURIComponent(q)}` },
  { name: "Zara", url: (q: string) => `https://www.zara.com/us/en/search?searchTerm=${encodeURIComponent(q)}` },
];

interface InspirationTabProps {
  tripId: string;
  trip: {
    destination: string;
    country: string | null;
    trip_type: string | null;
    latitude: number | null;
    longitude: number | null;
    start_date: string;
    end_date: string;
  };
}

const InspirationTab = ({ tripId, trip }: InspirationTabProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [generatingOutfits, setGeneratingOutfits] = useState(false);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: outfits = [] } = useQuery({
    queryKey: ["outfit-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as OutfitSuggestion[];
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

  const { data: weather = [] } = useQuery({
    queryKey: ["weather", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("weather_data").select("*").eq("trip_id", tripId).order("date", { ascending: true }).limit(7);
      if (error) throw error;
      return data as WeatherData[];
    },
  });

  const buildContext = () => {
    const weatherSummary = weather.length > 0
      ? weather.map(w => `${w.date}: ${w.description}, ${Math.round(w.temperature_high || 0)}°/${Math.round(w.temperature_low || 0)}°`).join("; ")
      : undefined;
    const eventsSummary = events.length > 0
      ? events.map(e => `${e.event_name}${e.event_type ? ` (${e.event_type})` : ""}${e.event_date ? ` on ${e.event_date}` : ""}`).join("; ")
      : undefined;
    return { weatherSummary, eventsSummary };
  };

  const generateOutfits = async () => {
    setGeneratingOutfits(true);
    try {
      const { weatherSummary, eventsSummary } = buildContext();
      const { error } = await supabase.functions.invoke("generate-outfits", {
        body: { trip_id: tripId, destination: trip.destination, country: trip.country, trip_type: trip.trip_type, weather_summary: weatherSummary, events_summary: eventsSummary },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
      toast({ title: "Looks generated!", description: "Street-style outfit inspiration is ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingOutfits(false);
    }
  };

  const seeMoreLikeThis = async (outfit: OutfitSuggestion) => {
    setGeneratingMore(true);
    try {
      const { weatherSummary, eventsSummary } = buildContext();
      const { error } = await supabase.functions.invoke("generate-outfits", {
        body: {
          trip_id: tripId, destination: trip.destination, country: trip.country, trip_type: trip.trip_type,
          weather_summary: weatherSummary, events_summary: eventsSummary,
          similar_to: { title: outfit.title, occasion: outfit.occasion, description: outfit.description },
        },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
      toast({ title: "More looks added!", description: "Similar styles have been added to your feed." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingMore(false);
    }
  };

  const togglePin = async (outfit: OutfitSuggestion) => {
    await supabase.from("outfit_suggestions").update({ pinned: !outfit.pinned } as any).eq("id", outfit.id);
    queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
  };

  const pinToBoard = async (outfit: OutfitSuggestion) => {
    if (!user) return;
    try {
      const itemsSummary = (outfit.items as unknown as OutfitItem[]).map(i => `${i.name} (${i.brand_suggestion || i.color})`).join(", ");
      const { error } = await supabase.from("board_items").insert({
        trip_id: tripId,
        image_url: outfit.image_url,
        description: `${outfit.title} — ${outfit.occasion}`,
        notes: `${outfit.description}\n\nItems: ${itemsSummary}`,
        order_index: 0,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
      toast({ title: "Pinned to Board!", description: `"${outfit.title}" saved to your mood board.` });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === "left" ? -320 : 320, behavior: "smooth" });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> Get the Look
          </h2>
          <p className="text-xs text-muted-foreground/70 font-body mt-1">
            AI-styled street looks for {trip.destination}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {outfits.length > 0 && (
            <>
              <button onClick={() => scroll("left")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ChevronLeft size={16} className="text-muted-foreground" />
              </button>
              <button onClick={() => scroll("right")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            </>
          )}
          <Button variant="champagne-outline" size="sm" onClick={generateOutfits} disabled={generatingOutfits || generatingMore}>
            <RefreshCw size={14} className={generatingOutfits ? "animate-spin" : ""} />
            {generatingOutfits ? "Styling..." : outfits.length > 0 ? "Regenerate" : "Generate Looks"}
          </Button>
        </div>
      </div>

      {outfits.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Sparkles size={40} className="text-primary mx-auto mb-4 opacity-40" />
          <h3 className="font-heading text-xl mb-2">Your Style Awaits</h3>
          <p className="text-muted-foreground font-body text-sm mb-6 max-w-md mx-auto">
            Generate AI-curated outfit boards with street-style visuals, tailored to {trip.destination}'s weather, events, and vibe.
          </p>
          <Button variant="champagne" onClick={generateOutfits} disabled={generatingOutfits}>
            <Sparkles size={16} />
            {generatingOutfits ? "Generating looks..." : "Generate Outfit Inspiration"}
          </Button>
          {generatingOutfits && (
            <p className="text-xs text-muted-foreground/60 font-body mt-4 animate-pulse">
              Creating 15 street-style looks with visuals — this may take a moment...
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Horizontal Carousel */}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {outfits.map((outfit, i) => (
              <div
                key={outfit.id}
                onClick={() => { setStartIndex(i); setFeedOpen(true); }}
                className="relative min-w-[260px] max-w-[280px] shrink-0 rounded-2xl overflow-hidden cursor-pointer group hover:shadow-champagne transition-all duration-500"
                style={{ scrollSnapAlign: "start" }}
              >
                {outfit.image_url ? (
                  <div className="aspect-[3/4] bg-secondary overflow-hidden">
                    <img src={outfit.image_url} alt={outfit.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                ) : (
                  <div className="aspect-[3/4] bg-secondary flex items-center justify-center">
                    <Sparkles size={32} className="text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">{outfit.occasion}</span>
                  <h3 className="font-heading text-lg leading-tight text-foreground">{outfit.title}</h3>
                </div>
                {outfit.pinned && (
                  <div className="absolute top-3 right-3">
                    <Pin size={14} className="text-primary fill-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground/50 font-body text-center">
            Tap a look to explore · Scroll for more
          </p>
        </>
      )}

      {/* Instagram-style Vertical Feed Overlay */}
      <AnimatePresence>
        {feedOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background overflow-y-auto"
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm tracking-[0.15em] uppercase text-muted-foreground font-body flex items-center gap-2">
                <Sparkles size={12} className="text-primary" /> Style Feed
              </h3>
              <button onClick={() => setFeedOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X size={18} className="text-foreground" />
              </button>
            </div>

            {/* Feed */}
            <div className="max-w-lg mx-auto pb-20">
              {outfits.slice(startIndex).concat(outfits.slice(0, startIndex)).map((outfit) => (
                <FeedCard
                  key={outfit.id}
                  outfit={outfit}
                  onTogglePin={togglePin}
                  onPinToBoard={pinToBoard}
                  onSeeMore={seeMoreLikeThis}
                  generatingMore={generatingMore}
                />
              ))}

              {/* Load more prompt */}
              <div className="p-8 text-center">
                <Button
                  variant="champagne-outline"
                  size="sm"
                  onClick={() => seeMoreLikeThis(outfits[outfits.length - 1])}
                  disabled={generatingMore}
                >
                  <ArrowDown size={14} className={generatingMore ? "animate-bounce" : ""} />
                  {generatingMore ? "Loading more looks..." : "Load More Looks"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ── Full-screen Feed Card (Instagram-style) ── */

const FeedCard = ({
  outfit, onTogglePin, onPinToBoard, onSeeMore, generatingMore,
}: {
  outfit: OutfitSuggestion;
  onTogglePin: (o: OutfitSuggestion) => void;
  onPinToBoard: (o: OutfitSuggestion) => void;
  onSeeMore: (o: OutfitSuggestion) => void;
  generatingMore: boolean;
}) => {
  const [shopOpen, setShopOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const items = (outfit.items || []) as OutfitItem[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      className="border-b border-border"
    >
      {/* Image */}
      {outfit.image_url ? (
        <div className="relative w-full aspect-[3/4] bg-secondary overflow-hidden">
          <img src={outfit.image_url} alt={outfit.title} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] bg-secondary flex items-center justify-center">
          <Sparkles size={40} className="text-muted-foreground/20" />
        </div>
      )}

      {/* Action bar */}
      <div className="px-4 pt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => onTogglePin(outfit)} className="p-1.5 hover:scale-110 transition-transform">
            <Heart size={22} className={outfit.pinned ? "text-primary fill-primary" : "text-foreground"} />
          </button>
          <button onClick={() => onPinToBoard(outfit)} className="p-1.5 hover:scale-110 transition-transform">
            <Pin size={20} className="text-foreground" />
          </button>
        </div>
        <button
          onClick={() => onSeeMore(outfit)}
          disabled={generatingMore}
          className="text-xs text-primary font-body tracking-wide hover:underline disabled:opacity-50"
        >
          {generatingMore ? "Loading..." : "See more like this"}
        </button>
      </div>

      {/* Caption */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">{outfit.occasion}</span>
        </div>
        <h3 className="font-heading text-xl leading-tight mb-1">{outfit.title}</h3>
        <p className="text-sm text-muted-foreground font-body leading-relaxed">{outfit.description}</p>

        {/* Items */}
        <div className="mt-4 space-y-1.5">
          {items.slice(0, expanded ? items.length : 3).map((item, i) => {
            const Icon = categoryIcons[item.category] || Shirt;
            return (
              <div key={i} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2.5 group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={14} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-body truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {item.brand_suggestion && <span className="text-primary/80">{item.brand_suggestion}</span>}
                      {item.brand_suggestion && item.color && <span> · </span>}
                      {item.color}
                    </p>
                  </div>
                </div>
                <div className="relative shrink-0 ml-2">
                  <button onClick={() => setShopOpen(shopOpen === i ? null : i)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                    <ShoppingBag size={14} className="text-primary" />
                  </button>
                  {shopOpen === i && (
                    <div className="absolute right-0 top-full mt-1 z-50">
                      <div className="bg-card border border-border rounded-xl shadow-xl p-1.5 min-w-[160px]">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body px-3 py-1.5">Shop this item</p>
                        {retailers.map((r) => (
                          <a key={r.name} href={r.url(item.search_terms)} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-body hover:bg-secondary rounded-lg transition-colors">
                            <ExternalLink size={10} className="text-muted-foreground" />
                            {r.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 3 && (
          <button onClick={() => setExpanded(!expanded)} className="text-xs text-primary/70 font-body mt-2 hover:text-primary transition-colors">
            {expanded ? "Show less" : `+${items.length - 3} more items`}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default InspirationTab;
