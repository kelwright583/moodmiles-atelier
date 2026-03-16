import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Music, ExternalLink, Calendar, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ConfirmedEvent {
  event_name: string;
  event_date: string | null;
  event_time: string | null;
  venue_name: string | null;
  dress_code: string | null;
}

interface PlaylistData {
  playlist_name: string;
  spotify_playlist_url: string;
}

interface PublicTripData {
  destination: string;
  country: string | null;
  start_date: string;
  end_date: string;
  trip_type: string | null;
  image_url: string | null;
  trip_theme: string | null;
  host: {
    first_name: string | null;
    avatar_url: string | null;
    handle: string | null;
  };
  confirmed_events: ConfirmedEvent[];
  collaborator_count: number;
  playlist: PlaylistData | null;
  style_highlights: string[];
}

const SpotifyLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.517 17.324a.748.748 0 01-1.03.249c-2.823-1.726-6.376-2.116-10.564-1.16a.748.748 0 01-.354-1.452c4.579-1.047 8.51-.596 11.7 1.34a.748.748 0 01.248 1.023zm1.471-3.271a.935.935 0 01-1.287.308c-3.232-1.987-8.158-2.563-11.983-1.401a.936.936 0 01-.543-1.788c4.368-1.327 9.8-.683 13.505 1.595a.936.936 0 01.308 1.286zm.126-3.403C15.558 8.373 9.89 8.18 6.558 9.179a1.122 1.122 0 01-.651-2.145c3.826-1.163 10.182-.938 14.192 1.648a1.123 1.123 0 01-1.385 1.968z" />
  </svg>
);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });

const formatEventDate = (d: string | null) => {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
};

const PublicTrip = () => {
  const { shareToken } = useParams<{ shareToken: string }>();

  const { data, isLoading, error } = useQuery<PublicTripData>({
    queryKey: ["public-trip", shareToken],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-public-trip", {
        body: { share_token: shareToken },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      return data as PublicTripData;
    },
    enabled: !!shareToken,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background max-w-lg mx-auto">
        {/* Hero skeleton */}
        <div className="h-72 bg-secondary animate-pulse" />
        <div className="px-4 -mt-8 relative z-10 space-y-4">
          {/* Host card skeleton */}
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-secondary animate-pulse flex-shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-secondary animate-pulse rounded w-32" />
              <div className="h-3 bg-secondary animate-pulse rounded w-20" />
            </div>
          </div>
          {/* Content skeletons */}
          <div className="space-y-3 pt-2">
            <div className="h-4 bg-secondary animate-pulse rounded w-28" />
            <div className="h-16 bg-secondary animate-pulse rounded-xl" />
            <div className="h-16 bg-secondary animate-pulse rounded-xl" />
          </div>
          <div className="space-y-3 pt-2">
            <div className="h-4 bg-secondary animate-pulse rounded w-20" />
            <div className="grid grid-cols-2 gap-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="aspect-square bg-secondary animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="glass-card rounded-2xl p-10 text-center max-w-sm w-full">
          <Sparkles size={40} className="text-primary mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-heading mb-2">This trip doesn't exist or has been made private</h2>
          <p className="text-sm text-muted-foreground font-body mb-6">
            The link may be invalid, or the owner made this trip private.
          </p>
          <Link to="/auth">
            <Button variant="champagne" className="w-full">Join Concierge Styled</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const visibleEvents = data.confirmed_events.slice(0, 5);
  const extraEvents = data.confirmed_events.length - 5;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto">
        {/* Hero */}
        <div className="relative h-72 md:h-96 overflow-hidden bg-secondary">
          {data.image_url && (
            <img
              src={data.image_url}
              alt={data.destination}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />
          <div className="absolute bottom-8 left-6 right-6">
            {data.trip_type && (
              <span className="inline-block text-xs tracking-[0.2em] uppercase bg-white/10 backdrop-blur-sm border border-white/20 text-white px-3 py-1 rounded-full font-body mb-3">
                {data.trip_type}
              </span>
            )}
            <h1 className="text-4xl md:text-6xl font-heading text-white leading-tight">{data.destination}</h1>
            <p className="text-sm font-body mt-2" style={{ color: "#cc8638" }}>
              {formatDate(data.start_date)} – {formatDate(data.end_date)}
            </p>
          </div>
        </div>

        {/* Host card */}
        <div className="glass-card mx-4 -mt-8 relative z-10 rounded-2xl p-4 flex items-center gap-3">
          {data.host.avatar_url ? (
            <img
              src={data.host.avatar_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover border border-primary/20 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-heading text-muted-foreground">
                {(data.host.first_name || "?")[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="text-sm font-body text-foreground">
              Trip planned by{" "}
              <span className="font-medium">{data.host.first_name || "a traveller"}</span>
            </p>
            {data.host.handle && (
              <p className="text-xs text-muted-foreground font-body">@{data.host.handle}</p>
            )}
          </div>
        </div>

        {/* Trip theme pill */}
        {data.trip_theme && (
          <div className="px-4 mt-5">
            <span
              className="inline-flex items-center gap-1.5 text-xs tracking-[0.15em] uppercase font-body px-4 py-2 rounded-full border"
              style={{ color: "#cc8638", borderColor: "rgba(202,151,92,0.3)", background: "rgba(202,151,92,0.08)" }}
            >
              ✦ {data.trip_theme}
            </span>
          </div>
        )}

        {/* Confirmed events */}
        {visibleEvents.length > 0 && (
          <div className="px-4 mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-primary" />
              <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body">What's planned</h2>
            </div>
            <div className="space-y-2">
              {visibleEvents.map((event, i) => (
                <div key={i} className="glass-card rounded-xl px-4 py-3 flex items-center gap-3">
                  {event.event_date && (
                    <span className="text-xs text-primary font-body font-medium w-16 flex-shrink-0">
                      {formatEventDate(event.event_date)}
                    </span>
                  )}
                  <span className="text-sm font-body text-foreground flex-1 min-w-0 truncate">
                    {event.event_name}
                  </span>
                  {event.venue_name && (
                    <span className="text-xs text-muted-foreground font-body truncate max-w-[80px]">
                      {event.venue_name}
                    </span>
                  )}
                  {event.dress_code && (
                    <span className="text-[10px] font-body px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border flex-shrink-0">
                      {event.dress_code}
                    </span>
                  )}
                </div>
              ))}
              {extraEvents > 0 && (
                <p className="text-xs text-muted-foreground font-body px-1 pt-1">
                  and {extraEvents} more event{extraEvents === 1 ? "" : "s"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Style highlights */}
        {data.style_highlights.length > 0 && (
          <div className="px-4 mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-primary" />
              <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body">The look</h2>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.style_highlights.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Style highlight ${i + 1}`}
                  className="w-full rounded-xl object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        )}

        {/* Playlist */}
        {data.playlist && (
          <div className="px-4 mt-8">
            <div className="flex items-center gap-2 mb-4">
              <Music size={14} className="text-primary" />
              <h2 className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body">The soundtrack</h2>
            </div>
            <div className="glass-card rounded-xl p-4 flex items-center gap-3">
              <SpotifyLogo />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-foreground truncate">{data.playlist.playlist_name}</p>
                <p className="text-xs text-muted-foreground font-body">Spotify</p>
              </div>
              {data.playlist.spotify_playlist_url && (
                <a
                  href={data.playlist.spotify_playlist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-body text-emerald-400 hover:text-emerald-300 transition-colors flex-shrink-0"
                >
                  Listen <ExternalLink size={12} />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Footer CTA */}
        <div className="px-4 mt-12 pb-16 text-center border-t border-border pt-10">
          <h3 className="text-2xl font-heading text-primary mb-1">Concierge Styled</h3>
          <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-body mb-1">
            Arrive Impeccably Everywhere
          </p>
          <p className="text-sm text-muted-foreground font-body mb-6">Plan your own trip</p>
          <Link to="/auth">
            <Button variant="champagne" className="w-full mb-3">Join Concierge Styled</Button>
          </Link>
          <Link to="/auth" className="text-xs text-muted-foreground font-body hover:text-foreground transition-colors">
            Already a member? Log in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicTrip;
