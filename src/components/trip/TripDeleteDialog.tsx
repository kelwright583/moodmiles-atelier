import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

interface TripDeleteDialogProps {
  tripId: string;
  destination: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TripDeleteDialog = ({ tripId, destination, open, onOpenChange }: TripDeleteDialogProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keepInspo, setKeepInspo] = useState(false);
  const [keepBoard, setKeepBoard] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete related data (unless user wants to keep)
      if (!keepInspo) {
        await supabase.from("outfit_suggestions").delete().eq("trip_id", tripId);
      }
      if (!keepBoard) {
        await supabase.from("board_items").delete().eq("trip_id", tripId);
      }

      // Always delete these
      await supabase.from("weather_data").delete().eq("trip_id", tripId);
      await supabase.from("packing_items").delete().eq("trip_id", tripId);
      await supabase.from("activity_suggestions").delete().eq("trip_id", tripId);
      await supabase.from("trip_events").delete().eq("trip_id", tripId);
      await supabase.from("wardrobe_items").delete().eq("trip_id", tripId);

      // Delete the trip itself (only if we cleaned up inspo/board too, or user didn't want to keep them)
      // If user kept inspo or board, we still delete the trip — orphaned rows are fine for now
      const { error } = await supabase.from("trips").delete().eq("id", tripId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Journey deleted", description: keepInspo || keepBoard ? "Saved items have been preserved." : undefined });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-xl">Delete {destination}?</AlertDialogTitle>
          <AlertDialogDescription className="font-body text-muted-foreground leading-relaxed">
            This will permanently remove this journey and all its data. You can choose to keep some items before deleting.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-3">
          <label className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors">
            <Checkbox checked={keepInspo} onCheckedChange={(v) => setKeepInspo(!!v)} />
            <div>
              <p className="text-sm font-body font-medium text-foreground">Keep inspiration & looks</p>
              <p className="text-xs font-body text-muted-foreground">Outfit suggestions and pinned looks</p>
            </div>
          </label>
          <label className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 cursor-pointer hover:bg-secondary transition-colors">
            <Checkbox checked={keepBoard} onCheckedChange={(v) => setKeepBoard(!!v)} />
            <div>
              <p className="text-sm font-body font-medium text-foreground">Keep mood board</p>
              <p className="text-xs font-body text-muted-foreground">Saved images and notes from your board</p>
            </div>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="font-body">Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="font-body gap-2">
            <Trash2 size={14} />
            {deleting ? "Deleting…" : "Delete Journey"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TripDeleteDialog;
