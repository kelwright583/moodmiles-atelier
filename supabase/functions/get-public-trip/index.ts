import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { getServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();
    const { share_token } = body as { share_token: string };

    if (!share_token) {
      return new Response(JSON.stringify({ error: "share_token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = getServiceClient();

    // Fetch trip by share_token
    const { data: trip, error: tripError } = await db
      .from("trips")
      .select("id, user_id, destination, country, start_date, end_date, trip_type, image_url, trip_theme, is_public")
      .eq("share_token", share_token)
      .single();

    if (tripError || !trip) {
      return new Response(JSON.stringify({ error: "Trip not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!trip.is_public) {
      return new Response(JSON.stringify({ error: "This trip is private" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch host profile
    const { data: hostProfile } = await db
      .from("profiles")
      .select("name, avatar_url, handle")
      .eq("user_id", trip.user_id)
      .single();

    const host = hostProfile
      ? {
          first_name: hostProfile.name ? hostProfile.name.split(" ")[0] : null,
          avatar_url: hostProfile.avatar_url,
          handle: hostProfile.handle,
        }
      : { first_name: null, avatar_url: null, handle: null };

    // Fetch confirmed events (max 10)
    const { data: eventsRaw } = await db
      .from("trip_events")
      .select("event_name, event_date, event_time, venue_name, dress_code")
      .eq("trip_id", trip.id)
      .eq("booking_status", "confirmed")
      .limit(10);

    const confirmed_events = (eventsRaw || []).map((e: any) => ({
      event_name: e.event_name,
      event_date: e.event_date,
      event_time: e.event_time,
      venue_name: e.venue_name,
      dress_code: e.dress_code,
    }));

    // Fetch collaborator count
    const { count: collaboratorCount } = await db
      .from("trip_collaborators")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", trip.id)
      .eq("status", "accepted");

    // Fetch playlist
    const { data: playlistRaw } = await db
      .from("trip_playlists")
      .select("playlist_name, spotify_playlist_url")
      .eq("trip_id", trip.id)
      .maybeSingle();

    const playlist = playlistRaw
      ? { playlist_name: playlistRaw.playlist_name, spotify_playlist_url: playlistRaw.spotify_playlist_url }
      : null;

    // Fetch style highlights (outfit images, max 6)
    const { data: outfitsRaw } = await db
      .from("outfit_suggestions")
      .select("image_url")
      .eq("trip_id", trip.id)
      .not("image_url", "is", null)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6);

    const style_highlights = (outfitsRaw || [])
      .map((o: any) => o.image_url as string)
      .filter(Boolean);

    return new Response(
      JSON.stringify({
        destination: trip.destination,
        country: trip.country,
        start_date: trip.start_date,
        end_date: trip.end_date,
        trip_type: trip.trip_type,
        image_url: trip.image_url,
        trip_theme: trip.trip_theme,
        host,
        confirmed_events,
        collaborator_count: collaboratorCount ?? 0,
        playlist,
        style_highlights,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
