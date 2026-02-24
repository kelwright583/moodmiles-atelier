import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Prediction {
  description: string;
  place_id: string;
  city: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
}

interface PlacesAutocompleteProps {
  onSelect: (place: { city: string; country: string; lat: number; lng: number }) => void;
  value: string;
  onChange: (val: string) => void;
}

const PlacesAutocomplete = ({ onSelect, value, onChange }: PlacesAutocompleteProps) => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("google-places", {
          body: { input: value },
        });
        if (error) throw error;
        setPredictions(data.predictions || []);
        setShowDropdown(true);
      } catch (err) {
        console.error("Places error:", err);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [value]);

  const handleSelect = (p: Prediction) => {
    onChange(p.city || p.description);
    setShowDropdown(false);
    if (p.city && p.country && p.lat && p.lng) {
      onSelect({ city: p.city, country: p.country, lat: p.lat, lng: p.lng });
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search a city..."
        className="bg-secondary border-border h-12 text-foreground placeholder:text-muted-foreground font-body"
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors text-sm font-body"
            >
              <MapPin size={14} className="text-primary shrink-0" />
              <span className="text-foreground truncate">{p.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default PlacesAutocomplete;
