import { useState, useRef, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toPng } from "html-to-image";
import {
  Camera, CalendarDays, Music, Moon, Sparkles,
  Download, Loader2, Check, Copy, ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Trip, TripPhoto } from "@/types/database";
import { UpgradePrompt } from "@/components/UpgradePrompt";

interface MemoriesTabProps {
  tripId: string;
  trip: Trip;
}

type FrameStyle = "minimal" | "editorial" | "clean";

const FRAME_STYLES: Record<FrameStyle, { label: string; bg: string; text: string; accent: string }> = {
  minimal: { label: "Minimal", bg: "#ffffff", text: "#111111", accent: "#cc8638" },
  editorial: { label: "Editorial", bg: "#151311", text: "#f9f6f3", accent: "#cc8638" },
  clean: { label: "Clean", bg: "#f9f6f3", text: "#151311", accent: "#cc8638" },
};

const MemoriesTab = ({ tripId, trip }: MemoriesTabProps) => {
  const { user } = useAuth();
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [frameStyle, setFrameStyle] = useState<FrameStyle>("editorial");
  const [caption, setCaption] = useState("");
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [captionCopied, setCaptionCopied] = useState(false);

  const style = FRAME_STYLES[frameStyle];

  // ── Profile check (tier gate) ─────────────────────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("subscription_tier").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const tier = profile?.subscription_tier || "free";
  const hasAccess = tier === "luxe" || tier === "atelier";

  // ── Fetch trip photos ─────────────────────────────────────────────────────
  const { data: photos = [] } = useQuery<(TripPhoto & { url: string })[]>({
    queryKey: ["trip-photos-memories", tripId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_photos")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true });
      return (data || []).map((p) => {
        const { data: { publicUrl } } = supabase.storage.from("trip-photos").getPublicUrl(p.storage_path);
        return { ...p, url: publicUrl } as TripPhoto & { url: string };
      });
    },
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const { data: eventCount = 0 } = useQuery({
    queryKey: ["memories-event-count", tripId],
    queryFn: async () => {
      const { count } = await supabase.from("trip_events").select("id", { count: "exact", head: true }).eq("trip_id", tripId);
      return count || 0;
    },
  });

  const { data: trackCount = 0 } = useQuery({
    queryKey: ["memories-track-count", tripId],
    queryFn: async () => {
      const { data } = await supabase.from("trip_playlist").select("id").eq("trip_id", tripId).maybeSingle();
      return data ? 1 : 0;
    },
  });

  const nights = useMemo(() => {
    const start = new Date(trip.start_date);
    const end = new Date(trip.end_date);
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  }, [trip.start_date, trip.end_date]);

  // ── Photo selection ───────────────────────────────────────────────────────
  const togglePhoto = (id: string) => {
    setSelectedPhotos((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 10) { toast({ title: "Max 10 photos", description: "Remove one to add another." }); return prev; }
      return [...prev, id];
    });
  };

  const selectedPhotoUrls = useMemo(
    () => selectedPhotos.map((id) => photos.find((p) => p.id === id)).filter(Boolean) as (TripPhoto & { url: string })[],
    [selectedPhotos, photos],
  );

  // ── AI Caption ────────────────────────────────────────────────────────────
  const generateCaption = async () => {
    setGeneratingCaption(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-carousel-caption", {
        body: {
          destination: trip.destination,
          country: trip.country,
          trip_type: trip.trip_type,
          events_count: eventCount,
          photos_count: photos.length,
          nights,
        },
      });
      if (error) throw error;
      setCaption(data.caption || "");
      toast({ title: "Caption generated" });
    } catch {
      toast({ title: "Could not generate caption", variant: "destructive" });
    } finally {
      setGeneratingCaption(false);
    }
  };

  const copyCaption = () => {
    navigator.clipboard.writeText(caption);
    setCaptionCopied(true);
    setTimeout(() => setCaptionCopied(false), 2000);
    toast({ title: "Caption copied" });
  };

  // ── Export carousel ───────────────────────────────────────────────────────
  const exportCarousel = useCallback(async () => {
    if (selectedPhotoUrls.length === 0) {
      toast({ title: "Select photos first", description: "Choose up to 10 photos for your carousel." });
      return;
    }

    setExporting(true);
    setExportProgress(0);

    const totalSlides = selectedPhotoUrls.length + 2;

    try {
      for (let i = 0; i < totalSlides; i++) {
        setExportProgress(Math.round(((i + 1) / totalSlides) * 100));

        const el = slideRefs.current[i];
        if (!el) continue;

        const dataUrl = await toPng(el, {
          width: 1080,
          height: 1080,
          pixelRatio: 1,
          cacheBust: true,
        });

        const link = document.createElement("a");
        link.download = `${trip.destination.replace(/\s+/g, "-").toLowerCase()}-slide-${i + 1}.png`;
        link.href = dataUrl;
        link.click();

        await new Promise((r) => setTimeout(r, 300));
      }

      toast({ title: "Carousel exported", description: `${totalSlides} slides saved` });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setExporting(false);
      setExportProgress(0);
    }
  }, [selectedPhotoUrls, trip.destination]);

  // ─── Tier gate ────────────────────────────────────────────────────────────
  if (!hasAccess) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl">
        <UpgradePrompt
          feature="Memories"
          tier="luxe"
          description="Create beautiful Instagram carousels from your trip photos and relive every moment."
        />
      </motion.div>
    );
  }

  // ─── Empty (no photos) ───────────────────────────────────────────────────
  if (photos.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-10 text-center">
        <Camera size={32} className="text-primary mx-auto mb-4 opacity-40" />
        <h3 className="font-heading text-xl mb-2">No photos to work with</h3>
        <p className="text-sm text-muted-foreground font-body max-w-sm mx-auto">
          Upload photos in the Photos tab first, then come back here to build your carousel.
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ── Trip Stats Recap ──────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <h3 className="eyebrow text-muted-foreground mb-4">Trip Recap</h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Moon size={16} className="text-primary" />
            </div>
            <p className="text-lg font-heading">{nights}</p>
            <p className="text-xs text-muted-foreground font-body">Nights</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <CalendarDays size={16} className="text-primary" />
            </div>
            <p className="text-lg font-heading">{eventCount}</p>
            <p className="text-xs text-muted-foreground font-body">Events</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Camera size={16} className="text-primary" />
            </div>
            <p className="text-lg font-heading">{photos.length}</p>
            <p className="text-xs text-muted-foreground font-body">Photos</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-1">
              <Music size={16} className="text-primary" />
            </div>
            <p className="text-lg font-heading">{trackCount ? "1" : "0"}</p>
            <p className="text-xs text-muted-foreground font-body">Playlist</p>
          </div>
        </div>
      </div>

      {/* ── Photo Selector ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="eyebrow text-muted-foreground">
            Select Photos ({selectedPhotos.length}/10)
          </h3>
          {selectedPhotos.length > 0 && (
            <button onClick={() => setSelectedPhotos([])} className="text-xs text-primary font-body">Clear</button>
          )}
        </div>
        <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5">
          {photos.map((photo) => {
            const isSelected = selectedPhotos.includes(photo.id);
            const order = selectedPhotos.indexOf(photo.id) + 1;
            return (
              <button
                key={photo.id}
                onClick={() => togglePhoto(photo.id)}
                className={`relative aspect-square rounded-lg overflow-hidden transition-all ${isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-95" : "hover:opacity-80"}`}
              >
                <img src={photo.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                {isSelected && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <span className="w-6 h-6 rounded-full bg-primary text-background text-xs font-body flex items-center justify-center">
                      {order}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Frame Style ───────────────────────────────────────────────────── */}
      <div>
        <h3 className="eyebrow text-muted-foreground mb-3">Frame Style</h3>
        <div className="flex gap-2">
          {(Object.entries(FRAME_STYLES) as [FrameStyle, typeof FRAME_STYLES[FrameStyle]][]).map(([key, s]) => (
            <button
              key={key}
              onClick={() => setFrameStyle(key)}
              className={`flex-1 py-3 rounded-xl text-xs font-body transition-all ${frameStyle === key ? "bg-primary/20 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}
            >
              <div className="w-6 h-6 rounded mx-auto mb-1" style={{ background: s.bg, border: `1px solid ${s.accent}` }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Caption ────────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="eyebrow text-muted-foreground">Instagram Caption</h3>
          <Button
            variant="champagne-outline"
            size="sm"
            onClick={generateCaption}
            disabled={generatingCaption}
          >
            {generatingCaption ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            {generatingCaption ? "Writing..." : "Generate"}
          </Button>
        </div>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write your caption or let AI generate one..."
          rows={3}
          className="w-full bg-secondary rounded-xl px-4 py-3 text-sm font-body placeholder:text-muted-foreground/40 border-none outline-none resize-none"
        />
        {caption && (
          <button onClick={copyCaption} className="flex items-center gap-1 text-xs text-primary font-body">
            {captionCopied ? <Check size={12} /> : <Copy size={12} />}
            {captionCopied ? "Copied" : "Copy to clipboard"}
          </button>
        )}
      </div>

      {/* ── Preview (first 3 slides) ──────────────────────────────────────── */}
      {selectedPhotoUrls.length > 0 && (
        <div>
          <h3 className="eyebrow text-muted-foreground mb-3">
            Preview ({selectedPhotoUrls.length + 2} slides)
          </h3>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {/* Cover slide preview */}
            <div className="w-40 h-40 rounded-xl overflow-hidden flex-shrink-0" style={{ background: style.bg }}>
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                <p className="text-[8px] tracking-[0.2em] uppercase" style={{ color: style.accent, fontFamily: "var(--font-body)" }}>Trip Memories</p>
                <p className="text-sm font-bold mt-1" style={{ color: style.text, fontFamily: "var(--font-heading)" }}>{trip.destination}</p>
                <div className="w-8 h-px mt-2" style={{ background: style.accent }} />
              </div>
            </div>
            {/* Photo slide previews (first 2) */}
            {selectedPhotoUrls.slice(0, 2).map((photo) => (
              <div key={photo.id} className="w-40 h-40 rounded-xl overflow-hidden flex-shrink-0 relative" style={{ background: style.bg }}>
                {frameStyle === "clean" ? (
                  <img src={photo.url} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <img src={photo.url} alt="" className="max-w-full max-h-full object-contain rounded" crossOrigin="anonymous" />
                  </div>
                )}
              </div>
            ))}
            {/* Closing slide preview */}
            <div className="w-40 h-40 rounded-xl overflow-hidden flex-shrink-0" style={{ background: style.bg }}>
              <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                <p className="text-[7px] tracking-[0.15em] uppercase" style={{ color: style.accent, fontFamily: "var(--font-body)" }}>Concierge Styled</p>
                <p className="text-xs mt-1" style={{ color: style.text, fontFamily: "var(--font-heading)" }}>Until next time,</p>
                <p className="text-xs" style={{ color: style.text, fontFamily: "var(--font-heading)" }}>{trip.destination}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Export Button ──────────────────────────────────────────────────── */}
      {selectedPhotoUrls.length > 0 && (
        <div className="space-y-3">
          <Button
            variant="champagne"
            className="w-full"
            onClick={exportCarousel}
            disabled={exporting}
          >
            {exporting ? (
              <><Loader2 size={14} className="animate-spin" /> Generating slide {Math.ceil((exportProgress / 100) * (selectedPhotoUrls.length + 2))} of {selectedPhotoUrls.length + 2}...</>
            ) : (
              <><Download size={14} /> Export {selectedPhotoUrls.length + 2} Slides (1080x1080)</>
            )}
          </Button>

          {exporting && (
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gold rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${exportProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Hidden slides for export (1080x1080) ─────────────────────────── */}
      <div className="fixed -left-[9999px] top-0" aria-hidden="true">
        {/* Cover slide */}
        <div
          ref={(el) => { slideRefs.current[0] = el; }}
          style={{ width: 1080, height: 1080, background: style.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}
        >
          <p style={{ fontSize: 18, letterSpacing: "0.3em", textTransform: "uppercase", color: style.accent, fontFamily: "var(--font-body)", marginBottom: 16 }}>
            Trip Memories
          </p>
          <p style={{ fontSize: 72, fontFamily: "var(--font-heading)", color: style.text, textAlign: "center", lineHeight: 1.1 }}>
            {trip.destination}
          </p>
          {trip.country && (
            <p style={{ fontSize: 20, fontFamily: "var(--font-body)", color: style.accent, marginTop: 16, letterSpacing: "0.15em", textTransform: "uppercase" }}>
              {trip.country}
            </p>
          )}
          <div style={{ width: 80, height: 2, background: style.accent, marginTop: 40 }} />
          <p style={{ fontSize: 14, fontFamily: "var(--font-body)", color: style.text, opacity: 0.5, marginTop: 24 }}>
            {new Date(trip.start_date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Photo slides */}
        {selectedPhotoUrls.map((photo, i) => (
          <div
            key={photo.id}
            ref={(el) => { slideRefs.current[i + 1] = el; }}
            style={{ width: 1080, height: 1080, background: style.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: frameStyle === "clean" ? 0 : 60, position: "relative" }}
          >
            <img
              src={photo.url}
              alt=""
              crossOrigin="anonymous"
              style={frameStyle === "clean"
                ? { width: 1080, height: 1080, objectFit: "cover" }
                : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
            />
            {frameStyle !== "clean" && (
              <p style={{ position: "absolute", bottom: 30, right: 40, fontSize: 11, fontFamily: "var(--font-body)", color: style.accent, letterSpacing: "0.2em", textTransform: "uppercase" }}>
                {i + 1} / {selectedPhotoUrls.length}
              </p>
            )}
          </div>
        ))}

        {/* Closing slide */}
        <div
          ref={(el) => { slideRefs.current[selectedPhotoUrls.length + 1] = el; }}
          style={{ width: 1080, height: 1080, background: style.bg, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}
        >
          <p style={{ fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", color: style.accent, fontFamily: "var(--font-body)", marginBottom: 24 }}>
            Concierge Styled
          </p>
          <p style={{ fontSize: 48, fontFamily: "var(--font-heading)", color: style.text, textAlign: "center", lineHeight: 1.2 }}>
            Until next time,
          </p>
          <p style={{ fontSize: 48, fontFamily: "var(--font-heading)", color: style.text, textAlign: "center", lineHeight: 1.2 }}>
            {trip.destination}
          </p>
          <div style={{ width: 80, height: 2, background: style.accent, marginTop: 40 }} />
          <p style={{ fontSize: 12, fontFamily: "var(--font-body)", color: style.text, opacity: 0.4, marginTop: 24, letterSpacing: "0.15em", textTransform: "uppercase" }}>
            {nights} nights &middot; {eventCount} events &middot; {photos.length} photos
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MemoriesTab;
