import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WardrobeItem } from "@/types/database";
import { Shirt, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const categories = ["Day Look", "Evening Look", "Travel Day", "Statement", "Rain Ready", "Outerwear", "Accessories"];
const styleTags = ["Minimal", "Structured", "Tailored", "Resort", "Street", "Monochrome", "Feminine", "Masculine", "Avant-garde", "Classic"];

const CapsuleTab = ({ tripId }: { tripId: string }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { data: items = [] } = useQuery({
    queryKey: ["wardrobe-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("wardrobe_items").select("*").eq("trip_id", tripId).order("order_index");
      if (error) throw error;
      return data as WardrobeItem[];
    },
  });

  const addItem = async () => {
    if (!category || !description) { toast({ title: "Required", description: "Category and description are required.", variant: "destructive" }); return; }
    const { error } = await supabase.from("wardrobe_items").insert({ trip_id: tripId, category, description, color: color || null, tags: selectedTags, order_index: items.length });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["wardrobe-items", tripId] });
    setOpen(false);
    setCategory(""); setDescription(""); setColor(""); setSelectedTags([]);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("wardrobe_items").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["wardrobe-items", tripId] });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
          <Shirt size={14} className="text-primary" /> Curated Capsule
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">Add Wardrobe Item</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block font-body">Category</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button key={c} type="button" onClick={() => setCategory(c)} className={`px-3 py-1.5 rounded-full text-xs font-body transition-all ${category === c ? "bg-gradient-champagne text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>{c}</button>
                  ))}
                </div>
              </div>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (e.g. Tailored wool trousers, cashmere knit)" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
              <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Colour palette (e.g. Camel / Charcoal)" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
              <div>
                <label className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-2 block font-body">Style Tags</label>
                <div className="flex flex-wrap gap-2">
                  {styleTags.map((tag) => (
                    <button key={tag} type="button" onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-xs font-body transition-all ${selectedTags.includes(tag) ? "bg-gradient-champagne text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{tag}</button>
                  ))}
                </div>
              </div>
              <Button variant="champagne" onClick={addItem} className="w-full">Add to Capsule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Shirt size={32} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-body text-sm">Your capsule is empty. Start adding wardrobe items to curate your travel looks.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="glass-card rounded-xl p-6 hover:shadow-champagne transition-all duration-300 group relative">
              <button onClick={() => deleteItem(item.id)} className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all">
                <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
              </button>
              <div className="w-full aspect-[3/4] rounded-lg bg-secondary mb-4 flex items-center justify-center">
                <Shirt size={32} className="text-muted-foreground/30" />
              </div>
              <span className="text-xs tracking-[0.2em] uppercase text-primary font-body">{item.category}</span>
              <p className="text-sm font-body text-foreground mt-2 leading-relaxed">{item.description}</p>
              {item.color && <p className="text-xs text-muted-foreground font-body mt-2">Palette: {item.color}</p>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {item.tags?.map((tag) => (
                  <span key={tag} className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-body">{tag}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default CapsuleTab;
