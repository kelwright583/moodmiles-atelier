import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PackingItem } from "@/types/database";
import { Briefcase, Plus, Trash2, Check, Minus, Sparkles, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

const packingCategories = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Underwear", "Sleepwear", "Swimwear", "Toiletries", "Tech", "Documents", "Flight Comfort", "Layering"];

interface PackingTabProps {
  tripId: string;
  trip?: {
    destination: string;
    country: string | null;
    origin_city: string | null;
    origin_country: string | null;
    start_date: string;
    end_date: string;
    trip_type: string | null;
  };
}

const PackingTab = ({ tripId, trip }: PackingTabProps) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const { data: items = [] } = useQuery({
    queryKey: ["packing-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("packing_items").select("*").eq("trip_id", tripId).order("order_index");
      if (error) throw error;
      return data as PackingItem[];
    },
  });

  const generateSuggestions = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-packing", {
        body: { trip_id: tripId },
      });
      if (error) {
        const msg = (data as { error?: string })?.error || error.message;
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      queryClient.invalidateQueries({ queryKey: ["packing-items", tripId] });
      toast({ title: "Packing list generated", description: `${(data as { count?: number })?.count ?? 0} smart suggestions based on your trip context.` });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Smart Suggest failed. Check that JWT verification is off for suggest-packing in Supabase Dashboard.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const addItem = async () => {
    if (!name) return;
    const { error } = await supabase.from("packing_items").insert({ trip_id: tripId, name, category: category || null, quantity, order_index: items.length });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["packing-items", tripId] });
    setOpen(false);
    setName(""); setCategory(""); setQuantity(1);
  };

  const togglePacked = async (item: PackingItem) => {
    await supabase.from("packing_items").update({ is_packed: !item.is_packed }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["packing-items", tripId] });
  };

  const updateQuantity = async (item: PackingItem, delta: number) => {
    const newQty = Math.max(1, item.quantity + delta);
    await supabase.from("packing_items").update({ quantity: newQty }).eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["packing-items", tripId] });
  };

  const deleteItem = async (id: string) => {
    await supabase.from("packing_items").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["packing-items", tripId] });
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const packedCount = items.filter((i) => i.is_packed).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? (packedCount / totalCount) * 100 : 0;
  const hasCelebratedRef = useRef(false);

  // Celebrate when 100% packed
  useEffect(() => {
    if (totalCount > 0 && progress >= 100 && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      toast({
        title: "All packed!",
        description: "You're ready to arrive impeccably.",
      });
    }
    if (progress < 100) hasCelebratedRef.current = false;
  }, [progress, totalCount]);

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  // Sort categories: Documents first, then alphabetically
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    if (a === "Documents") return -1;
    if (b === "Documents") return 1;
    if (a === "Flight Comfort") return -1;
    if (b === "Flight Comfort") return 1;
    return a.localeCompare(b);
  });

  // Calculate days
  const days = trip ? Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
          <Briefcase size={14} className="text-primary" /> Packing List
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="champagne-outline" size="sm" onClick={generateSuggestions} disabled={generating}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? "Generating…" : "Smart Suggest"}
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle className="font-heading">Add Packing Item</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item name" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {packingCategories.map((c) => (
                      <button key={c} type="button" onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${category === c ? "bg-gradient-champagne text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2 block font-body">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Minus size={14} /></button>
                    <span className="text-lg font-heading w-8 text-center">{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center"><Plus size={14} /></button>
                  </div>
                </div>
                <Button variant="champagne" onClick={addItem} className="w-full">Add to Packing List</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Trip context banner */}
      {trip && (
        <div className="glass-card rounded-xl p-4 mb-6 flex flex-wrap gap-x-6 gap-y-2 text-xs font-body text-muted-foreground">
          {trip.origin_city && (
            <span>From: <span className="text-foreground">{trip.origin_city}{trip.origin_country ? `, ${trip.origin_country}` : ""}</span></span>
          )}
          <span>To: <span className="text-foreground">{trip.destination}{trip.country ? `, ${trip.country}` : ""}</span></span>
          <span>Duration: <span className="text-foreground">{days} days</span></span>
          {trip.trip_type && <span>Type: <span className="text-foreground">{trip.trip_type}</span></span>}
        </div>
      )}

      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-body text-muted-foreground">{packedCount} of {totalCount} packed</span>
            <span className={`text-xs font-body ${progress >= 100 ? "text-primary font-medium" : "text-primary"}`}>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className={`h-2 transition-all duration-300 ${progress >= 100 ? "shadow-champagne ring-1 ring-primary/20" : ""}`} />
        </div>
      )}

      {totalCount === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Sparkles size={32} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-body text-sm mb-4">
            One tap and we&apos;ll build a smart list from your weather, events, and trip type — so you never overpack or forget the essentials.
          </p>
          <Button variant="champagne" onClick={generateSuggestions} disabled={generating}>
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {generating ? "Generating…" : "Generate Smart Packing List"}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((cat) => {
            const catItems = grouped[cat];
            const catPacked = catItems.filter(i => i.is_packed).length;
            const isCollapsed = collapsedCategories.has(cat);

            return (
              <div key={cat}>
                <button onClick={() => toggleCategory(cat)} className="flex items-center gap-2 w-full text-left mb-3 group">
                  {isCollapsed ? <ChevronRight size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                  <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body">{cat}</h3>
                  <span className="text-xs text-primary font-body ml-auto">{catPacked}/{catItems.length}</span>
                </button>
                <AnimatePresence>
                  {!isCollapsed && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden">
                      {catItems.map((item) => (
                        <div key={item.id} className={`glass-card rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-300 ${item.is_packed ? "opacity-50" : "hover:shadow-champagne"}`}>
                          <div className="flex items-center gap-4 min-w-0">
                            <button onClick={() => togglePacked(item)} className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all shrink-0 ${item.is_packed ? "bg-gradient-champagne border-transparent" : "border-border hover:border-primary"}`}>
                              {item.is_packed && <Check size={14} className="text-primary-foreground" />}
                            </button>
                            <span className={`text-sm font-body truncate ${item.is_packed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1">
                              <button onClick={() => updateQuantity(item, -1)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary"><Minus size={12} className="text-muted-foreground" /></button>
                              <span className="text-sm font-heading w-6 text-center text-gradient-champagne">{item.quantity}</span>
                              <button onClick={() => updateQuantity(item, 1)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary"><Plus size={12} className="text-muted-foreground" /></button>
                            </div>
                            <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-secondary">
                              <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};

export default PackingTab;
