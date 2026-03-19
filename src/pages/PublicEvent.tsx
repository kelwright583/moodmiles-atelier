import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, MapPin, CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatDate(dateStr: string, timeStr?: string | null): string {
  const d = new Date(dateStr + "T12:00:00");
  const datePart = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (!timeStr) return datePart;
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${datePart} · ${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function downloadIcs(event: any) {
  const fmt = (d: string, t?: string | null) => {
    const dt = new Date(d + "T12:00:00");
    if (t) {
      const [h, m] = t.split(":").map(Number);
      dt.setHours(h, m, 0, 0);
      return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
    }
    return d.replace(/-/g, "");
  };
  const start = fmt(event.event_date, event.event_time);
  const esc = (s: string) => s.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
  const content = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Concierge Styled//EN",
    "BEGIN:VEVENT",
    `UID:${event.id || Date.now()}@conciergestyled.com`,
    `DTSTART${event.event_time ? "" : ";VALUE=DATE"}:${start}`,
    `DTEND${event.event_time ? "" : ";VALUE=DATE"}:${start}`,
    `SUMMARY:${esc(event.event_name)}`,
    event.venue_address ? `LOCATION:${esc(event.venue_address)}` : "",
    event.dress_code ? `DESCRIPTION:Dress code: ${esc(event.dress_code)}` : "",
    "END:VEVENT", "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.event_name.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const PublicEvent = () => {
  const { share_token } = useParams<{ share_token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ["public-event", share_token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-event-details", {
        body: { share_token },
      });
      if (error || data?.error) throw new Error(data?.error || "Event not found");
      return data;
    },
    enabled: !!share_token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-gold animate-pulse" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-2xl font-heading mb-2">Event not found</h1>
        <p className="text-sm font-body text-muted-foreground mb-6">This event link may have expired or been removed.</p>
        <Link to="/">
          <Button variant="champagne" size="sm">Back to home</Button>
        </Link>
      </div>
    );
  }

  const heroImage = event.trip_image_url;
  const authUrl = `/auth?redirect=${encodeURIComponent(window.location.pathname)}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="relative h-64 md:h-80 overflow-hidden bg-secondary">
        {heroImage && (
          <>
            <img src={heroImage} alt={event.destination} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/10" />
          </>
        )}
        {!heroImage && (
          <div className="absolute inset-0 bg-gradient-to-t from-background to-background/20" />
        )}
      </div>

      <main className="max-w-xl mx-auto px-6 -mt-16 relative z-10 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* Event name */}
          <h1 className="text-4xl md:text-5xl font-heading mb-3">{event.event_name}</h1>

          {/* Date */}
          {event.event_date && (
            <div className="flex items-center gap-2 text-sm font-body text-muted-foreground mb-3">
              <Calendar size={14} className="text-primary" />
              <span>{formatDate(event.event_date, event.event_time)}</span>
            </div>
          )}

          {/* Venue */}
          {event.venue_name && (
            <div className="flex items-start gap-2 text-sm font-body text-muted-foreground mb-4">
              <MapPin size={14} className="text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-foreground">{event.venue_name}</p>
                {event.venue_address && event.venue_address !== event.venue_name && (
                  <p className="text-xs text-muted-foreground">{event.venue_address}</p>
                )}
              </div>
            </div>
          )}

          {/* Trip context */}
          {event.destination && (
            <p className="text-xs tracking-[0.15em] uppercase text-primary font-body mb-4">
              {event.destination}{event.country ? `, ${event.country}` : ""}
            </p>
          )}

          {/* Dress code */}
          {event.dress_code && (
            <div className="glass rounded-xl p-4 mb-6 border border-primary/20">
              <p className="text-xs tracking-[0.15em] uppercase text-primary font-body mb-1">Dress Code</p>
              <p className="text-lg font-heading">{event.dress_code}</p>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <p className="text-sm font-body text-muted-foreground mb-6 leading-relaxed">{event.notes}</p>
          )}

          {/* Add to calendar */}
          <Button
            variant="champagne-outline"
            className="w-full mb-8"
            onClick={() => downloadIcs(event)}
          >
            <CalendarPlus size={15} />
            Add to Calendar
          </Button>

          {/* Plan your outfit CTA */}
          <div className="glass rounded-2xl p-6 text-center border border-primary/10">
            <Sparkles size={20} className="text-primary mx-auto mb-3" />
            <p className="eyebrow text-primary mb-2">Style Planning</p>
            <p className="text-base font-heading mb-1">Attending {event.event_name}?</p>
            <p className="text-sm font-body text-muted-foreground mb-5">
              Plan your look with Concierge Styled.
            </p>
            {user && event.trip_id ? (
              <Link to={`/trip/${event.trip_id}?tab=Inspire`}>
                <Button variant="champagne" className="w-full">Plan my outfit</Button>
              </Link>
            ) : (
              <Link to={`${authUrl}&mode=signup`}>
                <Button variant="champagne" className="w-full">Plan my outfit</Button>
              </Link>
            )}
          </div>

          {/* Footer */}
          <p className="text-center text-xs font-body text-muted-foreground mt-10">
            Powered by{" "}
            <Link to="/" className="text-primary hover:underline">Concierge Styled</Link>
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default PublicEvent;
