import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { invite_token } = await req.json();

    if (!invite_token) {
      return new Response(JSON.stringify({ error: "invite_token is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getServiceClient();

    // Find invite with trip data
    const { data: invite } = await supabase
      .from("trip_collaborators")
      .select("trip_id, role, invited_by, status")
      .eq("invite_token", invite_token)
      .maybeSingle();

    if (!invite) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch trip and inviter in parallel — safe fields only, no user IDs or emails
    const [{ data: trip }, { data: inviterProfile }] = await Promise.all([
      supabase
        .from("trips")
        .select("destination, country, start_date, end_date, trip_type, image_url")
        .eq("id", invite.trip_id)
        .single(),
      supabase
        .from("profiles")
        .select("name, handle, avatar_url")
        .eq("user_id", invite.invited_by)
        .single(),
    ]);

    if (!trip) {
      return new Response(JSON.stringify({ error: "Invite not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        destination: trip.destination,
        country: trip.country,
        start_date: trip.start_date,
        end_date: trip.end_date,
        trip_type: trip.trip_type,
        image_url: trip.image_url,
        role: invite.role,
        inviter_name: inviterProfile?.name,
        inviter_handle: inviterProfile?.handle,
        inviter_avatar_url: inviterProfile?.avatar_url,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
