import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TripEvent, EventAttendee, ActivitySuggestion } from "@/types/database";
import {
  Utensils, Waves, Music, Camera, Car, Star, Plus, Edit2, Share2, Sparkles,
  ChevronDown, ChevronUp, Copy, Check, CalendarPlus, X, Loader2,
  ExternalLink, Trash2, MapPin, Globe, ChevronLeft, ChevronRight,
  BookmarkCheck, Ticket,
} from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import VenueAutocomplete from "./VenueAutocomplete";

// ─── Activity category colours ────────────────────────────────────────────────

const ACTIVITY_CATEGORY_COLORS: Record<string, string> = {
  Culture: "text-purple-400",
  Dining: "text-orange-400",
  Nightlife: "text-pink-400",
  Shopping: "text-emerald-400",
  Outdoor: "text-sky-400",
  Experience: "text-amber-400",
};

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  { value: "dining", label: "Dining", icon: Utensils },
  { value: "beach", label: "Beach", icon: Waves },
  { value: "nightlife", label: "Nightlife", icon: Music },
  { value: "excursion", label: "Excursion", icon: Camera },
  { value: "transport", label: "Transport", icon: Car },
  { value: "other", label: "Other", icon: Star },
] as const;

const BOOKING_STATUSES = ["researching", "booked", "confirmed", "cancelled"] as const;
type BookingStatus = typeof BOOKING_STATUSES[number];

const BOOKING_STATUS_STYLES: Record<BookingStatus, string> = {
  researching: "bg-muted/60 text-muted-foreground",
  booked: "bg-blue-500/15 text-blue-400",
  confirmed: "bg-emerald-500/15 text-emerald-400",
  cancelled: "bg-red-500/15 text-red-400",
};

const DRESS_CODE_CHIPS = ["Black Tie", "Smart Casual", "Resort Casual", "Casual", "Cocktail", "Themed", "Beach"];

const CURRENCIES = ["USD", "EUR", "GBP", "AUD", "JPY", "ZAR", "SGD", "AED"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCategoryIcon(cat: string | null) {
  return CATEGORY_OPTIONS.find((c) => c.value === cat)?.icon ?? Star;
}

function getCategoryLabel(cat: string | null) {
  return CATEGORY_OPTIONS.find((c) => c.value === cat)?.label ?? "Event";
}

function formatEventDate(dateStr: string, timeStr?: string | null): string {
  const d = new Date(dateStr + "T12:00:00");
  const datePart = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  if (!timeStr) return datePart;
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${datePart} · ${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function generateIcs(event: TripEvent): string {
  if (!event.event_date) return "";
  const fmt = (dateStr: string, timeStr?: string | null) => {
    const d = new Date(dateStr + "T12:00:00");
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      d.setHours(h, m, 0, 0);
      return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z/, "Z");
    }
    return dateStr.replace(/-/g, "");
  };
  const esc = (s: string) => s.replace(/[\\;,]/g, "\\$&").replace(/\n/g, "\\n");
  const start = fmt(event.event_date, event.event_time);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Concierge Styled//Events//EN",
    "BEGIN:VEVENT",
    `UID:${event.id}@conciergestyled.com`,
    `DTSTART${event.event_time ? "" : ";VALUE=DATE"}:${start}`,
    `DTEND${event.event_time ? "" : ";VALUE=DATE"}:${start}`,
    `SUMMARY:${esc(event.event_name)}`,
    event.venue_address ? `LOCATION:${esc(event.venue_address)}` : "",
    event.dress_code || event.notes
      ? `DESCRIPTION:${event.dress_code ? esc(`Dress code: ${event.dress_code}`) : ""}${event.notes ? "\\n" + esc(event.notes) : ""}`
      : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

function downloadIcs(event: TripEvent) {
  const content = generateIcs(event);
  if (!content) return;
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${event.event_name.replace(/[^a-z0-9]/gi, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function mapsUrl(event: TripEvent) {
  if (event.venue_place_id) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address || event.venue_name || "")}&query_place_id=${event.venue_place_id}`;
  }
  if (event.venue_address || event.venue_name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address || event.venue_name || "")}`;
  }
  return null;
}

// ─── Event Form ──────────────────────────────────────────────────────────────

interface EventForm {
  event_name: string; category: string; event_date: string; event_time: string;
  venue_input: string; venue_name: string; venue_address: string; venue_place_id: string;
  booking_status: string; booking_reference: string; booking_url: string;
  dress_code: string; cost_per_person: string; currency: string; notes: string;
  attendees: string[];
}

const EMPTY_FORM: EventForm = {
  event_name: "", category: "", event_date: "", event_time: "",
  venue_input: "", venue_name: "", venue_address: "", venue_place_id: "",
  booking_status: "researching", booking_reference: "", booking_url: "",
  dress_code: "", cost_per_person: "", currency: "USD", notes: "",
  attendees: [],
};

function eventToForm(e: TripEvent, allAttendeeIds: string[]): EventForm {
  return {
    event_name: e.event_name,
    category: e.category || "",
    event_date: e.event_date || "",
    event_time: e.event_time || "",
    venue_input: e.venue_name || "",
    venue_name: e.venue_name || "",
    venue_address: e.venue_address || "",
    venue_place_id: e.venue_place_id || "",
    booking_status: e.booking_status || "researching",
    booking_reference: e.booking_reference || "",
    booking_url: e.booking_url || "",
    dress_code: e.dress_code || "",
    cost_per_person: e.cost_per_person != null ? String(e.cost_per_person) : "",
    currency: e.currency || "USD",
    notes: e.notes || "",
    attendees: allAttendeeIds,
  };
}

// ─── Share Event Sheet ────────────────────────────────────────────────────────

const ShareEventSheet = ({
  event,
  destination,
  onClose,
}: {
  event: TripEvent | null;
  destination: string;
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  if (!event) return null;

  const siteUrl = window.location.origin;
  const shareUrl = event.share_token ? `${siteUrl}/event/${event.share_token}` : "";

  const copy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const whatsapp = () => {
    const dateStr = event.event_date ? formatEventDate(event.event_date, event.event_time) : "";
    const parts = [
      event.event_name,
      dateStr,
      event.venue_name || "",
      event.dress_code ? `Dress code: ${event.dress_code}` : "",
      shareUrl,
    ].filter(Boolean);
    window.open(`https://wa.me/?text=${encodeURIComponent(parts.join(" · "))}`, "_blank");
  };

  return (
    <Sheet open={!!event} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl px-6 pb-10">
        <div className="pt-4 pb-6">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-6" />
          <p className="text-xs tracking-[0.2em] uppercase text-primary font-body mb-1">Share Event</p>
          <h3 className="text-xl font-heading mb-6">{event.event_name}</h3>
          <div className="space-y-3">
            <button
              onClick={copy}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
            >
              {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} className="text-primary" />}
              <div>
                <p className="text-sm font-body text-foreground">{copied ? "Copied!" : "Copy link"}</p>
                {shareUrl && <p className="text-xs font-body text-muted-foreground truncate max-w-[260px]">{shareUrl}</p>}
              </div>
            </button>
            <button
              onClick={() => downloadIcs(event)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
            >
              <CalendarPlus size={18} className="text-primary" />
              <div>
                <p className="text-sm font-body text-foreground">Add to Calendar</p>
                <p className="text-xs font-body text-muted-foreground">Downloads a .ics file</p>
              </div>
            </button>
            <button
              onClick={whatsapp}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors text-left"
            >
              <Share2 size={18} className="text-primary" />
              <div>
                <p className="text-sm font-body text-foreground">Share on WhatsApp</p>
                <p className="text-xs font-body text-muted-foreground">Send event details to a contact</p>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ─── Add / Edit Event Modal ───────────────────────────────────────────────────

interface AddEditEventModalProps {
  open: boolean;
  onClose: () => void;
  tripId: string;
  editing: TripEvent | null;
  defaultAttendees: string[];
  collaboratorProfiles: Array<{ user_id: string; name: string | null; avatar_url: string | null }>;
}

const AddEditEventModal = ({
  open, onClose, tripId, editing, defaultAttendees, collaboratorProfiles,
}: AddEditEventModalProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const prevOpenRef = useRef(false);
  if (open !== prevOpenRef.current) {
    prevOpenRef.current = open;
    if (open) {
      if (editing) {
        setForm(eventToForm(editing, defaultAttendees));
      } else {
        setForm({ ...EMPTY_FORM, attendees: defaultAttendees });
      }
    }
  }

  const set = (k: keyof EventForm, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.event_name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        trip_id: tripId,
        event_name: form.event_name.trim(),
        category: form.category || null,
        event_date: form.event_date || null,
        event_time: form.event_time || null,
        venue_name: form.venue_name || null,
        venue_address: form.venue_address || null,
        venue_place_id: form.venue_place_id || null,
        booking_status: form.booking_status || "researching",
        booking_reference: form.booking_reference || null,
        booking_url: form.booking_url || null,
        dress_code: form.dress_code || null,
        cost_per_person: form.cost_per_person ? parseFloat(form.cost_per_person) : null,
        currency: form.currency || "USD",
        notes: form.notes || null,
      };

      let eventId: string;

      if (editing) {
        const { error } = await supabase.from("trip_events").update(payload).eq("id", editing.id);
        if (error) throw error;
        eventId = editing.id;
        await supabase.from("event_attendees").delete().eq("event_id", eventId);
      } else {
        const { data, error } = await supabase.from("trip_events").insert(payload).select("id").single();
        if (error) throw error;
        eventId = data.id;

        // Notify all collaborators about the new event
        try {
          const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user!.id).single();
          const { data: collabs } = await supabase.from("trip_collaborators").select("user_id").eq("trip_id", tripId).eq("status", "accepted").not("user_id", "is", null);
          const { data: tripData } = await supabase.from("trips").select("destination, user_id").eq("id", tripId).single();
          const recipients = [
            ...(collabs || []).filter((c) => c.user_id !== user!.id),
            ...(tripData?.user_id && tripData.user_id !== user!.id ? [{ user_id: tripData.user_id }] : []),
          ];
          for (const recipient of recipients) {
            await supabase.from("notifications").insert({
              user_id: recipient.user_id,
              trip_id: tripId,
              type: "event_added",
              title: `${profile?.name || "Someone"} added ${form.event_name.trim()} to your ${tripData?.destination || ""} trip`,
              action_url: `/trip/${tripId}?tab=events`,
            });
          }
        } catch { /* non-blocking */ }
      }

      if (form.attendees.length > 0) {
        await supabase.from("event_attendees").insert(
          form.attendees.map((uid) => ({ event_id: eventId, user_id: uid })),
        );
      }

      queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
      queryClient.invalidateQueries({ queryKey: ["event-attendees", tripId] });
      toast({ title: editing ? "Event updated" : "Event added" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleAttendee = (uid: string) =>
    set("attendees", form.attendees.includes(uid)
      ? form.attendees.filter((a) => a !== uid)
      : [...form.attendees, uid]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">{editing ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2 pb-2">
          {/* Event name */}
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Event Name *</label>
            <Input value={form.event_name} onChange={(e) => set("event_name", e.target.value)} placeholder="Dinner at Nobu" className="bg-secondary border-border h-11 font-body text-sm" />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => set("category", form.category === value ? "" : value)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${form.category === value ? "border-primary bg-primary/10" : "border-border bg-secondary hover:border-primary/40"}`}
                >
                  <Icon size={18} className={form.category === value ? "text-primary" : "text-muted-foreground"} />
                  <span className={`text-[10px] font-body ${form.category === value ? "text-primary" : "text-muted-foreground"}`}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Date</label>
              <Input type="date" value={form.event_date} onChange={(e) => set("event_date", e.target.value)} className="bg-secondary border-border h-11 font-body text-sm" />
            </div>
            <div>
              <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Time (optional)</label>
              <Input type="time" value={form.event_time} onChange={(e) => set("event_time", e.target.value)} className="bg-secondary border-border h-11 font-body text-sm" />
            </div>
          </div>

          {/* Venue */}
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Venue</label>
            <VenueAutocomplete
              value={form.venue_input}
              onChange={(v) => set("venue_input", v)}
              onSelect={({ name, address, place_id }) => {
                setForm((f) => ({ ...f, venue_input: name, venue_name: name, venue_address: address, venue_place_id: place_id }));
              }}
            />
            {form.venue_address && form.venue_address !== form.venue_input && (
              <p className="text-xs text-muted-foreground font-body mt-1.5 ml-1">{form.venue_address}</p>
            )}
          </div>

          {/* Booking status */}
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Booking Status</label>
            <div className="flex gap-1 flex-wrap">
              {BOOKING_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => set("booking_status", s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-body capitalize transition-all ${form.booking_status === s ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground border border-border hover:border-primary/30"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Booking reference + URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Reference</label>
              <Input value={form.booking_reference} onChange={(e) => set("booking_reference", e.target.value)} placeholder="ABC123" className="bg-secondary border-border h-11 font-body text-sm" />
            </div>
            <div>
              <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Booking URL</label>
              <div className="flex gap-1">
                <Input value={form.booking_url} onChange={(e) => set("booking_url", e.target.value)} placeholder="https://..." className="bg-secondary border-border h-11 font-body text-sm" />
                {form.booking_url && (
                  <button
                    onClick={() => window.open(form.booking_url, "_blank")}
                    className="h-11 px-2 rounded-lg bg-secondary border border-border hover:border-primary/40 transition-colors"
                    title="Test link"
                  >
                    <ExternalLink size={13} className="text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dress code */}
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Dress Code</label>
            <Input value={form.dress_code} onChange={(e) => set("dress_code", e.target.value)} placeholder="e.g. Smart Casual" className="bg-secondary border-border h-11 font-body text-sm mb-2" />
            <div className="flex flex-wrap gap-1.5">
              {DRESS_CODE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => set("dress_code", chip)}
                  className={`text-[11px] font-body px-2.5 py-1 rounded-full border transition-all ${form.dress_code === chip ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-primary/40"}`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Cost per person */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Cost per Person</label>
              <Input type="number" value={form.cost_per_person} onChange={(e) => set("cost_per_person", e.target.value)} placeholder="0" className="bg-secondary border-border h-11 font-body text-sm" />
            </div>
            <div>
              <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Currency</label>
              <select
                value={form.currency}
                onChange={(e) => set("currency", e.target.value)}
                className="w-full h-11 rounded-md bg-secondary border border-border text-sm font-body text-foreground px-3"
              >
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">Notes</label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Reservation details, special requests..." className="bg-secondary border-border font-body text-sm resize-none" rows={3} />
          </div>

          {/* Attendees */}
          {collaboratorProfiles.length > 0 && (
            <div>
              <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-3">Attendees</label>
              <div className="space-y-2">
                {collaboratorProfiles.map((p) => (
                  <label key={p.user_id} className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox
                      checked={form.attendees.includes(p.user_id)}
                      onCheckedChange={() => toggleAttendee(p.user_id)}
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary border border-border flex-shrink-0">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xs font-heading text-muted-foreground">{(p.name || "?")[0].toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-body text-foreground group-hover:text-foreground">{p.name || "Unknown"}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="champagne" onClick={save} disabled={!form.event_name.trim() || saving} className="flex-1">
              {saving ? <Loader2 size={14} className="animate-spin" /> : editing ? "Save Changes" : "Add Event"}
            </Button>
            <Button variant="champagne-outline" onClick={onClose} disabled={saving}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Event Card ───────────────────────────────────────────────────────────────

const EventCard = ({
  event,
  attendees,
  profilesById,
  canEdit,
  destination,
  onEdit,
  onShare,
  onDelete,
  onStyleEvent,
}: {
  event: TripEvent;
  attendees: EventAttendee[];
  profilesById: Record<string, { name: string | null; avatar_url: string | null }>;
  canEdit: boolean;
  destination: string;
  onEdit: () => void;
  onShare: () => void;
  onDelete: () => void;
  onStyleEvent: (query: string) => void;
}) => {
  const Icon = getCategoryIcon(event.category);
  const isCancelled = event.booking_status === "cancelled";
  const displayAvatars = attendees.slice(0, 3);
  const extraCount = Math.max(0, attendees.length - 3);
  const mapLink = mapsUrl(event);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-champagne ${isCancelled ? "opacity-60" : ""}`}
    >
      {/* Card body */}
      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Category icon badge */}
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Icon size={17} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.2em] uppercase text-primary font-body">
                {getCategoryLabel(event.category)}
              </p>
              {event.event_date && (
                <p className="text-xs font-body text-muted-foreground mt-0.5 truncate">
                  {formatEventDate(event.event_date, event.event_time)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Booking status badge */}
            {event.booking_status && (
              <span className={`text-[10px] tracking-[0.08em] uppercase font-body px-2.5 py-1 rounded-full ${BOOKING_STATUS_STYLES[event.booking_status as BookingStatus] ?? ""}`}>
                {event.booking_status}
              </span>
            )}
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Edit event"
              >
                <Edit2 size={13} className="text-muted-foreground" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                aria-label="Delete event"
              >
                <Trash2 size={13} className="text-muted-foreground hover:text-destructive" />
              </button>
            )}
          </div>
        </div>

        {/* Event name */}
        <h3 className={`font-heading text-2xl leading-tight ${isCancelled ? "line-through text-muted-foreground" : ""}`}>
          {event.event_name}
        </h3>

        {/* Venue with map link */}
        {(event.venue_name || event.venue_address) && (
          <div className="flex items-start gap-2">
            <MapPin size={13} className="text-primary mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-body text-foreground leading-snug">
                {event.venue_name}
              </p>
              {event.venue_address && event.venue_address !== event.venue_name && (
                <p className="text-xs font-body text-muted-foreground mt-0.5 leading-snug">{event.venue_address}</p>
              )}
              {mapLink && (
                <a
                  href={mapLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-body text-primary hover:underline mt-1"
                >
                  <ExternalLink size={10} /> View on Google Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* Booking details row */}
        {(event.booking_reference || event.cost_per_person) && (
          <div className="flex flex-wrap gap-3 text-xs font-body text-muted-foreground">
            {event.booking_reference && (
              <span>Ref: <span className="text-foreground">{event.booking_reference}</span></span>
            )}
            {event.cost_per_person && (
              <span>Cost: <span className="text-foreground">{event.currency || "USD"} {event.cost_per_person}/person</span></span>
            )}
            {event.booking_url && (
              <a href={event.booking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <ExternalLink size={10} /> Booking link
              </a>
            )}
          </div>
        )}

        {/* Notes */}
        {event.notes && (
          <p className="text-xs font-body text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
            {event.notes}
          </p>
        )}

        {/* Attendee avatars */}
        {attendees.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {displayAvatars.map((a) => {
                const p = profilesById[a.user_id];
                return (
                  <div key={a.user_id} className="w-6 h-6 rounded-full overflow-hidden bg-secondary border-2 border-card">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-[9px] font-heading text-muted-foreground">{(p?.name || "?")[0].toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {extraCount > 0 && (
              <span className="text-xs font-body text-muted-foreground">+{extraCount} more</span>
            )}
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="border-t border-border/60 px-5 py-3 flex items-center gap-2 bg-secondary/30">
        {/* Dress code pill — tappable to style */}
        {event.dress_code && (
          <button
            onClick={() => onStyleEvent(`${event.dress_code} ${destination} outfit`)}
            className="inline-flex items-center gap-1.5 text-[11px] font-body text-primary border border-primary/30 px-2.5 py-1 rounded-full hover:bg-primary/5 transition-colors"
          >
            <Sparkles size={10} />
            {event.dress_code}
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-secondary"
          >
            <Share2 size={12} /> Share
          </button>
          <button
            onClick={() => onStyleEvent(`${event.event_name} ${event.dress_code || ""} ${destination}`.trim())}
            className="flex items-center gap-1.5 text-xs font-body text-background bg-gradient-champagne px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity font-medium"
          >
            <Sparkles size={12} /> Style This Event
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Main EventsTab ───────────────────────────────────────────────────────────

interface EventsTabProps {
  tripId: string;
  trip: {
    destination: string;
    country: string | null;
    user_id: string;
    image_url?: string | null;
    trip_type?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  };
  onStyleEvent?: (query: string) => void;
}

const EventsTab = ({ tripId, trip, onStyleEvent }: EventsTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isHost = trip.user_id === user?.id;

  const [showPast, setShowPast] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TripEvent | null>(null);
  const [sharingEvent, setSharingEvent] = useState<TripEvent | null>(null);
  // Activity / experience discovery state
  const [generatingActivities, setGeneratingActivities] = useState(false);
  const [expFeedOpen, setExpFeedOpen] = useState(false);
  const [expFeedStart, setExpFeedStart] = useState(0);
  const expScrollRef = useRef<HTMLDivElement>(null);

  // Fetch user's collaborator role
  const { data: myCollab } = useQuery({
    queryKey: ["my-collab-role", tripId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_collaborators")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user!.id)
        .eq("status", "accepted")
        .maybeSingle();
      return data;
    },
    enabled: !!user && !isHost,
  });

  const canEdit = isHost || myCollab?.role === "collaborator";

  // Events
  const { data: events = [] } = useQuery({
    queryKey: ["trip-events", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_events").select("*").eq("trip_id", tripId).order("event_date", { ascending: true });
      if (error) throw error;
      return data as TripEvent[];
    },
  });

  // Event attendees
  const eventIds = events.map((e) => e.id);
  const { data: allAttendees = [] } = useQuery({
    queryKey: ["event-attendees", tripId],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data } = await supabase.from("event_attendees").select("event_id, user_id, status").in("event_id", eventIds);
      return (data || []) as EventAttendee[];
    },
    enabled: eventIds.length > 0,
  });

  // Collaborator profiles
  const { data: collabs = [] } = useQuery({
    queryKey: ["trip-collaborators", tripId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_collaborators")
        .select("user_id, role")
        .eq("trip_id", tripId)
        .eq("status", "accepted");
      return data || [];
    },
  });

  const allMemberIds = [trip.user_id, ...collabs.filter((c: any) => c.user_id).map((c: any) => c.user_id)];

  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["member-profiles", allMemberIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, name, avatar_url").in("user_id", allMemberIds);
      return data || [];
    },
    enabled: allMemberIds.length > 0,
  });

  const profilesById = Object.fromEntries(memberProfiles.map((p: any) => [p.user_id, p]));
  const attendeesByEvent: Record<string, EventAttendee[]> = {};
  allAttendees.forEach((a) => {
    if (!attendeesByEvent[a.event_id]) attendeesByEvent[a.event_id] = [];
    attendeesByEvent[a.event_id].push(a);
  });

  // Activity suggestions
  const { data: activities = [] } = useQuery({
    queryKey: ["activity-suggestions", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_suggestions").select("*").eq("trip_id", tripId).order("created_at", { ascending: true });
      if (error) throw error;
      return data as ActivitySuggestion[];
    },
  });

  const generateActivities = async () => {
    setGeneratingActivities(true);
    try {
      const { error } = await supabase.functions.invoke("suggest-activities", {
        body: { trip_id: tripId, destination: trip.destination, country: trip.country, trip_type: trip.trip_type ?? null, latitude: trip.latitude ?? null, longitude: trip.longitude ?? null },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["activity-suggestions", tripId] });
      toast({ title: "Experiences found!" });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not discover experiences.", variant: "destructive" });
    } finally {
      setGeneratingActivities(false);
    }
  };

  const addActivityToEvents = async (activity: ActivitySuggestion) => {
    if (events.some((e) => e.event_name === activity.name)) {
      toast({ title: "Already in your events", description: activity.name });
      return;
    }
    const { error } = await supabase.from("trip_events").insert({
      trip_id: tripId,
      event_name: activity.name,
      event_type: activity.category || null,
      location: activity.location || null,
      notes: activity.booking_url ? `Book: ${activity.booking_url}` : (activity.source_url || null),
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
    toast({ title: "Added to events", description: activity.name });
  };

  const isActivityInEvents = (name: string) => events.some((e) => e.event_name === name);
  const scrollExp = (dir: "left" | "right") =>
    expScrollRef.current?.scrollBy({ left: dir === "left" ? -300 : 300, behavior: "smooth" });

  // Split upcoming / past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcoming = events.filter((e) => !e.event_date || new Date(e.event_date + "T00:00") >= today);
  const past = events.filter((e) => e.event_date && new Date(e.event_date + "T00:00") < today);

  const handleStyleEvent = (query: string) => onStyleEvent?.(query);

  const deleteEvent = async (id: string) => {
    await supabase.from("trip_events").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["trip-events", tripId] });
    toast({ title: "Event deleted" });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 md:space-y-12 pb-24">

      {/* Discover Experiences */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
              <Globe size={14} className="text-primary" /> Discover Experiences
            </h2>
            <p className="text-xs text-muted-foreground/60 font-body mt-0.5">Find things to do and add them directly to your plan</p>
          </div>
          <div className="flex items-center gap-1.5">
            {activities.length > 0 && (
              <>
                <button onClick={() => scrollExp("left")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronLeft size={15} className="text-muted-foreground" />
                </button>
                <button onClick={() => scrollExp("right")} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                  <ChevronRight size={15} className="text-muted-foreground" />
                </button>
              </>
            )}
            <Button variant="champagne-outline" size="sm" onClick={generateActivities} disabled={generatingActivities}>
              <Globe size={13} className={generatingActivities ? "animate-spin" : ""} />
              {generatingActivities ? "Finding…" : activities.length > 0 ? "Refresh" : "Discover"}
            </Button>
          </div>
        </div>

        {activities.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Globe size={32} className="text-primary mx-auto mb-3 opacity-40" />
            <p className="text-sm text-muted-foreground font-body mb-1">Discover restaurants, sights and experiences in {trip.destination}.</p>
            <p className="text-xs text-muted-foreground/50 font-body mb-5">Tap any card to view details and add it to your plan.</p>
            <Button variant="champagne" size="sm" onClick={generateActivities} disabled={generatingActivities}>
              {generatingActivities ? "Discovering…" : "Find Experiences"}
            </Button>
          </div>
        ) : (
          <>
            <div ref={expScrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1" style={{ scrollSnapType: "x mandatory" }}>
              {activities.map((a, i) => (
                <div
                  key={a.id}
                  onClick={() => { setExpFeedStart(i); setExpFeedOpen(true); }}
                  className="relative min-w-[220px] max-w-[240px] shrink-0 rounded-2xl overflow-hidden cursor-pointer group hover:shadow-champagne transition-all duration-500"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="group-hover:[&_img]:scale-105 transition-transform duration-700">
                    <ImageWithFallback src={a.image_url} alt={a.name} fallbackIcon={MapPin} aspectClass="aspect-[3/4]" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-card/95 via-card/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className={`text-[10px] tracking-[0.2em] uppercase font-body ${ACTIVITY_CATEGORY_COLORS[a.category || ""] || "text-primary"}`}>{a.category}</span>
                    <p className="font-heading text-lg leading-tight text-foreground">{a.name}</p>
                    {isActivityInEvents(a.name) && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] text-primary font-body">
                        <BookmarkCheck size={9} /> In your plan
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground/40 font-body text-center mt-2">Tap to explore · add to your plan</p>
          </>
        )}
      </section>

      {/* Experience full-screen feed */}
      <AnimatePresence>
        {expFeedOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background overflow-y-auto">
            <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
                <Globe size={12} className="text-primary" /> Experiences in {trip.destination}
              </h3>
              <button onClick={() => setExpFeedOpen(false)} className="p-2 rounded-full hover:bg-secondary transition-colors">
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="max-w-lg mx-auto pb-20 pt-4">
              {[...activities.slice(expFeedStart), ...activities.slice(0, expFeedStart)].map((a) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} className="rounded-2xl overflow-hidden bg-card mx-4 mb-5">
                  <ImageWithFallback src={a.image_url} alt={a.name} fallbackIcon={MapPin} aspectClass="w-full aspect-[4/5]" />
                  <div className="px-4 pt-3 flex items-center justify-between">
                    {isActivityInEvents(a.name) ? (
                      <button onClick={() => setExpFeedOpen(false)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-body">
                        <BookmarkCheck size={12} /> In your plan
                      </button>
                    ) : (
                      <button onClick={() => addActivityToEvents(a)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-primary/10 hover:text-primary text-muted-foreground text-xs font-body transition-colors">
                        <Plus size={12} /> Add to my plan
                      </button>
                    )}
                    {a.booking_url && (
                      <a href={a.booking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-champagne text-primary-foreground text-xs font-body">
                        <Ticket size={12} /> Book
                      </a>
                    )}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] tracking-[0.2em] uppercase font-body ${ACTIVITY_CATEGORY_COLORS[a.category || ""] || "text-primary"}`}>{a.category}</span>
                      {a.rating && <span className="text-xs text-primary flex items-center gap-0.5"><Star size={10} className="fill-primary" /> {a.rating.toFixed(1)}</span>}
                      {(a as any).price_from && <span className="text-xs text-muted-foreground font-body ml-auto">{(a as any).price_from}</span>}
                    </div>
                    <h3 className="font-heading text-2xl leading-tight mb-1">{a.name}</h3>
                    <p className="text-sm text-muted-foreground font-body leading-relaxed">{a.description}</p>
                    {a.location && <p className="text-xs text-muted-foreground font-body mt-2 flex items-center gap-1"><MapPin size={10} /> {a.location}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming events */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <CalendarPlus size={14} className="text-primary" /> Upcoming
          </h2>
          {upcoming.length > 0 && (
            <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-body">{upcoming.length}</span>
          )}
        </div>
        {upcoming.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <Sparkles size={28} className="text-primary" />
            </div>
            <div>
              <p className="font-heading text-xl mb-1">Plan something special</p>
              <p className="text-sm font-body text-muted-foreground">
                Add dinners, experiences, beach clubs — every event gets outfit inspiration with one tap.
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 text-sm font-body text-background bg-gradient-champagne px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Plus size={15} /> Add your first event
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {upcoming.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  attendees={attendeesByEvent[e.id] || []}
                  profilesById={profilesById}
                  canEdit={canEdit}
                  destination={trip.destination}
                  onEdit={() => setEditingEvent(e)}
                  onShare={() => setSharingEvent(e)}
                  onDelete={() => deleteEvent(e.id)}
                  onStyleEvent={handleStyleEvent}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* Past events */}
      {past.length > 0 && (
        <section>
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-muted-foreground font-body mb-4 hover:text-foreground transition-colors"
          >
            {showPast ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Past Events ({past.length})
          </button>
          <AnimatePresence>
            {showPast && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="space-y-4 pt-2">
                  <AnimatePresence mode="popLayout">
                    {past.map((e) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        attendees={attendeesByEvent[e.id] || []}
                        profilesById={profilesById}
                        canEdit={canEdit}
                        destination={trip.destination}
                        onEdit={() => setEditingEvent(e)}
                        onShare={() => setSharingEvent(e)}
                        onDelete={() => deleteEvent(e.id)}
                        onStyleEvent={handleStyleEvent}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Floating add button */}
      {canEdit && events.length > 0 && (
        <button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-8 right-6 z-30 w-14 h-14 rounded-full bg-gradient-champagne shadow-champagne flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="Add event"
        >
          <Plus size={22} className="text-background" />
        </button>
      )}

      {/* Modals */}
      <AddEditEventModal
        open={addOpen || !!editingEvent}
        onClose={() => { setAddOpen(false); setEditingEvent(null); }}
        tripId={tripId}
        editing={editingEvent}
        defaultAttendees={allMemberIds}
        collaboratorProfiles={memberProfiles as any}
      />

      <ShareEventSheet
        event={sharingEvent}
        destination={trip.destination}
        onClose={() => setSharingEvent(null)}
      />
    </motion.div>
  );
};

export default EventsTab;
