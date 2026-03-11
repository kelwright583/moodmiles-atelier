import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { OutfitSuggestion, OutfitItem, TripEvent, TripCollaborator, Profile, EventLook } from "@/types/database";
import {
  Sparkles, Pin, ShoppingBag, Heart, ArrowDown, Globe, Copy, Search,
  LayoutGrid, Newspaper, AlertTriangle, Users, CalendarDays, Grid3X3, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { SaveToOtherBoardDialog } from "./SaveToOtherBoardDialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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
    user_id: string;
    trip_theme?: string | null;
  };
  initialSearch?: string;
  initialEventId?: string;
}

type Mode = "editorial" | "shop" | "coordinate";
type ShopFilter = "all" | "buy" | "rent" | "preloved";

// PWA install prompt — captured once at module level so it survives re-renders
let pwaInstallPrompt: any = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    pwaInstallPrompt = e;
  }, { once: true });
}

const CELEBRATION_KEY = "moodmiles_styled_celebrated";

function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

const MemberAvatar = ({
  profile,
  size = "md",
  ring = false,
  faded = false,
}: {
  profile: Profile | null | undefined;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  faded?: boolean;
}) => {
  const sizeClass = size === "sm" ? "w-6 h-6 text-[9px]" : size === "lg" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  const ringClass = ring ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "";
  const fadedClass = faded ? "opacity-30" : "";
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.name || ""}
        className={`${sizeClass} ${ringClass} ${fadedClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} ${ringClass} ${fadedClass} rounded-full bg-secondary flex items-center justify-center font-body text-muted-foreground flex-shrink-0`}>
      {getInitials(profile?.name || null)}
    </div>
  );
};

/* ── CoordinateView ── */
const CoordinateView = ({
  tripId,
  trip,
  onSwitchToEditorial,
}: {
  tripId: string;
  trip: InspirationTabProps["trip"];
  onSwitchToEditorial: (eventId: string, searchQuery: string) => void;
}) => {
  const { user } = useAuth();
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const { data: events = [] } = useQuery({
    queryKey: ["trip-events-dress-code-coord", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_events")
        .select("*")
        .eq("trip_id", tripId)
        .not("dress_code", "is", null)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as TripEvent[];
    },
  });

  const { data: collaborators = [] } = useQuery({
    queryKey: ["trip-collaborators-coord", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_collaborators")
        .select("*")
        .eq("trip_id", tripId)
        .eq("status", "accepted");
      if (error) throw error;
      return data as TripCollaborator[];
    },
  });

  const memberUserIds = [
    trip.user_id,
    ...collaborators.map((c) => c.user_id).filter(Boolean) as string[],
  ];

  const { data: profiles = [] } = useQuery({
    queryKey: ["coord-profiles", memberUserIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", memberUserIds);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: memberUserIds.length > 0,
  });

  const { data: eventLooks = [] } = useQuery({
    queryKey: ["event-looks", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_looks")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data as EventLook[];
    },
  });

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);
  const getLook = (eventId: string, userId: string) =>
    eventLooks.find((l) => l.event_id === eventId && l.user_id === userId);

  if (events.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-10 text-center">
        <Users size={40} className="text-primary mx-auto mb-4 opacity-40" />
        <h3 className="font-heading text-xl mb-2">No events with dress codes yet</h3>
        <p className="text-muted-foreground font-body text-sm max-w-md mx-auto">
          Add events with dress codes in the Events tab to start coordinating group looks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users size={14} className="text-primary" />
        <h3 className="font-heading text-lg">Group Coordination</h3>
      </div>
      <p className="text-xs text-muted-foreground font-body -mt-2">
        See how your group is styling each event
      </p>

      <div className="bg-card border border-border/20 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: "fit-content" }}>
            {/* Header row */}
            <div className="flex border-b border-border/30">
              {/* Blank corner cell */}
              <div className="flex-shrink-0 bg-secondary/40" style={{ width: 180, minHeight: 60 }} />
              {/* Member header cells */}
              {memberUserIds.map((userId) => {
                const profile = getProfile(userId);
                const isCurrentUser = userId === user?.id;
                return (
                  <div
                    key={userId}
                    className="flex-shrink-0 flex flex-col items-center justify-center gap-1 p-3 border-l border-border/30 bg-secondary/20"
                    style={{ width: 140, minHeight: 60 }}
                  >
                    <MemberAvatar profile={profile} size="lg" ring={isCurrentUser} />
                    <span className="text-xs font-body text-muted-foreground text-center truncate max-w-full px-1">
                      {profile?.name?.split(" ")[0] || (isCurrentUser ? "You" : "Member")}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Event rows */}
            {events.map((event) => (
              <div key={event.id} className="flex border-b border-border/20 last:border-b-0">
                {/* Event header cell */}
                <div
                  className="flex-shrink-0 flex flex-col justify-center p-3 bg-secondary/80 border-r border-border/30"
                  style={{ width: 180, minHeight: 160 }}
                >
                  <p className="font-heading text-sm leading-tight mb-1.5">{event.event_name}</p>
                  {event.dress_code && (
                    <span className="text-[10px] text-primary/70 border border-primary/20 rounded-full px-2 py-0.5 font-body w-fit mb-1.5">
                      {event.dress_code}
                    </span>
                  )}
                  {event.event_date && (
                    <span className="text-[10px] text-muted-foreground font-body">
                      {formatEventDate(event.event_date)}
                    </span>
                  )}
                </div>

                {/* Member look cells */}
                {memberUserIds.map((userId) => {
                  const profile = getProfile(userId);
                  const look = getLook(event.id, userId);
                  const isCurrentUser = userId === user?.id;

                  return (
                    <div
                      key={userId}
                      className="flex-shrink-0 border-l border-border/30 relative group"
                      style={{ width: 140, minHeight: 160 }}
                    >
                      {look ? (
                        /* Has a look */
                        <div
                          className="relative w-full h-full cursor-pointer"
                          style={{ minHeight: 160 }}
                          onClick={() => look.image_url && setLightboxImage(look.image_url)}
                        >
                          {look.image_url ? (
                            <img
                              src={look.image_url}
                              alt="Look"
                              className="w-full h-full object-cover"
                              style={{ minHeight: 160 }}
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center bg-secondary/60"
                              style={{ minHeight: 160 }}
                            >
                              <Sparkles size={20} className="text-primary/40" />
                            </div>
                          )}
                          {/* Hover overlay with name */}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-white text-xs font-body text-center px-2">
                              {profile?.name?.split(" ")[0] || "Look"}
                            </span>
                          </div>
                          {/* Member avatar bottom right */}
                          <div className="absolute bottom-1.5 right-1.5">
                            <MemberAvatar profile={profile} size="sm" ring={isCurrentUser} />
                          </div>
                        </div>
                      ) : (
                        /* Empty cell */
                        <button
                          className={`w-full h-full flex flex-col items-center justify-center gap-2 border-2 border-dashed transition-all ${
                            isCurrentUser
                              ? "border-primary/30 hover:border-primary hover:bg-primary/5 cursor-pointer"
                              : "border-border/20 cursor-default"
                          }`}
                          style={{ minHeight: 160 }}
                          onClick={() => {
                            if (isCurrentUser) {
                              onSwitchToEditorial(
                                event.id,
                                `${event.dress_code} ${trip.destination} outfit`
                              );
                            }
                          }}
                          disabled={!isCurrentUser}
                        >
                          <MemberAvatar profile={profile} size="md" ring={isCurrentUser} faded={!isCurrentUser} />
                          <span className={`text-[10px] font-body text-center leading-tight px-2 ${
                            isCurrentUser ? "text-primary" : "text-muted-foreground/40"
                          }`}>
                            {isCurrentUser ? "Add your look" : "No look yet"}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
            onClick={() => setLightboxImage(null)}
          >
            <button
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              onClick={() => setLightboxImage(null)}
            >
              <X size={20} className="text-white" />
            </button>
            <img
              src={lightboxImage}
              alt="Look"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── PinToSheet ── */
const PinToSheet = ({
  outfit,
  tripId,
  onClose,
  onPinToBoard,
  preSelectedEventId,
}: {
  outfit: OutfitSuggestion | null;
  tripId: string;
  onClose: () => void;
  onPinToBoard: (outfit: OutfitSuggestion) => Promise<void>;
  preSelectedEventId?: string;
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showEventSelector, setShowEventSelector] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(preSelectedEventId || "");
  const [assigning, setAssigning] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["trip-events-dress-code-pin", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_events")
        .select("*")
        .eq("trip_id", tripId)
        .not("dress_code", "is", null)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as TripEvent[];
    },
    enabled: showEventSelector,
  });

  // Pre-select event if provided
  useEffect(() => {
    if (preSelectedEventId) setSelectedEventId(preSelectedEventId);
  }, [preSelectedEventId]);

  const assignLookToEvent = async () => {
    if (!outfit || !selectedEventId || !user) return;
    setAssigning(true);
    try {
      const { error } = await supabase.from("event_looks").upsert(
        {
          trip_id: tripId,
          event_id: selectedEventId,
          user_id: user.id,
          image_url: outfit.image_url,
          outfit_suggestion_id: outfit.id,
        },
        { onConflict: "event_id,user_id" }
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["event-looks", tripId] });
      toast({ title: "Look assigned!", description: "Your look has been set for this event." });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <Sheet open={!!outfit} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl pb-8">
        <SheetHeader className="mb-4">
          <SheetTitle className="font-heading text-left">Pin to…</SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          {/* Option 1: Mood Board */}
          <button
            type="button"
            onClick={async () => {
              if (outfit) {
                await onPinToBoard(outfit);
                onClose();
              }
            }}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
              <Grid3X3 size={18} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-body text-foreground font-medium">Save to Mood Board</p>
              <p className="text-xs text-muted-foreground font-body mt-0.5">Add to your shared trip board</p>
            </div>
          </button>

          {/* Option 2: Assign to Event */}
          <button
            type="button"
            onClick={() => setShowEventSelector(!showEventSelector)}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center flex-shrink-0">
              <CalendarDays size={18} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-body text-foreground font-medium">Assign to Event</p>
              <p className="text-xs text-muted-foreground font-body mt-0.5">Set this as your look for an event</p>
            </div>
          </button>

          {/* Event selector */}
          <AnimatePresence>
            {showEventSelector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-2 space-y-2 px-1">
                  {events.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-body text-center py-4">
                      No events with dress codes found.
                    </p>
                  ) : (
                    events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        onClick={() => setSelectedEventId(event.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          selectedEventId === event.id
                            ? "border-primary/60 bg-primary/5"
                            : "border-border/40 hover:border-border hover:bg-secondary/40"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          selectedEventId === event.id ? "border-primary" : "border-border"
                        }`}>
                          {selectedEventId === event.id && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-body text-foreground leading-tight">{event.event_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {event.dress_code && (
                              <span className="text-[10px] text-primary/60 font-body">{event.dress_code}</span>
                            )}
                            {event.event_date && (
                              <span className="text-[10px] text-muted-foreground font-body">
                                {formatEventDate(event.event_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}

                  {selectedEventId && (
                    <Button
                      variant="champagne"
                      className="w-full mt-2"
                      onClick={assignLookToEvent}
                      disabled={assigning}
                    >
                      {assigning ? "Assigning…" : "Confirm — Set as My Look"}
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
};

/* ── InspirationTab ── */
const InspirationTab = ({ tripId, trip, initialSearch, initialEventId }: InspirationTabProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("editorial");
  const [shopFilter, setShopFilter] = useState<ShopFilter>("all");
  const [searchingWeb, setSearchingWeb] = useState(false);
  const [loadingShop, setLoadingShop] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState(initialSearch || "");
  const [saveToOtherOutfit, setSaveToOtherOutfit] = useState<OutfitSuggestion | null>(null);
  const [pinTarget, setPinTarget] = useState<OutfitSuggestion | null>(null);
  const [preSelectedEventId, setPreSelectedEventId] = useState(initialEventId || "");
  const initialSearchFiredRef = useRef(false);
  const [showPwaPrompt, setShowPwaPrompt] = useState(false);
  const [dressAlertCard, setDressAlertCard] = useState<{ headline: string; detail: string; severity: string } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editorial outfits
  const { data: editorialOutfits = [], error: editorialError } = useQuery({
    queryKey: ["outfit-suggestions", tripId, "editorial"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .or("source.is.null,source.neq.shoppable")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) {
        console.error("InspirationTab editorial query error:", error);
        throw error;
      }
      return data as unknown as OutfitSuggestion[];
    },
    retry: 1,
  });

  // Shoppable outfits
  const { data: shopOutfits = [], error: shopError } = useQuery({
    queryKey: ["outfit-suggestions", tripId, "shoppable"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .eq("source", "shoppable")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("InspirationTab shop query error:", error);
        throw error;
      }
      return data as unknown as OutfitSuggestion[];
    },
    retry: 1,
  });

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

  // Auto-trigger search when navigated from "Style This Event"
  useEffect(() => {
    if (initialSearch && !initialSearchFiredRef.current) {
      initialSearchFiredRef.current = true;
      searchWebFashion(undefined, initialSearch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update preSelectedEventId when prop changes
  useEffect(() => {
    if (initialEventId) setPreSelectedEventId(initialEventId);
  }, [initialEventId]);

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
      await queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId, "editorial"] });
      await queryClient.refetchQueries({ queryKey: ["outfit-suggestions", tripId, "editorial"] });
      toast({ title: "Looks added!", description: occasion ? "More similar styles from the web." : "Editorial fashion inspiration has been added to your feed." });

      // First-ever generation celebration
      if (!localStorage.getItem(CELEBRATION_KEY)) {
        localStorage.setItem(CELEBRATION_KEY, "1");
        setTimeout(() => {
          toast({
            title: "Your trip is styled.",
            description: "Welcome to Concierge Styled.",
            duration: 6000,
          });
          if (pwaInstallPrompt) setShowPwaPrompt(true);
        }, 1200);
      }
    } catch (err: any) {
      const message = err?.message || (await getInvokeErrorMessage(err, "Could not fetch web inspiration right now."));
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setSearchingWeb(false);
    }
  };

  const loadShoppableOutfits = async (forceRefresh = false) => {
    setLoadingShop(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-shoppable-outfits", {
        body: {
          trip_id: tripId,
          destination: trip.destination,
          country: trip.country,
          trip_type: trip.trip_type,
          force_refresh: forceRefresh,
        },
      });
      if (error) {
        const msg = (data as { error?: string })?.error || error.message;
        throw new Error(msg);
      }
      await queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId, "shoppable"] });
      await queryClient.refetchQueries({ queryKey: ["outfit-suggestions", tripId, "shoppable"] });
      toast({ title: "Shop the look ready!", description: "Real products curated for your trip." });
    } catch (err: any) {
      const message = err?.message || (await getInvokeErrorMessage(err, "Could not load shoppable outfits."));
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoadingShop(false);
    }
  };

  const seeMoreLikeThis = async (outfit: OutfitSuggestion) => {
    await searchWebFashion(outfit.occasion ?? undefined);
  };

  const togglePin = async (outfit: OutfitSuggestion) => {
    await supabase.from("outfit_suggestions").update({ pinned: !outfit.pinned }).eq("id", outfit.id);
    queryClient.invalidateQueries({ queryKey: ["outfit-suggestions", tripId, "editorial"] });
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
        pinned_by: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
      toast({ title: "Pinned to Board!", description: `"${outfit.title}" saved to your mood board.` });

      // Check dress codes after pinning (non-blocking)
      try {
        const { data: checkData } = await supabase.functions.invoke("check-dress-codes", {
          body: { trip_id: tripId },
        });
        if (checkData?.new_alerts > 0 && checkData?.alerts?.length > 0) {
          const alert = checkData.alerts[0];
          setDressAlertCard({ headline: alert.headline, detail: alert.detail, severity: alert.severity });
        }
      } catch {
        // Non-blocking — ignore
      }
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

  const uniqueEditorial = editorialOutfits.filter((outfit, index, self) =>
    index === self.findIndex(o => o.image_url === outfit.image_url)
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Sparkles size={14} className="text-primary" /> Get the Look
          </h2>
          <p className="text-xs text-muted-foreground/70 font-body mt-1">
            Fashion inspiration for {trip.destination}
          </p>
        </div>
        {mode === "editorial" ? (
          <Button variant="champagne-outline" size="sm" onClick={() => searchWebFashion()} disabled={searchingWeb}>
            <Globe size={14} className={searchingWeb ? "animate-spin" : ""} />
            {searchingWeb ? "Finding looks..." : uniqueEditorial.length > 0 ? "Find More" : "Get Looks"}
          </Button>
        ) : mode === "shop" ? (
          <Button variant="champagne-outline" size="sm" onClick={() => loadShoppableOutfits(true)} disabled={loadingShop}>
            <ShoppingBag size={14} className={loadingShop ? "animate-spin" : ""} />
            {loadingShop ? "Loading..." : "Refresh"}
          </Button>
        ) : null}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-secondary/60 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setMode("editorial")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-body tracking-wide transition-all ${
            mode === "editorial"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Newspaper size={12} />
          Editorial
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("shop");
            if (shopOutfits.length === 0) loadShoppableOutfits();
          }}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-body tracking-wide transition-all ${
            mode === "shop"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <LayoutGrid size={12} />
          Shop the Look
        </button>
        <button
          type="button"
          onClick={() => setMode("coordinate")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-body tracking-wide transition-all ${
            mode === "coordinate"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users size={12} />
          Coordinate
        </button>
      </div>

      {/* Shop filter pills — only in shop mode */}
      {mode === "shop" && (
        <div className="flex items-center gap-2 flex-wrap">
          {(["all", "buy", "rent", "preloved"] as ShopFilter[]).map((f) => {
            const labels: Record<ShopFilter, string> = {
              all: "All",
              buy: "Buy New",
              rent: "Rent",
              preloved: "Pre-loved",
            };
            return (
              <button
                key={f}
                type="button"
                onClick={() => setShopFilter(f)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-body transition-all ${
                  shopFilter === f
                    ? "bg-gradient-champagne text-primary-foreground shadow-champagne"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[f]}
              </button>
            );
          })}
        </div>
      )}

      {/* ── EDITORIAL MODE ── */}
      {mode === "editorial" && (
        <>
          {/* Search bar */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Refine your style… (e.g. minimal linen, old money, coastal grandmother)"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40 transition-colors"
            />
            {searchingWeb && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-primary/70 font-body animate-pulse">
                searching…
              </span>
            )}
          </div>

          {/* Group theme search button */}
          {trip.trip_theme && (
            <button
              onClick={() => {
                setUserSearchQuery(trip.trip_theme!);
                searchWebFashion(undefined, trip.trip_theme!);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 text-xs font-body text-primary hover:bg-primary/5 transition-colors"
            >
              <Sparkles size={11} />
              Search "{trip.trip_theme}"
            </button>
          )}

          {editorialError ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3 opacity-70" />
              <p className="text-muted-foreground font-body text-sm mb-4">Having trouble loading looks right now — try refreshing.</p>
              <Button variant="champagne-outline" size="sm" onClick={() => searchWebFashion()} disabled={searchingWeb}>
                <Globe size={13} /> Refresh
              </Button>
            </div>
          ) : uniqueEditorial.length === 0 ? (
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
              <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
                {uniqueEditorial.map((outfit) => (
                  <MasonryCard
                    key={outfit.id}
                    outfit={outfit}
                    onTogglePin={togglePin}
                    onPinToBoard={(o) => setPinTarget(o)}
                    onSaveToOtherBoard={() => setSaveToOtherOutfit(outfit)}
                  />
                ))}
              </div>
              <div className="pt-2 text-center">
                <Button
                  variant="champagne-outline"
                  size="sm"
                  onClick={() => seeMoreLikeThis(editorialOutfits[editorialOutfits.length - 1])}
                  disabled={searchingWeb}
                >
                  <ArrowDown size={14} className={searchingWeb ? "animate-bounce" : ""} />
                  {searchingWeb ? "Loading more looks..." : "Load More Looks"}
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* ── SHOP THE LOOK MODE ── */}
      {mode === "shop" && (
        <>
          {loadingShop ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground font-body animate-pulse">
                Curating real products for your trip…
              </p>
            </div>
          ) : shopError ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <AlertTriangle size={32} className="text-amber-400 mx-auto mb-3 opacity-70" />
              <p className="text-muted-foreground font-body text-sm mb-4">Having trouble loading looks right now — try refreshing.</p>
              <Button variant="champagne-outline" size="sm" onClick={() => loadShoppableOutfits()} disabled={loadingShop}>
                <Globe size={13} /> Refresh
              </Button>
            </div>
          ) : shopOutfits.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <ShoppingBag size={40} className="text-primary mx-auto mb-4 opacity-40" />
              <h3 className="font-heading text-xl mb-2">Shop the Look</h3>
              <p className="text-muted-foreground font-body text-sm mb-6 max-w-md mx-auto">
                Real buyable outfits curated for your trip — with direct links to shop each piece.
              </p>
              <Button variant="champagne" onClick={() => loadShoppableOutfits()} disabled={loadingShop}>
                <LayoutGrid size={16} />
                Build My Shoppable Wardrobe
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {shopOutfits.map((outfit) => (
                <ShopTheLookCard
                  key={outfit.id}
                  outfit={outfit}
                  filter={shopFilter}
                  onPinToBoard={(o) => setPinTarget(o)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── COORDINATE MODE ── */}
      {mode === "coordinate" && (
        <CoordinateView
          tripId={tripId}
          trip={trip}
          onSwitchToEditorial={(eventId, searchQuery) => {
            setMode("editorial");
            setPreSelectedEventId(eventId);
            setUserSearchQuery(searchQuery);
            searchWebFashion(undefined, searchQuery);
          }}
        />
      )}

      {/* Dress code alert card — shown after pinning when conflicts detected */}
      {dressAlertCard && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              size={16}
              className={`flex-shrink-0 mt-0.5 ${dressAlertCard.severity === "critical" ? "text-red-400" : "text-amber-400"}`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-body font-medium text-foreground">{dressAlertCard.headline}</p>
              {dressAlertCard.detail && (
                <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed">{dressAlertCard.detail}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Button
              variant="champagne-outline"
              size="sm"
              onClick={() => { setDressAlertCard(null); searchWebFashion(); }}
              disabled={searchingWeb}
            >
              <Globe size={12} /> Find something else
            </Button>
            <button
              onClick={() => setDressAlertCard(null)}
              className="text-xs text-muted-foreground font-body hover:text-foreground transition-colors"
            >
              This is fine
            </button>
          </div>
        </motion.div>
      )}

      {/* PWA install prompt */}
      {showPwaPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-6 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="glass-card rounded-2xl p-4 border border-primary/20 shadow-champagne">
            <p className="text-xs tracking-[0.2em] uppercase text-primary font-body mb-1">Add to Home Screen</p>
            <p className="text-sm text-foreground font-body mb-3 leading-snug">
              Get the full Concierge Styled experience — instant access from your home screen.
            </p>
            <div className="flex gap-2">
              <Button
                variant="champagne"
                size="sm"
                className="flex-1"
                onClick={async () => {
                  if (pwaInstallPrompt) {
                    pwaInstallPrompt.prompt();
                    await pwaInstallPrompt.userChoice;
                    pwaInstallPrompt = null;
                  }
                  setShowPwaPrompt(false);
                }}
              >
                Add to Home Screen
              </Button>
              <button
                onClick={() => setShowPwaPrompt(false)}
                className="text-xs text-muted-foreground font-body hover:text-foreground transition-colors px-2"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Save to other board dialog */}
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

      {/* PinToSheet */}
      <PinToSheet
        outfit={pinTarget}
        tripId={tripId}
        onClose={() => setPinTarget(null)}
        onPinToBoard={pinToBoard}
        preSelectedEventId={preSelectedEventId}
      />
    </motion.div>
  );
};

/* ── Masonry Card (Editorial) ── */

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
    <div className="break-inside-avoid mb-3">
      <div className="relative group cursor-pointer rounded-lg overflow-hidden bg-muted min-h-[200px]">
      <div className="absolute inset-0 animate-pulse bg-muted" />
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

      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-3">
        <div className="flex items-start justify-between">
          {outfit.store && (() => {
            const store = outfit.store.toLowerCase();
            const isEditorial = ["vogue", "harpersbazaar", "editorialist", "whowhatwear"].some(s => store.includes(s));
            const isShoppable = ["net-a-porter", "farfetch", "ssense", "asos", "zara", "mytheresa", "matchesfashion", "hm.com"].some(s => store.includes(s));
            return (
              <div className="flex flex-col gap-0.5">
                {isEditorial && (
                  <span className="text-[9px] tracking-[0.2em] uppercase font-body px-1.5 py-0.5 rounded bg-black/50 text-primary w-fit">
                    Editorial
                  </span>
                )}
                {isShoppable && (
                  <span className="text-[9px] tracking-[0.2em] uppercase font-body px-1.5 py-0.5 rounded bg-black/50 text-green-400 w-fit">
                    Shop
                  </span>
                )}
                <span className="text-[9px] text-white/60 font-body">{outfit.store}</span>
              </div>
            );
          })()}
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(outfit); }}
            className="p-1 ml-auto transition-transform hover:scale-110"
            title={outfit.pinned ? "Unpin" : "Pin"}
          >
            <Heart size={16} className={outfit.pinned ? "text-primary fill-primary" : "text-white"} />
          </button>
        </div>

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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/80 hover:bg-primary text-white text-[11px] font-body transition-colors"
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
    </div>
  );
};

/* ── Shop the Look Card ── */
interface EnrichedItem extends OutfitItem {
  image_url?: string | null;
  affiliate_url?: string | null;
  price?: number | null;
  currency?: string;
  affiliate_source?: string | null;
  is_rental?: boolean;
  is_resale?: boolean;
  original_price?: number | null;
  original_currency?: string | null;
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$";
  return `${symbol}${amount.toLocaleString()}`;
}

const ShopTheLookCard = ({
  outfit,
  filter,
  onPinToBoard,
}: {
  outfit: OutfitSuggestion;
  filter: ShopFilter;
  onPinToBoard: (o: OutfitSuggestion) => void;
}) => {
  const allItems = (outfit.items as unknown as EnrichedItem[]) || [];

  // Apply filter
  const items = allItems.filter((item) => {
    if (filter === "rent") return item.is_rental === true;
    if (filter === "preloved") return item.is_resale === true;
    if (filter === "buy") return !item.is_rental && !item.is_resale;
    return true; // "all"
  });

  const buyableItems = items.filter((i) => i.affiliate_url && i.image_url);

  // Total price: for rental, sum rental prices; for mixed "all", sum non-rental purchase prices
  const purchaseItems = allItems.filter((i) => !i.is_rental && !i.is_resale);
  const totalPrice = purchaseItems.reduce((sum, i) => sum + (i.price || 0), 0);

  if (buyableItems.length === 0 && filter !== "all") {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-primary font-body">{outfit.occasion}</p>
            <h3 className="font-heading text-lg leading-snug">{outfit.title}</h3>
          </div>
        </div>
        <p className="text-xs text-muted-foreground font-body text-center py-6">
          No {filter === "rent" ? "rental" : filter === "preloved" ? "pre-loved" : "buy-new"} items for this look yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Outfit header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-body">{outfit.occasion}</p>
          <h3 className="font-heading text-lg leading-snug">{outfit.title}</h3>
          {outfit.description && (
            <p className="text-xs text-muted-foreground font-body mt-1 leading-relaxed line-clamp-2">
              {outfit.description}
            </p>
          )}
        </div>
        <button
          onClick={() => onPinToBoard(outfit)}
          className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0"
          title="Pin to Board"
        >
          <Pin size={14} className="text-muted-foreground" />
        </button>
      </div>

      {/* Product grid */}
      {buyableItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {buyableItems.map((item, idx) => {
            const isRental = item.is_rental === true;
            const isResale = item.is_resale === true;
            const currency = item.currency || "USD";
            const originalCurrency = item.original_currency || currency;

            return (
              <a
                key={idx}
                href={item.affiliate_url!}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl overflow-hidden bg-secondary hover:ring-1 hover:ring-primary/40 transition-all"
              >
                <div className="aspect-square bg-muted relative overflow-hidden">
                  <img
                    src={item.image_url!}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="eager"
                  />
                  {/* Source badge */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5">
                    <span className="text-[9px] tracking-wide uppercase font-body px-1.5 py-0.5 rounded bg-black/60 text-white/80">
                      {item.category}
                    </span>
                    {isRental && (
                      <span className="text-[9px] tracking-wide uppercase font-body px-1.5 py-0.5 rounded bg-emerald-600/80 text-white">
                        Rent
                      </span>
                    )}
                    {isResale && (
                      <span className="text-[9px] tracking-wide uppercase font-body px-1.5 py-0.5 rounded bg-violet-600/80 text-white">
                        Pre-loved
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-body text-foreground leading-snug line-clamp-2">{item.name}</p>
                  {item.brand_suggestion && (
                    <p className="text-[10px] text-muted-foreground font-body mt-0.5">{item.brand_suggestion}</p>
                  )}
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <div className="min-w-0">
                      {isRental && item.price ? (
                        <span className="text-xs font-body text-emerald-500 font-medium">
                          {formatCurrency(item.price, currency)} / 4 days
                        </span>
                      ) : isResale && item.price ? (
                        <div>
                          {item.original_price && (
                            <span className="text-[10px] font-body text-muted-foreground line-through block leading-none">
                              Was {formatCurrency(item.original_price, originalCurrency)}
                            </span>
                          )}
                          <span className="text-xs font-body text-violet-400 font-medium">
                            {formatCurrency(item.price, currency)}
                          </span>
                        </div>
                      ) : item.price ? (
                        <span className="text-xs font-body text-primary font-medium">
                          {formatCurrency(item.price, currency)}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground font-body">See price</span>
                      )}
                    </div>
                    <span className={`text-[9px] tracking-wide uppercase font-body px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      isRental
                        ? "bg-emerald-600/10 text-emerald-500"
                        : isResale
                        ? "bg-violet-600/10 text-violet-400"
                        : "bg-primary/10 text-primary"
                    }`}>
                      {isRental ? "Rent This" : isResale ? "Buy Pre-loved" : "Buy"}
                    </span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        /* No products resolved — show item list as text */
        <div className="space-y-1.5">
          {(items.length > 0 ? items : allItems).map((item, idx) => (
            <div key={idx} className="flex items-center justify-between py-1 border-b border-border/40 last:border-0">
              <div>
                <span className="text-xs font-body text-foreground">{item.name}</span>
                {item.brand_suggestion && (
                  <span className="text-[10px] text-muted-foreground font-body ml-1.5">by {item.brand_suggestion}</span>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground font-body">{item.category}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer — total price */}
      {totalPrice > 0 && filter !== "rent" && filter !== "preloved" && (
        <div className="flex items-center justify-between pt-1 border-t border-border/40">
          <span className="text-xs font-body text-muted-foreground">
            Full look (buy new):{" "}
            <span className="text-foreground font-medium">${totalPrice.toLocaleString()}</span>
          </span>
          {buyableItems.length > 0 && (
            <span className="text-[10px] text-muted-foreground font-body">
              {buyableItems.length} piece{buyableItems.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default InspirationTab;
