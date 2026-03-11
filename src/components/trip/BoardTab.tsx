import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BoardItem, TripEvent, TripCollaborator, Profile, EventLook, TripPoll, PollOption } from "@/types/database";
import {
  Grid3X3, Plus, Trash2, ImagePlus, Palette, X, Check, Sparkles,
  ChevronDown, ChevronUp, Edit2, Users, BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import PollCard from "./PollCard";

const THEME_PALETTE = [
  "#1B2B4B", "#FFFFFF", "#C9975B", "#A67B5B", "#4A7B9D", "#E8D5B0",
  "#2D4A3E", "#1C1C1C", "#D4B8B8", "#8B7355", "#C5A880", "#B5B5B5",
  "#8B4513", "#556B2F", "#E8C5A0", "#9B8EA5", "#D4AF37", "#708090",
];

interface BoardTabProps {
  tripId: string;
  trip: {
    user_id: string;
    destination: string;
    trip_theme: string | null;
    theme_colors: string[] | null;
  };
  onSearchTheme?: (query: string) => void;
  onAddLookForEvent?: (query: string) => void;
}

/* ── Helpers ── */
function formatEventDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { month: "short", day: "numeric" });
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);
}

/* ── Avatar component ── */
const MemberAvatar = ({
  profile,
  size = "md",
  ring = false,
}: {
  profile: Profile | null | undefined;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
}) => {
  const sizeClass = size === "sm" ? "w-6 h-6 text-[9px]" : size === "lg" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  const ringClass = ring ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "";
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile.name || ""}
        className={`${sizeClass} ${ringClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${sizeClass} ${ringClass} rounded-full bg-secondary flex items-center justify-center font-body text-muted-foreground flex-shrink-0`}>
      {getInitials(profile?.name || null)}
    </div>
  );
};

/* ── TripThemeBanner ── */
const TripThemeBanner = ({
  tripId,
  trip,
  isHost,
  onSearchTheme,
}: {
  tripId: string;
  trip: BoardTabProps["trip"];
  isHost: boolean;
  onSearchTheme?: (query: string) => void;
}) => {
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [themeInput, setThemeInput] = useState(trip.trip_theme || "");
  const [selectedColors, setSelectedColors] = useState<string[]>(trip.theme_colors || []);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const hasTheme = !!trip.trip_theme;

  const toggleColor = (hex: string) => {
    setSelectedColors((prev) => {
      if (prev.includes(hex)) return prev.filter((c) => c !== hex);
      if (prev.length >= 6) return prev;
      return [...prev, hex];
    });
  };

  const saveTheme = async () => {
    if (!themeInput.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({ trip_theme: themeInput.trim(), theme_colors: selectedColors })
        .eq("id", tripId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast({ title: "Trip theme saved!", description: `Theme set to "${themeInput.trim()}"` });
      setEditOpen(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeTheme = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("trips")
        .update({ trip_theme: null, theme_colors: [] })
        .eq("id", tripId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["trip", tripId] });
      toast({ title: "Theme removed." });
      setEditOpen(false);
      setThemeInput("");
      setSelectedColors([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!hasTheme && !isHost) return null;

  if (!hasTheme && isHost) {
    return (
      <div className="mb-6">
        <button
          onClick={() => setEditOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/30 text-sm font-body text-primary/70 hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all"
        >
          <Palette size={14} />
          Set trip theme…
        </button>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="bg-card border-border max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-heading">Set Trip Theme</DialogTitle>
            </DialogHeader>
            <ThemeEditForm
              themeInput={themeInput}
              setThemeInput={setThemeInput}
              selectedColors={selectedColors}
              toggleColor={toggleColor}
              onSave={saveTheme}
              onRemove={null}
              saving={saving}
            />
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Theme is set — show banner
  return (
    <div className="mb-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-4 border border-primary/20"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] tracking-[0.2em] uppercase text-primary/60 font-body mb-1">Trip Theme</p>
            <h3 className="font-heading text-2xl leading-tight">{trip.trip_theme}</h3>
            {trip.theme_colors && trip.theme_colors.length > 0 && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {trip.theme_colors.map((hex) => (
                  <div
                    key={hex}
                    className="w-3.5 h-3.5 rounded-full border border-border/40 flex-shrink-0"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onSearchTheme && (
              <button
                onClick={() => onSearchTheme(trip.trip_theme!)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-champagne text-primary-foreground text-xs font-body shadow-champagne hover:opacity-90 transition-opacity"
              >
                <Sparkles size={11} />
                Search this theme
              </button>
            )}
            {isHost && (
              <button
                onClick={() => { setThemeInput(trip.trip_theme || ""); setSelectedColors(trip.theme_colors || []); setEditOpen(true); }}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
                title="Edit theme"
              >
                <Edit2 size={14} className="text-muted-foreground" />
              </button>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
            >
              {collapsed ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
            </button>
          </div>
        </div>
      </motion.div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading">Set Trip Theme</DialogTitle>
          </DialogHeader>
          <ThemeEditForm
            themeInput={themeInput}
            setThemeInput={setThemeInput}
            selectedColors={selectedColors}
            toggleColor={toggleColor}
            onSave={saveTheme}
            onRemove={isHost && hasTheme ? removeTheme : null}
            saving={saving}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ── ThemeEditForm ── */
const ThemeEditForm = ({
  themeInput,
  setThemeInput,
  selectedColors,
  toggleColor,
  onSave,
  onRemove,
  saving,
}: {
  themeInput: string;
  setThemeInput: (v: string) => void;
  selectedColors: string[];
  toggleColor: (hex: string) => void;
  onSave: () => void;
  onRemove: (() => void) | null;
  saving: boolean;
}) => (
  <div className="space-y-4 pt-2">
    <Input
      value={themeInput}
      onChange={(e) => setThemeInput(e.target.value)}
      placeholder="Trip theme… (e.g. Amalfi Riviera · Old Money)"
      className="bg-secondary border-border h-11 font-body"
    />
    <div>
      <p className="text-xs text-muted-foreground font-body mb-2">
        Palette <span className="text-primary/60">(select up to 6)</span>
      </p>
      <div className="grid grid-cols-6 gap-2">
        {THEME_PALETTE.map((hex) => {
          const isSelected = selectedColors.includes(hex);
          return (
            <button
              key={hex}
              type="button"
              onClick={() => toggleColor(hex)}
              className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center flex-shrink-0 ${
                isSelected ? "border-primary shadow-champagne scale-110" : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            >
              {isSelected && (
                <Check
                  size={12}
                  className={hex === "#FFFFFF" || hex === "#E8D5B0" || hex === "#D4B8B8" || hex === "#E8C5A0" ? "text-black/60" : "text-white"}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
    <Button
      variant="champagne"
      onClick={onSave}
      className="w-full"
      disabled={saving || !themeInput.trim()}
    >
      {saving ? "Saving…" : "Save Theme"}
    </Button>
    {onRemove && (
      <button
        type="button"
        onClick={onRemove}
        disabled={saving}
        className="w-full text-xs font-body text-muted-foreground hover:text-destructive transition-colors text-center py-1"
      >
        Remove theme
      </button>
    )}
  </div>
);

/* ── MyLookSection ── */
const MyLookSection = ({
  tripId,
  trip,
  onAddLookForEvent,
}: {
  tripId: string;
  trip: BoardTabProps["trip"];
  onAddLookForEvent?: (query: string) => void;
}) => {
  const { user } = useAuth();

  // Events with dress codes
  const { data: events = [] } = useQuery({
    queryKey: ["trip-events-dress-code", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_events")
        .select("*")
        .eq("trip_id", tripId)
        .not("dress_code", "is", null)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as TripEvent[];
    },
  });

  // Event looks for this trip
  const { data: eventLooks = [] } = useQuery({
    queryKey: ["event-looks", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_looks")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data as EventLook[];
    },
  });

  // Collaborators
  const { data: collaborators = [] } = useQuery({
    queryKey: ["trip-collaborators", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_collaborators")
        .select("*")
        .eq("trip_id", tripId)
        .eq("status", "accepted");
      if (error) throw error;
      return data as TripCollaborator[];
    },
  });

  // Profiles for host + collaborators
  const memberUserIds = [
    trip.user_id,
    ...collaborators.map((c) => c.user_id).filter(Boolean) as string[],
  ];

  const { data: profiles = [] } = useQuery({
    queryKey: ["member-profiles", memberUserIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", memberUserIds);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: memberUserIds.length > 0,
  });

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);
  const getLook = (eventId: string, userId: string) =>
    eventLooks.find((l) => l.event_id === eventId && l.user_id === userId);

  if (events.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2 mb-4">
        <Users size={14} className="text-primary" /> Group Looks by Event
      </h2>
      <div className="space-y-5">
        {events.map((event) => (
          <div key={event.id} className="glass-card rounded-2xl p-4">
            {/* Event header */}
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <span className="font-heading text-base">{event.event_name}</span>
              {event.dress_code && (
                <span className="text-primary/60 border border-primary/20 rounded-full px-2 py-0.5 text-xs font-body">
                  {event.dress_code}
                </span>
              )}
              {event.event_date && (
                <span className="text-xs text-muted-foreground font-body ml-auto">
                  {formatEventDate(event.event_date)}
                </span>
              )}
            </div>

            {/* Member slots horizontal scroll */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {memberUserIds.map((memberId) => {
                const profile = getProfile(memberId);
                const look = getLook(event.id, memberId);
                const isCurrentUser = memberId === user?.id;

                return (
                  <div
                    key={memberId}
                    className={`relative flex-shrink-0 w-24 rounded-xl overflow-hidden border transition-all ${
                      isCurrentUser
                        ? "ring-2 ring-primary border-primary/40"
                        : "border-border/40"
                    }`}
                    style={{ minHeight: 108 }}
                  >
                    {look ? (
                      /* Has a look */
                      <div className="relative w-full h-full" style={{ minHeight: 108 }}>
                        {look.image_url ? (
                          <img
                            src={look.image_url}
                            alt="Look"
                            className="w-full h-full object-cover"
                            style={{ minHeight: 108 }}
                          />
                        ) : (
                          <div className="w-full bg-secondary flex items-center justify-center" style={{ minHeight: 108 }}>
                            <Sparkles size={20} className="text-primary/40" />
                          </div>
                        )}
                        {/* Member avatar overlay */}
                        <div className="absolute bottom-1 right-1">
                          <MemberAvatar profile={profile} size="sm" ring={isCurrentUser} />
                        </div>
                      </div>
                    ) : (
                      /* No look yet */
                      <button
                        className={`w-full flex flex-col items-center justify-center gap-1.5 p-2 border-2 border-dashed rounded-xl transition-all ${
                          isCurrentUser
                            ? "border-primary/40 hover:border-primary hover:bg-primary/5 cursor-pointer"
                            : "border-border/30 cursor-default"
                        }`}
                        style={{ minHeight: 108 }}
                        onClick={() => {
                          if (isCurrentUser && onAddLookForEvent) {
                            onAddLookForEvent(`${event.dress_code} ${trip.destination} outfit`);
                          }
                        }}
                        disabled={!isCurrentUser}
                      >
                        <MemberAvatar profile={profile} size="md" ring={isCurrentUser} />
                        <span className={`text-[10px] font-body text-center leading-tight ${
                          isCurrentUser ? "text-primary" : "text-muted-foreground/50"
                        }`}>
                          {isCurrentUser ? "Add your look" : "No look yet"}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/* ── CreatePollModal ── */
const CreatePollModal = ({
  tripId,
  open,
  onClose,
}: {
  tripId: string;
  open: boolean;
  onClose: () => void;
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState("");
  const [optionTexts, setOptionTexts] = useState(["", ""]);
  const [optionImages, setOptionImages] = useState<(File | null)[]>([null, null]);
  const [closesAt, setClosesAt] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addOption = () => {
    if (optionTexts.length >= 4) return;
    setOptionTexts((prev) => [...prev, ""]);
    setOptionImages((prev) => [...prev, null]);
  };

  const removeOption = (i: number) => {
    if (optionTexts.length <= 2) return;
    setOptionTexts((prev) => prev.filter((_, idx) => idx !== i));
    setOptionImages((prev) => prev.filter((_, idx) => idx !== i));
  };

  const resetForm = () => {
    setQuestion("");
    setOptionTexts(["", ""]);
    setOptionImages([null, null]);
    setClosesAt("");
  };

  const save = async () => {
    if (!question.trim() || optionTexts.some((o) => !o.trim())) return;
    setSaving(true);
    try {
      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from("trip_polls")
        .insert({
          trip_id: tripId,
          question: question.trim(),
          created_by: user!.id,
          closes_at: closesAt || null,
        })
        .select()
        .single();
      if (pollError) throw pollError;

      // Upload option images + create options
      const optionInserts = await Promise.all(
        optionTexts.map(async (text, i) => {
          let imageUrl: string | null = null;
          const file = optionImages[i];
          if (file && user) {
            const ext = file.name.split(".").pop();
            const path = `${user.id}/${poll.id}/${i}.${ext}`;
            const { error: uploadErr } = await supabase.storage
              .from("board-images")
              .upload(path, file, { upsert: true });
            if (!uploadErr) {
              const { data: urlData } = supabase.storage.from("board-images").getPublicUrl(path);
              imageUrl = urlData.publicUrl;
            }
          }
          return {
            poll_id: poll.id,
            option_text: text.trim(),
            image_url: imageUrl,
            order_index: i,
          };
        }),
      );

      const { error: optErr } = await supabase.from("poll_options").insert(optionInserts);
      if (optErr) throw optErr;

      // Notify collaborators about the new poll
      try {
        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user!.id).single();
        const { data: collabs } = await supabase.from("trip_collaborators").select("user_id").eq("trip_id", tripId).eq("status", "accepted").not("user_id", "is", null);
        const { data: tripData } = await supabase.from("trips").select("destination, user_id").eq("id", tripId).single();
        const recipients = [
          ...(collabs || []).filter((c) => c.user_id !== user!.id),
          ...(tripData?.user_id && tripData.user_id !== user!.id ? [{ user_id: tripData.user_id }] : []),
        ];
        for (const r of recipients) {
          await supabase.from("notifications").insert({
            user_id: r.user_id,
            trip_id: tripId,
            type: "poll_created",
            title: `${profile?.name || "Someone"} wants your opinion on ${tripData?.destination || "the trip"}`,
            action_url: `/trip/${tripId}?tab=board`,
          });
        }
      } catch { /* non-blocking */ }

      queryClient.invalidateQueries({ queryKey: ["trip-polls", tripId] });
      queryClient.invalidateQueries({ queryKey: ["poll-options", tripId] });
      toast({ title: "Poll created!" });
      resetForm();
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Create Poll</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pt-2">
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">
              Question *
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What should we wear to the gala?"
              className="bg-secondary border-border h-11 font-body"
            />
          </div>
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-3">
              Options *
            </label>
            <div className="space-y-2.5">
              {optionTexts.map((text, i) => (
                <div key={i} className="flex items-center gap-2">
                  {/* Option image upload */}
                  <button
                    type="button"
                    onClick={() => fileRefs.current[i]?.click()}
                    className="w-10 h-10 rounded-lg bg-secondary border border-border flex-shrink-0 overflow-hidden hover:border-primary/40 transition-colors flex items-center justify-center"
                  >
                    {optionImages[i] ? (
                      <img
                        src={URL.createObjectURL(optionImages[i]!)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImagePlus size={14} className="text-muted-foreground" />
                    )}
                  </button>
                  <input
                    ref={(el) => { fileRefs.current[i] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setOptionImages((prev) => prev.map((img, idx) => (idx === i ? f : img)));
                    }}
                  />
                  <Input
                    value={text}
                    onChange={(e) =>
                      setOptionTexts((prev) =>
                        prev.map((t, idx) => (idx === i ? e.target.value : t)),
                      )
                    }
                    placeholder={`Option ${i + 1}`}
                    className="bg-secondary border-border h-10 font-body flex-1"
                  />
                  {optionTexts.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1.5 rounded-lg hover:bg-secondary transition-colors flex-shrink-0"
                    >
                      <X size={14} className="text-muted-foreground" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {optionTexts.length < 4 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-xs font-body text-primary hover:underline"
              >
                <Plus size={12} /> Add option
              </button>
            )}
          </div>
          <div>
            <label className="text-xs tracking-[0.12em] uppercase text-muted-foreground font-body block mb-2">
              Close Date (optional)
            </label>
            <Input
              type="datetime-local"
              value={closesAt}
              onChange={(e) => setClosesAt(e.target.value)}
              className="bg-secondary border-border h-11 font-body"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="champagne"
              onClick={save}
              disabled={!question.trim() || optionTexts.some((o) => !o.trim()) || saving}
              className="flex-1"
            >
              {saving ? "Creating..." : "Create Poll"}
            </Button>
            <Button variant="champagne-outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── BoardTab (main) ── */
const BoardTab = ({ tripId, trip, onSearchTheme, onAddLookForEvent }: BoardTabProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterUserId, setFilterUserId] = useState<string | "all" | "mine">("all");
  const [pollCreateOpen, setPollCreateOpen] = useState(false);

  const isHost = user?.id === trip.user_id;

  // Last visit tracking for new poll indicator
  const LAST_VISIT_KEY = `board_last_visit_${tripId}`;
  const lastVisit = useRef<Date>(new Date(localStorage.getItem(LAST_VISIT_KEY) || 0));
  useEffect(() => {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  }, [tripId]);

  const { data: items = [] } = useQuery({
    queryKey: ["board-items", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("board_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("order_index");
      if (error) throw error;
      return data as BoardItem[];
    },
  });

  // Collaborators
  const { data: collaborators = [] } = useQuery({
    queryKey: ["trip-collaborators", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_collaborators")
        .select("*")
        .eq("trip_id", tripId)
        .eq("status", "accepted");
      if (error) throw error;
      return data as TripCollaborator[];
    },
  });

  // Polls
  const { data: polls = [] } = useQuery({
    queryKey: ["trip-polls", tripId],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_polls")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      return (data || []) as TripPoll[];
    },
  });

  // Poll options
  const { data: pollOptions = [] } = useQuery({
    queryKey: ["poll-options", tripId],
    queryFn: async () => {
      if (polls.length === 0) return [];
      const pollIds = polls.map((p) => p.id);
      const { data } = await supabase
        .from("poll_options")
        .select("*")
        .in("poll_id", pollIds)
        .order("order_index");
      return (data || []) as PollOption[];
    },
    enabled: polls.length > 0,
  });

  // My collaborator role (for canEdit)
  const { data: myCollab } = useQuery({
    queryKey: ["my-collab-role-board", tripId, user?.id],
    queryFn: async () => {
      if (!user || isHost) return null;
      const { data } = await supabase
        .from("trip_collaborators")
        .select("role")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .eq("status", "accepted")
        .maybeSingle();
      return data;
    },
    enabled: !!user && !isHost,
  });

  const canEdit = isHost || myCollab?.role === "collaborator";

  // All member user IDs (host + accepted collabs)
  const memberUserIds = [
    trip.user_id,
    ...collaborators.map((c) => c.user_id).filter(Boolean) as string[],
  ];

  // Profiles for board item pinned_by users + member profiles
  const pinnedByIds = [...new Set(items.map((i) => i.pinned_by).filter(Boolean) as string[])];
  const pollCreatorIds = [...new Set(polls.map((p) => p.created_by))];
  const allProfileIds = [...new Set([...memberUserIds, ...pinnedByIds, ...pollCreatorIds])];

  const { data: profiles = [] } = useQuery({
    queryKey: ["board-profiles", allProfileIds.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", allProfileIds);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: allProfileIds.length > 0,
  });

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);

  // profilesById for polls
  const profilesById: Record<string, { name: string | null; avatar_url: string | null; handle: string | null }> = {};
  for (const p of profiles) {
    profilesById[p.user_id] = { name: p.name, avatar_url: p.avatar_url, handle: p.handle };
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const addItem = async () => {
    if (!user) return;
    setUploading(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("board-images").upload(path, file, { upsert: false });
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("board-images").getPublicUrl(path);
          imageUrl = urlData.publicUrl;
        }
      }
      const { error } = await supabase.from("board_items").insert({
        trip_id: tripId,
        image_url: imageUrl,
        description: description || null,
        notes: notes || null,
        order_index: items.length,
        pinned_by: user.id,
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
      setOpen(false);
      setDescription(""); setNotes(""); setFile(null); setPreviewUrl(null);
      toast({ title: "Added to board" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteItem = async (item: BoardItem) => {
    if (item.image_url && user) {
      const path = item.image_url.split("/board-images/")[1];
      if (path) await supabase.storage.from("board-images").remove([path]);
    }
    await supabase.from("board_items").delete().eq("id", item.id);
    queryClient.invalidateQueries({ queryKey: ["board-items", tripId] });
  };

  const canDelete = (item: BoardItem) => {
    if (!user) return false;
    return item.pinned_by === user.id || isHost;
  };

  // Filter items
  const filteredItems = items.filter((item) => {
    if (filterUserId === "all") return true;
    if (filterUserId === "mine") return item.pinned_by === user?.id;
    return item.pinned_by === filterUserId;
  });

  // Build collaborator list for filter pills (excluding host, which is "mine")
  const collabMembers = collaborators
    .filter((c) => c.user_id && c.user_id !== trip.user_id)
    .map((c) => ({
      userId: c.user_id!,
      profile: getProfile(c.user_id!),
    }));

  const isMember = user?.id === trip.user_id || collaborators.some((c) => c.user_id === user?.id);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Trip Theme Banner */}
      <TripThemeBanner
        tripId={tripId}
        trip={trip}
        isHost={isHost}
        onSearchTheme={onSearchTheme}
      />

      {/* My Look Section */}
      <MyLookSection
        tripId={tripId}
        trip={trip}
        onAddLookForEvent={onAddLookForEvent}
      />

      {/* Polls section */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
            <BarChart2 size={14} className="text-primary" /> Polls
          </h2>
          {canEdit && (
            <Button variant="champagne-outline" size="sm" onClick={() => setPollCreateOpen(true)}>
              <Plus size={14} /> Create Poll
            </Button>
          )}
        </div>
        {polls.length === 0 ? (
          <div className="glass-card rounded-xl p-6 text-center">
            <p className="text-xs text-muted-foreground font-body">
              No polls yet. Ask the group what to wear!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map((poll) => {
              const options = pollOptions.filter((o) => o.poll_id === poll.id);
              const isNew = new Date(poll.created_at) > lastVisit.current;
              return (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  options={options}
                  creatorProfile={profilesById[poll.created_by] || null}
                  isNew={isNew}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Board Grid header with filter pills + add button */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body flex items-center gap-2">
          <Grid3X3 size={14} className="text-primary" /> Mood Board
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Filter pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterUserId("all")}
              className={`px-3 py-1 rounded-full text-xs font-body transition-all ${
                filterUserId === "all"
                  ? "bg-gradient-champagne text-primary-foreground shadow-champagne"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterUserId("mine")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body transition-all ${
                filterUserId === "mine"
                  ? "bg-gradient-champagne text-primary-foreground shadow-champagne"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              Mine
            </button>
            {collabMembers.map(({ userId, profile }) => (
              <button
                key={userId}
                type="button"
                onClick={() => setFilterUserId(userId)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-body transition-all ${
                  filterUserId === userId
                    ? "bg-gradient-champagne text-primary-foreground shadow-champagne"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[9px] text-muted-foreground">
                    {getInitials(profile?.name || null)}
                  </div>
                )}
                {profile?.name?.split(" ")[0] || "Member"}
              </button>
            ))}
          </div>

          {/* Add item button for all members */}
          {isMember && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="champagne-outline" size="sm">
                  <Plus size={14} /> Add Item
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-heading">Add to Board</DialogTitle>
                </DialogHeader>
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
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description"
                    className="bg-secondary border-border h-11 text-foreground placeholder:text-muted-foreground font-body"
                  />
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes…"
                    className="bg-secondary border-border text-foreground placeholder:text-muted-foreground font-body min-h-[80px]"
                  />
                  <Button variant="champagne" onClick={addItem} className="w-full" disabled={uploading}>
                    {uploading ? "Uploading…" : "Add to Board"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Board grid */}
      {filteredItems.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Grid3X3 size={32} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-body text-sm">
            {filterUserId === "all"
              ? "Pin looks from Inspiration, upload your own images, or add notes. Your shared style scrapbook for this trip."
              : "No board items from this member yet."}
          </p>
        </div>
      ) : (
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {filteredItems.map((item) => {
            const contributor = item.pinned_by ? getProfile(item.pinned_by) : null;
            return (
              <div
                key={item.id}
                className="break-inside-avoid glass-card rounded-xl overflow-hidden group relative hover:shadow-champagne transition-all duration-300"
              >
                {/* Delete button */}
                {canDelete(item) && (
                  <button
                    onClick={() => deleteItem(item)}
                    className="absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove"
                  >
                    <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                  </button>
                )}

                {/* Image or placeholder */}
                {item.image_url ? (
                  <img src={item.image_url} alt={item.description || ""} className="w-full object-cover" />
                ) : (
                  <div className="w-full aspect-square bg-secondary flex items-center justify-center">
                    <Grid3X3 size={24} className="text-muted-foreground/20" />
                  </div>
                )}

                {/* Description / notes */}
                {(item.description || item.notes) && (
                  <div className="p-4 pb-8">
                    {item.description && (
                      <p className="text-sm font-body text-foreground">{item.description}</p>
                    )}
                    {item.notes && (
                      <p className="text-xs text-muted-foreground font-body mt-1">{item.notes}</p>
                    )}
                  </div>
                )}

                {/* Contributor avatar — bottom left */}
                {contributor && (
                  <div className="absolute bottom-2 left-2">
                    <MemberAvatar
                      profile={contributor}
                      size="sm"
                      ring={contributor.user_id === user?.id}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground font-body mt-6 text-center">
        Shared with your trip group · Pin looks from Inspiration
      </p>

      {/* Floating add button */}
      {isMember && (
        <div className="fixed bottom-6 right-6 z-40">
          <AnimatePresence>
            {!open && (
              <motion.button
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => setOpen(true)}
                className="w-12 h-12 rounded-full bg-gradient-champagne shadow-champagne flex items-center justify-center hover:opacity-90 transition-opacity"
                title="Add to board"
              >
                <Plus size={20} className="text-primary-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Create Poll Modal */}
      <CreatePollModal
        open={pollCreateOpen}
        onClose={() => setPollCreateOpen(false)}
        tripId={tripId}
      />
    </motion.div>
  );
};

export default BoardTab;
