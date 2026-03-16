import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, User, Mail, LogOut, ChevronRight, Crown, Sparkles, Check, X, Loader2, AtSign, Music, Copy, Inbox, Plane, Building2, Utensils, MapPin, Bus, HelpCircle, Trash2, Download, AlertTriangle, Gift, Users } from "lucide-react";
import { UpgradeCelebration } from "@/components/UpgradeCelebration";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layout/Navbar";
import PlacesAutocomplete from "@/components/trip/PlacesAutocomplete";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Profile, ImportedBooking } from "@/types/database";

const styleProfileOptions = ["Minimal", "Structured", "Tailored", "Resort", "Street", "Monochrome", "Feminine", "Masculine", "Avant-garde", "Classic"];
const luggageSizes = ["carry-on", "medium", "large"];

const STYLE_VIBES = [
  { id: "classic", label: "Classic", desc: "Timeless, tailored" },
  { id: "minimalist", label: "Minimalist", desc: "Clean, monochrome" },
  { id: "bohemian", label: "Bohemian", desc: "Flowing, earthy" },
  { id: "streetwear", label: "Streetwear", desc: "Urban, bold" },
  { id: "resort", label: "Resort", desc: "Relaxed luxury" },
  { id: "eclectic", label: "Eclectic", desc: "Mixed, maximalist" },
  { id: "preppy", label: "Preppy", desc: "Structured, polished" },
  { id: "avant-garde", label: "Avant-garde", desc: "Experimental" },
] as const;

const NATIONALITIES = [
  "American", "Argentine", "Australian", "Austrian", "Belgian", "Brazilian", "British", "Canadian",
  "Chinese", "Colombian", "Czech", "Danish", "Dutch", "Egyptian", "Finnish", "French", "German",
  "Greek", "Hong Kong", "Indian", "Indonesian", "Irish", "Israeli", "Italian", "Japanese",
  "Kenyan", "Korean", "Malaysian", "Mexican", "Moroccan", "New Zealand", "Nigerian", "Norwegian",
  "Pakistani", "Philippine", "Polish", "Portuguese", "Russian", "Saudi", "Singaporean", "South African",
  "Spanish", "Swedish", "Swiss", "Thai", "Turkish", "Ukrainian", "Emirati", "Vietnamese",
];

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // Spotify connection query
  const { data: spotifyConn } = useQuery({
    queryKey: ["spotify-connection", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("spotify_connections")
        .select("spotify_display_name, spotify_avatar_url, spotify_user_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Import booking queries
  const { data: importBookings = [], refetch: refetchBookings } = useQuery<ImportedBooking[]>({
    queryKey: ["imported-bookings", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("imported_bookings")
        .select("*")
        .eq("user_id", user!.id)
        .order("received_at", { ascending: false })
        .limit(10);
      return (data || []) as ImportedBooking[];
    },
    enabled: !!user,
  });

  const { data: userTrips = [] } = useQuery({
    queryKey: ["user-trips-import", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("id, destination, status")
        .eq("user_id", user!.id)
        .in("status", ["upcoming", "active"])
        .order("start_date", { ascending: true });
      return data || [];
    },
    enabled: !!user,
  });

  const [importTokenCopied, setImportTokenCopied] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationTier, setCelebrationTier] = useState("luxe");
  const [exportingData, setExportingData] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Legacy fields
  const [name, setName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [styleProfile, setStyleProfile] = useState<string[]>([]);
  const [styleProfileLoaded, setStyleProfileLoaded] = useState(false);
  const [luggageSize, setLuggageSize] = useState("medium");
  const [luggageSizeLoaded, setLuggageSizeLoaded] = useState(false);

  // Identity fields
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [styleVibe, setStyleVibe] = useState<string[]>([]);
  const [nationality, setNationality] = useState("");
  const [identityLoaded, setIdentityLoaded] = useState(false);

  // Handle check state
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid" | "yours">("idle");
  const [handleSuggestions, setHandleSuggestions] = useState<string[]>([]);
  const [handleChanges, setHandleChanges] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });

  // Count handle changes
  const { data: handleHistory = [] } = useQuery({
    queryKey: ["handle-history", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles_handle_history")
        .select("id, old_handle")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const changes = (handleHistory || []).filter((h: any) => h.old_handle !== null).length;
    setHandleChanges(changes);
  }, [handleHistory]);

  // Referral stats
  const { data: referralStats } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("referrals")
        .select("id, status")
        .eq("referrer_user_id", user!.id);
      return {
        total: (data || []).length,
        joined: (data || []).filter((r: any) => r.status === "completed").length,
      };
    },
    enabled: !!user,
  });

  // Check for post-upgrade session_id param and show celebration
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const success = params.get("success");
    if (sessionId || success === "subscription") {
      const tier = params.get("tier") || (profile?.subscription_tier ?? "luxe");
      setCelebrationTier(tier);
      setShowCelebration(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [profile]);

  // Populate form from profile
  if (profile && !nameLoaded) { setName(profile.name || ""); setNameLoaded(true); }
  if (profile && !styleProfileLoaded) { setStyleProfile(profile.style_profile || []); setStyleProfileLoaded(true); }
  if (profile && !luggageSizeLoaded) { setLuggageSize(profile.luggage_size || "medium"); setLuggageSizeLoaded(true); }
  if (profile && !identityLoaded) {
    setHandle(profile.handle || "");
    if (profile.handle) setHandleStatus("yours");
    setBio(profile.bio || "");
    setHomeCity(profile.home_city || "");
    setStyleVibe(profile.style_vibe ? profile.style_vibe.split(",") : []);
    setNationality(profile.nationality || "");
    setIdentityLoaded(true);
  }

  // ── Handle availability check ──────────────────────────────
  const checkHandle = async (value: string) => {
    const h = value.toLowerCase().trim();
    if (!h) { setHandleStatus("idle"); return; }
    if (h === (profile?.handle || "").toLowerCase()) { setHandleStatus("yours"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(h)) { setHandleStatus("invalid"); return; }
    setHandleStatus("checking");
    try {
      const { data } = await supabase.functions.invoke("check-handle", { body: { handle: h } });
      if (data?.available) { setHandleStatus("available"); setHandleSuggestions([]); }
      else if (!data?.valid) { setHandleStatus("invalid"); }
      else { setHandleStatus("taken"); setHandleSuggestions(data?.suggestions || []); }
    } catch { setHandleStatus("idle"); toast({ title: "Could not check handle", description: "Please try again in a moment.", variant: "destructive" }); }
  };

  const handleHandleInput = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(cleaned);
    setHandleStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cleaned.length >= 3) {
      debounceRef.current = setTimeout(() => checkHandle(cleaned), 400);
    }
  };

  // ── Avatar upload ───────────────────────────────────────────
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from("avatars").remove([path]);
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", user.id);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Profile photo updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  // ── Save identity fields ────────────────────────────────────
  const saveIdentity = async () => {
    if (!user) return;
    if (handle && handleStatus !== "available" && handleStatus !== "yours") {
      toast({ title: "Fix your handle before saving", variant: "destructive" });
      return;
    }
    setSavingIdentity(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        bio: bio || null,
        home_city: homeCity || null,
        style_vibe: styleVibe.length ? styleVibe.join(",") : null,
        nationality: nationality || null,
        onboarding_completed: true,
      };
      if (handle) {
        payload.handle_set = true;
        if (handle !== (profile?.handle || "")) {
          payload.handle = handle;
        }
      }
      const { error } = await supabase.from("profiles").upsert({ user_id: user.id, ...payload }, { onConflict: "user_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      queryClient.invalidateQueries({ queryKey: ["onboarding-check", user.id] });
      toast({ title: "Profile saved" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingIdentity(false);
    }
  };

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({ user_id: user.id, name }, { onConflict: "user_id" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Name updated" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Update failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleStyleTag = (tag: string) => {
    setStyleProfile((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const saveStyleProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error: spError } = await supabase.from("profiles").upsert({ user_id: user.id, style_profile: styleProfile }, { onConflict: "user_id" });
      if (spError) throw spError;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Style profile updated" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Update failed", variant: "destructive" });
    } finally { setSavingProfile(false); }
  };

  const saveLuggageSize = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error: lsError } = await supabase.from("profiles").upsert({ user_id: user.id, luggage_size: luggageSize }, { onConflict: "user_id" });
      if (lsError) throw lsError;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Luggage size updated" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Update failed", variant: "destructive" });
    } finally { setSavingProfile(false); }
  };

  const connectSpotify = () => {
    const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
    const redirectUri = encodeURIComponent(window.location.origin + "/auth/spotify/callback");
    const scopes = encodeURIComponent("playlist-modify-public playlist-modify-private user-read-private user-read-email");
    window.location.href = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;
  };

  const disconnectSpotify = async () => {
    await supabase.from("spotify_connections").delete().eq("user_id", user!.id);
    queryClient.invalidateQueries({ queryKey: ["spotify-connection", user?.id] });
    toast({ title: "Spotify disconnected" });
  };

  const handleSignOut = async () => { await signOut(); navigate("/"); };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const { data, error } = await supabase.functions.invoke("export-user-data", { body: {} });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `concierge-styled-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported", description: "Your data has been downloaded." });
    } catch (err: unknown) {
      toast({ title: "Export failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
    } finally {
      setExportingData(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { error } = await supabase.functions.invoke("delete-user-data", { body: {} });
      if (error) throw error;
      await signOut();
      navigate("/");
      toast({ title: "Account deleted", description: "All your data has been permanently removed." });
    } catch (err: unknown) {
      toast({ title: "Deletion failed", description: err instanceof Error ? err.message : "Please try again.", variant: "destructive" });
      setDeletingAccount(false);
    }
  };

  // ── Import booking handlers ───────────────────────────────────
  const importAddress = profile ? `import+${profile.import_token || ""}@concierge-styled.com` : "";

  const copyImportAddress = () => {
    navigator.clipboard.writeText(importAddress);
    setImportTokenCopied(true);
    setTimeout(() => setImportTokenCopied(false), 2000);
    toast({ title: "Import address copied" });
  };

  const assignBookingToTrip = async (bookingId: string, tripId: string) => {
    const booking = importBookings.find((b) => b.id === bookingId);
    if (!booking) return;

    const parsed = booking.parsed_data || {};
    const eventPayload: Record<string, any> = {
      trip_id: tripId,
      event_name: parsed.event_name || "Imported booking",
      event_type: booking.parsed_type === "flight" ? "flight" : booking.parsed_type === "hotel" ? "accommodation" : booking.parsed_type === "restaurant" ? "dining" : "activity",
      event_date: parsed.event_date || null,
      event_time: parsed.event_time || null,
      location: parsed.location || null,
      venue_name: parsed.venue_name || null,
      booking_reference: parsed.booking_reference || null,
      booking_status: "confirmed",
      notes: parsed.notes || null,
    };

    if (booking.parsed_type === "flight" && parsed.flight_number) {
      eventPayload.flight_number = parsed.flight_number;
    }

    const { data: newEvent } = await supabase.from("trip_events").insert(eventPayload).select("id").single();

    await supabase.from("imported_bookings").update({
      trip_id: tripId,
      event_id: newEvent?.id || null,
      status: "assigned",
    }).eq("id", bookingId);

    refetchBookings();
    toast({ title: "Booking assigned to trip" });
  };

  const ignoreBooking = async (bookingId: string) => {
    await supabase.from("imported_bookings").update({ status: "ignored" }).eq("id", bookingId);
    refetchBookings();
    toast({ title: "Booking ignored" });
  };

  const BOOKING_ICONS: Record<string, typeof Plane> = {
    flight: Plane,
    hotel: Building2,
    restaurant: Utensils,
    activity: MapPin,
    transfer: Bus,
    other: HelpCircle,
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-portal", { body: {} });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No portal URL");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not open billing", variant: "destructive" });
    } finally { setPortalLoading(false); }
  };

  const handleUpgradeToLuxe = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan: "luxe" } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not start checkout", variant: "destructive" });
    } finally { setCheckoutLoading(false); }
  };

  const handleUpgradeToAtelier = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: { plan: "atelier" } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not start checkout", variant: "destructive" });
    } finally { setCheckoutLoading(false); }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gradient-champagne animate-pulse" />
      </div>
    );
  }

  const canChangeHandle = handleChanges < 2;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 md:pt-28 pb-16 px-4 md:px-6">
        <div className="max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">Settings</p>
            <h1 className="text-3xl md:text-4xl font-heading mb-10">Your Profile</h1>
          </motion.div>

          {/* ── Avatar ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-col items-center mb-6" id="photo">
            <div
              onClick={() => fileRef.current?.click()}
              className="relative w-28 h-28 rounded-full overflow-hidden bg-secondary border-2 border-border hover:border-primary/50 cursor-pointer transition-colors group"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={40} className="text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-card/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera size={20} className="text-foreground" />
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-card/80 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
            <p className="text-xs text-muted-foreground font-body mt-3">Tap to change photo</p>
          </motion.div>

          {/* ── Identity section ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4 mb-6">
            <div className="glass-card rounded-xl p-5 space-y-4">
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">Identity</p>

              {/* Display name */}
              <div id="name">
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Display name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body"
                />
              </div>

              {/* Handle */}
              <div id="handle">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground font-body">@Handle</label>
                  <span className="text-[10px] font-body text-muted-foreground/60">
                    {canChangeHandle
                      ? `You can change this ${2 - handleChanges} more time${2 - handleChanges === 1 ? "" : "s"}`
                      : "Handle locked — changed 2 times"}
                  </span>
                </div>
                <div className="relative">
                  <AtSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={handle}
                    onChange={(e) => handleHandleInput(e.target.value)}
                    placeholder="yourhandle"
                    className="bg-secondary border-border h-11 font-body pl-8 pr-10"
                    maxLength={20}
                    disabled={!canChangeHandle && !!profile?.handle}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {handleStatus === "checking" && <Loader2 size={14} className="text-muted-foreground animate-spin" />}
                    {(handleStatus === "available" || handleStatus === "yours") && <Check size={14} className="text-emerald-400" />}
                    {(handleStatus === "taken" || handleStatus === "invalid") && <X size={14} className="text-red-400" />}
                  </div>
                </div>
                {handleStatus === "taken" && handleSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {handleSuggestions.map((s) => (
                      <button key={s} onClick={() => { setHandle(s); checkHandle(s); }}
                        className="text-xs font-body px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-primary transition-colors">
                        @{s}
                      </button>
                    ))}
                  </div>
                )}
                {handleStatus === "invalid" && handle.length > 0 && (
                  <p className="text-xs text-muted-foreground font-body mt-1">3-20 chars, lowercase letters, numbers and underscores only</p>
                )}
              </div>

              {/* Bio */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-muted-foreground font-body">Bio</label>
                  <span className="text-[10px] text-muted-foreground/60 font-body">{bio.length}/160</span>
                </div>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 160))}
                  placeholder="A short bio..."
                  rows={2}
                  className="w-full bg-secondary border border-border rounded-lg px-4 py-3 text-sm font-body text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
              </div>

              {/* Home city */}
              <div id="city">
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Home city</label>
                <PlacesAutocomplete
                  value={homeCity}
                  onChange={setHomeCity}
                  onSelect={(place) => setHomeCity(place.city)}
                />
              </div>

              {/* Style vibe */}
              <div id="style">
                <label className="text-xs text-muted-foreground font-body mb-2 block">Travel style</label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_VIBES.map((vibe) => (
                    <button
                      key={vibe.id}
                      type="button"
                      onClick={() => setStyleVibe(prev => prev.includes(vibe.id) ? prev.filter(v => v !== vibe.id) : [...prev, vibe.id])}
                      className={`rounded-xl p-3 text-left border transition-all text-sm ${
                        styleVibe.includes(vibe.id)
                          ? "border-primary bg-primary/5"
                          : "border-border bg-secondary/60 hover:border-border/80"
                      }`}
                    >
                      <p className="font-body font-medium text-foreground text-xs">{vibe.label}</p>
                      <p className="text-[10px] text-muted-foreground font-body">{vibe.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nationality */}
              <div>
                <label className="text-xs text-muted-foreground font-body mb-1.5 block">Nationality</label>
                <select
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full bg-secondary border border-border rounded-lg px-4 h-11 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                >
                  <option value="">Select nationality...</option>
                  {NATIONALITIES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <p className="text-[10px] text-muted-foreground/60 font-body mt-1">Used to personalise travel advisory links in the Briefing tab.</p>
              </div>

              <Button
                variant="champagne"
                className="w-full"
                onClick={saveIdentity}
                disabled={savingIdentity || (!!handle && handleStatus !== "available" && handleStatus !== "yours" && handleStatus !== "idle")}
              >
                {savingIdentity ? <><Loader2 size={14} className="animate-spin mr-2" /> Saving…</> : "Save Profile"}
              </Button>
            </div>
          </motion.div>

          {/* ── Legacy fields ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Email</label>
              <div className="flex items-center gap-2.5 bg-secondary rounded-lg px-4 h-11">
                <Mail size={14} className="text-muted-foreground" />
                <span className="text-sm font-body text-muted-foreground">{user?.email}</span>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Style Tags</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {styleProfileOptions.map((tag) => (
                  <button key={tag} type="button" onClick={() => toggleStyleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${styleProfile.includes(tag) ? "bg-gradient-champagne text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    {tag}
                  </button>
                ))}
              </div>
              <Button variant="champagne-outline" size="sm" onClick={saveStyleProfile}
                disabled={savingProfile || JSON.stringify(styleProfile) === JSON.stringify(profile?.style_profile || [])}>
                {savingProfile ? "Saving..." : "Save"}
              </Button>
            </div>

            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Luggage Size</label>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-2 flex-1">
                  {luggageSizes.map((size) => (
                    <button key={size} type="button" onClick={() => setLuggageSize(size)}
                      className={`px-4 py-2 rounded-full text-sm font-body transition-all capitalize ${luggageSize === size ? "bg-gradient-champagne text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                      {size.replace("-", " ")}
                    </button>
                  ))}
                </div>
                <Button variant="champagne-outline" size="sm" onClick={saveLuggageSize}
                  disabled={savingProfile || luggageSize === (profile?.luggage_size || "medium")}>
                  {savingProfile ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Membership */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Membership</label>

              {/* Current tier display */}
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  {profile?.subscription_tier === "atelier" ? (
                    <><Crown size={18} className="text-primary" /><span className="font-body text-foreground">Atelier</span></>
                  ) : profile?.subscription_tier === "luxe" ? (
                    <><Crown size={18} className="text-primary" /><span className="font-body text-foreground">Luxe</span></>
                  ) : (
                    <><Sparkles size={18} className="text-muted-foreground" /><span className="font-body text-muted-foreground">Free — first trip, fully featured</span></>
                  )}
                </div>
                {(profile?.subscription_tier === "luxe" || profile?.subscription_tier === "atelier") && (
                  <Button variant="champagne-outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                    {portalLoading ? "Opening…" : "Manage"}
                  </Button>
                )}
              </div>

              {/* Upgrade options */}
              {profile?.subscription_tier === "free" || !profile?.subscription_tier ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-secondary/30">
                    <div>
                      <p className="text-sm font-body text-foreground">Luxe</p>
                      <p className="text-xs text-muted-foreground font-body">Unlimited trips · Group collaboration</p>
                    </div>
                    <Button variant="champagne-outline" size="sm" onClick={handleUpgradeToLuxe} disabled={checkoutLoading}>
                      {checkoutLoading ? "Opening…" : "Upgrade"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <div>
                      <p className="text-sm font-body text-foreground flex items-center gap-1.5"><Crown size={12} className="text-primary" /> Atelier</p>
                      <p className="text-xs text-muted-foreground font-body">Everything in Luxe · PDF lookbook export</p>
                    </div>
                    <Button variant="champagne" size="sm" onClick={handleUpgradeToAtelier} disabled={checkoutLoading}>
                      {checkoutLoading ? "Opening…" : "Upgrade"}
                    </Button>
                  </div>
                </div>
              ) : profile?.subscription_tier === "luxe" ? (
                <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-primary/5">
                  <div>
                    <p className="text-sm font-body text-foreground flex items-center gap-1.5"><Crown size={12} className="text-primary" /> Atelier</p>
                    <p className="text-xs text-muted-foreground font-body">Add PDF lookbook export + premium features</p>
                  </div>
                  <Button variant="champagne" size="sm" onClick={handleUpgradeToAtelier} disabled={checkoutLoading}>
                    {checkoutLoading ? "Opening…" : "Upgrade"}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground font-body">Unlimited trips · Full AI styling · PDF lookbook export · Group collaboration.</p>
              )}
            </div>

            {/* Music */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-3 block">Music</label>
              {spotifyConn ? (
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {spotifyConn.spotify_avatar_url ? (
                      <img src={spotifyConn.spotify_avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
                        <Music size={14} className="text-[#1DB954]" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-body text-foreground">{spotifyConn.spotify_display_name}</p>
                      <span className="text-[10px] font-body text-[#1DB954]">● Connected</span>
                    </div>
                  </div>
                  <Button variant="champagne-outline" size="sm" onClick={disconnectSpotify}>Disconnect</Button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-muted-foreground font-body mb-3">Connect Spotify to create collaborative trip playlists with your travel crew.</p>
                  <Button variant="champagne" size="sm" onClick={connectSpotify} disabled={!import.meta.env.VITE_SPOTIFY_CLIENT_ID}>
                    <Music size={14} /> Connect Spotify
                  </Button>
                  {!import.meta.env.VITE_SPOTIFY_CLIENT_ID && (
                    <p className="text-[10px] text-muted-foreground/60 font-body mt-1">VITE_SPOTIFY_CLIENT_ID not configured</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Booking Email Import ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-4">
            <div className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Inbox size={14} className="text-primary" />
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">Booking Import</label>
              </div>
              <p className="text-xs text-muted-foreground font-body mb-4">
                Forward booking confirmations to your personal import address. We'll parse them automatically and add them to your itinerary.
              </p>

              {/* Import address */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 bg-secondary rounded-lg px-4 h-11 flex items-center">
                  <span className="text-sm font-body text-foreground truncate">{importAddress || "Loading..."}</span>
                </div>
                <Button variant="champagne-outline" size="sm" onClick={copyImportAddress} disabled={!importAddress}>
                  {importTokenCopied ? <Check size={14} /> : <Copy size={14} />}
                </Button>
              </div>

              {/* Recent imports */}
              {importBookings.length > 0 && (
                <div>
                  <h4 className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2">Recent Imports</h4>
                  <div className="space-y-2">
                    {importBookings.map((booking) => {
                      const Icon = BOOKING_ICONS[booking.parsed_type || "other"] || HelpCircle;
                      const parsed = booking.parsed_data || {};
                      return (
                        <div key={booking.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon size={14} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-body text-foreground truncate">{parsed.event_name || "Booking"}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground font-body capitalize">{booking.parsed_type || "other"}</span>
                              {parsed.event_date && <span className="text-[10px] text-muted-foreground font-body">{parsed.event_date}</span>}
                              <span className={`text-[10px] font-body px-1.5 py-0.5 rounded-full ${
                                booking.status === "assigned" ? "bg-emerald-500/20 text-emerald-400"
                                : booking.status === "ignored" ? "bg-muted-foreground/20 text-muted-foreground"
                                : "bg-primary/20 text-primary"
                              }`}>{booking.status}</span>
                            </div>

                            {booking.status === "pending" && (
                              <div className="flex items-center gap-2 mt-2">
                                <select
                                  onChange={(e) => { if (e.target.value) assignBookingToTrip(booking.id, e.target.value); }}
                                  defaultValue=""
                                  className="flex-1 bg-secondary border border-border rounded-lg px-3 h-8 text-xs font-body text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                                >
                                  <option value="" disabled>Assign to trip...</option>
                                  {userTrips.map((t: any) => (
                                    <option key={t.id} value={t.id}>{t.destination}</option>
                                  ))}
                                </select>
                                <button onClick={() => ignoreBooking(booking.id)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors" title="Ignore">
                                  <Trash2 size={12} className="text-muted-foreground" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* ── Invite a Friend ── */}
          {profile?.handle && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }} className="space-y-3">
              <div className="glass-card rounded-xl p-5">
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-4 block">Invite a Friend</label>
                <p className="text-sm font-body text-muted-foreground mb-4">
                  Share your link — when a friend signs up, you both get rewarded.
                </p>
                <div className="bg-secondary rounded-lg p-3 flex items-center justify-between gap-3 mb-3">
                  <p className="text-xs font-mono text-muted-foreground truncate">
                    {typeof window !== "undefined" ? `${window.location.origin}/auth?ref=${profile.handle}` : ""}
                  </p>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${profile.handle}`);
                        setCopiedReferral(true);
                        setTimeout(() => setCopiedReferral(false), 2000);
                      } catch {
                        toast({ title: "Copy failed", variant: "destructive" });
                      }
                    }}
                    className="flex-shrink-0 p-1.5 rounded-md hover:bg-secondary/80 transition-colors"
                    aria-label="Copy referral link"
                  >
                    {copiedReferral ? <Check size={14} className="text-primary" /> : <Copy size={14} className="text-muted-foreground" />}
                  </button>
                </div>
                {referralStats && (referralStats.total > 0) && (
                  <div className="flex items-center gap-4 text-xs font-body text-muted-foreground">
                    <span className="flex items-center gap-1.5"><Users size={11} /> {referralStats.total} invited</span>
                    <span className="flex items-center gap-1.5"><Gift size={11} className="text-primary" /> {referralStats.joined} joined</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── Data & Account ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-3">
            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-4 block">Data & Account</label>
              <div className="space-y-3">
                {/* Export data */}
                <button
                  onClick={handleExportData}
                  disabled={exportingData}
                  className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-secondary transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Download size={14} className="text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-sm font-body text-foreground">Export my data</p>
                      <p className="text-[10px] text-muted-foreground font-body">Download all your trip data as JSON</p>
                    </div>
                  </div>
                  {exportingData ? (
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
                  )}
                </button>

                {/* Delete account */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-red-500/5 transition-colors group">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={14} className="text-red-400/70" />
                        <div className="text-left">
                          <p className="text-sm font-body text-red-400/80">Delete account</p>
                          <p className="text-[10px] text-muted-foreground font-body">Permanently remove all data and cancel subscription</p>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-red-400/50 transition-colors" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will immediately cancel your subscription, delete all trips, outfits, board images, and personal data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        {deletingAccount ? "Deleting..." : "Yes, delete everything"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </motion.div>

          {/* Sign out */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-8 pt-8 border-t border-border">
            <button onClick={handleSignOut} className="flex items-center justify-between w-full px-5 py-4 rounded-xl hover:bg-secondary transition-colors group">
              <div className="flex items-center gap-3">
                <LogOut size={16} className="text-muted-foreground" />
                <span className="text-sm font-body text-muted-foreground">Sign out</span>
              </div>
              <ChevronRight size={14} className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
            </button>
          </motion.div>
        </div>
      </main>

      <UpgradeCelebration
        open={showCelebration}
        tier={celebrationTier}
        onClose={() => setShowCelebration(false)}
      />
    </div>
  );
};

export default Settings;
