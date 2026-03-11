import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Trip } from "@/types/database";
import PlacesAutocomplete from "./PlacesAutocomplete";

const tripTypes = ["Leisure", "Business", "Fashion Week", "Ski", "Yacht", "Wedding", "City Break", "Beach Escape", "Family"];

interface TripEditDialogProps {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TripEditDialog = ({ trip, open, onOpenChange }: TripEditDialogProps) => {
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState(trip.destination);
  const [country, setCountry] = useState(trip.country || "");
  const [latitude, setLatitude] = useState<number | null>(trip.latitude);
  const [longitude, setLongitude] = useState<number | null>(trip.longitude);
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [selectedType, setSelectedType] = useState(trip.trip_type || "");
  const [accommodation, setAccommodation] = useState(trip.accommodation || "");
  const [originCity, setOriginCity] = useState(trip.origin_city || "");
  const [originCountry, setOriginCountry] = useState(trip.origin_country || "");

  const handleOriginSelect = (place: { city: string; country: string; lat: number; lng: number }) => {
    setOriginCity(place.city);
    setOriginCountry(place.country);
  };
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDestination(trip.destination);
    setCountry(trip.country || "");
    setLatitude(trip.latitude);
    setLongitude(trip.longitude);
    setStartDate(trip.start_date);
    setEndDate(trip.end_date);
    setSelectedType(trip.trip_type || "");
    setAccommodation(trip.accommodation || "");
    setOriginCity(trip.origin_city || "");
    setOriginCountry(trip.origin_country || "");
  }, [trip, open]);

  const handlePlaceSelect = (place: { city: string; country: string; lat: number; lng: number }) => {
    setDestination(place.city);
    setCountry(place.country);
    setLatitude(place.lat);
    setLongitude(place.lng);
  };

  const handleSave = async () => {
    if (!destination || !startDate || !endDate) {
      toast({ title: "Missing fields", description: "Please fill in destination and dates.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({
          destination,
          country: country || null,
          start_date: startDate,
          end_date: endDate,
          trip_type: selectedType || null,
          accommodation: accommodation || null,
          latitude,
          longitude,
          origin_city: originCity || null,
          origin_country: originCountry || null,
        })
        .eq("id", trip.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["trip", trip.id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Trip updated" });
      onOpenChange(false);
      // Refresh destination image if destination changed
      if (destination !== trip.destination || country !== (trip.country || "")) {
        supabase.functions.invoke("fetch-destination-image", {
          body: { trip_id: trip.id, destination, country: country || null },
        }).then(({ data: imgData }) => {
          if (imgData?.image_url) {
            queryClient.invalidateQueries({ queryKey: ["trips"] });
            queryClient.invalidateQueries({ queryKey: ["trip", trip.id] });
          }
        }).catch(console.error);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Edit Journey</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          {/* Origin */}
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-primary mb-2 font-body">Travelling From</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block font-body">City</label>
                <PlacesAutocomplete value={originCity} onChange={setOriginCity} onSelect={handleOriginSelect} />
              </div>
              <div>
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block font-body">Country</label>
                <Input value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} placeholder="South Africa" className="bg-secondary border-border h-11 text-foreground font-body" />
              </div>
            </div>
          </div>
          {/* Destination */}
          <div>
            <p className="text-xs tracking-[0.2em] uppercase text-primary mb-2 font-body">Destination</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block font-body">City</label>
                <PlacesAutocomplete value={destination} onChange={setDestination} onSelect={handlePlaceSelect} />
              </div>
              <div>
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block font-body">Country</label>
                <Input value={country} onChange={(e) => setCountry(e.target.value)} className="bg-secondary border-border h-11 text-foreground font-body" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block font-body">Departure</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-secondary border-border h-11 text-foreground font-body" />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block font-body">Return</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-secondary border-border h-11 text-foreground font-body" />
            </div>
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block font-body">Type</label>
            <div className="flex flex-wrap gap-2">
              {tripTypes.map((type) => (
                <button key={type} type="button" onClick={() => setSelectedType(type)} className={`px-3 py-1.5 rounded-full text-xs font-body transition-all duration-300 ${selectedType === type ? "bg-gradient-champagne text-primary-foreground shadow-champagne" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-1.5 block font-body">Accommodation</label>
            <Input value={accommodation} onChange={(e) => setAccommodation(e.target.value)} className="bg-secondary border-border h-11 text-foreground font-body" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-body">Cancel</Button>
            <Button variant="champagne" onClick={handleSave} disabled={saving} className="font-body">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TripEditDialog;
