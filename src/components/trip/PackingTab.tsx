import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PackingItem } from "@/types/database";
import { Briefcase, Plus, Trash2, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

const packingCategories = ["Tops", "Bottoms", "Dresses", "Outerwear", "Shoes", "Accessories", "Toiletries", "Tech", "Documents"];

const PackingTab = ({ tripId }: { tripId: string }) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: items = [] } = useQuery({
    queryKey: ["packing-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("packing_items").select("*").eq("trip_id", tripId).order("order_index");
      if (error) throw error;
      return data as PackingItem[];
    },
  });

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

  const packedCount = items.filter((i) => i.is_packed).length;
  const totalCount = items.length;

  // Group by category
  const grouped = items.reduce((acc, item) => {
    const cat = item.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
          <Briefcase size={14} className="text-primary" /> Packing List
        </h2>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="glass-card rounded-full px-4 py-1.5">
              <span className="text-xs font-body text-primary">{packedCount} / {totalCount} packed</span>
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Item</Button>
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

      {totalCount === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Briefcase size={32} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-body text-sm">Your packing list is empty. Add items to start organising.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <h3 className="text-xs tracking-[0.15em] uppercase text-muted-foreground font-body mb-3">{cat}</h3>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <div key={item.id} className={`glass-card rounded-xl px-5 py-4 flex items-center justify-between transition-all duration-300 ${item.is_packed ? "opacity-60" : "hover:shadow-champagne"}`}>
                    <div className="flex items-center gap-4">
                      <button onClick={() => togglePacked(item)} className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${item.is_packed ? "bg-gradient-champagne border-transparent" : "border-border hover:border-primary"}`}>
                        {item.is_packed && <Check size={14} className="text-primary-foreground" />}
                      </button>
                      <span className={`text-sm font-body ${item.is_packed ? "line-through text-muted-foreground" : "text-foreground"}`}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default PackingTab;
