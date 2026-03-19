import { motion } from "framer-motion";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, Globe, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";

const STYLE_VIBE_LABELS: Record<string, { label: string; desc: string }> = {
  classic: { label: "Classic", desc: "Timeless, tailored, neutral" },
  minimalist: { label: "Minimalist", desc: "Clean lines, monochrome, less is more" },
  bohemian: { label: "Bohemian", desc: "Flowing, earthy, free-spirited" },
  streetwear: { label: "Streetwear", desc: "Urban, bold, statement pieces" },
  resort: { label: "Resort", desc: "Relaxed luxury, linen, sun-ready" },
  eclectic: { label: "Eclectic", desc: "Mixed, unexpected, maximalist" },
  preppy: { label: "Preppy", desc: "Structured, collegiate, polished" },
  "avant-garde": { label: "Avant-garde", desc: "Fashion-forward, experimental" },
};

const Profile = () => {
  const { handle } = useParams<{ handle: string }>();
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", handle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, handle, avatar_url, home_city, style_vibe, bio")
        .ilike("handle", handle!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!handle,
  });

  const { data: publicTrips = [] } = useQuery({
    queryKey: ["public-trips", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("id, destination, country, start_date, end_date, image_url, trip_type")
        .eq("user_id", profile!.user_id)
        .eq("is_public", true)
        .order("start_date", { ascending: false })
        .limit(6);
      return data || [];
    },
    enabled: !!profile?.user_id,
  });

  const { data: tripCount } = useQuery({
    queryKey: ["trip-count", profile?.user_id],
    queryFn: async () => {
      const { count } = await supabase
        .from("trips")
        .select("id", { count: "exact", head: true })
        .eq("user_id", profile!.user_id)
        .eq("is_public", true);
      return count || 0;
    },
    enabled: !!profile?.user_id,
  });

  const { data: destCount } = useQuery({
    queryKey: ["dest-count", profile?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trips")
        .select("destination")
        .eq("user_id", profile!.user_id)
        .eq("is_public", true);
      if (!data) return 0;
      return new Set(data.map((t: any) => t.destination)).size;
    },
    enabled: !!profile?.user_id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-gold animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-32 flex flex-col items-center justify-center text-center px-6">
          <Globe size={48} className="text-muted-foreground/20 mb-4" />
          <h1 className="text-2xl font-heading mb-2">Traveller not found</h1>
          <p className="text-muted-foreground font-body text-sm">
            This traveller hasn't joined yet — or the handle is incorrect.
          </p>
          <Link to="/" className="mt-6 text-sm text-primary font-body hover:underline">
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const vibeInfo = profile.style_vibe ? STYLE_VIBE_LABELS[profile.style_vibe] : null;
  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 md:pt-28 pb-16 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-8">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-secondary border-2 border-border flex-shrink-0">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name || ""} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={36} className="text-muted-foreground/30" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-3xl font-heading">{profile.name || profile.handle}</h1>
                {profile.handle && (
                  <p className="text-primary font-body text-sm mt-0.5">@{profile.handle}</p>
                )}
                {profile.home_city && (
                  <p className="text-muted-foreground font-body text-sm flex items-center gap-1 mt-1">
                    <MapPin size={12} className="text-primary" /> {profile.home_city}
                  </p>
                )}
                {profile.bio && (
                  <p className="text-sm font-body text-muted-foreground mt-2 leading-relaxed max-w-sm">{profile.bio}</p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="glass rounded-xl p-4 flex gap-6 mb-8">
              <div>
                <p className="text-2xl font-heading text-foreground">{tripCount ?? 0}</p>
                <p className="text-xs text-muted-foreground font-body">trips planned</p>
              </div>
              <div className="w-px bg-border" />
              <div>
                <p className="text-2xl font-heading text-foreground">{destCount ?? 0}</p>
                <p className="text-xs text-muted-foreground font-body">destinations</p>
              </div>
            </div>

            {/* Style vibe */}
            {vibeInfo && (
              <div className="glass rounded-xl p-4 mb-8">
                <p className="text-xs tracking-[0.15em] uppercase text-primary font-body mb-1">Style</p>
                <p className="font-heading text-lg">{vibeInfo.label}</p>
                <p className="text-sm text-muted-foreground font-body">{vibeInfo.desc}</p>
              </div>
            )}

            {/* Public trips */}
            <section>
              <h2 className="eyebrow text-muted-foreground flex items-center gap-2 mb-6">
                <Calendar size={14} className="text-primary" /> Recent Trips
              </h2>
              {publicTrips.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <p className="text-muted-foreground font-body text-sm">No public trips yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {publicTrips.map((trip: any) => (
                    <div key={trip.id} className="glass rounded-xl overflow-hidden">
                      <div className="relative h-32 bg-secondary">
                        {trip.image_url && (
                          <img
                            src={trip.image_url}
                            alt={trip.destination}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-heading text-lg">{trip.destination}</h3>
                        <p className="text-xs text-muted-foreground font-body">
                          {formatDate(trip.start_date)} · {trip.trip_type || "Trip"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* CTA for logged-in users */}
            {user && user.id !== profile.user_id && (
              <div className="mt-12 glass rounded-2xl p-6 text-center border border-primary/10">
                <p className="eyebrow text-primary mb-2">Travelling Together?</p>
                <p className="text-sm text-muted-foreground font-body mb-4">
                  Invite {profile.name?.split(" ")[0] || "them"} to collaborate on your next trip.
                </p>
                <Button variant="champagne" size="sm">
                  Invite {profile.name?.split(" ")[0] || "them"} to a Trip
                </Button>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
