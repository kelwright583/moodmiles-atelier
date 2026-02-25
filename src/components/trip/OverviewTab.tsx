import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TripEvent, WeatherData } from "@/types/database";
import { Calendar, MapPin, Plus, Pin, PinOff, Trash2, CloudSun, Droplets, Wind, RefreshCw, Sun, Cloud, CloudRain, Snowflake, CloudLightning, CloudFog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

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

const OverviewTab = ({ tripId, trip }: { tripId: string; trip?: { latitude?: number; longitude?: number; start_date: string; end_date: string } }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [refreshingWeather, setRefreshingWeather] = useState(false);

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
    if (!name) return;
    const { error } = await supabase.from("trip_events").insert({ trip_id: tripId, event_name: name, event_type: type || null, event_date: date || null, location: location || null });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
    setOpen(false);
    setName(""); setType(""); setDate(""); setLocation("");
  };

  const togglePin = async (event: TripEvent) => {
    await supabase.from("trip_events").update({ is_pinned: !event.is_pinned }).eq("id", event.id);
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
  };

  const deleteEvent = async (id: string) => {
    await supabase.from("trip_events").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
  };

  const pinnedEvents = events.filter((e) => e.is_pinned);
  const otherEvents = events.filter((e) => !e.is_pinned);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 md:space-y-12">
      {/* Weather Section */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <CloudSun size={14} className="text-primary" /> Weather Forecast
          </h2>
          <Button variant="champagne-outline" size="sm" onClick={refreshWeather} disabled={refreshingWeather}>
            <RefreshCw size={14} className={refreshingWeather ? "animate-spin" : ""} />
            {refreshingWeather ? "Updating..." : "Refresh"}
          </Button>
        </div>
        {weather.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-muted-foreground font-body text-sm">
              {trip?.latitude ? "No weather data yet. Click Refresh to fetch forecast." : "Add coordinates to your destination to see weather data."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {weather.slice(0, 14).map((w) => {
              const Icon = getWeatherIcon(w.weather_code || 0);
              return (
                <div key={w.id} className="glass-card rounded-xl p-3 md:p-4 text-center hover:shadow-champagne transition-all duration-300">
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

      {/* Pinned Events */}
      {pinnedEvents.length > 0 && (
        <section>
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground mb-6 font-body flex items-center gap-2">
            <Pin size={14} className="text-primary" /> Pinned Events
          </h2>
          <div className="space-y-3">
            {pinnedEvents.map((e) => (
              <EventRow key={e.id} event={e} onTogglePin={togglePin} onDelete={deleteEvent} />
            ))}
          </div>
        </section>
      )}

      {/* All Events */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <Calendar size={14} className="text-primary" /> Events
          </h2>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Event</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-heading">Add Event</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Event name" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
                <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type (Fashion, Cultural, etc.)" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-secondary border-border h-11 text-foreground font-body" />
                <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Location" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
                <Button variant="champagne" onClick={addEvent} className="w-full">Add Event</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        {otherEvents.length === 0 && pinnedEvents.length === 0 ? (
          <div className="glass-card rounded-xl p-8 text-center">
            <p className="text-muted-foreground font-body text-sm">Add dinners, shows, or special occasions — we&apos;ll suggest outfits for each.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {otherEvents.map((e) => (
              <EventRow key={e.id} event={e} onTogglePin={togglePin} onDelete={deleteEvent} />
            ))}
          </div>
        )}
      </section>
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

export default OverviewTab;
