import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, User, Mail, LogOut, ChevronRight, Crown, Sparkles, Check, X, Loader2, AtSign, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/database";
import { Progress } from "@/components/ui/progress";

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

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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
  const [styleVibe, setStyleVibe] = useState("");
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

  // Populate form from profile
  if (profile && !nameLoaded) { setName(profile.name || ""); setNameLoaded(true); }
  if (profile && !styleProfileLoaded) { setStyleProfile(profile.style_profile || []); setStyleProfileLoaded(true); }
  if (profile && !luggageSizeLoaded) { setLuggageSize(profile.luggage_size || "medium"); setLuggageSizeLoaded(true); }
  if (profile && !identityLoaded) {
    setHandle(profile.handle || "");
    if (profile.handle) setHandleStatus("yours");
    setBio(profile.bio || "");
    setHomeCity(profile.home_city || "");
    setStyleVibe(profile.style_vibe || "");
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
    } catch { setHandleStatus("idle"); }
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
        style_vibe: styleVibe || null,
        nationality: nationality || null,
        onboarding_completed: true,
      };
      if (handle) {
        payload.handle_set = true;
        if (handle !== (profile?.handle || "")) {
          payload.handle = handle;
        }
      }
      await supabase.from("profiles").update(payload).eq("user_id", user.id);
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
      await supabase.from("profiles").update({ name }).eq("user_id", user.id);
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
      await supabase.from("profiles").update({ style_profile: styleProfile }).eq("user_id", user.id);
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
      await supabase.from("profiles").update({ luggage_size: luggageSize }).eq("user_id", user.id);
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

  const completionScore = profile?.profile_completion_score ?? 0;
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

          {/* ── Profile completion score ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">Profile Completion</p>
              <span className="text-xs font-body text-primary font-medium">{completionScore}%</span>
            </div>
            <Progress value={completionScore} className="h-1.5 mb-1" />
            {completionScore < 100 && (
              <p className="text-xs text-muted-foreground font-body mt-1.5">
                {completionScore === 0 ? "Complete your profile for better personalisation." : "Almost there — fill in the remaining fields below."}
              </p>
            )}
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
                <Input
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  placeholder="Where are you based?"
                  className="bg-secondary border-border h-11 font-body"
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
                      onClick={() => setStyleVibe(vibe.id === styleVibe ? "" : vibe.id)}
                      className={`rounded-xl p-3 text-left border transition-all text-sm ${
                        styleVibe === vibe.id
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

          {/* Sign out */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-16 pt-8 border-t border-border">
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
    </div>
  );
};

export default Settings;
