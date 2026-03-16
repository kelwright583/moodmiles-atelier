import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Check, X, Camera, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PlacesAutocomplete from "@/components/trip/PlacesAutocomplete";
import { toast } from "@/hooks/use-toast";

const STYLE_VIBES = [
  { id: "classic", label: "Classic", desc: "Timeless, tailored, neutral", accent: "from-stone-700 to-stone-500" },
  { id: "minimalist", label: "Minimalist", desc: "Clean lines, monochrome, less is more", accent: "from-zinc-700 to-zinc-400" },
  { id: "bohemian", label: "Bohemian", desc: "Flowing, earthy, free-spirited", accent: "from-amber-800 to-amber-500" },
  { id: "streetwear", label: "Streetwear", desc: "Urban, bold, statement pieces", accent: "from-slate-800 to-slate-500" },
  { id: "resort", label: "Resort", desc: "Relaxed luxury, linen, sun-ready", accent: "from-sky-700 to-sky-400" },
  { id: "eclectic", label: "Eclectic", desc: "Mixed, unexpected, maximalist", accent: "from-violet-700 to-fuchsia-500" },
  { id: "preppy", label: "Preppy", desc: "Structured, collegiate, polished", accent: "from-emerald-700 to-emerald-500" },
  { id: "avant-garde", label: "Avant-garde", desc: "Fashion-forward, experimental", accent: "from-rose-700 to-pink-500" },
] as const;

type StyleVibe = (typeof STYLE_VIBES)[number]["id"];
type StyleVibes = StyleVibe[];

const Onboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [styleVibe, setStyleVibe] = useState<StyleVibes>([]);
  const [homeCity, setHomeCity] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [handleSuggestions, setHandleSuggestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Redirect if already onboarded — must use useEffect, never call navigate() outside hooks
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("onboarding_completed, name").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!profileLoading && profile?.onboarding_completed) {
      navigate("/dashboard", { replace: true });
    }
  }, [profileLoading, profile, navigate]);

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gradient-champagne animate-pulse" />
      </div>
    );
  }

  // ── Handle availability check ──────────────────────────────
  const checkHandle = async (value: string) => {
    const h = value.toLowerCase().trim();
    if (!h) { setHandleStatus("idle"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(h)) { setHandleStatus("invalid"); return; }

    setHandleStatus("checking");
    try {
      const { data } = await supabase.functions.invoke("check-handle", { body: { handle: h } });
      if (data?.available) {
        setHandleStatus("available");
        setHandleSuggestions([]);
      } else if (data?.valid === false) {
        setHandleStatus("invalid");
      } else {
        setHandleStatus("taken");
        setHandleSuggestions(data?.suggestions || []);
      }
    } catch {
      setHandleStatus("idle");
      toast({ title: "Could not check handle", description: "Please try again in a moment.", variant: "destructive" });
    }
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
  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return null;
    setUploadingAvatar(true);
    try {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      await supabase.storage.from("avatars").remove([path]);
      const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch {
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Step navigation ─────────────────────────────────────────
  const goToStep = (s: number) => setStep(s);

  const handleStep1Continue = () => {
    if (displayName.trim().length < 2) return;
    goToStep(2);
  };

  const handleStep2Continue = () => goToStep(3);
  const handleStep2Skip = () => { setHandle(""); setHandleStatus("idle"); goToStep(3); };

  const handleStep3Continue = () => goToStep(4);
  const handleStep3Skip = () => { setStyleVibe([]); goToStep(4); };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      let avatarUrl: string | null = null;
      if (avatarFile) avatarUrl = await uploadAvatar();

      const { data, error } = await supabase.functions.invoke("complete-onboarding", {
        body: {
          display_name: displayName.trim(),
          handle: handle || undefined,
          avatar_url: avatarUrl || undefined,
          home_city: homeCity || undefined,
          style_vibe: styleVibe.length ? styleVibe.join(",") : undefined,
        },
      });

      if (error || !data?.success) throw new Error(data?.error || error?.message || "Failed");

      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      setCelebrated(true);
      setTimeout(() => navigate("/dashboard", { replace: true }), 1800);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipToEnd = () => handleFinish();

  if (celebrated) {
    const firstName = displayName.trim().split(" ")[0];
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-champagne flex items-center justify-center mx-auto mb-6">
            <Check size={28} className="text-primary-foreground" />
          </div>
          <h2 className="text-3xl font-heading mb-3">
            You're all set, {firstName}.
          </h2>
          <p className="text-muted-foreground font-body">
            Let's plan something beautiful.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-10">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              s === step ? "w-8 bg-primary" : s < step ? "w-3 bg-primary/50" : "w-3 bg-secondary"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {/* ── Step 1: Name ─────────────────────────────────── */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-sm"
            >
              <p className="text-xs tracking-[0.3em] uppercase text-primary font-body mb-3">Step 1 of 4</p>
              <h1 className="text-3xl md:text-4xl font-heading mb-2">What should we call you?</h1>
              <p className="text-muted-foreground font-body text-sm mb-8">Your name as it appears on your trips.</p>
              <Input
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && displayName.trim().length >= 2 && handleStep1Continue()}
                placeholder="Your name"
                className="bg-secondary border-border h-12 text-lg font-body mb-4"
              />
              <label className="text-xs text-muted-foreground font-body mb-1.5 block">Where are you based? <span className="opacity-50">(optional)</span></label>
              <div className="mb-6">
                <PlacesAutocomplete
                  value={homeCity}
                  onChange={setHomeCity}
                  onSelect={(place) => setHomeCity(place.city)}
                />
              </div>
              <Button
                variant="champagne"
                className="w-full h-12"
                onClick={handleStep1Continue}
                disabled={displayName.trim().length < 2}
              >
                Continue
              </Button>
            </motion.div>
          )}

          {/* ── Step 2: Handle ───────────────────────────────── */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-sm"
            >
              <p className="text-xs tracking-[0.3em] uppercase text-primary font-body mb-3">Step 2 of 4</p>
              <h1 className="text-3xl md:text-4xl font-heading mb-2">Choose your @handle</h1>
              <p className="text-muted-foreground font-body text-sm mb-8">
                Your personal link for sharing trips. You can set this later.
              </p>

              <div className="relative mb-2">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-body text-lg">@</span>
                <Input
                  autoFocus
                  value={handle}
                  onChange={(e) => handleHandleInput(e.target.value)}
                  placeholder="yourhandle"
                  className="bg-secondary border-border h-12 font-body pl-8 pr-10"
                  maxLength={20}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {handleStatus === "checking" && <Loader2 size={16} className="text-muted-foreground animate-spin" />}
                  {handleStatus === "available" && <Check size={16} className="text-emerald-400" />}
                  {(handleStatus === "taken" || handleStatus === "invalid") && <X size={16} className="text-red-400" />}
                </div>
              </div>

              {handleStatus === "available" && (
                <p className="text-xs text-emerald-400 font-body mb-4">@{handle} is available</p>
              )}
              {handleStatus === "taken" && (
                <div className="mb-4">
                  <p className="text-xs text-red-400 font-body mb-2">@{handle} is taken</p>
                  {handleSuggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {handleSuggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => { setHandle(s); checkHandle(s); }}
                          className="text-xs font-body px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-primary transition-colors"
                        >
                          @{s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {handleStatus === "invalid" && handle.length > 0 && (
                <p className="text-xs text-muted-foreground font-body mb-4">
                  3-20 characters, lowercase letters, numbers and underscores only
                </p>
              )}

              <Button
                variant="champagne"
                className="w-full h-12 mb-3"
                onClick={handleStep2Continue}
                disabled={!!handle && handleStatus !== "available"}
              >
                Continue
              </Button>
              <button
                onClick={handleStep2Skip}
                className="w-full text-sm text-muted-foreground font-body hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {/* ── Step 3: Style vibe ───────────────────────────── */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-md"
            >
              <p className="text-xs tracking-[0.3em] uppercase text-primary font-body mb-3">Step 3 of 4</p>
              <h1 className="text-3xl md:text-4xl font-heading mb-2">What's your travel style?</h1>
              <p className="text-muted-foreground font-body text-sm mb-8">We'll tailor outfit suggestions to your aesthetic.</p>

              <div className="grid grid-cols-2 gap-3 mb-8">
                {STYLE_VIBES.map((vibe) => (
                  <button
                    key={vibe.id}
                    type="button"
                    onClick={() => setStyleVibe(prev => prev.includes(vibe.id) ? prev.filter(v => v !== vibe.id) : [...prev, vibe.id])}
                    className={`relative rounded-2xl p-4 text-left transition-all duration-200 border-2 ${
                      styleVibe.includes(vibe.id)
                        ? "border-primary bg-primary/5 shadow-champagne"
                        : "border-border bg-secondary/60 hover:border-border/80"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${vibe.accent} mb-3`} />
                    <p className="text-sm font-body font-medium text-foreground">{vibe.label}</p>
                    <p className="text-[11px] text-muted-foreground font-body mt-0.5 leading-snug">{vibe.desc}</p>
                    {styleVibe.includes(vibe.id) && (
                      <div className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-gradient-champagne flex items-center justify-center">
                        <Check size={9} className="text-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </div>

              <Button
                variant="champagne"
                className="w-full h-12 mb-3"
                onClick={handleStep3Continue}
                disabled={styleVibe.length === 0}
              >
                Continue
              </Button>
              <button
                onClick={handleStep3Skip}
                className="w-full text-sm text-muted-foreground font-body hover:text-foreground transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {/* ── Step 4: Photo ────────────────────────────────── */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="w-full max-w-sm"
            >
              <p className="text-xs tracking-[0.3em] uppercase text-primary font-body mb-3">Step 4 of 4</p>
              <h1 className="text-3xl md:text-4xl font-heading mb-2">Add a profile photo</h1>
              <p className="text-muted-foreground font-body text-sm mb-10">
                So your travel companions know who you are.
              </p>

              <div className="flex justify-center mb-8">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="relative w-28 h-28 rounded-full overflow-hidden bg-secondary border-2 border-border hover:border-primary/50 cursor-pointer transition-colors group"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <User size={32} className="text-muted-foreground/40" />
                      <span className="text-[10px] text-muted-foreground/60 font-body">Upload</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera size={20} className="text-white" />
                  </div>
                  {(uploadingAvatar) && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={20} className="text-white animate-spin" />
                    </div>
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </div>

              <Button
                variant="champagne"
                className="w-full h-12 mb-3"
                onClick={handleFinish}
                disabled={submitting || uploadingAvatar}
              >
                {submitting ? <><Loader2 size={16} className="animate-spin mr-2" /> Setting up…</> : "Finish Setup"}
              </Button>
              <button
                onClick={handleSkipToEnd}
                disabled={submitting}
                className="w-full text-sm text-muted-foreground font-body hover:text-foreground transition-colors"
              >
                Add later
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Branded footer */}
      <div className="text-center pb-8">
        <p className="text-xs text-muted-foreground/40 font-body tracking-[0.2em] uppercase">
          Concierge Styled
        </p>
      </div>
    </div>
  );
};

export default Onboarding;
