import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId, supabase } = await requireAuth(req);
    const { invite_token } = await req.json();

    if (!invite_token) {
      return new Response(JSON.stringify({ error: "invite_token is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the invite
    const { data: invite } = await supabase
      .from("trip_collaborators")
      .select("id, trip_id, status, invited_by, role")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (!invite) {
      return new Response(JSON.stringify({ error: "Invalid invite link" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invite.status === "accepted") {
      // Already accepted — return trip_id so frontend can redirect
      const { data: trip } = await supabase
        .from("trips")
        .select("destination")
        .eq("id", invite.trip_id)
        .single();
      return new Response(
        JSON.stringify({ error: "This invite has already been used", trip_id: invite.trip_id, destination: trip?.destination }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prevent accepting your own invite
    if (invite.invited_by === userId) {
      return new Response(JSON.stringify({ error: "You cannot accept your own invite" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept the invite
    const { error: updateError } = await supabase
      .from("trip_collaborators")
      .update({ user_id: userId, status: "accepted" })
      .eq("id", invite.id);

    if (updateError) throw updateError;

    // Get trip + inviter info for the response
    const [{ data: trip }, { data: inviterProfile }] = await Promise.all([
      supabase.from("trips").select("destination, country, user_id").eq("id", invite.trip_id).single(),
      supabase.from("profiles").select("name").eq("user_id", invite.invited_by).single(),
    ]);

    // Notify trip owner that someone joined
    try {
      const { createNotification } = await import("../create-notification/index.ts");
      const { data: joinerProfile } = await supabase.from("profiles").select("name").eq("user_id", userId).single();
      if (trip && joinerProfile) {
        await createNotification({
          user_id: trip.user_id,
          trip_id: invite.trip_id,
          type: "collaborator_joined",
          title: `${joinerProfile.name || "Someone"} joined your ${trip.destination || ""} trip`,
          action_url: `/trip/${invite.trip_id}`,
        });
      }
    } catch (notifErr) {
      console.error("accept-invite notification error:", notifErr instanceof Error ? notifErr.message : String(notifErr));
    }

    return new Response(
      JSON.stringify({
        trip_id: invite.trip_id,
        destination: trip?.destination,
        inviter_name: inviterProfile?.name,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: err.name === "AuthError" ? 401 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
