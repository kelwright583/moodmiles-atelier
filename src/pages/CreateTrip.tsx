import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Plane } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import PlacesAutocomplete from "@/components/trip/PlacesAutocomplete";

const tripTypes = ["Leisure", "Business", "Fashion Week", "Ski", "Yacht", "Wedding", "City Break", "Beach Escape"];

const CreateTrip = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [accommodation, setAccommodation] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePlaceSelect = (place: { city: string; country: string; lat: number; lng: number }) => {
    setDestination(place.city);
    setCountry(place.country);
    setLatitude(place.lat);
    setLongitude(place.lng);
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
          trip_type: selectedType || null,
          accommodation: accommodation || null,
          latitude,
          longitude,
        } as any)
        .select()
        .single();
      if (error) throw error;

      // Fetch weather in background if we have coordinates
      if (latitude && longitude) {
        supabase.functions.invoke("fetch-weather", {
          body: { trip_id: data.id, latitude, longitude, start_date: startDate, end_date: endDate },
        }).catch(console.error);
      }

      queryClient.invalidateQueries({ queryKey: ["trips"] });
      navigate(`/trip/${data.id}`);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 md:pt-28 pb-16 md:pb-20 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 md:mb-12">
            <p className="text-sm tracking-[0.3em] uppercase text-primary mb-2 font-body">New Journey</p>
            <h1 className="text-3xl md:text-5xl font-heading">
              Where are you <span className="text-gradient-champagne italic">going?</span>
            </h1>
          </motion.div>

          <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">City</label>
                <PlacesAutocomplete value={destination} onChange={setDestination} onSelect={handlePlaceSelect} />
              </div>
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Country</label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="France" className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body" />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Departure</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-secondary border-border h-12 text-foreground font-body" required />
              </div>
              <div>
                <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Return</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-secondary border-border h-12 text-foreground font-body" required />
              </div>
            </div>
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-3 block font-body">Type of Trip</label>
              <div className="flex flex-wrap gap-2">
                {tripTypes.map((type) => (
                  <button key={type} type="button" onClick={() => setSelectedType(type)} className={`px-4 py-2 rounded-full text-sm font-body transition-all duration-300 ${selectedType === type ? "bg-gradient-champagne text-primary-foreground shadow-champagne" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Accommodation <span className="text-muted-foreground/50">(optional)</span></label>
              <Input value={accommodation} onChange={(e) => setAccommodation(e.target.value)} placeholder="Hotel, villa, resort..." className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body" />
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
