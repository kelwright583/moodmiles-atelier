import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface VenuePrediction {
  description: string;
  place_id: string;
}

interface VenueAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  onSelect: (venue: { name: string; address: string; place_id: string }) => void;
  placeholder?: string;
  className?: string;
}

const VenueAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Search venue or restaurant...",
  className = "",
}: VenueAutocompleteProps) => {
  const [predictions, setPredictions] = useState<VenuePrediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

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
    if (justSelectedRef.current) { justSelectedRef.current = false; return; }
    if (value.length < 2) { setPredictions([]); setShowDropdown(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("google-places", { body: { input: value } });
        setPredictions(data?.predictions || []);
        setShowDropdown(true);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [value]);

  const handleSelect = (p: VenuePrediction) => {
    justSelectedRef.current = true;
    const parts = p.description.split(", ");
    const name = parts[0];
    const address = p.description;
    onChange(name);
    setPredictions([]);
    setShowDropdown(false);
    onSelect({ name, address, place_id: p.place_id });
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body pr-8 ${className}`}
        autoComplete="off"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <Loader2 size={14} className="animate-spin text-muted-foreground" />
        </div>
      )}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {predictions.map((p) => (
            <button
              key={p.place_id}
              type="button"
              onClick={() => handleSelect(p)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors text-sm font-body"
            >
              <MapPin size={13} className="text-primary shrink-0" />
              <span className="text-foreground truncate">{p.description}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VenueAutocomplete;
