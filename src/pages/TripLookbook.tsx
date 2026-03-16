import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trip, TripEvent, OutfitSuggestion, PackingItem } from "@/types/database";
import { Button } from "@/components/ui/button";
import { BookOpen, Download } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { QRCodeSVG } from "qrcode.react";

// ─── Helper components ───────────────────────────────────────────────────────

const SectionHeader = ({ title }: { title: string }) => (
  <div>
    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "28px", color: "#111", marginBottom: "8px" }}>{title}</h2>
    <div style={{ width: "60px", height: "2px", background: "#cc8638" }} />
  </div>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div style={{ marginBottom: "0.75rem" }}>
    <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", fontFamily: "var(--font-body)", marginBottom: "2px" }}>{label}</p>
    <p style={{ fontSize: "14px", color: "#111", fontFamily: "var(--font-body)" }}>{value}</p>
  </div>
);

const StatBox = ({ value, label }: { value: number; label: string }) => (
  <div style={{ textAlign: "center", padding: "1rem", border: "1px solid #f3f4f6", borderRadius: "8px", minWidth: "80px" }}>
    <p style={{ fontSize: "28px", fontFamily: "var(--font-heading)", color: "#111" }}>{value}</p>
    <p style={{ fontSize: "10px", color: "#6b7280", fontFamily: "var(--font-body)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</p>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatEventDatetime(dateStr: string | null, timeStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const dayStr = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  if (!timeStr) return dayStr;
  return `${dayStr} · ${timeStr}`;
}

function groupByCategory(items: PackingItem[]): Record<string, PackingItem[]> {
  return items.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);
}

// ─── Component ───────────────────────────────────────────────────────────────

const TripLookbook = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Trip details
  const { data: trip, isLoading: tripLoading } = useQuery({
    queryKey: ["lookbook-trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*").eq("id", tripId!).single();
      if (error) throw error;
      return data as Trip;
    },
    enabled: !!tripId,
  });

  // 2. Profile (for host name + subscription check)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["lookbook-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("name, avatar_url, subscription_tier").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // 3. Collaborators (accepted)
  const { data: collaborators = [], isLoading: collabsLoading } = useQuery({
    queryKey: ["lookbook-collabs", tripId],
    queryFn: async () => {
      const { data } = await supabase.from("trip_collaborators").select("user_id, role").eq("trip_id", tripId!).eq("status", "accepted");
      return data || [];
    },
    enabled: !!tripId,
  });

  // Fetch collaborator profiles
  const { data: collabProfiles = [], isLoading: collabProfilesLoading } = useQuery({
    queryKey: ["lookbook-collab-profiles", collaborators.map((c) => c.user_id).join(",")],
    queryFn: async () => {
      const ids = collaborators.map((c) => c.user_id).filter(Boolean) as string[];
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", ids);
      return data || [];
    },
    enabled: collaborators.length > 0,
  });

  // 4. Confirmed events
  const { data: confirmedEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ["lookbook-events", tripId],
    queryFn: async () => {
      const { data } = await supabase.from("trip_events").select("*").eq("trip_id", tripId!).eq("booking_status", "confirmed").order("event_date", { ascending: true });
      return (data || []) as TripEvent[];
    },
    enabled: !!tripId,
  });

  // 5. Pinned outfits
  const { data: pinnedOutfits = [], isLoading: outfitsLoading } = useQuery({
    queryKey: ["lookbook-outfits", tripId],
    queryFn: async () => {
      const { data } = await supabase.from("outfit_suggestions").select("*").eq("trip_id", tripId!).eq("pinned", true).order("created_at", { ascending: false });
      return (data || []) as OutfitSuggestion[];
    },
    enabled: !!tripId,
  });

  // 6. Packing items
  const { data: packingItems = [], isLoading: packingLoading } = useQuery({
    queryKey: ["lookbook-packing", tripId],
    queryFn: async () => {
      const { data } = await supabase.from("packing_items").select("*").eq("trip_id", tripId!).order("category", { ascending: true });
      return (data || []) as PackingItem[];
    },
    enabled: !!tripId,
  });

  // 7. Playlist
  const { data: playlist, isLoading: playlistLoading } = useQuery({
    queryKey: ["lookbook-playlist", tripId],
    queryFn: async () => {
      const { data } = await supabase.from("trip_playlists").select("*").eq("trip_id", tripId!).maybeSingle();
      return data as { playlist_name: string; spotify_playlist_url: string } | null;
    },
    enabled: !!tripId,
  });

  const isLoading =
    tripLoading ||
    profileLoading ||
    collabsLoading ||
    (collaborators.length > 0 && collabProfilesLoading) ||
    eventsLoading ||
    outfitsLoading ||
    packingLoading ||
    playlistLoading;

  const nightCount =
    trip?.start_date && trip?.end_date
      ? Math.ceil(
          (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

  // Auto-print after data loads
  useEffect(() => {
    if (!isLoading && trip && profile?.subscription_tier === "atelier") {
      const timer = setTimeout(() => window.print(), 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, trip, profile]);

  const handleExport = () => window.print();

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 bg-white/10 animate-pulse rounded w-32 mb-6" />
          <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
            <div className="h-screen bg-gray-900 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm w-full">
          <h2 className="text-2xl font-heading mb-3">Trip not found</h2>
          <p className="text-sm text-muted-foreground font-body mb-6">This trip could not be loaded.</p>
          <Button variant="champagne" onClick={() => navigate(-1)}>Back to trip</Button>
        </div>
      </div>
    );
  }

  // ── Subscription gate ──────────────────────────────────────────────────────
  if (profile && profile.subscription_tier !== "atelier") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Navbar />
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm w-full mt-20">
          <BookOpen size={40} className="text-primary mx-auto mb-4 opacity-60" />
          <h2 className="text-2xl font-heading mb-3">Trip Lookbook</h2>
          <p className="text-sm text-muted-foreground font-body mb-6">
            Export your complete trip as a beautifully designed PDF lookbook — events, outfits, packing list and playlist in one document. Available on Concierge Atelier.
          </p>
          <Button variant="champagne" className="w-full" onClick={() => navigate("/settings")}>
            Upgrade to Atelier
          </Button>
          <button onClick={() => navigate(-1)} className="mt-3 text-xs text-muted-foreground hover:text-foreground font-body transition-colors">
            Back to trip
          </button>
        </div>
      </div>
    );
  }

  // ── Main lookbook ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#111] py-8 px-4">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          nav, header { display: none !important; }
          #lookbook-content { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; max-width: 100% !important; }
          .page-break { page-break-before: always !important; }
          img { max-width: 100% !important; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; print-color-adjust: exact !important; }
          h1, h2 { font-size: inherit !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
        @page {
          margin: 0;
          size: A4;
        }
      `}</style>

      {/* Screen controls — hidden on print */}
      <div className="no-print flex items-center justify-between max-w-4xl mx-auto mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-white/60 hover:text-white text-sm font-body flex items-center gap-2 transition-colors"
        >
          ← Back to trip
        </button>
        <Button
          onClick={handleExport}
          className="bg-primary text-white hover:bg-primary/85 font-body"
        >
          <Download size={14} /> Export as PDF
        </Button>
      </div>

      {/* Lookbook content — white background */}
      <motion.div
        id="lookbook-content"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto bg-white text-black rounded-lg overflow-hidden shadow-2xl"
      >

        {/* ── Page 1: Cover ─────────────────────────────────────────────── */}
        <div className="lookbook-page cover-page relative" style={{ minHeight: "100vh", background: "#1A1917" }}>
          {trip.image_url && (
            <div className="absolute inset-0">
              <img src={trip.image_url} alt="" className="w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(26,25,23,0.3) 0%, rgba(26,25,23,0.85) 100%)" }} />
            </div>
          )}
          <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-12 text-center text-white">
            <p style={{ letterSpacing: "0.3em", fontSize: "11px", color: "#cc8638", fontFamily: "var(--font-body)", textTransform: "uppercase", marginBottom: "2rem" }}>
              CONCIERGE STYLED
            </p>
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(3rem, 8vw, 5rem)", color: "white", marginBottom: "1rem", lineHeight: 1.1 }}>
              {trip.destination}
            </h1>
            <p style={{ color: "#cc8638", fontFamily: "var(--font-body)", fontSize: "14px", marginBottom: "0.5rem" }}>
              {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
            </p>
            {trip.trip_type && (
              <span style={{ border: "1px solid #cc8638", color: "#cc8638", padding: "4px 14px", borderRadius: "999px", fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", fontFamily: "var(--font-body)" }}>
                {trip.trip_type}
              </span>
            )}
            <div style={{ marginTop: "3rem" }}>
              <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-body)", fontSize: "12px" }}>
                Planned by {profile?.name || ""}
              </p>
              {collabProfiles.length > 0 && (
                <p style={{ color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-body)", fontSize: "11px", marginTop: "0.25rem" }}>
                  Travelling with: {collabProfiles.map((p) => p.name).filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <p style={{ position: "absolute", bottom: "3rem", fontStyle: "italic", color: "rgba(255,255,255,0.3)", fontFamily: "var(--font-body)", fontSize: "12px" }}>
              Arrive Impeccably Everywhere
            </p>
          </div>
        </div>

        {/* ── Page 2: Trip Overview ──────────────────────────────────────── */}
        <div className="lookbook-page page-break" style={{ padding: "3rem", minHeight: "80vh", background: "white", color: "black" }}>
          <SectionHeader title="THE TRIP" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2rem" }}>
            <div>
              <DetailRow label="Destination" value={`${trip.destination}${trip.country ? ", " + trip.country : ""}`} />
              <DetailRow label="Dates" value={`${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}`} />
              <DetailRow label="Duration" value={`${nightCount} nights`} />
              {trip.trip_type && <DetailRow label="Type" value={trip.trip_type} />}
              {trip.trip_theme && <DetailRow label="Theme" value={trip.trip_theme} />}
            </div>
            <div>
              <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                <StatBox value={nightCount} label="Nights" />
                <StatBox value={confirmedEvents.length} label="Events" />
                <StatBox value={pinnedOutfits.length} label="Outfits" />
              </div>
            </div>
          </div>

          {collabProfiles.length > 0 && (
            <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
              <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6b7280", marginBottom: "1rem", fontFamily: "var(--font-body)" }}>
                Travel Companions
              </p>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                {collabProfiles.map((p) => (
                  <div key={p.user_id} style={{ textAlign: "center" }}>
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.name || ""} style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                        {p.name?.[0] || "?"}
                      </div>
                    )}
                    <p style={{ fontSize: "10px", marginTop: "4px", fontFamily: "var(--font-body)", color: "#374151" }}>{p.name?.split(" ")[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Pages 3+: Confirmed Events ────────────────────────────────── */}
        {confirmedEvents.length > 0 &&
          confirmedEvents.map((event) => {
            const eventOutfit = pinnedOutfits.find(
              (o) => (o as OutfitSuggestion & { outfit_event_id?: string }).outfit_event_id === event.id
            );
            return (
              <div key={event.id} className="lookbook-page page-break" style={{ padding: "3rem", background: "white", color: "black" }}>
                <div style={{ display: "flex", gap: "3rem" }}>
                  {/* Left: event details */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#cc8638", fontFamily: "var(--font-body)", marginBottom: "0.5rem" }}>
                      Confirmed Event
                    </p>
                    <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "2rem", marginBottom: "1.5rem", color: "#111" }}>
                      {event.event_name}
                    </h2>

                    {event.event_date && (
                      <DetailRow label="Date & Time" value={formatEventDatetime(event.event_date, event.event_time)} />
                    )}
                    {event.venue_name && <DetailRow label="Venue" value={event.venue_name} />}
                    {event.venue_address && <DetailRow label="Address" value={event.venue_address} />}
                    {event.booking_reference && <DetailRow label="Booking Reference" value={event.booking_reference} />}

                    {event.dress_code && (
                      <div style={{ marginTop: "1.5rem" }}>
                        <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", fontFamily: "var(--font-body)", marginBottom: "6px" }}>Dress Code</p>
                        <span style={{ display: "inline-block", border: "1px solid #cc8638", color: "#cc8638", padding: "4px 16px", borderRadius: "999px", fontSize: "12px", fontFamily: "var(--font-body)" }}>
                          {event.dress_code}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right: pinned outfit */}
                  <div style={{ flex: 1 }}>
                    {eventOutfit?.image_url ? (
                      <div>
                        <p style={{ fontSize: "9px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", fontFamily: "var(--font-body)", marginBottom: "8px" }}>Your Look</p>
                        <img src={eventOutfit.image_url} alt="Outfit" style={{ width: "100%", maxHeight: "400px", objectFit: "cover", borderRadius: "8px" }} />
                      </div>
                    ) : (
                      <div style={{ height: "200px", border: "1px dashed #e5e7eb", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <p style={{ color: "#9ca3af", fontSize: "12px", fontFamily: "var(--font-body)" }}>No look selected yet</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        {/* ── Style Edit Page (pinned outfits) ──────────────────────────── */}
        {pinnedOutfits.length > 0 && (
          <div className="lookbook-page page-break" style={{ padding: "3rem", background: "white", color: "black" }}>
            <SectionHeader title="THE LOOK" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "2rem" }}>
              {pinnedOutfits.slice(0, 4).map((outfit) => (
                <div key={outfit.id}>
                  {outfit.image_url && (
                    <img src={outfit.image_url} alt={outfit.title || ""} style={{ width: "100%", borderRadius: "8px", objectFit: "cover", maxHeight: "280px" }} />
                  )}
                  {outfit.store && (
                    <p style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "var(--font-body)", marginTop: "6px" }}>
                      {outfit.store}
                      {outfit.product_url && (
                        <span> · <a href={outfit.product_url} style={{ color: "#cc8638" }}>Shop</a></span>
                      )}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {pinnedOutfits.length > 4 && (
          <div className="lookbook-page page-break" style={{ padding: "3rem", background: "white", color: "black" }}>
            <SectionHeader title="THE LOOK — continued" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "2rem" }}>
              {pinnedOutfits.slice(4, 8).map((outfit) => (
                <div key={outfit.id}>
                  {outfit.image_url && (
                    <img src={outfit.image_url} alt={outfit.title || ""} style={{ width: "100%", borderRadius: "8px", objectFit: "cover", maxHeight: "280px" }} />
                  )}
                  {outfit.store && (
                    <p style={{ fontSize: "10px", color: "#9ca3af", fontFamily: "var(--font-body)", marginTop: "6px" }}>{outfit.store}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Packing List Page ─────────────────────────────────────────── */}
        {packingItems.filter((item) => item.category !== "leave_behind").length > 0 && (
          <div className="lookbook-page page-break" style={{ padding: "3rem", background: "white", color: "black" }}>
            <SectionHeader title="WHAT TO PACK" />

            {Object.entries(groupByCategory(packingItems.filter((item) => item.category !== "leave_behind"))).map(
              ([category, items]) => (
                <div key={category} style={{ marginTop: "1.5rem" }}>
                  <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#6b7280", fontFamily: "var(--font-body)", marginBottom: "0.5rem", borderBottom: "1px solid #f3f4f6", paddingBottom: "4px" }}>
                    {category}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                    {items.map((item) => (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                        <div style={{ width: 14, height: 14, border: "1px solid #d1d5db", borderRadius: "2px", flexShrink: 0 }} />
                        <span style={{ fontSize: "12px", fontFamily: "var(--font-body)", color: "#374151" }}>{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {packingItems.filter((item) => item.category === "leave_behind").length > 0 && (
              <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid #f3f4f6" }}>
                <p style={{ fontSize: "10px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", fontFamily: "var(--font-body)", marginBottom: "0.5rem" }}>
                  Leave These At Home
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                  {packingItems.filter((item) => item.category === "leave_behind").map((item) => {
                    let name = item.name;
                    try {
                      name = JSON.parse(item.name).item || item.name;
                    } catch {
                      // keep original name
                    }
                    return (
                      <div key={item.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
                        <span style={{ color: "#ef4444", fontSize: "12px", flexShrink: 0 }}>✕</span>
                        <span style={{ fontSize: "12px", fontFamily: "var(--font-body)", color: "#9ca3af" }}>{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Playlist Page ─────────────────────────────────────────────── */}
        {playlist && (
          <div className="lookbook-page page-break" style={{ padding: "3rem", background: "white", color: "black" }}>
            <SectionHeader title="THE SOUNDTRACK" />
            <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", color: "#111", marginBottom: "0.5rem" }}>
                  {playlist.playlist_name}
                </h3>
                <a href={playlist.spotify_playlist_url} style={{ color: "#1DB954", fontSize: "12px", fontFamily: "var(--font-body)", textDecoration: "none" }}>
                  Open on Spotify ↗
                </a>
              </div>
              <div style={{ textAlign: "center" }}>
                <QRCodeSVG value={playlist.spotify_playlist_url} size={100} />
                <p style={{ fontSize: "9px", color: "#9ca3af", fontFamily: "var(--font-body)", marginTop: "6px", letterSpacing: "0.1em" }}>
                  SCAN TO LISTEN
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default TripLookbook;
