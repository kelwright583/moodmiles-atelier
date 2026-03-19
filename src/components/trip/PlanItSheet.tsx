import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { ActivitySuggestion } from "@/types/database";

interface PlanForm {
  date: string;
  time: string;
  booking_status: "researching" | "booked" | "confirmed";
  booking_url: string;
  notes: string;
}

interface PlanItSheetProps {
  activity: ActivitySuggestion | null;
  tripId: string;
  tripStartDate: string;
  tripEndDate: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PlanItSheet({ activity, tripId, tripStartDate, tripEndDate, onClose, onSuccess }: PlanItSheetProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<PlanForm>({
    date: tripStartDate || "",
    time: "",
    booking_status: "researching",
    booking_url: activity?.booking_url || "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Reset booking_url when activity changes
  const bookingUrl = form.booking_url || activity?.booking_url || "";

  const BOOKING_STATUS = ["researching", "booked", "confirmed"] as const;

  const promoteToItinerary = async () => {
    if (!activity || !form.date) {
      toast({ title: "Please select a date", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("trip_events").insert({
        trip_id: tripId,
        event_name: activity.name,
        event_type: activity.category || null,
        location: activity.location || null,
        venue_name: activity.location || null,
        booking_url: bookingUrl || null,
        booking_status: form.booking_status,
        event_date: form.date,
        event_time: form.time || null,
        notes: form.notes || null,
        source_activity_id: activity.id,
      });
      if (error) throw error;

      // Remove from board after promoting
      await supabase
        .from("activity_suggestions")
        .update({ is_saved_to_board: false })
        .eq("id", activity.id);

      queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
      queryClient.invalidateQueries({ queryKey: ["activity-suggestions", tripId] });
      toast({ title: `${activity.name} added to your itinerary` });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={!!activity} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="bg-ink-raised border-t border-ink-border rounded-t-lg max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="font-heading font-normal text-2xl text-left">
            Plan <em className="italic text-gold">{activity?.name}</em>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 pb-6">
          {/* Date — required */}
          <div>
            <label className="eyebrow block mb-2">Date *</label>
            <input
              type="date"
              min={tripStartDate}
              max={tripEndDate}
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full bg-ink border border-ink-border rounded-sm px-4 h-11 text-sm font-body text-parchment focus:border-gold/50 focus:outline-none"
            />
          </div>

          {/* Time — optional */}
          <div>
            <label className="eyebrow block mb-2">Time (optional)</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
              placeholder="e.g. 19:30"
              className="w-full bg-ink border border-ink-border rounded-sm px-4 h-11 text-sm font-body text-parchment focus:border-gold/50 focus:outline-none"
            />
          </div>

          {/* Booking status */}
          <div>
            <label className="eyebrow block mb-2">Booking Status</label>
            <div className="flex gap-2">
              {BOOKING_STATUS.map((status) => (
                <button
                  key={status}
                  onClick={() => setForm((f) => ({ ...f, booking_status: status }))}
                  className={`flex-1 py-2 text-xs font-body font-medium tracking-[0.08em] uppercase rounded-sm border transition-all duration-200 ${
                    form.booking_status === status
                      ? "border-gold text-gold bg-gold/10"
                      : "border-ink-border text-parchment-faint hover:border-gold/30"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Booking URL */}
          <div>
            <label className="eyebrow block mb-2">Booking URL (optional)</label>
            <input
              type="url"
              value={bookingUrl}
              onChange={(e) => setForm((f) => ({ ...f, booking_url: e.target.value }))}
              placeholder="https://..."
              className="w-full bg-ink border border-ink-border rounded-sm px-4 h-11 text-sm font-body text-parchment focus:border-gold/50 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="eyebrow block mb-2">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={3}
              className="w-full bg-ink border border-ink-border rounded-sm px-4 py-3 text-sm font-body text-parchment focus:border-gold/50 focus:outline-none resize-none"
            />
          </div>

          <Button
            onClick={promoteToItinerary}
            disabled={saving || !form.date}
            className="w-full"
            size="lg"
          >
            {saving ? "Adding…" : "Add to Itinerary"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
