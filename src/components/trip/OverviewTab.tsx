import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { WeatherData, TripCollaborator, Flight } from "@/types/database";
import {
  CloudSun, Droplets, Wind, RefreshCw, Sun, Cloud, CloudRain, Snowflake,
  CloudLightning, CloudFog, CheckCircle2, Users, Clock,
  Crown, Eye, User, Copy, Check, X, Loader2, Plus, Plane, FileText, ExternalLink, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import InlineHandlePrompt from "@/components/profile/InlineHandlePrompt";

const getWeatherIcon = (code: number) => {
  if (code === 0 || code === 1) return Sun;
  if (code === 2 || code === 3) return Cloud;
  if (code >= 45 && code <= 48) return CloudFog;
  if (code >= 51 && code <= 65) return CloudRain;
  if (code >= 71 && code <= 77) return Snowflake;
  if (code >= 80 && code <= 82) return CloudRain;
  if (code >= 95) return CloudLightning;
  return CloudSun;
};

const ROLE_ICONS: Record<string, React.ElementType> = {
  host: Crown,
  collaborator: User,
  viewer: Eye,
};

interface OverviewTabProps {
  tripId: string;
  trip?: {
    latitude?: number;
    longitude?: number;
    start_date: string;
    end_date: string;
    user_id?: string;
    destination?: string;
  };
  onNavigateTo?: (tab: string) => void;
}

const OverviewTab = ({ tripId, trip, onNavigateTo }: OverviewTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHost = trip?.user_id === user?.id;

  // Invite modal state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"collaborator" | "viewer">("collaborator");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ invite_url: string; invite_token: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [refreshingWeather, setRefreshingWeather] = useState(false);

  // Flight state
  const [flightOpen, setFlightOpen] = useState(false);
  const [flightAirline, setFlightAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [depAirport, setDepAirport] = useState("");
  const [depCity, setDepCity] = useState("");
  const [depDatetime, setDepDatetime] = useState("");
  const [arrAirport, setArrAirport] = useState("");
  const [arrCity, setArrCity] = useState("");
  const [arrDatetime, setArrDatetime] = useState("");
  const [flightBookingUrl, setFlightBookingUrl] = useState("");
  const [flightFile, setFlightFile] = useState<File | null>(null);
  const [flightUploading, setFlightUploading] = useState(false);
  const flightFileRef = useRef<HTMLInputElement>(null);

  const { data: weather = [] } = useQuery({
    queryKey: ["weather", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("weather_data").select("*").eq("trip_id", tripId).order("date", { ascending: true });
      if (error) throw error;
      return data as WeatherData[];
    },
  });


  const { data: collaborators = [] } = useQuery({
    queryKey: ["trip-collaborators", tripId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_collaborators")
        .select("id, user_id, invited_email, role, status, invited_by, invite_token")
        .eq("trip_id", tripId)
        .in("status", ["pending", "accepted"]);
      return (data || []) as TripCollaborator[];
    },
  });

  const myCollabEntry = collaborators.find((c) => c.status === "accepted" && c.user_id === user?.id);
  const canEditFlights = isHost || myCollabEntry?.role === "collaborator";

  const acceptedUserIds = collaborators.filter((c) => c.status === "accepted" && c.user_id).map((c) => c.user_id!);
  const profileIds = [...new Set([...(trip?.user_id ? [trip.user_id] : []), ...acceptedUserIds])];

  const { data: collaboratorProfiles = [] } = useQuery({
    queryKey: ["collab-profiles", profileIds.join(",")],
    queryFn: async () => {
      if (profileIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("user_id, name, avatar_url, handle").in("user_id", profileIds);
      return data || [];
    },
    enabled: profileIds.length > 0,
  });

  const { data: myProfile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("handle, handle_set").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user && isHost,
  });

  // Flights query
  const { data: flights = [] } = useQuery({
    queryKey: ["flights", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("flights").select("*").eq("trip_id", tripId).order("departure_datetime", { ascending: true });
      if (error) throw error;
      return data as Flight[];
    },
  });

  const addFlight = async () => {
    setFlightUploading(true);
    let documentUrl: string | null = null;
    if (flightFile && user) {
      try {
        const ext = flightFile.name.split(".").pop();
        const path = `${user.id}/${tripId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("board-images").upload(path, flightFile, { upsert: false });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("board-images").getPublicUrl(path);
          documentUrl = urlData.publicUrl;
        }
      } catch { /* continue without doc */ }
    }
    const { error } = await supabase.from("flights").insert({
      trip_id: tripId,
      airline: flightAirline || null,
      flight_number: flightNumber || null,
      departure_airport: depAirport || null,
      departure_city: depCity || null,
      departure_datetime: depDatetime || null,
      arrival_airport: arrAirport || null,
      arrival_city: arrCity || null,
      arrival_datetime: arrDatetime || null,
      booking_url: flightBookingUrl || null,
      document_url: documentUrl,
      order_index: flights.length,
    });
    setFlightUploading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["flights", tripId] });
    setFlightOpen(false);
    setFlightAirline(""); setFlightNumber(""); setDepAirport(""); setDepCity(""); setDepDatetime("");
    setArrAirport(""); setArrCity(""); setArrDatetime(""); setFlightBookingUrl(""); setFlightFile(null);
    toast({ title: "Flight added" });
  };

  const deleteFlight = async (id: string) => {
    await supabase.from("flights").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["flights", tripId] });
  };

  const fmtFlightRoute = (f: Flight) => `${f.departure_airport || f.departure_city || "?"} → ${f.arrival_airport || f.arrival_city || "?"}`;
  const fmtFlightTime = (dt: string | null) =>
    dt ? new Date(dt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  const getProfile = (userId: string) => collaboratorProfiles.find((p: any) => p.user_id === userId);
  const hostProfile = trip?.user_id ? getProfile(trip.user_id) : null;

  const refreshWeather = async () => {
    if (!trip?.latitude || !trip?.longitude) {
      toast({ title: "No coordinates", description: "This trip doesn't have location coordinates for weather data.", variant: "destructive" });
      return;
    }
    setRefreshingWeather(true);
    try {
      const { error } = await supabase.functions.invoke("fetch-weather", {
        body: { trip_id: tripId, latitude: trip.latitude, longitude: trip.longitude, start_date: trip.start_date, end_date: trip.end_date },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["weather", tripId] });
      toast({ title: "Weather updated" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setRefreshingWeather(false);
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail) return;
    setInviteSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-collaborator", {
        body: { trip_id: tripId, invited_email: inviteEmail, role: inviteRole },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setInviteResult({ invite_url: data.invite_url, invite_token: data.invite_token });
      queryClient.invalidateQueries({ queryKey: ["trip-collaborators", tripId] });
    } catch (err: any) {
      toast({ title: "Could not send invite", description: err.message, variant: "destructive" });
    } finally {
      setInviteSending(false);
    }
  };

  const revokeInvite = async (id: string) => {
    await supabase.from("trip_collaborators").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["trip-collaborators", tripId] });
    toast({ title: "Invite revoked" });
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const resetInviteModal = () => {
    setInviteEmail("");
    setInviteRole("collaborator");
    setInviteResult(null);
    setCopiedLink(false);
  };

  const pendingInvites = collaborators.filter((c) => c.status === "pending");
  const acceptedCollabs = collaborators.filter((c) => c.status === "accepted");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 md:space-y-12">

      {/* Travelling With */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="eyebrow text-muted-foreground flex items-center gap-2">
            <Users size={14} className="text-primary" /> Travelling With
          </h2>
          {isHost && (
            <Button variant="champagne-outline" size="sm" onClick={() => { resetInviteModal(); setInviteOpen(true); }}>
              <Plus size={13} /> Invite
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {hostProfile && (
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-secondary border-2 border-primary/30">
                {hostProfile.avatar_url ? (
                  <img src={hostProfile.avatar_url} alt={hostProfile.name || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-lg font-heading text-primary">{(hostProfile.name || "?")[0].toUpperCase()}</span>
                  </div>
                )}
              </div>
              <p className="text-xs font-body text-foreground max-w-[56px] truncate text-center">{hostProfile.name?.split(" ")[0] || hostProfile.handle || "Host"}</p>
              <div className="flex items-center gap-0.5">
                <Crown size={9} className="text-primary" />
                <span className="text-[9px] text-primary font-body">Host</span>
              </div>
            </div>
          )}

          {acceptedCollabs.map((c) => {
            const profile = c.user_id ? getProfile(c.user_id) : null;
            const RoleIcon = ROLE_ICONS[c.role] || User;
            const initial = profile?.name?.[0]?.toUpperCase() || (c.invited_email?.[0]?.toUpperCase() ?? "?");
            return (
              <div key={c.id} className="flex flex-col items-center gap-1.5">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-secondary border-2 border-border">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.name || ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-lg font-heading text-muted-foreground">{initial}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-body text-foreground max-w-[56px] truncate text-center">
                  {profile?.name?.split(" ")[0] || "Traveller"}
                </p>
                <div className="flex items-center gap-0.5">
                  <RoleIcon size={9} className="text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground font-body capitalize">{c.role}</span>
                </div>
              </div>
            );
          })}

          {pendingInvites.map((c) => (
            <div key={c.id} className="flex flex-col items-center gap-1.5 opacity-50">
              <div className="w-12 h-12 rounded-full bg-secondary border-2 border-dashed border-border flex items-center justify-center">
                <Clock size={16} className="text-muted-foreground" />
              </div>
              <p className="text-xs font-body text-muted-foreground max-w-[56px] truncate text-center">
                {c.invited_email?.split("@")[0]}
              </p>
              <span className="text-[9px] text-muted-foreground font-body">Pending</span>
            </div>
          ))}

          {!hostProfile && acceptedCollabs.length === 0 && pendingInvites.length === 0 && (
            <div className="glass rounded-xl p-4 w-full text-center">
              <p className="text-xs font-body text-muted-foreground">
                {isHost ? "Invite friends to plan this trip together." : "Just you on this trip so far."}
              </p>
            </div>
          )}
        </div>
      </section>


      {/* Flights */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="eyebrow text-muted-foreground flex items-center gap-2">
            <Plane size={14} className="text-primary" /> Flights
          </h2>
          {canEditFlights && (
            <button onClick={() => setFlightOpen(true)} className="flex items-center gap-1.5 text-xs font-body text-primary hover:underline">
              <Plus size={12} /> Add Flight
            </button>
          )}
        </div>
        {flights.length === 0 ? (
          <div className="glass rounded-xl p-5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground font-body">No flights added yet.</p>
            <div className="flex items-center gap-3">
              {["Google Flights", "Skyscanner"].map((name) => (
                <a key={name} href={name === "Google Flights" ? "https://www.google.com/flights" : "https://www.skyscanner.net"} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-primary font-body hover:underline flex items-center gap-1">
                  <ExternalLink size={11} /> {name}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {flights.map((f) => (
              <div key={f.id} className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-heading text-base">{fmtFlightRoute(f)}</p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {f.airline && f.flight_number ? `${f.airline} ${f.flight_number} · ` : (f.airline ? `${f.airline} · ` : "")}
                    {fmtFlightTime(f.departure_datetime)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.booking_url && (
                    <a href={f.booking_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-body hover:underline flex items-center gap-1">
                      <ExternalLink size={11} /> View
                    </a>
                  )}
                  {f.document_url && (
                    <a href={f.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground font-body hover:text-foreground flex items-center gap-1">
                      <FileText size={11} /> Doc
                    </a>
                  )}
                  {canEditFlights && (
                    <button onClick={() => deleteFlight(f.id)} className="p-1.5 rounded-lg hover:bg-secondary">
                      <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add Flight Dialog */}
      <Dialog open={flightOpen} onOpenChange={setFlightOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Add Flight</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <Input value={flightAirline} onChange={(e) => setFlightAirline(e.target.value)} placeholder="Airline" className="bg-secondary border-border" />
              <Input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="Flight no." className="bg-secondary border-border" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Departure</p>
              <div className="grid grid-cols-2 gap-2">
                <Input value={depAirport} onChange={(e) => setDepAirport(e.target.value)} placeholder="Airport (JFK)" className="bg-secondary border-border" />
                <Input value={depCity} onChange={(e) => setDepCity(e.target.value)} placeholder="City" className="bg-secondary border-border" />
                <Input type="datetime-local" value={depDatetime} onChange={(e) => setDepDatetime(e.target.value)} className="bg-secondary border-border col-span-2" />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-body mb-2">Arrival</p>
              <div className="grid grid-cols-2 gap-2">
                <Input value={arrAirport} onChange={(e) => setArrAirport(e.target.value)} placeholder="Airport (CDG)" className="bg-secondary border-border" />
                <Input value={arrCity} onChange={(e) => setArrCity(e.target.value)} placeholder="City" className="bg-secondary border-border" />
                <Input type="datetime-local" value={arrDatetime} onChange={(e) => setArrDatetime(e.target.value)} className="bg-secondary border-border col-span-2" />
              </div>
            </div>
            <Input value={flightBookingUrl} onChange={(e) => setFlightBookingUrl(e.target.value)} placeholder="Booking link (optional)" className="bg-secondary border-border" />
            <div onClick={() => flightFileRef.current?.click()}
              className="rounded-xl border-2 border-dashed border-border bg-secondary/50 p-4 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <FileText size={20} className="mx-auto text-muted-foreground mb-1" />
              <p className="text-xs text-muted-foreground font-body">{flightFile ? flightFile.name : "Upload confirmation or boarding pass (optional)"}</p>
            </div>
            <input ref={flightFileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFlightFile(e.target.files?.[0] || null)} />
            <Button variant="champagne" onClick={addFlight} className="w-full" disabled={flightUploading}>
              {flightUploading ? "Adding…" : "Add Flight"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weather */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="eyebrow text-muted-foreground flex items-center gap-2">
            <CloudSun size={14} className="text-primary" /> Weather Forecast
          </h2>
          <Button variant="champagne-outline" size="sm" onClick={refreshWeather} disabled={refreshingWeather}>
            <RefreshCw size={14} className={refreshingWeather ? "animate-spin" : ""} />
            {refreshingWeather ? "Updating..." : "Refresh"}
          </Button>
        </div>
        {weather.length === 0 ? (
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-muted-foreground font-body text-sm">
              {trip?.latitude ? "No weather data yet. Click Refresh to fetch forecast." : "Add coordinates to your destination to see weather data."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {weather.slice(0, 14).map((w) => {
              const Icon = getWeatherIcon(w.weather_code || 0);
              return (
                <div key={w.id} className="glass rounded-xl p-3 md:p-4 text-center hover:glow-gold transition-all duration-300">
                  <p className="text-xs text-muted-foreground font-body mb-2">
                    {new Date(w.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}
                  </p>
                  <Icon size={24} className="mx-auto text-primary mb-2" />
                  <div className="flex items-center justify-center gap-1 text-sm font-body">
                    <span className="text-foreground font-medium">{Math.round(w.temperature_high || 0)}°</span>
                    <span className="text-muted-foreground">{Math.round(w.temperature_low || 0)}°</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    <Droplets size={10} className="text-blue-400" />
                    <span>{w.rain_probability || 0}%</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 mt-0.5 text-xs text-muted-foreground">
                    <Wind size={10} />
                    <span>{Math.round(w.wind_speed || 0)} km/h</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Invite Modal */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) resetInviteModal(); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">Invite to Trip</DialogTitle>
          </DialogHeader>

          {myProfile && !myProfile.handle ? (
            <InlineHandlePrompt
              promptText="Set your @handle so your guest knows who's inviting them."
              onComplete={() => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] })}
            />
          ) : inviteResult ? (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl bg-live/15 border border-live-dim p-4">
                <p className="text-xs text-live-text font-body mb-1">Invite link created</p>
                <p className="text-xs font-body text-muted-foreground break-all">{inviteResult.invite_url}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="champagne-outline" size="sm" className="flex-1" onClick={() => copyLink(inviteResult.invite_url)}>
                  {copiedLink ? <Check size={13} className="text-live-text" /> : <Copy size={13} />}
                  {copiedLink ? "Copied!" : "Copy link"}
                </Button>
                <Button
                  variant="champagne-outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const msg = `Join my trip to ${trip?.destination || "our destination"} on Concierge Styled 🌍 ${inviteResult.invite_url}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                >
                  WhatsApp
                </Button>
              </div>
              <button onClick={resetInviteModal} className="w-full text-xs text-primary font-body text-center hover:underline pt-1">
                Invite another person
              </button>
              {pendingInvites.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body mb-3">Pending</p>
                  <div className="space-y-2">
                    {pendingInvites.map((c) => (
                      <div key={c.id} className="flex items-center justify-between">
                        <span className="text-sm font-body text-foreground truncate">{c.invited_email}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => copyLink(`${window.location.origin}/invite/${c.invite_token}`)} className="text-xs text-primary font-body hover:underline">Copy</button>
                          <button onClick={() => revokeInvite(c.id)} className="text-xs text-muted-foreground font-body hover:text-destructive">Revoke</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {myProfile?.handle && (
                <p className="text-xs text-muted-foreground font-body">
                  Inviting as <span className="text-primary">@{myProfile.handle}</span>
                </p>
              )}
              <div>
                <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Their email address</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  className="bg-secondary border-border h-11 font-body text-sm"
                />
              </div>
              <div>
                <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["collaborator", "viewer"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      className={`rounded-xl border p-3 text-left transition-all ${inviteRole === r ? "border-primary bg-primary/5" : "border-border bg-secondary hover:border-primary/40"}`}
                    >
                      <p className="text-sm font-body capitalize font-medium text-foreground mb-1">{r}</p>
                      <p className="text-xs font-body text-muted-foreground leading-relaxed">
                        {r === "collaborator" ? "Can add events, pin outfits, and vote on polls" : "Can view the trip but not make changes"}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              <Button variant="champagne" className="w-full" onClick={sendInvite} disabled={!inviteEmail || inviteSending}>
                {inviteSending ? <Loader2 size={14} className="animate-spin" /> : "Send Invite"}
              </Button>
              {pendingInvites.length > 0 && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body mb-3">Pending Invites</p>
                  <div className="space-y-2">
                    {pendingInvites.map((c) => (
                      <div key={c.id} className="flex items-center justify-between">
                        <span className="text-sm font-body text-foreground truncate">{c.invited_email}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => copyLink(`${window.location.origin}/invite/${c.invite_token}`)} className="text-xs text-primary font-body hover:underline">Copy</button>
                          <button onClick={() => revokeInvite(c.id)} className="text-xs text-muted-foreground font-body hover:text-destructive">Revoke</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default OverviewTab;
