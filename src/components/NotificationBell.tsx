import { useState, useEffect, useRef } from "react";
import { Bell, User, Calendar, MessageCircle, Sparkles, Music, Heart } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  action_url: string | null;
  created_at: string;
  trip_id: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function NotifIcon({ type }: { type: string }) {
  const cls = "w-4 h-4 flex-shrink-0";
  if (type === "invite_received" || type === "collaborator_joined")
    return <User size={14} className={`${cls} text-primary`} />;
  if (type === "event_added")
    return <Calendar size={14} className={`${cls} text-blue-400`} />;
  if (type === "new_message")
    return <MessageCircle size={14} className={`${cls} text-emerald-400`} />;
  if (type === "outfit_pinned")
    return <Heart size={14} className={`${cls} text-pink-400`} />;
  if (type === "track_added")
    return <Music size={14} className={`${cls} text-green-400`} />;
  if (type === "poll_created" || type === "poll_voted")
    return <Sparkles size={14} className={`${cls} text-purple-400`} />;
  return <Bell size={14} className={`${cls} text-muted-foreground`} />;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      return (data || []) as Notification[];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          toast({ title: notif.title, duration: 3000 });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
      queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    }
    setOpen(false);
    if (notif.action_url) navigate(notif.action_url);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        aria-label="Notifications"
      >
        <Bell size={16} className="text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-primary flex items-center justify-center px-1">
            <span className="text-[9px] font-body text-white font-medium leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-body font-medium text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-body text-primary hover:text-primary/80 transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto max-h-[360px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                  <Bell size={28} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-body text-muted-foreground">You're all caught up</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <button
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors border-b border-border/30 last:border-0 ${
                      !notif.is_read ? "border-l-2 border-l-primary" : ""
                    }`}
                  >
                    <div className="mt-0.5">
                      <NotifIcon type={notif.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-body leading-snug ${
                          !notif.is_read
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-[10px] text-muted-foreground/60 font-body mt-0.5 truncate">
                          {notif.body}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground/50 font-body whitespace-nowrap flex-shrink-0 mt-0.5">
                      {timeAgo(notif.created_at)}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
