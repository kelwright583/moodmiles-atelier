import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TripMessage, OutfitSuggestion, Profile } from "@/types/database";
import { MessageCircle, Camera, Shirt, Send, SmilePlus, X, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ChatTabProps {
  tripId: string;
  trip: {
    destination: string;
    user_id: string;
  };
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🔥", "✨", "😮"];

function formatDateSeparator(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/* ── MessageBubble ── */
interface MessageBubbleProps {
  message: TripMessage;
  profile: Profile | undefined;
  isOwn: boolean;
  showHeader: boolean;
  onReact: (emoji: string) => void;
  outfitById: Record<string, OutfitSuggestion>;
  onLightbox: (url: string) => void;
  currentUserId: string | undefined;
}

const MessageBubble = ({
  message,
  profile,
  isOwn,
  showHeader,
  onReact,
  outfitById,
  onLightbox,
  currentUserId,
}: MessageBubbleProps) => {
  const [showReactions, setShowReactions] = useState(false);

  return (
    <div className={`flex gap-2.5 group ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar slot */}
      <div className="flex-shrink-0 w-7">
        {showHeader && !isOwn && (
          <div className="w-7 h-7 rounded-full overflow-hidden bg-secondary border border-border flex items-center justify-center mt-1">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                className="w-full h-full object-cover"
                alt=""
              />
            ) : (
              <span className="text-[10px] font-heading text-muted-foreground">
                {(profile?.name || "?")[0].toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-1 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name */}
        {showHeader && !isOwn && (
          <span className="text-[11px] font-body text-muted-foreground ml-1">
            {profile?.name || "Member"}
          </span>
        )}

        {/* The bubble */}
        <div className="relative">
          {/* Image message */}
          {message.image_url && (
            <div
              className="rounded-2xl overflow-hidden max-w-[200px] cursor-pointer"
              onClick={() => onLightbox(message.image_url!)}
            >
              <img src={message.image_url} alt="" className="block w-full" />
            </div>
          )}

          {/* Outfit share message */}
          {message.pinned_outfit_id && outfitById[message.pinned_outfit_id] && (
            <div className="glass-card rounded-2xl overflow-hidden max-w-[220px]">
              <div className="relative">
                <img
                  src={outfitById[message.pinned_outfit_id].image_url ?? undefined}
                  alt=""
                  className="w-full h-36 object-cover"
                />
                {outfitById[message.pinned_outfit_id].store && (
                  <span className="absolute top-2 left-2 text-[9px] tracking-wide uppercase font-body px-1.5 py-0.5 rounded bg-black/60 text-white">
                    via {outfitById[message.pinned_outfit_id].store}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="text-xs font-body text-foreground font-medium truncate">
                  {outfitById[message.pinned_outfit_id].title}
                </p>
                {outfitById[message.pinned_outfit_id].product_url && (
                  <a
                    href={outfitById[message.pinned_outfit_id].product_url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-primary font-body hover:underline mt-1"
                  >
                    <ShoppingBag size={10} /> Shop This
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Text message */}
          {message.content && (
            <div
              className={`rounded-2xl px-3.5 py-2.5 ${
                isOwn
                  ? "bg-gradient-champagne text-background rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}
            >
              <p className="text-sm font-body leading-relaxed whitespace-pre-wrap">
                {message.content}
              </p>
            </div>
          )}

          {/* Reaction picker toggle */}
          <button
            onClick={() => setShowReactions((v) => !v)}
            className={`absolute ${isOwn ? "-left-7" : "-right-7"} top-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-primary`}
          >
            <SmilePlus size={13} />
          </button>

          {/* Reaction picker dropdown */}
          <AnimatePresence>
            {showReactions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`absolute ${isOwn ? "right-0" : "left-0"} -top-11 z-20 flex items-center gap-1 bg-card border border-border rounded-full px-2 py-1.5 shadow-lg`}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(emoji);
                      setShowReactions(false);
                    }}
                    className="text-lg hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reactions display */}
        {Object.keys(message.reactions || {}).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            <AnimatePresence>
              {Object.entries(message.reactions || {}).map(([emoji, users]) =>
                (users as string[]).length > 0 ? (
                  <motion.button
                    key={emoji}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    onClick={() => onReact(emoji)}
                    className={`flex items-center gap-1 text-xs font-body px-2 py-0.5 rounded-full border transition-colors ${
                      (users as string[]).includes(currentUserId || "")
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-secondary border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {emoji} {(users as string[]).length}
                  </motion.button>
                ) : null,
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Timestamp */}
        <span
          className={`text-[10px] font-body text-muted-foreground/50 ${
            isOwn ? "mr-1" : "ml-1"
          }`}
        >
          {new Date(message.created_at).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {message.edited_at && " · edited"}
        </span>
      </div>
    </div>
  );
};

/* ── ChatTab ── */
const ChatTab = ({ tripId, trip }: ChatTabProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [textInput, setTextInput] = useState("");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [outfitPickerOpen, setOutfitPickerOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [showNewMessagesPill, setShowNewMessagesPill] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isNearBottomRef = useRef(true);

  // Messages query
  const { data: messages = [] } = useQuery({
    queryKey: ["chat-messages", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_messages")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as TripMessage[];
    },
  });

  // User profiles for message senders
  const senderIds = [...new Set(messages.map((m) => m.user_id))];
  const { data: senderProfiles = [] } = useQuery({
    queryKey: ["chat-profiles", senderIds.join(",")],
    queryFn: async () => {
      if (senderIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", senderIds);
      if (error) throw error;
      return data as Profile[];
    },
    enabled: senderIds.length > 0,
  });

  const profileByUserId: Record<string, Profile> = {};
  for (const p of senderProfiles) {
    profileByUserId[p.user_id] = p;
  }

  // Pinned outfits for outfit picker
  const { data: pinnedOutfits = [] } = useQuery({
    queryKey: ["pinned-outfits-chat", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .eq("trip_id", tripId)
        .eq("pinned", true)
        .limit(20);
      if (error) throw error;
      return data as OutfitSuggestion[];
    },
  });

  const outfitById: Record<string, OutfitSuggestion> = {};
  for (const o of pinnedOutfits) {
    outfitById[o.id] = o;
  }

  // Also build outfit map from message pinned_outfit_ids that might not be in pinned list
  const pinnedOutfitIdsInMessages = messages
    .map((m) => m.pinned_outfit_id)
    .filter(Boolean) as string[];
  const { data: messageOutfits = [] } = useQuery({
    queryKey: ["message-outfits", pinnedOutfitIdsInMessages.join(",")],
    queryFn: async () => {
      if (pinnedOutfitIdsInMessages.length === 0) return [];
      const { data, error } = await supabase
        .from("outfit_suggestions")
        .select("*")
        .in("id", pinnedOutfitIdsInMessages);
      if (error) throw error;
      return data as OutfitSuggestion[];
    },
    enabled: pinnedOutfitIdsInMessages.length > 0,
  });

  for (const o of messageOutfits) {
    outfitById[o.id] = o;
  }

  // Mark last_read on mount
  useEffect(() => {
    localStorage.setItem(`chat_last_read_${tripId}`, new Date().toISOString());
  }, [tripId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat-${tripId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "trip_messages",
          filter: `trip_id=eq.${tripId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat-messages", tripId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, queryClient]);

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
      setShowNewMessagesPill(false);
    } else {
      setShowNewMessagesPill(true);
    }
  }, [messages]);

  // Initial scroll to bottom
  useEffect(() => {
    scrollToBottom(false);
  }, []);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  };

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const threshold = 150;
    isNearBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
    if (isNearBottomRef.current) setShowNewMessagesPill(false);
  };

  const sendMessage = async () => {
    if (!textInput.trim() && !pendingImageFile) return;
    const content = textInput.trim();
    setTextInput("");

    let imageUrl: string | null = null;
    if (pendingImageFile && user) {
      const ext = pendingImageFile.name.split(".").pop();
      const path = `${user.id}/${tripId}/${Date.now()}.${ext}`;
      try {
        const { error } = await supabase.storage
          .from("chat-images")
          .upload(path, pendingImageFile, { upsert: false });
        if (!error) {
          const { data } = supabase.storage.from("chat-images").getPublicUrl(path);
          imageUrl = data.publicUrl;
        } else {
          toast({ title: "Image upload failed", description: error.message, variant: "destructive" });
        }
      } catch {
        toast({ title: "Image upload failed", variant: "destructive" });
      }
      setPendingImageFile(null);
    }

    const { error } = await supabase.from("trip_messages").insert({
      trip_id: tripId,
      user_id: user!.id,
      content: content || null,
      image_url: imageUrl,
    });
    if (error) {
      toast({ title: "Error sending message", variant: "destructive" });
    } else {
      // Notify collaborators about the new message
      try {
        const { data: profile } = await supabase.from("profiles").select("name").eq("user_id", user!.id).single();
        const { data: collabs } = await supabase.from("trip_collaborators").select("user_id").eq("trip_id", tripId).eq("status", "accepted").not("user_id", "is", null);
        const { data: tripData } = await supabase.from("trips").select("destination, user_id").eq("id", tripId).single();
        const recipients = [
          ...(collabs || []).filter((c) => c.user_id !== user!.id),
          ...(tripData?.user_id && tripData.user_id !== user!.id ? [{ user_id: tripData.user_id }] : []),
        ];
        const messagePreview = content ? content.slice(0, 60) : "Shared a photo";
        for (const r of recipients) {
          await supabase.from("notifications").insert({
            user_id: r.user_id,
            trip_id: tripId,
            type: "new_message",
            title: `${profile?.name || "Someone"}: ${messagePreview}`,
            action_url: `/trip/${tripId}?tab=chat`,
          });
        }
      } catch { /* non-blocking */ }
    }
  };

  const shareOutfit = async (outfit: OutfitSuggestion) => {
    await supabase.from("trip_messages").insert({
      trip_id: tripId,
      user_id: user!.id,
      pinned_outfit_id: outfit.id,
      content: null,
    });
    setOutfitPickerOpen(false);
    queryClient.invalidateQueries({ queryKey: ["chat-messages", tripId] });
  };

  const toggleReaction = async (message: TripMessage, emoji: string) => {
    if (!user) return;
    const current = message.reactions || {};
    const users: string[] = current[emoji] || [];
    let updated: Record<string, string[]>;
    if (users.includes(user.id)) {
      const filtered = users.filter((uid) => uid !== user.id);
      if (filtered.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [emoji]: _removed, ...rest } = current;
        updated = rest;
      } else {
        updated = { ...current, [emoji]: filtered };
      }
    } else {
      updated = { ...current, [emoji]: [...users, user.id] };
    }
    await supabase.from("trip_messages").update({ reactions: updated }).eq("id", message.id);
    queryClient.invalidateQueries({ queryKey: ["chat-messages", tripId] });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col relative"
      style={{ height: "calc(100vh - 280px)", minHeight: 400 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <MessageCircle size={14} className="text-primary" />
        <h2 className="text-sm tracking-[0.2em] uppercase text-muted-foreground font-body">
          Group Chat
        </h2>
        <span className="text-xs text-muted-foreground/60 font-body">· {trip.destination}</span>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-1 pr-1"
        style={{ scrollbarWidth: "thin" }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <MessageCircle size={24} className="text-primary" />
            </div>
            <h3 className="font-heading text-lg mb-1">Start the conversation</h3>
            <p className="text-xs text-muted-foreground font-body max-w-[240px]">
              Your group chat lives here — coordinate outfits, share finds, and plan together.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message, index) => {
            const prev = messages[index - 1];
            const showDateSep = !prev || !isSameDay(prev.created_at, message.created_at);
            const isFirstInSequence =
              !prev ||
              prev.user_id !== message.user_id ||
              !isSameDay(prev.created_at, message.created_at);
            const isOwn = message.user_id === user?.id;

            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Date separator */}
                {showDateSep && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex-1 h-px bg-border/40" />
                    <span className="text-[10px] font-body text-muted-foreground/60 tracking-wide">
                      {formatDateSeparator(message.created_at)}
                    </span>
                    <div className="flex-1 h-px bg-border/40" />
                  </div>
                )}

                <MessageBubble
                  message={message}
                  profile={profileByUserId[message.user_id]}
                  isOwn={isOwn}
                  showHeader={isFirstInSequence}
                  onReact={(emoji) => toggleReaction(message, emoji)}
                  outfitById={outfitById}
                  onLightbox={setLightboxImage}
                  currentUserId={user?.id}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* New messages pill */}
      <AnimatePresence>
        {showNewMessagesPill && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              scrollToBottom();
              setShowNewMessagesPill(false);
            }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 bg-primary text-background text-xs font-body px-3 py-1.5 rounded-full shadow-champagne"
          >
            New messages ↓
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input bar */}
      <div className="flex-shrink-0 pt-3 border-t border-border/40 mt-3">
        {/* Pending image preview */}
        {pendingImageFile && (
          <div className="mb-2 relative w-16 h-16 rounded-lg overflow-hidden border border-border">
            <img
              src={URL.createObjectURL(pendingImageFile)}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => setPendingImageFile(null)}
              className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5"
            >
              <X size={10} className="text-white" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={() => imageInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0"
          >
            <Camera size={16} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => setOutfitPickerOpen(true)}
            className="p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors flex-shrink-0"
          >
            <Shirt size={16} className="text-muted-foreground" />
          </button>
          <input
            type="file"
            accept="image/*"
            ref={imageInputRef}
            className="hidden"
            onChange={(e) => setPendingImageFile(e.target.files?.[0] || null)}
          />
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Message the group..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/60 border border-border text-sm font-body text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
          <button
            onClick={sendMessage}
            disabled={!textInput.trim() && !pendingImageFile}
            className="p-2.5 rounded-xl bg-gradient-champagne disabled:opacity-40 transition-opacity flex-shrink-0"
          >
            <Send size={16} className="text-background" />
          </button>
        </div>
      </div>

      {/* Outfit picker sheet */}
      <Sheet open={outfitPickerOpen} onOpenChange={setOutfitPickerOpen}>
        <SheetContent side="bottom" className="bg-card border-border rounded-t-2xl pb-10">
          <div className="pt-4">
            <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5" />
            <p className="text-xs tracking-[0.2em] uppercase text-primary font-body mb-4">
              Share a Look
            </p>
            {pinnedOutfits.length === 0 ? (
              <p className="text-sm text-muted-foreground font-body text-center py-6">
                Pin outfits from Inspiration to share them here.
              </p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {pinnedOutfits.map((outfit) => (
                  <button
                    key={outfit.id}
                    onClick={() => shareOutfit(outfit)}
                    className="flex-shrink-0 group"
                  >
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-secondary border border-border group-hover:border-primary/40 transition-colors">
                      <img
                        src={outfit.image_url ?? undefined}
                        alt={outfit.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] font-body text-muted-foreground mt-1 truncate max-w-[80px] text-center">
                      {outfit.title}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxImage}
              alt=""
              className="max-w-full max-h-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X size={18} className="text-white" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ChatTab;
