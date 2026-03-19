import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trip } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface SaveToOtherBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTripId: string;
  item: {
    image_url: string | null;
    description: string | null;
    notes: string | null;
  };
  onSaved?: () => void;
}

export const SaveToOtherBoardDialog = ({
  open,
  onOpenChange,
  currentTripId,
  item,
  onSaved,
}: SaveToOtherBoardDialogProps) => {
  const queryClient = useQueryClient();

  const { data: trips = [] } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, destination, country, start_date")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as Pick<Trip, "id" | "destination" | "country" | "start_date">[];
    },
    enabled: open,
  });

  const otherTrips = trips.filter((t) => t.id !== currentTripId);

  const saveToTrip = async (targetTripId: string) => {
    const { error } = await supabase.from("board_items").insert({
      trip_id: targetTripId,
      image_url: item.image_url,
      description: item.description,
      notes: item.notes,
      order_index: 0,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["board-items", targetTripId] });
    const trip = otherTrips.find((t) => t.id === targetTripId);
    toast({ title: "Saved!", description: `Added to ${trip?.destination || "trip"}'s board.` });
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading">Save to another trip</DialogTitle>
        </DialogHeader>
        <div className="pt-2 max-h-64 overflow-y-auto space-y-2">
          {otherTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground font-body">No other trips yet. Create a trip to save inspiration across boards.</p>
          ) : (
            otherTrips.map((trip) => (
              <button
                key={trip.id}
                onClick={() => saveToTrip(trip.id)}
                className="w-full text-left glass rounded-xl p-4 hover:glow-gold transition-all flex items-center justify-between"
              >
                <div>
                  <p className="font-heading text-base">{trip.destination}</p>
                  <p className="text-xs text-muted-foreground font-body">
                    {trip.country}
                    {trip.start_date && ` · ${new Date(trip.start_date).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`}
                  </p>
                </div>
                <span className="text-xs text-primary font-body">Save</span>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
