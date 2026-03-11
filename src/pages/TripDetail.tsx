import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trip } from "@/types/database";
import { Calendar, MapPin, Pencil, Trash2, Shield, CalendarDays, Grid3X3, MessageCircle, Sparkles, Music, Share2, Copy, Check, Download, BookOpen, Sun } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { getSeverity } from "@/components/trip/BriefingTab";
import TripEditDialog from "@/components/trip/TripEditDialog";
import TripDeleteDialog from "@/components/trip/TripDeleteDialog";
import { ShimmerSkeleton } from "@/components/ui/shimmer-skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { toPng } from "html-to-image";

const OverviewTab = lazy(() => import("@/components/trip/OverviewTab"));
const EventsTab = lazy(() => import("@/components/trip/EventsTab"));
const PackingTab = lazy(() => import("@/components/trip/PackingTab"));
const BriefingTab = lazy(() => import("@/components/trip/BriefingTab"));
const BoardTab = lazy(() => import("@/components/trip/BoardTab"));
const ChatTab = lazy(() => import("@/components/trip/ChatTab"));
const StyleTab = lazy(() => import("@/components/trip/StyleTab"));
const PlaylistTab = lazy(() => import("@/components/trip/PlaylistTab"));
const TodayTab = lazy(() => import("@/components/trip/TodayTab"));

const TabSkeleton = () => (
  <div className="space-y-4 p-4">
    <ShimmerSkeleton variant="card" className="h-32 rounded-2xl" />
    <ShimmerSkeleton variant="card" className="h-24 rounded-2xl" />
    <ShimmerSkeleton variant="text" className="h-8 rounded-lg w-2/3" />
  </div>
);

const PLANNING_TABS = ["Overview", "Briefing", "Events", "Chat", "Style", "Board", "Playlist", "Pack"] as const;
const ACTIVE_TABS = ["Today", "Events", "Chat", "Style", "Board", "Playlist", "Pack", "Overview", "Briefing"] as const;
type Tab = "Today" | "Overview" | "Briefing" | "Events" | "Chat" | "Style" | "Board" | "Playlist" | "Pack";

const TripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("Events");
  const [initialTabSet, setInitialTabSet] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inspireSearch, setInspireSearch] = useState("");
  const [inspireEventId, setInspireEventId] = useState("");

  const [lookbookGateOpen, setLookbookGateOpen] = useState(false);
  const [tabLastViewed, setTabLastViewed] = useState<Record<string, number>>({});

  // Tour for first-time collaborators
  const tourKey = id ? `first_collab_visit_${id}` : "";
  const [tourStep, setTourStep] = useState<number | null>(null);

  // Share state
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [tripIsPublic, setTripIsPublic] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingCard, setDownloadingCard] = useState(false);
  const tripCardRef = useRef<HTMLDivElement>(null);

  const handleStyleEvent = (query: string) => {
    setInspireSearch(query);
    setActiveTab("Style");
    requestAnimationFrame(() => setInspireSearch(""));
  };

  const handleSearchTheme = (query: string) => {
    setInspireSearch(query);
    setActiveTab("Style");
    requestAnimationFrame(() => setInspireSearch(""));
  };

  const handleAddLookForEvent = (query: string, eventId?: string) => {
    setInspireSearch(query);
    if (eventId) setInspireEventId(eventId);
    setActiveTab("Style");
    requestAnimationFrame(() => {
      setInspireSearch("");
      setInspireEventId("");
    });
  };

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as Trip;
    },
    enabled: !!id,
  });

  // Update trip statuses and set initial tab based on trip status
  useEffect(() => {
    if (!trip) return;
    supabase.rpc("update_trip_statuses").catch(() => {});
    if (!initialTabSet) {
      setActiveTab(trip.status === "active" ? "Today" : "Events");
      setInitialTabSet(true);
    }
  }, [trip?.id, trip?.status, initialTabSet]);

  const tabs = useMemo<readonly Tab[]>(
    () => (trip?.status === "active" ? ACTIVE_TABS : PLANNING_TABS),
    [trip?.status],
  );

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Sync share state when trip loads
  useEffect(() => {
    if (trip) {
      setTripIsPublic(trip.is_public ?? false);
    }
  }, [trip]);

  // Count accepted collaborators (hide Chat for solo trips)
  const { data: collabCount = 0 } = useQuery({
    queryKey: ["collab-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("trip_collaborators")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", id!)
        .eq("status", "accepted");
      return count ?? 0;
    },
    enabled: !!id,
  });

  // Unread chat message count
  const { data: chatUnread = 0, refetch: refetchUnread } = useQuery({
    queryKey: ["chat-unread", id],
    queryFn: async () => {
      const lastRead = localStorage.getItem(`chat_last_read_${id}`) ?? new Date(0).toISOString();
      const { count } = await supabase
        .from("trip_messages")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", id!)
        .neq("user_id", user?.id ?? "")
        .gt("created_at", lastRead);
      return count ?? 0;
    },
    enabled: !!id && !!user,
    refetchInterval: 30_000,
  });

  // Update last_read + clear badge when Chat tab is opened
  useEffect(() => {
    if (activeTab === "Chat") {
      localStorage.setItem(`chat_last_read_${id}`, new Date().toISOString());
      refetchUnread();
    }
  }, [activeTab, id, refetchUnread]);

  // Collaborator onboarding tour
  useEffect(() => {
    if (!trip || !user || !tourKey) return;
    const isNotOwner = trip.user_id !== user.id;
    if (isNotOwner && !localStorage.getItem(tourKey)) {
      const timer = setTimeout(() => setTourStep(0), 800);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.user_id, user?.id, tourKey]);

  const dismissTour = () => {
    if (tourKey) localStorage.setItem(tourKey, "true");
    setTourStep(null);
  };

  const tourSteps = [
    {
      title: trip ? `This trip was shared with you by the host` : "Welcome to the trip",
      body: "Welcome! Here you'll find all the trip details.",
    },
    {
      title: "Pin outfits, vote on polls and chat with the group",
      body: "Explore the Style tab to find inspiration for this trip.",
    },
    {
      title: "Add your look to each event in the Events tab",
      body: "See what's planned and add your outfit for each event.",
    },
  ];

  // Check for red briefing items to show badge on tab
  const { data: briefingBadge } = useQuery({
    queryKey: ["briefing-badge", trip?.destination, trip?.country],
    queryFn: async () => {
      const { data } = await supabase
        .from("destination_briefings")
        .select("health_malaria,health_vaccinations,entry_visa,legal_drugs,legal_lgbt,legal_dresscode_law,safety_areas_avoid,safety_scams")
        .eq("destination", trip!.destination)
        .eq("country", trip!.country ?? "")
        .maybeSingle();
      if (!data) return false;
      const fields = Object.values(data) as (string | null)[];
      return fields.some((f) => getSeverity(f) === "red");
    },
    enabled: !!trip,
  });

  // Tab click handler — updates last-viewed timestamp per tab
  const handleTabClick = (tab: Tab) => {
    const key = `last_viewed_${id}_${tab}`;
    const now = Date.now();
    localStorage.setItem(key, String(now));
    setTabLastViewed((prev) => ({ ...prev, [tab]: now }));
    setActiveTab(tab);

    // Mark Board / Playlist notifications as read when switching to those tabs
    if (tab === "Board" && user) {
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("trip_id", id!)
        .in("type", ["poll_created", "outfit_pinned"])
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["unread-notifs-by-type", id, user.id] });
        });
    }
    if (tab === "Playlist" && user) {
      supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("trip_id", id!)
        .eq("type", "track_added")
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["unread-notifs-by-type", id, user.id] });
        });
    }
  };

  // Recent events since last viewed
  const { data: recentEventCount = 0 } = useQuery({
    queryKey: ["recent-events-count", id, tabLastViewed["Events"]],
    queryFn: async () => {
      const lastViewed = localStorage.getItem(`last_viewed_${id}_Events`);
      if (!lastViewed) return 0;
      const { count } = await supabase
        .from("trip_events")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", id!)
        .gt("created_at", new Date(parseInt(lastViewed)).toISOString());
      return count || 0;
    },
    enabled: !!id && !!user,
    refetchInterval: 60000,
  });

  // Unread notifications per type for this trip
  const { data: unreadByType = {} } = useQuery({
    queryKey: ["unread-notifs-by-type", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("type")
        .eq("user_id", user!.id)
        .eq("trip_id", id!)
        .eq("is_read", false);
      const map: Record<string, number> = {};
      for (const n of data || []) {
        map[n.type] = (map[n.type] || 0) + 1;
      }
      return map;
    },
    enabled: !!id && !!user,
    refetchInterval: 30000,
  });

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });

  // Fetch outfit image URLs for trip card — up to 3 pinned outfit suggestions
  const { data: outfitImages = [] } = useQuery<string[]>({
    queryKey: ["outfit-images-card", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("outfit_suggestions")
        .select("image_url")
        .eq("trip_id", id!)
        .not("image_url", "is", null)
        .limit(3);
      return (data || []).map((r: { image_url: string }) => r.image_url).filter(Boolean);
    },
    enabled: !!id,
  });

  const toggleVisibility = async (makePublic: boolean) => {
    if (!trip) return;
    setTogglingVisibility(true);
    try {
      const { data, error } = await supabase.functions.invoke("toggle-trip-visibility", {
        body: { trip_id: trip.id, is_public: makePublic },
      });
      if (error) throw error;
      setTripIsPublic(data.is_public);
      setShareUrl(data.share_url);
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setTogglingVisibility(false);
    }
  };

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: "Copy the link manually.", variant: "destructive" });
    }
  };

  const downloadTripCard = async () => {
    if (!tripCardRef.current || !trip) return;
    setDownloadingCard(true);
    try {
      const dataUrl = await toPng(tripCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${trip.destination.replace(/\s+/g, "-").toLowerCase()}-trip-card.png`;
      link.href = dataUrl;
      link.click();
      toast({ title: "Trip card downloaded!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast({ title: "Download failed", description: message, variant: "destructive" });
    } finally {
      setDownloadingCard(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 md:pt-28 px-4 md:px-6">
          <div className="max-w-6xl mx-auto">
            <ShimmerSkeleton variant="card" className="h-56 rounded-2xl mb-8" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <ShimmerSkeleton key={i} variant="text" className="h-10 flex-1 rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-body">Trip not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hidden trip card for download — 540×960 (9:16 Instagram Stories) */}
      <div
        ref={tripCardRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "540px",
          height: "960px",
          backgroundColor: "#151311",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top 40% — hero image */}
        <div style={{ position: "relative", width: "100%", height: "384px", flexShrink: 0 }}>
          {trip.image_url && (
            <img
              src={trip.image_url}
              alt=""
              crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(21,19,17,0.1) 0%, rgba(21,19,17,0.7) 100%)" }} />
          <p style={{ position: "absolute", top: "24px", left: "0", right: "0", textAlign: "center", color: "#ca975c", fontSize: "10px", letterSpacing: "0.3em", textTransform: "uppercase", fontFamily: "sans-serif" }}>
            CONCIERGE STYLED
          </p>
        </div>

        {/* Middle 45% — destination name, dates, outfit images */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 40px", backgroundColor: "#151311" }}>
          <h1 style={{ color: "#f9f6f3", fontSize: "52px", fontFamily: "serif", lineHeight: 1.1, textAlign: "center", marginBottom: "12px" }}>
            {trip.destination}
          </h1>
          <p style={{ color: "#ca975c", fontSize: "14px", fontFamily: "sans-serif", letterSpacing: "0.1em", marginBottom: "24px" }}>
            {formatDate(trip.start_date)} – {formatDate(trip.end_date)}
          </p>
          {trip.trip_type && (
            <span style={{ display: "inline-block", color: "#ca975c", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", fontFamily: "sans-serif", border: "1px solid rgba(202,151,92,0.4)", padding: "5px 16px", borderRadius: "999px", marginBottom: "28px" }}>
              {trip.trip_type}
            </span>
          )}
          {/* Outfit images row — up to 3 */}
          {outfitImages.length > 0 && (
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              {outfitImages.slice(0, 3).map((url, i) => (
                <div key={i} style={{ width: "120px", height: "150px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(202,151,92,0.3)" }}>
                  <img src={url} alt="" crossOrigin="anonymous" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom 15% — tagline + URL */}
        <div style={{ height: "144px", backgroundColor: "#151311", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderTop: "1px solid rgba(202,151,92,0.15)" }}>
          <p style={{ color: "rgba(249,246,243,0.6)", fontSize: "11px", letterSpacing: "0.15em", fontFamily: "sans-serif", marginBottom: "6px" }}>
            Arrive Impeccably Everywhere
          </p>
          <p style={{ color: "rgba(202,151,92,0.5)", fontSize: "10px", fontFamily: "sans-serif", letterSpacing: "0.05em" }}>
            concierge-styled.com
          </p>
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-44 md:h-56 overflow-hidden bg-secondary">
        {trip.image_url ? (
          <>
            <img
              src={trip.image_url}
              alt={trip.destination}
              className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
        )}
        <div className="absolute bottom-6 left-4 right-4 md:bottom-8 md:left-8 md:right-8 max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs tracking-[0.2em] uppercase text-primary font-body">{trip.trip_type || "Trip"}</span>
                {trip.status === "active" && (
                  <span className="text-[10px] tracking-[0.15em] uppercase font-body bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Travel Mode
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-5xl font-heading mt-1">{trip.destination}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-body">
                <span className="flex items-center gap-1"><Calendar size={12} className="text-primary" /> {formatDate(trip.start_date)} – {formatDate(trip.end_date)}</span>
                {trip.country && <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" /> {trip.country}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (profile?.subscription_tier === "atelier") {
                    window.open(`/trip/${id}/lookbook`, "_blank");
                  } else {
                    setLookbookGateOpen(true);
                  }
                }}
                className="w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-colors"
                aria-label="Export lookbook"
              >
                <BookOpen size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => setShareOpen(true)} className="w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-colors" aria-label="Share trip">
                <Share2 size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => setEditOpen(true)} className="w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-secondary transition-colors" aria-label="Edit trip">
                <Pencil size={14} className="text-muted-foreground" />
              </button>
              <button onClick={() => setDeleteOpen(true)} className="w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center hover:bg-destructive/20 transition-colors" aria-label="Delete trip">
                <Trash2 size={14} className="text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      <main className="px-4 md:px-6 pb-16 md:pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex gap-1 mt-6 md:mt-8 mb-8 md:mb-12 border-b border-border overflow-x-auto scrollbar-hide">
            {tabs.filter((tab) => tab !== "Chat" || collabCount > 0).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabClick(tab)}
                className={`px-4 md:px-5 py-3 text-sm font-body tracking-wide transition-all duration-300 relative whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab === "Today" && <Sun size={12} className={activeTab === "Today" ? "text-primary" : "text-muted-foreground"} />}
                {tab === "Briefing" && <Shield size={12} className={activeTab === "Briefing" ? "text-primary" : "text-muted-foreground"} />}
                {tab === "Events" && <CalendarDays size={12} className={activeTab === "Events" ? "text-primary" : "text-muted-foreground"} />}
                {tab === "Chat" && <MessageCircle size={12} className={activeTab === "Chat" ? "text-primary" : "text-muted-foreground"} />}
                {tab === "Style" && <Sparkles size={12} className={activeTab === "Style" ? "text-primary" : "text-muted-foreground"} />}
                {tab === "Board" && <Grid3X3 size={12} className={activeTab === "Board" ? "text-primary" : "text-muted-foreground"} />}
                {tab === "Playlist" && <Music size={12} className={activeTab === "Playlist" ? "text-primary" : "text-muted-foreground"} />}
                {tab}
                {/* Red dot badge when briefing has critical items */}
                {tab === "Briefing" && briefingBadge && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                )}
                {/* Unread count badge on Chat tab */}
                {tab === "Chat" && chatUnread > 0 && activeTab !== "Chat" && (
                  <span className="min-w-[16px] h-4 rounded-full bg-blue-500 text-white text-[10px] font-body flex items-center justify-center px-1 flex-shrink-0">
                    {chatUnread > 99 ? "99+" : chatUnread}
                  </span>
                )}
                {/* Red dot on Events tab for new events */}
                {tab === "Events" && recentEventCount > 0 && activeTab !== "Events" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                )}
                {/* Gold dot on Board tab for unread poll/board notifications */}
                {tab === "Board" && ((unreadByType["poll_created"] || 0) + (unreadByType["outfit_pinned"] || 0)) > 0 && activeTab !== "Board" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                )}
                {/* Green dot on Playlist tab for new tracks */}
                {tab === "Playlist" && (unreadByType["track_added"] || 0) > 0 && activeTab !== "Playlist" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                )}
                {activeTab === tab && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-px bg-gradient-champagne" />}
              </button>
            ))}
          </div>

          <Suspense fallback={<TabSkeleton />}>
            {activeTab === "Today" && (
              <TodayTab tripId={trip.id} trip={trip as Trip} />
            )}
            {activeTab === "Overview" && (
              <OverviewTab
                tripId={trip.id}
                trip={{ latitude: trip.latitude, longitude: trip.longitude, start_date: trip.start_date, end_date: trip.end_date, user_id: trip.user_id, destination: trip.destination }}
                onNavigateTo={(tab) => setActiveTab(tab as Tab)}
              />
            )}
            {activeTab === "Events" && (
              <EventsTab
                tripId={trip.id}
                trip={{ destination: trip.destination, country: trip.country, user_id: trip.user_id, image_url: trip.image_url, trip_type: trip.trip_type, latitude: trip.latitude, longitude: trip.longitude }}
                onStyleEvent={handleStyleEvent}
              />
            )}
            {activeTab === "Briefing" && (
              <BriefingTab
                tripId={trip.id}
                trip={{ destination: trip.destination, country: trip.country, trip_type: trip.trip_type, start_date: trip.start_date, end_date: trip.end_date }}
              />
            )}
            {activeTab === "Style" && (
              <StyleTab
                tripId={trip.id}
                trip={{
                  destination: trip.destination,
                  country: trip.country,
                  trip_type: trip.trip_type,
                  latitude: trip.latitude,
                  longitude: trip.longitude,
                  start_date: trip.start_date,
                  end_date: trip.end_date,
                  user_id: trip.user_id,
                  trip_theme: trip.trip_theme ?? null,
                }}
                initialSearch={inspireSearch}
                initialEventId={inspireEventId}
              />
            )}
            {activeTab === "Chat" && (
              <ChatTab
                tripId={trip.id}
                trip={{ destination: trip.destination, user_id: trip.user_id }}
              />
            )}
            {activeTab === "Board" && (
              <BoardTab
                tripId={trip.id}
                trip={{
                  user_id: trip.user_id,
                  destination: trip.destination,
                  trip_theme: trip.trip_theme ?? null,
                  theme_colors: trip.theme_colors ?? null,
                }}
                onSearchTheme={handleSearchTheme}
                onAddLookForEvent={(query) => handleAddLookForEvent(query)}
              />
            )}
            {activeTab === "Playlist" && (
              <PlaylistTab
                tripId={trip.id}
                trip={{ destination: trip.destination, trip_type: trip.trip_type, start_date: trip.start_date }}
              />
            )}
            {activeTab === "Pack" && (
              <PackingTab
                tripId={trip.id}
                trip={{ destination: trip.destination, country: trip.country, origin_city: trip.origin_city, origin_country: trip.origin_country, start_date: trip.start_date, end_date: trip.end_date, trip_type: trip.trip_type }}
              />
            )}
          </Suspense>
        </div>
      </main>

      {/* Collaborator onboarding tour */}
      <AnimatePresence>
        {tourStep !== null && tourSteps[tourStep] && (
          <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-card border border-border rounded-2xl p-4 max-w-sm mx-auto shadow-xl pointer-events-auto"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] text-primary font-body tracking-widest uppercase">
                  Step {tourStep + 1} of {tourSteps.length}
                </span>
                <div className="flex gap-1 ml-auto">
                  {tourSteps.map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${i === tourStep ? "bg-primary" : "bg-border"}`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm font-body font-medium text-foreground mb-1">
                {tourSteps[tourStep].title}
              </p>
              <p className="text-xs text-muted-foreground font-body mb-4">
                {tourSteps[tourStep].body}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={dismissTour}
                  className="text-xs text-muted-foreground font-body hover:text-foreground transition-colors"
                >
                  Skip
                </button>
                {tourStep < tourSteps.length - 1 ? (
                  <Button
                    size="sm"
                    variant="champagne"
                    onClick={() => setTourStep((prev) => (prev !== null ? prev + 1 : null))}
                  >
                    Next
                  </Button>
                ) : (
                  <Button size="sm" variant="champagne" onClick={dismissTour}>
                    Got it
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TripEditDialog trip={trip} open={editOpen} onOpenChange={setEditOpen} />
      <TripDeleteDialog tripId={trip.id} destination={trip.destination} open={deleteOpen} onOpenChange={setDeleteOpen} />

      {/* Lookbook upgrade gate Sheet */}
      <Sheet open={lookbookGateOpen} onOpenChange={setLookbookGateOpen}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl pb-8">
          <SheetHeader className="mb-4">
            <SheetTitle className="font-heading text-left">Trip Lookbook</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center text-center py-4">
            <BookOpen size={36} className="text-primary mb-4 opacity-60" />
            <p className="text-sm text-muted-foreground font-body mb-6 max-w-sm">
              Export your complete trip as a beautifully designed PDF lookbook — events, outfits, packing list and playlist in one document. Available on Concierge Atelier.
            </p>
            <Button variant="champagne" className="w-full max-w-xs" onClick={() => { setLookbookGateOpen(false); window.location.href = "/settings"; }}>
              Upgrade to Atelier
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Share Sheet */}
      <Sheet open={shareOpen} onOpenChange={setShareOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="font-heading text-xl">Share Trip</SheetTitle>
          </SheetHeader>

          <div className="space-y-8 pb-8">
            {/* Section 1 — Share publicly */}
            <div className="space-y-4">
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">Share Publicly</p>

              {/* Toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-body text-foreground">Make this trip public</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">Anyone with the link can view it</p>
                </div>
                <button
                  onClick={() => !togglingVisibility && toggleVisibility(!tripIsPublic)}
                  disabled={togglingVisibility}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${tripIsPublic ? "bg-primary" : "bg-secondary border border-border"}`}
                  aria-label="Toggle public visibility"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${tripIsPublic ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
              </div>

              {tripIsPublic && shareUrl && (
                <div className="space-y-3">
                  {/* Share URL display */}
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-sm font-mono text-muted-foreground truncate">{shareUrl}</p>
                  </div>

                  {/* Copy link */}
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={copyLink}
                  >
                    {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                    {copiedLink ? "Copied!" : "Copy link"}
                  </Button>

                  {/* WhatsApp */}
                  <Button
                    variant="outline"
                    className="w-full gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10"
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Come see my trip to ${trip.destination} 🌍 ${shareUrl}`)}`)}
                  >
                    Share on WhatsApp
                  </Button>
                </div>
              )}
            </div>

            {/* Section 2 — Trip card download */}
            <div className="space-y-3">
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">Trip Card</p>
              <p className="text-xs text-muted-foreground font-body">Download a branded image for Instagram Stories</p>
              <Button
                variant="champagne-outline"
                className="w-full gap-2"
                onClick={downloadTripCard}
                disabled={downloadingCard}
              >
                <Download size={14} />
                {downloadingCard ? "Generating..." : "Download trip card"}
              </Button>
            </div>

            {/* Section 3 — Invite collaborators */}
            <div className="space-y-3">
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">Invite Collaborators</p>
              <Button
                variant="champagne-outline"
                className="w-full"
                onClick={() => setShareOpen(false)}
              >
                Invite to Collaborate
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TripDetail;
