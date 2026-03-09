import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OutfitSuggestion, OutfitItem } from "@/types/database";
import {
  Sparkles, Pin, ShoppingBag, Heart, ArrowDown, Globe, Copy, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SaveToOtherBoardDialog } from "./SaveToOtherBoardDialog";


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
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [saveToOtherOutfit, setSaveToOtherOutfit] = useState<OutfitSuggestion | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: outfits = [] } = useQuery({
    queryKey: ["outfit-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as OutfitSuggestion[];
    },
  });
  console.log("Outfits from DB:", outfits.length, outfits.map(o => ({ id: o.id, title: o.title, image_url: o.image_url })));

  const getInvokeErrorMessage = async (err: any, fallback = "Request failed") => {
    if (err?.context && typeof err.context.json === "function") {
      try {
        const payload = await err.context.json();
        if (payload?.error) return payload.error;
      } catch {
        // ignore parse issues
      }
    }
    return err?.message || fallback;
  };

  const searchWebFashion = async (occasion?: string, searchQuery?: string) => {
    setSearchingWeb(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-fashion", {
        body: {
          trip_id: tripId,
          destination: trip.destination,
          country: trip.country,
          trip_type: trip.trip_type,
          occasion: occasion || null,
          start_date: trip.start_date,
          end_date: trip.end_date,
          user_search_query: searchQuery || userSearchQuery || null,
        },
      });
      if (error) {
        const msg = (data as { error?: string })?.error || error.message;
        throw new Error(msg);
      }
      await queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId] });
      await queryClient.refetchQueries({ queryKey: ["outfit-suggestions", tripId] });
      toast({ title: "Looks added!", description: occasion ? "More similar styles from the web." : "Editorial fashion inspiration has been added to your feed." });
    } catch (err: any) {
      const message = err?.message || (await getInvokeErrorMessage(err, "Could not fetch web inspiration right now."));
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSearchingWeb(false);
    }
  };

  const seeMoreLikeThis = async (outfit: OutfitSuggestion) => {
    await searchWebFashion(outfit.occasion);
  };

  const togglePin = async (outfit: OutfitSuggestion) => {
    await supabase.from("outfit_suggestions").update({ pinned: !outfit.pinned }).eq("id", outfit.id);
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

  // Debounced search query handler
  const handleSearchInput = (value: string) => {
    setUserSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) return;
    debounceRef.current = setTimeout(() => {
      searchWebFashion(undefined, value.trim());
    }, 800);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> Get the Look
          </h2>
          <p className="text-xs text-muted-foreground/70 font-body mt-1">
            Editorial fashion inspiration for {trip.destination}
          </p>
        </div>
        <Button variant="champagne-outline" size="sm" onClick={() => searchWebFashion()} disabled={searchingWeb}>
          <Globe size={14} className={searchingWeb ? "animate-spin" : ""} />
          {searchingWeb ? "Finding looks..." : outfits.length > 0 ? "Find More" : "Get Looks"}
        </Button>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
        <input
          type="text"
          value={userSearchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          placeholder="Refine your style... (e.g. minimal linen, old money, coastal grandmother)"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
        />
        {searchingWeb && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary/70 font-body animate-pulse">
            searching…
          </span>
        )}
      </div>

      {outfits.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <Sparkles size={40} className="text-primary mx-auto mb-4 opacity-40" />
          <h3 className="font-heading text-xl mb-2">Styled for {trip.destination}</h3>
          <p className="text-muted-foreground font-body text-sm mb-6 max-w-md mx-auto">
            Editorial fashion inspiration from Vogue, Farfetch, and more — curated for your trip.
          </p>
          <Button variant="champagne" onClick={() => searchWebFashion()} disabled={searchingWeb}>
            <Globe size={16} />
            {searchingWeb ? "Finding looks..." : "Get Looks"}
          </Button>
          {searchingWeb && (
            <p className="text-xs text-muted-foreground/60 font-body mt-4 animate-pulse">
              Searching editorial sources for your style…
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Masonry Grid */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {outfits.map((outfit) => (
              <MasonryCard
                key={outfit.id}
                outfit={outfit}
                onTogglePin={togglePin}
                onPinToBoard={pinToBoard}
                onSaveToOtherBoard={() => setSaveToOtherOutfit(outfit)}
              />
            ))}
          </div>

          {/* Load more */}
          <div className="pt-2 text-center">
            <Button
              variant="champagne-outline"
              size="sm"
              onClick={() => seeMoreLikeThis(outfits[outfits.length - 1])}
              disabled={searchingWeb}
            >
              <ArrowDown size={14} className={searchingWeb ? "animate-bounce" : ""} />
              {searchingWeb ? "Loading more looks..." : "Load More Looks"}
            </Button>
          </div>
        </>
      )}

      {saveToOtherOutfit && (
        <SaveToOtherBoardDialog
          open={!!saveToOtherOutfit}
          onOpenChange={(open) => !open && setSaveToOtherOutfit(null)}
          currentTripId={tripId}
          item={{
            image_url: saveToOtherOutfit.image_url,
            description: `${saveToOtherOutfit.title} — ${saveToOtherOutfit.occasion}`,
            notes: saveToOtherOutfit.description
              ? `${saveToOtherOutfit.description}\n\nItems: ${(saveToOtherOutfit.items as OutfitItem[]).map((i) => `${i.name} (${i.brand_suggestion || i.color})`).join(", ")}`
              : null,
          }}
          onSaved={() => setSaveToOtherOutfit(null)}
        />
      )}
    </motion.div>
  );
};

/* ── Masonry Card with hover overlay ── */

const MasonryCard = ({
  outfit,
  onTogglePin,
  onPinToBoard,
  onSaveToOtherBoard,
}: {
  outfit: OutfitSuggestion;
  onTogglePin: (o: OutfitSuggestion) => void;
  onPinToBoard: (o: OutfitSuggestion) => void;
  onSaveToOtherBoard: () => void;
}) => {
  return (
    <div className="break-inside-avoid mb-3 relative group cursor-pointer rounded-lg overflow-hidden bg-muted min-h-[200px]">
      {/* Shimmer placeholder — hidden once image loads */}
      <div className="absolute inset-0 animate-pulse bg-muted" />
      {/* Image — natural dimensions for Pinterest-style height variation */}
      <img
        src={outfit.image_url ?? undefined}
        alt={outfit.title}
        className="w-full block relative"
        loading="eager"
        onLoad={(e) => {
          const placeholder = e.currentTarget.previousSibling as HTMLElement | null;
          if (placeholder) placeholder.style.display = "none";
        }}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const placeholder = el.previousSibling as HTMLElement | null;
          if (placeholder) placeholder.style.display = "none";
          const fallback = document.createElement("div");
          fallback.className = "w-full bg-secondary/80 flex flex-col items-center justify-center p-3 text-center";
          fallback.style.minHeight = "200px";
          fallback.innerHTML = `<p class="text-foreground text-xs font-semibold leading-snug">${outfit.title}</p>${outfit.store ? `<p class="text-muted-foreground text-[10px] mt-0.5">${outfit.store}</p>` : ""}`;
          el.parentElement?.insertBefore(fallback, el.nextSibling);
        }}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
        {/* Top: source badge + heart toggle */}
        <div className="flex items-start justify-between">
          {outfit.store && (
            <span className="text-[10px] tracking-[0.15em] uppercase font-body px-2 py-1 rounded-md bg-black/40 text-[#ca975c]">
              {outfit.store}
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(outfit); }}
            className="p-1 ml-auto transition-transform hover:scale-110"
            title={outfit.pinned ? "Unpin" : "Pin"}
          >
            <Heart size={16} className={outfit.pinned ? "text-[#ca975c] fill-[#ca975c]" : "text-white"} />
          </button>
        </div>

        {/* Bottom: title + actions */}
        <div>
          <p className="text-white text-xs font-body leading-snug mb-2 line-clamp-2">{outfit.title}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onPinToBoard(outfit); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-body transition-colors"
            >
              <Pin size={11} /> Pin to Board
            </button>
            {outfit.product_url && (
              <a
                href={outfit.product_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#ca975c]/80 hover:bg-[#ca975c] text-white text-[11px] font-body transition-colors"
              >
                <ShoppingBag size={11} /> Shop This
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onSaveToOtherBoard(); }}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-auto"
              title="Save to another trip"
            >
              <Copy size={11} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspirationTab;
