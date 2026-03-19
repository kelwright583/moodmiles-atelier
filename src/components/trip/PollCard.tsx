import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TripPoll, PollOption } from "@/types/database";
import { Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface PollCardProps {
  poll: TripPoll;
  options: PollOption[];
  creatorProfile: { name: string | null; avatar_url: string | null; handle: string | null } | null;
  isNew?: boolean;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function computeTimeLeft(closesAt: string): string | null {
  const diff = new Date(closesAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const totalMins = Math.floor(diff / 60000);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hours > 0) return `Closes in ${hours}h ${mins}m`;
  return `Closes in ${mins}m`;
}

const PollCard = ({ poll, options, creatorProfile, isNew }: PollCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [voting, setVoting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(
    poll.closes_at ? computeTimeLeft(poll.closes_at) : null,
  );

  const isClosed = !!(poll.closes_at && new Date(poll.closes_at) < new Date());

  // Recompute countdown every minute
  useEffect(() => {
    if (!poll.closes_at || isClosed) return;
    const interval = setInterval(() => {
      setTimeLeft(computeTimeLeft(poll.closes_at!));
    }, 60000);
    return () => clearInterval(interval);
  }, [poll.closes_at, isClosed]);

  const { data: votes = [] } = useQuery({
    queryKey: ["poll-votes", poll.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("poll_votes")
        .select("option_id, user_id")
        .eq("poll_id", poll.id);
      return (data || []) as { option_id: string; user_id: string }[];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`poll-${poll.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "poll_votes",
          filter: `poll_id=eq.${poll.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["poll-votes", poll.id] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [poll.id, queryClient]);

  const myVoteOptionId = votes.find((v) => v.user_id === user?.id)?.option_id ?? null;
  const totalVotes = votes.length;

  const voteCounts: Record<string, number> = {};
  for (const v of votes) {
    voteCounts[v.option_id] = (voteCounts[v.option_id] || 0) + 1;
  }

  const handleVote = async (optionId: string) => {
    if (myVoteOptionId || voting || isClosed) return;
    setVoting(true);
    // Optimistic update
    queryClient.setQueryData(
      ["poll-votes", poll.id],
      (old: { option_id: string; user_id: string }[] | undefined) => [
        ...(old || []),
        { option_id: optionId, user_id: user!.id },
      ],
    );
    try {
      await supabase.functions.invoke("vote-poll", {
        body: { poll_id: poll.id, option_id: optionId },
      });
      await queryClient.invalidateQueries({ queryKey: ["poll-votes", poll.id] });
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: ["poll-votes", poll.id] });
      toast({ title: "Error voting", description: err.message, variant: "destructive" });
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* New poll indicator */}
      {isNew && <div className="h-1 w-full bg-blue-500" />}

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary border border-border flex items-center justify-center flex-shrink-0">
              {creatorProfile?.avatar_url ? (
                <img
                  src={creatorProfile.avatar_url}
                  alt={creatorProfile.name || ""}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-heading text-muted-foreground">
                  {(creatorProfile?.name || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-body font-medium text-foreground">
                  {creatorProfile?.name || "Member"}
                </span>
                {creatorProfile?.handle && (
                  <span className="text-xs text-muted-foreground font-body">
                    @{creatorProfile.handle}
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-body">
                {timeAgo(poll.created_at)}
              </span>
            </div>
          </div>

          {/* Closed badge or countdown */}
          {isClosed ? (
            <span className="text-xs tracking-[0.1em] uppercase font-body bg-secondary text-muted-foreground px-2.5 py-1 rounded-full">
              Closed
            </span>
          ) : timeLeft ? (
            <span className="text-xs tracking-[0.1em] uppercase font-body text-primary/70 border border-primary/20 px-2.5 py-1 rounded-full">
              {timeLeft}
            </span>
          ) : null}
        </div>

        {/* Question */}
        <h3 className="font-heading text-xl leading-snug">{poll.question}</h3>

        {/* Options */}
        <div className="space-y-2.5">
          {options.map((option) => {
            const count = voteCounts[option.id] || 0;
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
            const isMyVote = myVoteOptionId === option.id;
            const hasVoted = !!myVoteOptionId;

            return (
              <button
                key={option.id}
                onClick={() => handleVote(option.id)}
                disabled={hasVoted || voting || isClosed}
                className={`w-full text-left rounded-xl overflow-hidden border transition-all ${
                  isMyVote ? "border-primary" : "border-border hover:border-primary/40"
                } ${hasVoted || isClosed ? "cursor-default" : "cursor-pointer"}`}
              >
                <div className="relative">
                  {option.image_url ? (
                    /* Image option */
                    <div className="relative h-28 overflow-hidden">
                      <img
                        src={option.image_url}
                        alt={option.option_text}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-body font-medium text-white">
                            {option.option_text}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {isMyVote && (
                              <Check size={14} className="text-primary flex-shrink-0" />
                            )}
                            {hasVoted && (
                              <span className="text-xs font-body text-white/80">{pct}%</span>
                            )}
                          </div>
                        </div>
                        {hasVoted && (
                          <div className="mt-1.5 h-1 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              className={`h-full rounded-full ${
                                isMyVote ? "bg-primary" : "bg-white/60"
                              }`}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Text-only option */
                    <div className="p-3.5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-body text-foreground">
                          {option.option_text}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isMyVote && (
                            <Check size={14} className="text-primary flex-shrink-0" />
                          )}
                          {hasVoted && (
                            <span className="text-xs font-body text-muted-foreground">
                              {pct}%
                            </span>
                          )}
                        </div>
                      </div>
                      {hasVoted && (
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.6, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              isMyVote ? "bg-primary" : "bg-muted-foreground/30"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Total votes */}
        <p className="text-xs text-muted-foreground font-body">
          {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

export default PollCard;
