import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, MapPin, Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface InviteDetails {
  destination: string;
  country: string | null;
  start_date: string;
  end_date: string;
  trip_type: string | null;
  image_url: string | null;
  role: string;
  inviter_name: string | null;
  inviter_handle: string | null;
  inviter_avatar_url: string | null;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });

/** 2-step onboarding overlay for collaborators who haven't onboarded yet */
const CollabOnboardingOverlay = ({ onDone }: { onDone: () => void }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [handleStatus, setHandleStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkHandle = async (value: string) => {
    const h = value.toLowerCase().trim();
    if (!h || !/^[a-z0-9_]{3,20}$/.test(h)) { setHandleStatus(h ? "invalid" : "idle"); return; }
    setHandleStatus("checking");
    try {
      const { data } = await supabase.functions.invoke("check-handle", { body: { handle: h } });
      setHandleStatus(data?.available ? "available" : "taken");
    } catch { setHandleStatus("idle"); toast({ title: "Could not check handle", description: "Please try again.", variant: "destructive" }); }
  };

  const handleInput = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setHandle(cleaned);
    setHandleStatus("idle");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (cleaned.length >= 3) debounceRef.current = setTimeout(() => checkHandle(cleaned), 400);
  };

  const saveStep1 = async () => {
    if (displayName.trim().length < 2) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("profiles").update({ name: displayName.trim() }).eq("user_id", user!.id);
      if (error) throw error;
      setStep(2);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const saveStep2 = async () => {
    if (handleStatus !== "available") return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ handle, handle_set: true, onboarding_completed: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      onDone();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-8 max-w-sm w-full border border-primary/20"
      >
        <p className="eyebrow text-primary mb-1">
          {step === 1 ? "Step 1 of 2" : "Step 2 of 2"}
        </p>
        <h2 className="text-2xl font-heading mb-2">
          {step === 1 ? "What's your name?" : "Choose your @handle"}
        </h2>
        <p className="text-sm font-body text-muted-foreground mb-6">
          {step === 1
            ? "So your travel companions know who you are."
            : "Your unique identifier on Concierge Styled. Required to join."}
        </p>

        {step === 1 ? (
          <>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="bg-secondary border-border h-11 font-body text-sm mb-4"
              autoFocus
            />
            <Button
              variant="champagne"
              className="w-full"
              onClick={saveStep1}
              disabled={displayName.trim().length < 2 || saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Continue"}
            </Button>
          </>
        ) : (
          <>
            <div className="relative mb-4">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-body text-sm">@</span>
              <Input
                value={handle}
                onChange={(e) => handleInput(e.target.value)}
                placeholder="yourhandle"
                className="bg-secondary border-border h-11 font-body pl-7 pr-8 text-sm"
                maxLength={20}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {handleStatus === "checking" && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                {handleStatus === "available" && <Check size={13} className="text-live-text" />}
                {(handleStatus === "taken" || handleStatus === "invalid") && <X size={13} className="text-red-400" />}
              </div>
            </div>
            {handleStatus === "taken" && <p className="text-xs text-red-400 font-body mb-3">That handle is taken.</p>}
            {handleStatus === "invalid" && handle.length > 0 && (
              <p className="text-xs text-muted-foreground font-body mb-3">3-20 chars, letters, numbers and _ only.</p>
            )}
            <Button
              variant="champagne"
              className="w-full"
              onClick={saveStep2}
              disabled={handleStatus !== "available" || saving}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Join Trip"}
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
};

const InviteAccept = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const acceptedRef = useRef(false);

  const [acceptState, setAcceptState] = useState<"idle" | "accepting" | "success" | "error">("idle");
  const [acceptedTrip, setAcceptedTrip] = useState<{ trip_id: string; destination: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Fetch invite details (unauthenticated preview)
  const { data: details, isLoading: detailsLoading } = useQuery<InviteDetails>({
    queryKey: ["invite-details", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-invite-details", {
        body: { invite_token: token },
      });
      if (error || data?.error) throw new Error(data?.error || "Invite not found");
      return data as InviteDetails;
    },
    enabled: !!token,
    retry: false,
  });

  // Auto-accept for logged-in users
  useEffect(() => {
    if (authLoading || !user || !token || acceptedRef.current) return;
    acceptedRef.current = true;
    setAcceptState("accepting");

    (async () => {
      try {
        // Check onboarding status
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_completed")
          .eq("user_id", user.id)
          .single();

        const { data, error } = await supabase.functions.invoke("accept-invite", {
          body: { invite_token: token },
        });

        if (error) throw new Error(error.message);

        // "Already used" — redirect anyway
        if (data?.error === "This invite has already been used") {
          setAcceptedTrip({ trip_id: data.trip_id, destination: data.destination });
          setAcceptState("success");
          setTimeout(() => navigate(`/trip/${data.trip_id}`), 1500);
          return;
        }

        if (data?.error) throw new Error(data.error);

        setAcceptedTrip({ trip_id: data.trip_id, destination: data.destination });
        setAcceptState("success");
        queryClient.invalidateQueries({ queryKey: ["shared-trips"] });

        if (!profile?.onboarding_completed) {
          setNeedsOnboarding(true);
        } else {
          setTimeout(() => navigate(`/trip/${data.trip_id}`), 1500);
        }
      } catch (err: any) {
        const msg = err.message || "Something went wrong";
        setErrorMsg(msg);
        setAcceptState("error");
        toast({ title: "Couldn't join trip", description: msg, variant: "destructive" });
      }
    })();
  }, [user, authLoading, token]);

  // Loading auth state
  if (authLoading || detailsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="text-primary animate-spin" />
      </div>
    );
  }

  // Authenticated — show accept flow
  if (user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        {needsOnboarding && acceptedTrip ? (
          <CollabOnboardingOverlay onDone={() => navigate(`/trip/${acceptedTrip.trip_id}`)} />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-10 max-w-sm w-full text-center border border-primary/10"
          >
            {acceptState === "accepting" && (
              <>
                <Loader2 size={32} className="text-primary animate-spin mx-auto mb-4" />
                <p className="text-lg font-heading">
                  Joining {details?.destination || "trip"}…
                </p>
              </>
            )}
            {acceptState === "success" && (
              <>
                <div className="w-14 h-14 rounded-full bg-live/15 flex items-center justify-center mx-auto mb-4">
                  <Check size={28} className="text-live-text" />
                </div>
                <p className="text-2xl font-heading mb-2">You're in!</p>
                <p className="text-sm font-body text-muted-foreground">
                  Redirecting to {acceptedTrip?.destination}…
                </p>
              </>
            )}
            {acceptState === "error" && (
              <>
                <p className="text-lg font-heading mb-2 text-destructive">Couldn't join</p>
                <p className="text-sm font-body text-muted-foreground mb-6">{errorMsg}</p>
                <Link to="/dashboard">
                  <Button variant="champagne" size="sm">Go to Dashboard</Button>
                </Link>
              </>
            )}
          </motion.div>
        )}
      </div>
    );
  }

  // Unauthenticated — show invite preview
  const authUrl = `/auth?redirect=${encodeURIComponent(`/invite/${token}`)}`;

  if (!details) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <p className="text-2xl font-heading mb-2">Invite not found</p>
        <p className="text-sm font-body text-muted-foreground mb-6">This invite link may have expired or already been used.</p>
        <Link to="/">
          <Button variant="champagne" size="sm">Go to Home</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background image */}
      {details.image_url && (
        <div className="absolute inset-0">
          <img src={details.image_url} alt={details.destination} className="w-full h-full object-cover blur-sm scale-105" />
          <div className="absolute inset-0 bg-background/80" />
        </div>
      )}

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 max-w-md w-full border border-primary/20 text-center"
        >
          {/* Inviter */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-secondary border-2 border-primary/30 mb-3">
              {details.inviter_avatar_url ? (
                <img src={details.inviter_avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-2xl font-heading text-primary">
                    {(details.inviter_name || "?")[0].toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm font-body text-muted-foreground">
              <span className="text-foreground">{details.inviter_name || "Someone"}</span>
              {details.inviter_handle && (
                <span className="text-primary"> (@{details.inviter_handle})</span>
              )}{" "}
              invited you to join their trip
            </p>
          </div>

          {/* Trip info */}
          <h1 className="text-4xl font-heading mb-2">{details.destination}</h1>
          {details.country && (
            <p className="text-sm text-muted-foreground font-body flex items-center justify-center gap-1 mb-3">
              <MapPin size={12} className="text-primary" /> {details.country}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground font-body mb-4">
            <Calendar size={12} className="text-primary" />
            <span>{formatDate(details.start_date)} – {formatDate(details.end_date)}</span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            {details.trip_type && (
              <span className="text-xs tracking-[0.15em] uppercase bg-secondary px-3 py-1.5 rounded-full text-primary font-body">
                {details.trip_type}
              </span>
            )}
            <span className="text-xs tracking-[0.15em] uppercase bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full text-primary font-body capitalize">
              {details.role}
            </span>
          </div>

          {/* Auth buttons */}
          <div className="flex flex-col gap-3">
            <Link to={`${authUrl}&mode=signup`}>
              <Button variant="champagne" className="w-full">
                Create account &amp; join
              </Button>
            </Link>
            <Link to={authUrl}>
              <Button variant="champagne-outline" className="w-full">
                Log in &amp; join
              </Button>
            </Link>
          </div>

          <p className="text-xs text-muted-foreground font-body mt-6">
            Powered by Concierge Styled
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default InviteAccept;
