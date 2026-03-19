import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plane, Crown, Sparkles } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PlacesAutocomplete from "@/components/trip/PlacesAutocomplete";

const tripTypes = ["Leisure", "Business", "Fashion Week", "Ski", "Yacht", "Wedding", "City Break", "Beach Escape", "Family"];

const CreateTrip = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const destinationParam = searchParams.get("destination");
  useEffect(() => {
    if (destinationParam) setDestination(destinationParam);
  }, [destinationParam]);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: freeTripsData } = useQuery({
    queryKey: ["user-free-trips", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_free_trips")
        .select("full_trips_used")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const freeTripsUsed = freeTripsData?.full_trips_used ?? 0;
  const needsUpgrade = profile?.subscription_tier === "free" && freeTripsUsed >= 1;

  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [customType, setCustomType] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [originCountry, setOriginCountry] = useState("");
  const [originLat, setOriginLat] = useState<number | null>(null);
  const [originLng, setOriginLng] = useState<number | null>(null);
  const [showOrigin, setShowOrigin] = useState(false);
  const [showAccommodation, setShowAccommodation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handlePlaceSelect = (place: { city: string; country: string; lat: number; lng: number }) => {
    setDestination(place.city);
    setCountry(place.country);
    setLatitude(place.lat);
    setLongitude(place.lng);
  };

  const handleOriginSelect = (place: { city: string; country: string; lat: number; lng: number }) => {
    setOriginCity(place.city);
    setOriginCountry(place.country);
    setOriginLat(place.lat);
    setOriginLng(place.lng);
  };

  const handleUpgradeToLuxe = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !startDate || !endDate) {
      toast({ title: "Missing fields", description: "Please fill in destination and dates.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user!.id,
          destination,
          country: country || null,
          start_date: startDate,
          end_date: endDate,
          trip_type: (selectedType === "Other" ? customType : selectedType) || null,
          accommodation: accommodation || null,
          latitude,
          longitude,
          origin_city: originCity || null,
          origin_country: originCountry || null,
          origin_latitude: originLat,
          origin_longitude: originLng,
        })
        .select()
        .single();
      if (error) throw error;

      // Record free trip usage for free tier users
      if (profile?.subscription_tier === "free") {
        await supabase.from("user_free_trips").upsert(
          { user_id: user!.id, full_trips_used: freeTripsUsed + 1 },
          { onConflict: "user_id" },
        );
        queryClient.invalidateQueries({ queryKey: ["user-free-trips", user?.id] });
      }

      if (latitude && longitude) {
        supabase.functions.invoke("fetch-weather", {
          body: { trip_id: data.id, latitude, longitude, start_date: startDate, end_date: endDate },
        }).catch(console.error);
      }

      supabase.functions.invoke("fetch-destination-image", {
        body: { trip_id: data.id, destination, country: country || null },
      }).then(({ data: imgData }) => {
        if (imgData?.image_url) queryClient.invalidateQueries({ queryKey: ["trips"] });
      }).catch(console.error);

      queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/trip/${data.id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (needsUpgrade) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 md:pt-28 pb-16 md:pb-20 px-4 md:px-6">
          <div className="max-w-xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-sm p-12">
              <div className="w-16 h-16 rounded-sm bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6">
                <Crown size={28} className="text-gold" />
              </div>
              <p className="eyebrow mb-3">Concierge Luxe</p>
              <h1 className="text-4xl font-heading font-normal mb-4 leading-tight">
                Your next adventure<br />awaits
              </h1>
              <p className="text-sm font-body font-light text-parchment-dim mb-8 leading-relaxed">
                You've planned your first trip with Concierge Styled. Ready to unlock unlimited trips, group collaboration, and your personal style feed? Join Luxe from $14.99/month.
              </p>
              <div className="flex flex-col gap-3">
                <Button variant="champagne" size="xl" onClick={handleUpgradeToLuxe} disabled={checkoutLoading} className="w-full">
                  <Sparkles size={16} />
                  {checkoutLoading ? "Opening checkout…" : "Join Concierge Luxe"}
                  <ArrowRight size={16} />
                </Button>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="text-sm text-muted-foreground font-body hover:text-foreground transition-colors py-2"
                >
                  Maybe later
                </button>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 md:pt-28 pb-16 md:pb-20 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 md:mb-12">
            <p className="eyebrow mb-2">New Journey</p>
            <h1 className="text-4xl font-heading font-normal">
              Where are you <em className="font-heading italic">going?</em>
            </h1>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            {/* Travelling From */}
            <div>
              {showOrigin ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <p className="eyebrow">Travelling From</p>
                    <button type="button" onClick={() => { setShowOrigin(false); setOriginCity(""); setOriginCountry(""); setOriginLat(null); setOriginLng(null); }} className="text-xs text-parchment-faint font-body hover:text-parchment-dim">Skip</button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="eyebrow mb-2 block">City</label>
                      <PlacesAutocomplete value={originCity} onChange={setOriginCity} onSelect={handleOriginSelect} />
                    </div>
                    <div>
                      <label className="eyebrow mb-2 block">Country</label>
                      <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="South Africa" className="bg-ink-raised border-ink-border rounded-sm font-body text-sm text-parchment focus:border-gold/50 h-12 placeholder:text-parchment-faint" />
                    </div>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => setShowOrigin(true)} className="text-xs text-muted-foreground font-body hover:text-primary transition-colors">
                  + Add travelling from (optional)
                </button>
              )}
            </div>

            {/* Destination */}
            <div>
              <p className="eyebrow mb-3">Destination</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="eyebrow mb-2 block">City</label>
                  <PlacesAutocomplete value={destination} onChange={setDestination} onSelect={handlePlaceSelect} />
                </div>
                <div>
                  <label className="eyebrow mb-2 block">Country</label>
                  <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" className="bg-ink-raised border-ink-border rounded-sm font-body text-sm text-parchment focus:border-gold/50 h-12 placeholder:text-parchment-faint" />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="eyebrow mb-2 block">Departure</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-ink-raised border-ink-border rounded-sm font-body text-sm text-parchment focus:border-gold/50 h-12" required />
              </div>
              <div>
                <label className="eyebrow mb-2 block">Return</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-ink-raised border-ink-border rounded-sm font-body text-sm text-parchment focus:border-gold/50 h-12" required />
              </div>
            </div>

            <div>
              <label className="eyebrow mb-3 block">Type of Trip</label>
              <div className="flex flex-wrap gap-2">
                {[...tripTypes, "Other"].map((type) => (
                  <button key={type} type="button" onClick={() => setSelectedType(type)} className={`px-4 py-2 text-xs font-body font-medium tracking-[0.1em] uppercase border rounded-sm transition-all duration-200 ${
                    selectedType === type
                      ? "border-gold text-gold bg-gold/10"
                      : "border-ink-border text-parchment-faint hover:border-gold/40 hover:text-parchment-dim"
                  }`}>
                    {type}
                  </button>
                ))}
              </div>
              {selectedType === "Other" && (
                <Input value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Describe your trip type..." className="bg-ink-raised border-ink-border rounded-sm font-body text-sm text-parchment focus:border-gold/50 h-12 placeholder:text-parchment-faint mt-3" />
              )}
            </div>

            <div>
              {showAccommodation ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <label className="eyebrow">Accommodation</label>
                    <button type="button" onClick={() => { setShowAccommodation(false); setAccommodation(""); }} className="text-xs text-parchment-faint font-body hover:text-parchment-dim">Skip</button>
                  </div>
                  <Input value={accommodation} onChange={(e) => setAccommodation(e.target.value)} placeholder="Hotel, villa, resort..." className="bg-ink-raised border-ink-border rounded-sm font-body text-sm text-parchment focus:border-gold/50 h-12 placeholder:text-parchment-faint" />
                </>
              ) : (
                <button type="button" onClick={() => setShowAccommodation(true)} className="text-xs text-parchment-faint font-body hover:text-gold transition-colors">
                  + Add accommodation (optional)
                </button>
              )}
            </div>

            <div className="pt-4">
              <Button variant="champagne" size="xl" type="submit" className="w-full md:w-auto" disabled={loading}>
                <Plane size={18} />
                {loading ? "Creating..." : "Generate Trip Intelligence"}
                <ArrowRight size={18} />
              </Button>
            </div>
          </motion.form>
        </div>
      </main>
    </div>
  );
};

export default CreateTrip;
