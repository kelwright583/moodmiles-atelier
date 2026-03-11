import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId, supabase } = await requireAuth(req);
    const { poll_id, option_id } = await req.json();

    if (!poll_id || !option_id) {
      return new Response(
        JSON.stringify({ error: "poll_id and option_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the poll to get trip_id and check if closed
    const { data: poll, error: pollError } = await supabase
      .from("trip_polls")
      .select("id, trip_id, closes_at")
      .eq("id", poll_id)
      .single();

    if (pollError || !poll) {
      return new Response(
        JSON.stringify({ error: "Poll not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check if poll is closed
    if (poll.closes_at && new Date(poll.closes_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Poll is closed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify caller is a trip member: owner or accepted collaborator
    const { data: trip } = await supabase
      .from("trips")
      .select("user_id")
      .eq("id", poll.trip_id)
      .single();

    const isOwner = trip?.user_id === userId;

    if (!isOwner) {
      const { data: collab } = await supabase
        .from("trip_collaborators")
        .select("id")
        .eq("trip_id", poll.trip_id)
        .eq("user_id", userId)
        .eq("status", "accepted")
        .maybeSingle();

      if (!collab) {
        return new Response(
          JSON.stringify({ error: "You are not a member of this trip" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Insert vote — on conflict (poll_id, user_id) DO NOTHING (idempotent)
    const { error: voteError } = await supabase
      .from("poll_votes")
      .upsert(
        { poll_id, option_id, user_id: userId },
        { onConflict: "poll_id,user_id", ignoreDuplicates: true },
      );

    if (voteError) {
      throw voteError;
    }

    // Notify poll creator
    try {
      const { createNotification } = await import("../create-notification/index.ts");
      const { data: pollRow } = await supabase
        .from("trip_polls")
        .select("created_by, question, trip_id")
        .eq("id", poll_id)
        .single();
      const { data: voterProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", userId)
        .single();
      if (pollRow && pollRow.created_by && pollRow.created_by !== userId) {
        await createNotification({
          user_id: pollRow.created_by,
          trip_id: pollRow.trip_id,
          type: "poll_voted",
          title: `${voterProfile?.name || "Someone"} voted on your poll`,
          body: pollRow.question,
          action_url: `/trip/${pollRow.trip_id}?tab=board`,
        });
      }
    } catch (notifErr) {
      console.error("vote-poll notification error:", notifErr instanceof Error ? notifErr.message : String(notifErr));
    }

    // Query vote counts per option
    const { data: votesData, error: countError } = await supabase
      .from("poll_votes")
      .select("option_id")
      .eq("poll_id", poll_id);

    if (countError) throw countError;

    const votes = votesData || [];
    const total = votes.length;

    // Build count map
    const countMap: Record<string, number> = {};
    for (const v of votes) {
      countMap[v.option_id] = (countMap[v.option_id] || 0) + 1;
    }

    // Fetch all options for this poll to include options with 0 votes
    const { data: optionsData } = await supabase
      .from("poll_options")
      .select("id")
      .eq("poll_id", poll_id);

    const counts = (optionsData || []).map((opt: { id: string }) => {
      const count = countMap[opt.id] || 0;
      return {
        option_id: opt.id,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });

    return new Response(
      JSON.stringify({ counts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: err.name === "AuthError" ? 401 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
