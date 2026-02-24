import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete related data first (order matters for RLS)
      await supabase.from("weather_data").delete().eq("trip_id", tripId);
      await supabase.from("packing_items").delete().eq("trip_id", tripId);
      await supabase.from("activity_suggestions").delete().eq("trip_id", tripId);
      await supabase.from("outfit_suggestions").delete().eq("trip_id", tripId);
      await supabase.from("board_items").delete().eq("trip_id", tripId);
      await supabase.from("trip_events").delete().eq("trip_id", tripId);
      await supabase.from("wardrobe_items").delete().eq("trip_id", tripId);

      const { error } = await supabase.from("trips").delete().eq("id", tripId);
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Journey deleted" });
      navigate("/dashboard");
    } catch (error: unknown) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "Delete failed", variant: "destructive" });
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
            This will permanently remove this journey and all its data — including weather, events, activities, outfit inspiration, packing list, and mood board.
          </AlertDialogDescription>
        </AlertDialogHeader>

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
