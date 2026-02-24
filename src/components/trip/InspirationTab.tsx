import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OutfitSuggestion, ActivitySuggestion, OutfitItem } from "@/types/database";
import {
  Sparkles, RefreshCw, Pin, ChevronLeft, ChevronRight,
  Star, MapPin, ExternalLink, ShoppingBag, Shirt, Footprints,
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
  };
}

const InspirationTab = ({ tripId, trip }: InspirationTabProps) => {
  const queryClient = useQueryClient();
  const [generatingOutfits, setGeneratingOutfits] = useState(false);
  const [generatingActivities, setGeneratingActivities] = useState(false);
  const activitiesScrollRef = useRef<HTMLDivElement>(null);

  const { data: outfits = [] } = useQuery({
    queryKey: ["outfit-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as OutfitSuggestion[];
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

  const generateOutfits = async () => {
    setGeneratingOutfits(true);
    try {
      const { error } = await supabase.functions.invoke("generate-outfits", {
        body: {
          trip_id: tripId,
          destination: trip.destination,
          country: trip.country,
          trip_type: trip.trip_type,
        },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
      toast({ title: "Outfits generated!", description: "Your styled looks are ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingOutfits(false);
    }
  };

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
      toast({ title: "Activities found!", description: "Things to do are ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingActivities(false);
    }
  };

  const togglePin = async (outfit: OutfitSuggestion) => {
    await supabase
      .from("outfit_suggestions")
      .update({ pinned: !outfit.pinned } as any)
      .eq("id", outfit.id);
    queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
  };

  const scrollActivities = (dir: "left" | "right") => {
    if (activitiesScrollRef.current) {
      const amount = dir === "left" ? -320 : 320;
      activitiesScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const categoryColors: Record<string, string> = {
    Culture: "text-purple-400",
    Dining: "text-orange-400",
    Nightlife: "text-pink-400",
    Shopping: "text-emerald-400",
    Outdoor: "text-sky-400",
    Experience: "text-amber-400",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12">
      {/* Get the Look - Outfit Boards */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> Get the Look
          </h2>
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
          <div className="glass-card rounded-xl p-8 text-center">
            <Sparkles size={32} className="text-primary mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground font-body text-sm mb-4">
              AI-curated outfit boards tailored for your trip to {trip.destination}.
            </p>
            <Button variant="champagne" size="sm" onClick={generateOutfits} disabled={generatingOutfits}>
              {generatingOutfits ? "Generating..." : "Generate Outfit Ideas"}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {outfits.map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} onTogglePin={togglePin} />
            ))}
          </div>
        )}
      </section>

      {/* Things to Do - Horizontal Scroll */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <MapPin size={14} className="text-primary" /> Things to Do
          </h2>
          <div className="flex items-center gap-2">
            {activities.length > 0 && (
              <>
                <button onClick={() => scrollActivities("left")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronLeft size={16} className="text-muted-foreground" />
                </button>
                <button onClick={() => scrollActivities("right")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </>
            )}
            <Button
              variant="champagne-outline"
              size="sm"
              onClick={generateActivities}
              disabled={generatingActivities}
            >
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
            ref={activitiesScrollRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1"
            style={{ scrollSnapType: "x mandatory" }}
          >
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="glass-card rounded-xl p-5 min-w-[280px] max-w-[300px] shrink-0 hover:shadow-champagne transition-all duration-300"
                style={{ scrollSnapAlign: "start" }}
              >
                {activity.image_url && (
                  <div className="w-full h-32 rounded-lg overflow-hidden mb-3 bg-secondary">
                    <img src={activity.image_url} alt={activity.name} className="w-full h-full object-cover" />
                  </div>
                )}
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
            ))}
          </div>
        )}
      </section>
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
  const items = (outfit.items || []) as OutfitItem[];

  return (
    <div className={`glass-card rounded-xl overflow-hidden hover:shadow-champagne transition-all duration-300 ${outfit.pinned ? "ring-1 ring-primary/30" : ""}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-heading text-lg leading-tight">{outfit.title}</h3>
            <span className="text-xs tracking-[0.15em] uppercase text-primary font-body">{outfit.occasion}</span>
          </div>
          <button onClick={() => onTogglePin(outfit)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Pin size={14} className={outfit.pinned ? "text-primary fill-primary" : "text-muted-foreground"} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground font-body leading-relaxed mb-4">{outfit.description}</p>

        {/* Items Grid */}
        <div className="space-y-2">
          {items.slice(0, expanded ? items.length : 3).map((item, i) => {
            const Icon = categoryIcons[item.category] || Shirt;
            return (
              <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon size={14} className="text-primary shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-body truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {item.brand_suggestion && <span>{item.brand_suggestion} · </span>}
                      {item.color}
                    </p>
                  </div>
                </div>
                <div className="relative group shrink-0 ml-2">
                  <button className="p-1.5 rounded-md hover:bg-secondary transition-colors">
                    <ShoppingBag size={12} className="text-primary" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 z-50 hidden group-hover:block">
                    <div className="bg-card border border-border rounded-lg shadow-lg p-1 min-w-[140px]">
                      {retailers.map((r) => (
                        <a
                          key={r.name}
                          href={r.url(item.search_terms)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 text-xs font-body hover:bg-secondary rounded-md transition-colors"
                        >
                          <ExternalLink size={10} className="text-muted-foreground" />
                          {r.name}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {items.length > 3 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-primary font-body mt-3 hover:underline"
          >
            {expanded ? "Show less" : `+${items.length - 3} more items`}
          </button>
        )}
      </div>
    </div>
  );
};

export default InspirationTab;
