import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BoardItem } from "@/types/database";
import { Grid3X3, Plus, Trash2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

const BoardTab = ({ tripId }: { tripId: string }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["board-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("board_items").select("*").eq("trip_id", tripId).order("order_index");
      if (error) throw error;
      return data as BoardItem[];
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const addItem = async () => {
    setUploading(true);
    try {
      let imageUrl: string | null = null;

      if (file && user) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("board-images").upload(path, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("board-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      const { error } = await supabase.from("board_items").insert({
        trip_id: tripId,
        image_url: imageUrl,
        description: description || null,
        notes: notes || null,
        order_index: items.length,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
      setOpen(false);
      setDescription(""); setNotes(""); setFile(null); setPreviewUrl(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (item: BoardItem) => {
    // Delete storage file if exists
    if (item.image_url && user) {
      const path = item.image_url.split("/board-images/")[1];
      if (path) await supabase.storage.from("board-images").remove([path]);
    }
    await supabase.from("board_items").delete().eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
          <Grid3X3 size={14} className="text-primary" /> Mood Board
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="champagne-outline" size="sm"><Plus size={14} /> Add Item</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader><DialogTitle className="font-heading">Add to Board</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div
                onClick={() => fileRef.current?.click()}
                className="w-full aspect-video rounded-xl bg-secondary border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex items-center justify-center transition-colors overflow-hidden"
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <ImagePlus size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground font-body">Click to upload image</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body" />
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes..." className="bg-secondary border-border text-foreground placeholder:text-muted-foreground font-body min-h-[80px]" />
              <Button variant="champagne" onClick={addItem} className="w-full" disabled={uploading}>
                {uploading ? "Uploading..." : "Add to Board"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Grid3X3 size={32} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-body text-sm">Your mood board is empty. Upload inspiration images, notes, and outfit ideas.</p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="break-inside-avoid glass-card rounded-xl overflow-hidden group relative hover:shadow-champagne transition-all duration-300">
              <button onClick={() => deleteItem(item)} className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
              </button>
              {item.image_url ? (
                <img src={item.image_url} alt={item.description || ""} className="w-full object-cover" />
              ) : (
                <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                  <Grid3X3 size={24} className="text-muted-foreground/20" />
                </div>
              )}
              {(item.description || item.notes) && (
                <div className="p-4">
                  {item.description && <p className="text-sm font-body text-foreground">{item.description}</p>}
                  {item.notes && <p className="text-xs text-muted-foreground font-body mt-1">{item.notes}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground font-body mt-6 text-center">
        Private by default · Upload images to curate your look
      </p>
    </motion.div>
  );
};

export default BoardTab;
