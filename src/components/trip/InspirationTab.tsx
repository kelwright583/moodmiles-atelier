import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OutfitSuggestion, OutfitItem, TripEvent, WeatherData } from "@/types/database";
import {
  Sparkles, RefreshCw, Pin, ExternalLink, ShoppingBag, Shirt, Footprints,
  Watch, Briefcase, Gem, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const categoryIcons: Record<string, any> = {
  Top: Shirt,
  Bottom: Palette,
  Outerwear: Briefcase,
  Shoes: Footprints,
  Accessory: Watch,
  Bag: Gem,
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
  const [generatingOutfits, setGeneratingOutfits] = useState(false);

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

  // Fetch events and weather to pass context to AI
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

  const generateOutfits = async () => {
    setGeneratingOutfits(true);
    try {
      // Build context from trip data
      const weatherSummary = weather.length > 0
        ? weather.map(w => `${w.date}: ${w.description}, ${Math.round(w.temperature_high || 0)}°/${Math.round(w.temperature_low || 0)}°`).join("; ")
        : undefined;

      const eventsSummary = events.length > 0
        ? events.map(e => `${e.event_name}${e.event_type ? ` (${e.event_type})` : ""}${e.event_date ? ` on ${e.event_date}` : ""}`).join("; ")
        : undefined;

      const { error } = await supabase.functions.invoke("generate-outfits", {
        body: {
          trip_id: tripId,
          destination: trip.destination,
          country: trip.country,
          trip_type: trip.trip_type,
          weather_summary: weatherSummary,
          events_summary: eventsSummary,
        },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
      toast({ title: "Looks generated!", description: "AI-styled outfits with visuals are ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingOutfits(false);
    }
  };

  const togglePin = async (outfit: OutfitSuggestion) => {
    await supabase
      .from("outfit_suggestions")
      .update({ pinned: !outfit.pinned } as any)
      .eq("id", outfit.id);
    queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> Get the Look
          </h2>
          <p className="text-xs text-muted-foreground/70 font-body mt-1">
            AI-styled outfits based on your destination, weather, and events
          </p>
        </div>
        <Button
          variant="champagne-outline"
          size="sm"
          onClick={generateOutfits}
          disabled={generatingOutfits}
        >
          <RefreshCw size={14} className={generatingOutfits ? "animate-spin" : ""} />
          {generatingOutfits ? "Styling..." : outfits.length > 0 ? "Regenerate" : "Generate Looks"}
        </Button>
      </div>

      {outfits.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Sparkles size={40} className="text-primary mx-auto mb-4 opacity-40" />
          <h3 className="font-heading text-xl mb-2">Your Style Awaits</h3>
          <p className="text-muted-foreground font-body text-sm mb-6 max-w-md mx-auto">
            Generate AI-curated outfit boards with visuals, tailored to {trip.destination}'s weather, your events, and trip style.
          </p>
          <Button variant="champagne" onClick={generateOutfits} disabled={generatingOutfits}>
            <Sparkles size={16} />
            {generatingOutfits ? "Generating looks..." : "Generate Outfit Inspiration"}
          </Button>
          {generatingOutfits && (
            <p className="text-xs text-muted-foreground/60 font-body mt-4 animate-pulse">
              Creating outfits and generating visuals — this may take a moment...
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} onTogglePin={togglePin} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

const OutfitCard = ({
  outfit,
  onTogglePin,
}: {
  outfit: OutfitSuggestion;
  onTogglePin: (o: OutfitSuggestion) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [shopOpen, setShopOpen] = useState<number | null>(null);
  const items = (outfit.items || []) as OutfitItem[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl overflow-hidden hover:shadow-champagne transition-all duration-500 ${outfit.pinned ? "ring-1 ring-primary/30" : ""}`}
    >
      {/* Outfit Image */}
      {outfit.image_url ? (
        <div className="relative h-56 md:h-64 overflow-hidden bg-secondary">
          <img
            src={outfit.image_url}
            alt={outfit.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={() => onTogglePin(outfit)}
              className="p-2 rounded-full bg-card/60 backdrop-blur-sm hover:bg-card/80 transition-colors"
            >
              <Pin size={14} className={outfit.pinned ? "text-primary fill-primary" : "text-foreground"} />
            </button>
          </div>
          <div className="absolute bottom-3 left-4 right-4">
            <span className="text-xs tracking-[0.15em] uppercase text-primary font-body">{outfit.occasion}</span>
            <h3 className="font-heading text-xl leading-tight text-foreground">{outfit.title}</h3>
          </div>
        </div>
      ) : (
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <span className="text-xs tracking-[0.15em] uppercase text-primary font-body">{outfit.occasion}</span>
              <h3 className="font-heading text-xl leading-tight">{outfit.title}</h3>
            </div>
            <button onClick={() => onTogglePin(outfit)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Pin size={14} className={outfit.pinned ? "text-primary fill-primary" : "text-muted-foreground"} />
            </button>
          </div>
        </div>
      )}

      <div className="p-5">
        <p className="text-xs text-muted-foreground font-body leading-relaxed mb-4">{outfit.description}</p>

        {/* Items */}
        <div className="space-y-1.5">
          {items.slice(0, expanded ? items.length : 4).map((item, i) => {
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
                  <button
                    onClick={() => setShopOpen(shopOpen === i ? null : i)}
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                  >
                    <ShoppingBag size={14} className="text-primary" />
                  </button>
                  {shopOpen === i && (
                    <div className="absolute right-0 top-full mt-1 z-50">
                      <div className="bg-card border border-border rounded-xl shadow-xl p-1.5 min-w-[160px]">
                        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground font-body px-3 py-1.5">Shop this item</p>
                        {retailers.map((r) => (
                          <a
                            key={r.name}
                            href={r.url(item.search_terms)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 text-xs font-body hover:bg-secondary rounded-lg transition-colors"
                          >
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

        {items.length > 4 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary font-body mt-3 hover:underline"
          >
            {expanded ? "Show less" : `+${items.length - 4} more items`}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default InspirationTab;
