import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Flight, TripEvent, WeatherData, ActivitySuggestion } from "@/types/database";
import {
  Calendar, MapPin, Plus, Pin, PinOff, Trash2, CloudSun, Droplets, Wind, RefreshCw, Sun, Cloud, CloudRain, Snowflake, CloudLightning, CloudFog,
  Plane, ExternalLink, FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

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

const BOOKING_SITES = [
  { name: "Google Flights", url: "https://www.google.com/flights" },
  { name: "Skyscanner", url: "https://www.skyscanner.net" },
  { name: "Kayak", url: "https://www.kayak.com" },
];

interface PlanTabProps {
  tripId: string;
  trip: {
    destination: string;
    country: string | null;
    trip_type: string | null;
    latitude?: number | null;
    longitude?: number | null;
    start_date: string;
    end_date: string;
  };
}

const PlanTab = ({ tripId, trip }: PlanTabProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [eventOpen, setEventOpen] = useState(false);
  const [flightOpen, setFlightOpen] = useState(false);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [flightAirline, setFlightAirline] = useState("");
  const [flightNumber, setFlightNumber] = useState("");
  const [depAirport, setDepAirport] = useState("");
  const [depCity, setDepCity] = useState("");
  const [depDatetime, setDepDatetime] = useState("");
  const [arrAirport, setArrAirport] = useState("");
  const [arrCity, setArrCity] = useState("");
  const [arrDatetime, setArrDatetime] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [flightNotes, setFlightNotes] = useState("");
  const [flightFile, setFlightFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshingWeather, setRefreshingWeather] = useState(false);

  const { data: flights = [] } = useQuery({
    queryKey: ["flights", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("flights").select("*").eq("trip_id", tripId).order("departure_datetime", { ascending: true });
      if (error) throw error;
      return data as Flight[];
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["trip-events", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_events").select("*").eq("trip_id", tripId).order("event_date", { ascending: true });
      if (error) throw error;
      return data as TripEvent[];
    },
  });

  const { data: weather = [] } = useQuery({
    queryKey: ["weather", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("weather_data").select("*").eq("trip_id", tripId).order("date", { ascending: true });
      if (error) throw error;
      return data as WeatherData[];
    },
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activity-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_suggestions").select("*").eq("trip_id", tripId).order("created_at", { ascending: true });
      if (error) throw error;
      return data as ActivitySuggestion[];
    },
  });

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

  const addEvent = async () => {
    if (!eventName) return;
    const { error } = await supabase.from("trip_events").insert({
      trip_id: tripId,
      event_name: eventName,
      event_type: eventType || null,
      event_date: eventDate || null,
      location: eventLocation || null,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
    setEventOpen(false);
    setEventName(""); setEventType(""); setEventDate(""); setEventLocation("");
  };

  const addFlight = async () => {
    setUploading(true);
    let documentUrl: string | null = null;
    if (flightFile && user) {
      try {
        const ext = flightFile.name.split(".").pop();
        const path = `${user.id}/${tripId}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("board-images").upload(path, flightFile, { upsert: false });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("board-images").getPublicUrl(path);
          documentUrl = urlData.publicUrl;
        }
      } catch {
        // Continue without document
      }
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
      booking_url: bookingUrl || null,
      document_url: documentUrl,
      notes: flightNotes || null,
      order_index: flights.length,
    });
    setUploading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["flights", tripId] });
    setFlightOpen(false);
    setFlightAirline(""); setFlightNumber(""); setDepAirport(""); setDepCity(""); setDepDatetime("");
    setArrAirport(""); setArrCity(""); setArrDatetime(""); setBookingUrl(""); setFlightNotes(""); setFlightFile(null);
    toast({ title: "Flight added" });
  };

  const deleteFlight = async (id: string) => {
    await supabase.from("flights").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["flights", tripId] });
  };

  const togglePin = async (event: TripEvent) => {
    await supabase.from("trip_events").update({ is_pinned: !event.is_pinned }).eq("id", event.id);
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("trip_events").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
  };

  const addActivityToEvents = async (activity: ActivitySuggestion) => {
    const existing = events.find((e) => e.event_name === activity.name);
    if (existing) {
      toast({ title: "Already added", description: `${activity.name} is in your plan.` });
      return;
    }
    const { error } = await supabase.from("trip_events").insert({
      trip_id: tripId,
      event_name: activity.name,
      event_type: activity.category || null,
      location: activity.location || null,
      notes: activity.booking_url ? `Book: ${activity.booking_url}` : (activity.source_url || null),
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
      toast({ title: "Added to plan", description: activity.name });
    }
  };

  const pinnedEvents = events.filter((e) => e.is_pinned);
  const otherEvents = events.filter((e) => !e.is_pinned);
  const isInEvents = (name: string) => events.some((e) => e.event_name === name);

  const formatFlightRoute = (f: Flight) => {
    const dep = f.departure_airport || f.departure_city || "?";
    const arr = f.arrival_airport || f.arrival_city || "?";
    return `${dep} → ${arr}`;
  };

  const formatFlightTime = (dt: string | null) =>
    dt ? new Date(dt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 md:space-y-12">
      {/* Flights */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Plane size={14} className="text-primary" /> Flights
          </h2>
          <Dialog open={flightOpen} onOpenChange={setFlightOpen}>
            <DialogTrigger asChild>
              <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Flight</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-heading">Add Flight</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <Input value={flightAirline} onChange={(e) => setFlightAirline(e.target.value)} placeholder="Airline" className="bg-secondary border-border" />
                  <Input value={flightNumber} onChange={(e) => setFlightNumber(e.target.value)} placeholder="Flight number" className="bg-secondary border-border" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-body">Departure</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={depAirport} onChange={(e) => setDepAirport(e.target.value)} placeholder="Airport (e.g. JFK)" className="bg-secondary border-border" />
                    <Input value={depCity} onChange={(e) => setDepCity(e.target.value)} placeholder="City" className="bg-secondary border-border" />
                    <Input type="datetime-local" value={depDatetime} onChange={(e) => setDepDatetime(e.target.value)} className="bg-secondary border-border col-span-2" />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-body">Arrival</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={arrAirport} onChange={(e) => setArrAirport(e.target.value)} placeholder="Airport (e.g. CDG)" className="bg-secondary border-border" />
                    <Input value={arrCity} onChange={(e) => setArrCity(e.target.value)} placeholder="City" className="bg-secondary border-border" />
                    <Input type="datetime-local" value={arrDatetime} onChange={(e) => setArrDatetime(e.target.value)} className="bg-secondary border-border col-span-2" />
                  </div>
                </div>
                <Input value={bookingUrl} onChange={(e) => setBookingUrl(e.target.value)} placeholder="Booking link (optional)" className="bg-secondary border-border" />
                <div
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border-2 border-dashed border-border bg-secondary/50 p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <FileText size={24} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground font-body">{flightFile ? flightFile.name : "Upload confirmation or boarding pass (optional)"}</p>
                </div>
                <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setFlightFile(e.target.files?.[0] || null)} />
                <Input value={flightNotes} onChange={(e) => setFlightNotes(e.target.value)} placeholder="Notes" className="bg-secondary border-border" />
                <Button variant="champagne" onClick={addFlight} className="w-full" disabled={uploading}>
                  {uploading ? "Adding…" : "Add Flight"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {flights.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <Plane size={32} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-body text-sm mb-4">Add your flights for this trip. Include booking links or upload confirmations.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {BOOKING_SITES.map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-body hover:underline flex items-center gap-1">
                  <ExternalLink size={12} /> {s.name}
                </a>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {flights.map((f) => (
              <div key={f.id} className="glass-card rounded-xl p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:shadow-champagne transition-all duration-300">
                <div className="min-w-0">
                  <p className="font-heading text-base">{formatFlightRoute(f)}</p>
                  <p className="text-xs text-muted-foreground font-body mt-1">
                    {f.airline && f.flight_number ? `${f.airline} ${f.flight_number}` : f.airline || "Flight"}
                  </p>
                  <p className="text-xs text-muted-foreground font-body mt-0.5">
                    {formatFlightTime(f.departure_datetime)} → {formatFlightTime(f.arrival_datetime)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.booking_url && (
                    <a href={f.booking_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-body hover:underline flex items-center gap-1">
                      <ExternalLink size={12} /> Book
                    </a>
                  )}
                  {f.document_url && (
                    <a href={f.document_url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground font-body hover:text-foreground flex items-center gap-1">
                      <FileText size={12} /> View
                    </a>
                  )}
                  <button onClick={() => deleteFlight(f.id)} className="p-2 rounded-lg hover:bg-secondary">
                    <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Weather */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <CloudSun size={14} className="text-primary" /> Weather
          </h2>
          <Button variant="champagne-outline" size="sm" onClick={refreshWeather} disabled={refreshingWeather}>
            <RefreshCw size={14} className={refreshingWeather ? "animate-spin" : ""} />
            {refreshingWeather ? "Updating…" : "Refresh"}
          </Button>
        </div>
        {weather.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-muted-foreground font-body text-sm">
              {trip?.latitude ? "No weather data yet. Click Refresh to fetch forecast." : "Add coordinates to your destination to see weather."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {weather.slice(0, 14).map((w) => {
              const Icon = getWeatherIcon(w.weather_code || 0);
              return (
                <div key={w.id} className="glass-card rounded-xl p-3 md:p-4 text-center hover:shadow-champagne transition-all duration-300">
                  <p className="text-xs text-muted-foreground font-body mb-2">{new Date(w.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric" })}</p>
                  <Icon size={24} className="mx-auto text-primary mb-2" />
                  <div className="flex justify-center gap-1 text-sm font-body">
                    <span className="text-foreground font-medium">{Math.round(w.temperature_high || 0)}°</span>
                    <span className="text-muted-foreground">{Math.round(w.temperature_low || 0)}°</span>
                  </div>
                  <div className="flex justify-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    <Droplets size={10} className="text-blue-400" />
                    <span>{w.rain_probability || 0}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pinned Events */}
      {pinnedEvents.length > 0 && (
        <section>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 font-body flex items-center gap-2">
            <Pin size={14} className="text-primary" /> Pinned
          </h2>
          <div className="space-y-3">
            {pinnedEvents.map((e) => (
              <EventRow key={e.id} event={e} onTogglePin={togglePin} onDelete={deleteEvent} />
            ))}
          </div>
        </section>
      )}

      {/* Events & Plan */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Calendar size={14} className="text-primary" /> Plans & Events
          </h2>
          <Dialog open={eventOpen} onOpenChange={setEventOpen}>
            <DialogTrigger asChild>
              <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Event</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-heading">Add Event</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Event name" className="bg-secondary border-border h-11" />
                <Input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="Type (dinner, show, etc.)" className="bg-secondary border-border h-11" />
                <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="bg-secondary border-border h-11" />
                <Input value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} placeholder="Location" className="bg-secondary border-border h-11" />
                <Button variant="champagne" onClick={addEvent} className="w-full">Add</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {otherEvents.length === 0 && pinnedEvents.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-body text-sm">Add dinners, shows, or experiences. Discover curated options below.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {otherEvents.map((e) => (
              <EventRow key={e.id} event={e} onTogglePin={togglePin} onDelete={deleteEvent} />
            ))}
          </div>
        )}
      </section>

      {/* Discover experiences */}
      {activities.length > 0 && (
        <section>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 font-body flex items-center gap-2">
            <MapPin size={14} className="text-primary" /> Add to Plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activities.slice(0, 6).map((a) => (
              <div key={a.id} className="glass-card rounded-xl overflow-hidden flex gap-4 p-4 hover:shadow-champagne transition-all">
                <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-secondary">
                  <ImageWithFallback src={a.image_url} alt={a.name} fallbackIcon={MapPin} aspectClass="w-full h-full" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading text-sm truncate">{a.name}</h3>
                  <p className="text-xs text-muted-foreground font-body truncate">{a.location || a.category}</p>
                  <Button
                    variant="champagne-outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => addActivityToEvents(a)}
                    disabled={isInEvents(a.name)}
                  >
                    {isInEvents(a.name) ? "Added" : "Add to plan"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
};

const EventRow = ({ event, onTogglePin, onDelete }: { event: TripEvent; onTogglePin: (e: TripEvent) => void; onDelete: (id: string) => void }) => (
  <div className="glass-card rounded-xl p-4 md:p-5 flex items-center justify-between hover:shadow-champagne transition-all duration-300">
    <div className="min-w-0 flex-1">
      <h3 className="font-heading text-base truncate">{event.event_name}</h3>
      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground font-body">
        {event.event_date && <span>{new Date(event.event_date).toLocaleDateString("en-GB", { month: "short", day: "numeric" })}</span>}
        {event.location && <span className="flex items-center gap-1 truncate"><MapPin size={10} />{event.location}</span>}
      </div>
    </div>
    <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
      {event.event_type && <span className="hidden sm:inline text-xs tracking-[0.15em] uppercase text-primary font-body bg-secondary px-3 py-1 rounded-full">{event.event_type}</span>}
      <button onClick={() => onTogglePin(event)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
        {event.is_pinned ? <PinOff size={14} className="text-primary" /> : <Pin size={14} className="text-muted-foreground" />}
      </button>
      <button onClick={() => onDelete(event.id)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
        <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  </div>
);

export default PlanTab;
