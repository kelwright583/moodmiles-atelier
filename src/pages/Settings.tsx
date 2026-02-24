import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, User, Mail, Briefcase, LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Profile } from "@/types/database";

const Settings = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [nameLoaded, setNameLoaded] = useState(false);

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

  // Set name from profile once loaded
  if (profile && !nameLoaded) {
    setName(profile.name || "");
    setNameLoaded(true);
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
        .update({ avatar_url: avatarUrl } as any)
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
        .update({ name } as any)
        .eq("user_id", user.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast({ title: "Name updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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
              <div className="flex flex-wrap gap-2">
                {(profile?.style_profile || []).length > 0 ? (
                  profile!.style_profile.map((s) => (
                    <span key={s} className="text-xs bg-secondary text-foreground px-3 py-1.5 rounded-full font-body">{s}</span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground font-body">No style preferences set yet</p>
                )}
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-2 block">Luggage Size</label>
              <div className="flex items-center gap-2.5 bg-secondary rounded-lg px-4 h-11">
                <Briefcase size={14} className="text-muted-foreground" />
                <span className="text-sm font-body text-foreground capitalize">{profile?.luggage_size || "medium"}</span>
              </div>
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
