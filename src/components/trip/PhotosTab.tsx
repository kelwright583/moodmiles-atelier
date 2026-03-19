import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera, Upload, X, ChevronLeft, ChevronRight, Download,
  Trash2, Loader2, ImagePlus, Crown, ZoomIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { TripPhoto } from "@/types/database";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PhotoWithUrl extends TripPhoto {
  url: string;
  uploaderName?: string;
  uploaderAvatar?: string;
  isNew?: boolean;
}

interface PhotosTabProps {
  tripId: string;
  trip: { destination: string; user_id: string };
}

// ─── Tier limits ─────────────────────────────────────────────────────────────

const PHOTO_LIMITS: Record<string, number> = {
  free: 50,
  luxe: 200,
  atelier: Infinity,
};

// ─── Image compression ────────────────────────────────────────────────────────
// Compresses to max 2000px on longest side, quality 0.85

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 2000;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Compression failed"));
      }, "image/jpeg", 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ─── Get image dimensions from file ──────────────────────────────────────────

async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

const PhotosTab = ({ tripId, trip }: PhotosTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [filterUserId, setFilterUserId] = useState<string>("all");
  const [captionInput, setCaptionInput] = useState("");
  const [newPhotoIds, setNewPhotoIds] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Profile + tier ────────────────────────────────────────────────────────
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("user_id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const tier = profile?.subscription_tier || "free";
  const photoLimit = PHOTO_LIMITS[tier] ?? 50;

  // ── Fetch photos ──────────────────────────────────────────────────────────
  const { data: photos = [], isLoading } = useQuery<PhotoWithUrl[]>({
    queryKey: ["trip-photos", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_photos")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Resolve public URLs + uploader names in one batch
      const uploaderIds = [...new Set((data || []).map((p) => p.uploaded_by))];
      const { data: uploaderProfiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", uploaderIds);

      const profileMap = Object.fromEntries(
        (uploaderProfiles || []).map((p) => [p.user_id, p])
      );

      return (data || []).map((photo) => {
        const { data: { publicUrl } } = supabase.storage
          .from("trip-photos")
          .getPublicUrl(photo.storage_path);
        const uploader = profileMap[photo.uploaded_by];
        return {
          ...photo,
          url: publicUrl,
          uploaderName: uploader?.name || "Someone",
          uploaderAvatar: uploader?.avatar_url || null,
        } as PhotoWithUrl;
      });
    },
  });

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`trip-photos-${tripId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trip_photos", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          // Don't flash for own uploads
          if (payload.new.uploaded_by !== user?.id) {
            setNewPhotoIds((prev) => new Set([...prev, payload.new.id]));
            setTimeout(() => {
              setNewPhotoIds((prev) => { const next = new Set(prev); next.delete(payload.new.id); return next; });
            }, 3000);
          }
          queryClient.invalidateQueries({ queryKey: ["trip-photos", tripId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [tripId, user?.id, queryClient]);

  // ── Filtered photos ───────────────────────────────────────────────────────
  const filteredPhotos = filterUserId === "all"
    ? photos
    : photos.filter((p) => p.uploaded_by === filterUserId);

  // ── Unique uploaders for filter pills ─────────────────────────────────────
  const uploaders = [...new Map(photos.map((p) => [p.uploaded_by, { id: p.uploaded_by, name: p.uploaderName, avatar: p.uploaderAvatar }])).values()];

  // ── Photo count for this user ─────────────────────────────────────────────
  const myPhotoCount = photos.filter((p) => p.uploaded_by === user?.id).length;
  const atLimit = myPhotoCount >= photoLimit;

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (atLimit) {
      toast({ title: "Photo limit reached", description: `${tier === "free" ? "Free" : "Luxe"} plan allows ${photoLimit} photos. Upgrade for more.`, variant: "destructive" });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const toUpload = Array.from(files).slice(0, Math.min(files.length, photoLimit - myPhotoCount));
    let uploaded = 0;

    for (const file of toUpload) {
      try {
        const { width, height } = await getImageDimensions(file);
        const compressed = await compressImage(file);
        const ext = "jpg";
        const path = `${tripId}/${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("trip-photos")
          .upload(path, compressed, { contentType: "image/jpeg", upsert: false });

        if (uploadError) throw uploadError;

        await supabase.from("trip_photos").insert({
          trip_id: tripId,
          uploaded_by: user!.id,
          storage_path: path,
          caption: captionInput || null,
          width,
          height,
        });

        uploaded++;
        setUploadProgress(Math.round((uploaded / toUpload.length) * 100));
      } catch (err: any) {
        toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["trip-photos", tripId] });
    setCaptionInput("");
    setUploading(false);
    setUploadProgress(0);

    if (uploaded > 0) {
      toast({ title: `${uploaded} photo${uploaded > 1 ? "s" : ""} added`, description: `Shared to ${trip.destination}` });
    }
  }, [atLimit, captionInput, myPhotoCount, photoLimit, tier, tripId, trip.destination, user, queryClient]);

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = async (photo: PhotoWithUrl) => {
    setDeletingId(photo.id);
    try {
      await supabase.storage.from("trip-photos").remove([photo.storage_path]);
      await supabase.from("trip_photos").delete().eq("id", photo.id);
      queryClient.invalidateQueries({ queryKey: ["trip-photos", tripId] });
      if (lightboxIndex !== null && filteredPhotos[lightboxIndex]?.id === photo.id) {
        setLightboxIndex(null);
      }
      toast({ title: "Photo deleted" });
    } catch (err: any) {
      toast({ title: "Could not delete", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Lightbox navigation ───────────────────────────────────────────────────
  const lightboxPhoto = lightboxIndex !== null ? filteredPhotos[lightboxIndex] : null;

  const lightboxPrev = () => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : filteredPhotos.length - 1));
  const lightboxNext = () => setLightboxIndex((i) => (i !== null ? (i + 1) % filteredPhotos.length : 0));

  // Swipe handling for lightbox
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dy) > Math.abs(dx) && dy > 60) { setLightboxIndex(null); return; }
    if (Math.abs(dx) > 40) { dx < 0 ? lightboxNext() : lightboxPrev(); }
  };

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") lightboxPrev();
      if (e.key === "ArrowRight") lightboxNext();
      if (e.key === "Escape") setLightboxIndex(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, filteredPhotos.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Upload area ──────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="eyebrow text-muted-foreground">Add Photos</h3>
          {tier !== "atelier" && (
            <span className="text-xs font-body text-muted-foreground">
              {myPhotoCount} / {photoLimit}
            </span>
          )}
        </div>

        {atLimit ? (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-center">
            <Crown size={20} className="text-primary mx-auto mb-2" />
            <p className="text-sm font-body text-muted-foreground mb-3">
              {tier === "free" ? "Upgrade to Luxe for 200 photos" : "Upgrade to Atelier for unlimited photos"}
            </p>
            <Button variant="champagne" size="sm" onClick={() => window.location.href = "/settings"}>
              Upgrade
            </Button>
          </div>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              capture="environment"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files)}
            />

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Add a caption (optional)"
                value={captionInput}
                onChange={(e) => setCaptionInput(e.target.value)}
                className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm font-body placeholder:text-muted-foreground/40 border-none outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { if (fileInputRef.current) { fileInputRef.current.removeAttribute("capture"); fileInputRef.current.click(); } }}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/30 text-sm font-body text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
              >
                <ImagePlus size={16} />
                Gallery
              </button>
              <button
                onClick={() => { if (fileInputRef.current) { fileInputRef.current.setAttribute("capture", "environment"); fileInputRef.current.click(); } }}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/30 text-sm font-body text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
              >
                <Camera size={16} />
                Camera
              </button>
            </div>

            {uploading && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs font-body text-muted-foreground mb-1">
                  <span>Uploading…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gold rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Collaborator filter pills ─────────────────────────────────────── */}
      {uploaders.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setFilterUserId("all")}
            className={`flex-shrink-0 text-xs font-body px-3 py-1.5 rounded-full transition-all ${filterUserId === "all" ? "bg-gold text-background" : "bg-secondary text-muted-foreground"}`}
          >
            All ({photos.length})
          </button>
          {uploaders.map((u) => {
            const count = photos.filter((p) => p.uploaded_by === u.id).length;
            return (
              <button
                key={u.id}
                onClick={() => setFilterUserId(u.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-body px-3 py-1.5 rounded-full transition-all ${filterUserId === u.id ? "bg-gold text-background" : "bg-secondary text-muted-foreground"}`}
              >
                {u.avatar ? (
                  <img src={u.avatar} className="w-4 h-4 rounded-full" alt="" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[8px] text-primary font-heading">
                    {(u.name || "?")[0].toUpperCase()}
                  </span>
                )}
                {u.id === user?.id ? "You" : u.name} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {!isLoading && filteredPhotos.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Camera size={28} className="text-primary" />
          </div>
          <h3 className="font-heading text-xl mb-2">No photos yet</h3>
          <p className="text-sm text-muted-foreground font-body max-w-sm mx-auto">
            {filterUserId === "all"
              ? `Be the first to capture ${trip.destination} — every memory shared here is yours to keep forever.`
              : "This member hasn't shared any photos yet."}
          </p>
        </motion.div>
      )}

      {/* ── Masonry grid ──────────────────────────────────────────────────── */}
      {!isLoading && filteredPhotos.length > 0 && (
        <div className="columns-2 md:columns-3 gap-2 space-y-2">
          {filteredPhotos.map((photo, index) => {
            const aspectRatio = photo.width && photo.height ? photo.height / photo.width : 1;
            const isNew = newPhotoIds.has(photo.id);
            return (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                className={`break-inside-avoid mb-2 relative rounded-xl overflow-hidden cursor-pointer group ${isNew ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                onClick={() => setLightboxIndex(index)}
                style={{ aspectRatio: photo.width && photo.height ? `${photo.width}/${photo.height}` : undefined }}
              >
                <img
                  src={photo.url}
                  alt={photo.caption || "Trip photo"}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  {photo.caption && (
                    <p className="text-white text-xs font-body truncate">{photo.caption}</p>
                  )}
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <ZoomIn size={12} className="text-white" />
                  </div>
                </div>
                {isNew && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] tracking-[0.15em] uppercase font-body bg-primary text-background px-1.5 py-0.5 rounded-full">New</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Lightbox ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between p-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                {lightboxPhoto.uploaderAvatar ? (
                  <img src={lightboxPhoto.uploaderAvatar} className="w-7 h-7 rounded-full" alt="" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-heading text-primary">
                      {(lightboxPhoto.uploaderName || "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-xs font-body text-white/80">
                    {lightboxPhoto.uploaded_by === user?.id ? "You" : lightboxPhoto.uploaderName}
                  </p>
                  {lightboxPhoto.caption && (
                    <p className="text-xs font-body text-white/50">{lightboxPhoto.caption}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Download */}
                <a
                  href={lightboxPhoto.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={15} className="text-white" />
                </a>
                {/* Delete (own or trip host) */}
                {(lightboxPhoto.uploaded_by === user?.id || trip.user_id === user?.id) && (
                  <button
                    className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center hover:bg-red-500/40 transition-colors"
                    onClick={(e) => { e.stopPropagation(); handleDelete(lightboxPhoto); }}
                    disabled={deletingId === lightboxPhoto.id}
                  >
                    {deletingId === lightboxPhoto.id
                      ? <Loader2 size={15} className="text-red-400 animate-spin" />
                      : <Trash2 size={15} className="text-red-400" />}
                  </button>
                )}
                {/* Close */}
                <button
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  onClick={() => setLightboxIndex(null)}
                >
                  <X size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center px-4 relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={lightboxPhoto.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  src={lightboxPhoto.url}
                  alt={lightboxPhoto.caption || "Trip photo"}
                  className="max-w-full max-h-full object-contain rounded-lg select-none"
                  draggable={false}
                />
              </AnimatePresence>
            </div>

            {/* Nav arrows (desktop) */}
            {filteredPhotos.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hidden md:flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronLeft size={20} className="text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hidden md:flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <ChevronRight size={20} className="text-white" />
                </button>
              </>
            )}

            {/* Bottom: counter + dot strip */}
            <div className="flex flex-col items-center gap-2 p-4 flex-shrink-0">
              <p className="text-xs text-white/40 font-body">
                {lightboxIndex! + 1} / {filteredPhotos.length}
                <span className="ml-3 text-white/25">↑ swipe down to close</span>
              </p>
              {filteredPhotos.length <= 20 && (
                <div className="flex gap-1">
                  {filteredPhotos.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIndex(i)}
                      className={`rounded-full transition-all ${i === lightboxIndex ? "w-4 h-1.5 bg-primary" : "w-1.5 h-1.5 bg-white/30"}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PhotosTab;
