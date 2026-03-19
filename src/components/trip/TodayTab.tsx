import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plane, Clock, MapPin, CalendarClock, ChevronDown, ChevronUp,
  AlertTriangle, Navigation, Share2, Loader2, Shirt, Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Trip, TripEvent } from "@/types/database";

interface TodayTabProps {
  tripId: string;
  trip: Trip;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTimeShort(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function formatCountdown(targetDate: Date) {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  if (diff <= 0) return "now";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getFlightStatusColour(status: string | null) {
  switch (status) {
    case "boarding": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "departed":
    case "en_route": return "bg-sky-500/20 text-sky-400 border-sky-500/30";
    case "landed": return "bg-live/15 text-live-text border-live-dim";
    case "delayed": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "cancelled": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-secondary text-muted-foreground border-border";
  }
}

function isFlightEvent(event: TripEvent) {
  return event.event_type === "flight" || !!event.flight_number;
}

// ─── Component ──────────────────────────────────────────────────────────────

const TodayTab = ({ tripId, trip }: TodayTabProps) => {
  const queryClient = useQueryClient();
  const [tomorrowOpen, setTomorrowOpen] = useState(false);
  const [countdown, setCountdown] = useState("");
  const [leaveCountdown, setLeaveCountdown] = useState("");
  const [rendezvousLocation, setRendezvousLocation] = useState("");
  const [rendezvousTime, setRendezvousTime] = useState("");
  const [pollingFlightId, setPollingFlightId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];

  // ── Fetch today's events ────────────────────────────────────────────────
  const { data: todayEvents = [] } = useQuery<TripEvent[]>({
    queryKey: ["today-events", tripId, today],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_events")
        .select("*")
        .eq("trip_id", tripId)
        .eq("event_date", today)
        .order("event_time", { ascending: true });
      return (data || []) as TripEvent[];
    },
  });

  // ── Fetch tomorrow's events ─────────────────────────────────────────────
  const { data: tomorrowEvents = [] } = useQuery<TripEvent[]>({
    queryKey: ["tomorrow-events", tripId, tomorrow],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_events")
        .select("*")
        .eq("trip_id", tripId)
        .eq("event_date", tomorrow)
        .order("event_time", { ascending: true });
      return (data || []) as TripEvent[];
    },
  });

  // ── Flight events ───────────────────────────────────────────────────────
  const flightEvents = useMemo(() => todayEvents.filter(isFlightEvent), [todayEvents]);
  const nonFlightEvents = useMemo(() => todayEvents.filter((e) => !isFlightEvent(e)), [todayEvents]);

  // ── Next upcoming event (with time in the future) ───────────────────────
  const nextEvent = useMemo(() => {
    const now = new Date();
    return todayEvents.find((e) => {
      if (!e.event_time) return false;
      const eventDate = new Date(`${today}T${e.event_time}`);
      return eventDate > now;
    });
  }, [todayEvents, today]);

  // ── Leave time calculation ──────────────────────────────────────────────
  const nextFlightOrMajorEvent = flightEvents[0] || nextEvent;

  const { data: leaveData } = useQuery({
    queryKey: ["leave-time", nextFlightOrMajorEvent?.id, trip.origin_latitude, trip.origin_longitude],
    queryFn: async () => {
      if (!nextFlightOrMajorEvent?.event_time) return null;
      const eventDateTime = `${today}T${nextFlightOrMajorEvent.event_time}:00`;
      const isFlight = isFlightEvent(nextFlightOrMajorEvent);

      const destLat = trip.latitude;
      const destLng = trip.longitude;
      const originLat = trip.origin_latitude;
      const originLng = trip.origin_longitude;

      if (!originLat || !originLng || !destLat || !destLng) return null;

      const { data, error } = await supabase.functions.invoke("calculate-leave-time", {
        body: {
          origin_lat: originLat,
          origin_lng: originLng,
          dest_lat: destLat,
          dest_lng: destLng,
          arrival_time: eventDateTime,
          is_airport: isFlight,
        },
      });
      if (error) throw error;
      return data;
    },
    enabled: !!nextFlightOrMajorEvent?.event_time && !!trip.origin_latitude,
    staleTime: 1000 * 60 * 10,
  });

  // ── Flight status polling ───────────────────────────────────────────────
  const refreshFlightStatus = async (event: TripEvent) => {
    if (!event.flight_number) return;
    setPollingFlightId(event.id);
    try {
      const { data, error } = await supabase.functions.invoke("get-flight-status", {
        body: {
          event_id: event.id,
          flight_number: event.flight_number,
          flight_date: event.event_date,
        },
      });
      if (error) throw error;
      if (data?.error === "Flight not found") {
        toast({ title: "Flight not found", description: `Could not find ${event.flight_number}. Check the flight number.`, variant: "destructive" });
      } else {
        queryClient.invalidateQueries({ queryKey: ["today-events", tripId] });
        toast({ title: "Flight status updated", description: `${event.flight_number}: ${data?.status || "unknown"}` });
      }
    } catch {
      toast({ title: "Could not check flight", description: "Please try again later.", variant: "destructive" });
    } finally {
      setPollingFlightId(null);
    }
  };

  // Auto-poll flights every 10 minutes
  useEffect(() => {
    if (flightEvents.length === 0) return;
    const interval = setInterval(() => {
      flightEvents.forEach((fe) => {
        if (fe.flight_number && fe.flight_status !== "landed" && fe.flight_status !== "cancelled") {
          supabase.functions.invoke("get-flight-status", {
            body: { event_id: fe.id, flight_number: fe.flight_number, flight_date: fe.event_date },
          }).then(() => queryClient.invalidateQueries({ queryKey: ["today-events", tripId] }))
            .catch(() => {});
        }
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [flightEvents, tripId, queryClient]);

  // ── Countdown tickers ───────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (nextEvent?.event_time) {
        setCountdown(formatCountdown(new Date(`${today}T${nextEvent.event_time}`)));
      }
      if (leaveData?.leave_at) {
        setLeaveCountdown(formatCountdown(new Date(leaveData.leave_at)));
      }
    };
    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, [nextEvent, leaveData, today]);

  // ── Rendezvous share ────────────────────────────────────────────────────
  const shareRendezvous = () => {
    if (!rendezvousLocation || !rendezvousTime) {
      toast({ title: "Fill in both fields", description: "Enter a location and time to share." });
      return;
    }
    const text = `Let's meet at ${rendezvousLocation} at ${rendezvousTime} - ${trip.destination} trip`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  // ── Empty state ─────────────────────────────────────────────────────────
  if (todayEvents.length === 0 && tomorrowEvents.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="glass rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
            <Sun size={28} className="text-primary" />
          </div>
          <h3 className="font-heading text-xl mb-2">Nothing on today</h3>
          <p className="text-sm text-muted-foreground font-body max-w-sm mx-auto">
            Your day is free! Add events in the Events tab and they'll show up here with countdowns and outfit reminders.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* ── Leave Reminder Card ──────────────────────────────────────────── */}
      {leaveData?.leave_at && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Navigation size={18} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-base">Leave by {formatTimeShort(leaveData.leave_at)}</h3>
                <span className="text-xs font-body text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full">
                  in {leaveCountdown}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-body">
                {leaveData.duration_text} drive ({leaveData.distance_text})
                {leaveData.buffer_minutes > 15 && ` + ${leaveData.buffer_minutes} min airport buffer`}
              </p>
              {nextFlightOrMajorEvent && (
                <p className="text-xs text-muted-foreground/70 font-body mt-1">
                  For: {nextFlightOrMajorEvent.event_name} at {nextFlightOrMajorEvent.event_time?.slice(0, 5)}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Flight Status Cards ──────────────────────────────────────────── */}
      {flightEvents.map((flight) => (
        <motion.div
          key={flight.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <Plane size={16} className="text-primary" />
              <span className="font-heading text-base">{flight.flight_number || flight.event_name}</span>
            </div>
            <span className={`eyebrow px-2.5 py-1 rounded-full border ${getFlightStatusColour(flight.flight_status)}`}>
              {flight.flight_status || "scheduled"}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm font-body text-muted-foreground mb-3">
            {flight.event_time && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {flight.event_time.slice(0, 5)}
              </span>
            )}
            {flight.location && (
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {flight.location}
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-body">
            {flight.terminal && (
              <span className="bg-secondary px-2 py-1 rounded-lg">Terminal {flight.terminal}</span>
            )}
            {flight.gate && (
              <span className="bg-secondary px-2 py-1 rounded-lg">Gate {flight.gate}</span>
            )}
            {flight.baggage_claim && (
              <span className="bg-secondary px-2 py-1 rounded-lg">Baggage {flight.baggage_claim}</span>
            )}
          </div>

          {flight.flight_status === "delayed" && (
            <div className="flex items-center gap-2 mt-3 text-xs text-amber-400 font-body">
              <AlertTriangle size={12} />
              <span>This flight is delayed</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-xs font-body text-primary"
            onClick={() => refreshFlightStatus(flight)}
            disabled={pollingFlightId === flight.id}
          >
            {pollingFlightId === flight.id ? (
              <><Loader2 size={12} className="animate-spin" /> Checking...</>
            ) : (
              "Refresh status"
            )}
          </Button>

          {flight.flight_status_updated_at && (
            <p className="text-xs text-muted-foreground/50 font-body mt-1">
              Last checked {new Date(flight.flight_status_updated_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </motion.div>
      ))}

      {/* ── Next Up Countdown ────────────────────────────────────────────── */}
      {nextEvent && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CalendarClock size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-heading text-base">{nextEvent.event_name}</h3>
                <span className="text-xs font-body text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  in {countdown}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-body">
                {nextEvent.event_time && (
                  <span className="flex items-center gap-1"><Clock size={10} /> {nextEvent.event_time.slice(0, 5)}</span>
                )}
                {nextEvent.venue_name && (
                  <span className="flex items-center gap-1"><MapPin size={10} /> {nextEvent.venue_name}</span>
                )}
              </div>
              {nextEvent.dress_code && (
                <span className="inline-flex items-center gap-1 mt-2 eyebrow text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  <Shirt size={10} /> {nextEvent.dress_code}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Today's Full Schedule ────────────────────────────────────────── */}
      {nonFlightEvents.length > 0 && (
        <div className="space-y-2">
          <h3 className="eyebrow text-muted-foreground px-1">
            Today's Schedule
          </h3>
          {nonFlightEvents.map((event) => (
            <div
              key={event.id}
              className="glass rounded-xl p-4 flex items-center gap-3"
            >
              <div className="text-center min-w-[44px]">
                <p className="text-sm font-heading">{event.event_time?.slice(0, 5) || "TBD"}</p>
              </div>
              <div className="h-8 w-px bg-border" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body truncate">{event.event_name}</p>
                {event.venue_name && (
                  <p className="text-xs text-muted-foreground font-body truncate">{event.venue_name}</p>
                )}
              </div>
              {event.dress_code && (
                <span className="text-[9px] tracking-[0.15em] uppercase font-body text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  {event.dress_code}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Rendezvous Share ──────────────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5">
        <h3 className="eyebrow text-muted-foreground mb-3">
          Share Meeting Point
        </h3>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            placeholder="e.g. Hotel lobby"
            value={rendezvousLocation}
            onChange={(e) => setRendezvousLocation(e.target.value)}
            className="flex-1 bg-secondary rounded-lg px-3 py-2 text-sm font-body placeholder:text-muted-foreground/40 border-none outline-none"
          />
          <input
            type="time"
            value={rendezvousTime}
            onChange={(e) => setRendezvousTime(e.target.value)}
            className="bg-secondary rounded-lg px-3 py-2 text-sm font-body border-none outline-none w-[110px]"
          />
        </div>
        <Button variant="champagne" size="sm" className="w-full" onClick={shareRendezvous}>
          <Share2 size={14} /> Share via WhatsApp
        </Button>
      </div>

      {/* ── Tomorrow Preview ─────────────────────────────────────────────── */}
      {tomorrowEvents.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <button
            onClick={() => setTomorrowOpen(!tomorrowOpen)}
            className="w-full flex items-center justify-between p-5 text-left"
          >
            <h3 className="eyebrow text-muted-foreground">
              Tomorrow ({tomorrowEvents.length} event{tomorrowEvents.length > 1 ? "s" : ""})
            </h3>
            {tomorrowOpen ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
          </button>

          {tomorrowOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="px-5 pb-5 space-y-2"
            >
              {tomorrowEvents.map((event) => (
                <div key={event.id} className="flex items-center gap-3 py-2">
                  <p className="text-sm font-heading min-w-[44px] text-center">
                    {event.event_time?.slice(0, 5) || "TBD"}
                  </p>
                  <div className="h-6 w-px bg-border" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body truncate">{event.event_name}</p>
                    {event.venue_name && (
                      <p className="text-xs text-muted-foreground font-body truncate">{event.venue_name}</p>
                    )}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default TodayTab;
