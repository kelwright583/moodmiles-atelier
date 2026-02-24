import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, User, Mail, LogOut, ChevronRight, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/database";

const styleProfileOptions = ["Minimal", "Structured", "Tailored", "Resort", "Street", "Monochrome", "Feminine", "Masculine", "Avant-garde", "Classic"];
const luggageSizes = ["carry-on", "medium", "large"];

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [name, setName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);
  const [styleProfile, setStyleProfile] = useState<string[]>([]);
  const [styleProfileLoaded, setStyleProfileLoaded] = useState(false);
  const [luggageSize, setLuggageSize] = useState("medium");
  const [luggageSizeLoaded, setLuggageSizeLoaded] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

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

  // Set form values from profile once loaded
  if (profile && !nameLoaded) {
    setName(profile.name || "");
    setNameLoaded(true);
  }
  if (profile && !styleProfileLoaded) {
    setStyleProfile(profile.style_profile || []);
    setStyleProfileLoaded(true);
  }
  if (profile && !luggageSizeLoaded) {
    setLuggageSize(profile.luggage_size || "medium");
    setLuggageSizeLoaded(true);
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      // Remove old avatar if exists
      await supabase.storage.from("avatars").remove([path]);

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`; // cache bust

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);
      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Profile photo updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveName = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ name })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Name updated" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Update failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleStyleTag = (tag: string) => {
    setStyleProfile((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const saveStyleProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ style_profile: styleProfile })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Style profile updated" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Update failed", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveLuggageSize = async () => {
    if (!user) return;
    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ luggage_size: luggageSize })
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Luggage size updated" });
    } catch (err: unknown) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Update failed", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgradeToLuxe = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", { body: {} });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
      else throw new Error("No checkout URL");
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Could not start checkout", variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gradient-champagne animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 md:pt-28 pb-16 px-4 md:px-6">
        <div className="max-w-xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">Settings</p>
            <h1 className="text-3xl md:text-4xl font-heading mb-10">Your Profile</h1>
          </motion.div>

          {/* Avatar */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center mb-10">
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

          {/* Profile fields */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Name</label>
              <div className="flex items-center gap-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body flex-1"
                />
                <Button variant="champagne-outline" size="sm" onClick={saveName} disabled={saving || name === (profile?.name || "")}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Email</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5 bg-secondary rounded-lg px-4 h-11 flex-1">
                  <Mail size={14} className="text-muted-foreground" />
                  <span className="text-sm font-body text-muted-foreground">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Style Profile</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {styleProfileOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleStyleTag(tag)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${styleProfile.includes(tag) ? "bg-gradient-champagne text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <Button variant="champagne-outline" size="sm" onClick={saveStyleProfile} disabled={savingProfile || JSON.stringify(styleProfile) === JSON.stringify(profile?.style_profile || [])}>
                {savingProfile ? "Saving..." : "Save"}
              </Button>
            </div>

            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Luggage Size</label>
              <div className="flex items-center gap-3">
                <div className="flex flex-wrap gap-2 flex-1">
                  {luggageSizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setLuggageSize(size)}
                      className={`px-4 py-2 rounded-full text-sm font-body transition-all capitalize ${luggageSize === size ? "bg-gradient-champagne text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                    >
                      {size.replace("-", " ")}
                    </button>
                  ))}
                </div>
                <Button variant="champagne-outline" size="sm" onClick={saveLuggageSize} disabled={savingProfile || luggageSize === (profile?.luggage_size || "medium")}>
                  {savingProfile ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Membership */}
            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Membership</label>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  {profile?.subscription_tier === "luxe" ? (
                    <>
                      <Crown size={18} className="text-primary" />
                      <span className="font-body text-foreground">Luxe — $7.99/month</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="text-muted-foreground" />
                      <span className="font-body text-muted-foreground">Free — first trip included</span>
                    </>
                  )}
                </div>
                {profile?.subscription_tier === "luxe" ? (
                  <Button variant="champagne-outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading}>
                    {portalLoading ? "Opening…" : "Manage"}
                  </Button>
                ) : (
                  <Button variant="champagne" size="sm" onClick={handleUpgradeToLuxe} disabled={checkoutLoading}>
                    {checkoutLoading ? "Opening…" : "Upgrade to Luxe"}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-body">
                {profile?.subscription_tier === "luxe" ? "Unlimited trips, full AI styling." : "Your first trip is free. Upgrade for unlimited trips."}
              </p>
            </div>
          </motion.div>

          {/* Sign out at the bottom */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-16 pt-8 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex items-center justify-between w-full px-5 py-4 rounded-xl hover:bg-secondary transition-colors group"
            >
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
