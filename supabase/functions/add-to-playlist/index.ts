import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth, getServiceClient } from "../_shared/auth.ts";

async function refreshSpotifyToken(
  supabase: ReturnType<typeof getServiceClient>,
  userId: string,
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(clientId + ":" + clientSecret)}`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Token refresh failed: ${errText}`);
  }

  const data = await res.json();
  const newExpiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

  await supabase
    .from("spotify_connections")
    .update({ access_token: data.access_token, expires_at: newExpiry, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  return data.access_token as string;
}

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId } = await requireAuth(req);
    const supabase = getServiceClient();

    const body = await req.json();
    const { trip_id, track_uri } = body as { trip_id: string; track_uri: string };

    if (!trip_id || !track_uri) {
      return new Response(JSON.stringify({ error: "Missing trip_id or track_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is trip owner or accepted collaborator
    const { data: tripOwner } = await supabase
      .from("trips")
      .select("id")
      .eq("id", trip_id)
      .eq("user_id", userId)
      .maybeSingle();

    const { data: collab } = await supabase
      .from("trip_collaborators")
      .select("id")
      .eq("trip_id", trip_id)
      .eq("user_id", userId)
      .eq("status", "accepted")
      .maybeSingle();

    if (!tripOwner && !collab) {
      return new Response(JSON.stringify({ error: "Not authorized for this trip" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get Spotify connection
    const { data: conn, error: connError } = await supabase
      .from("spotify_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (connError || !conn) {
      return new Response(JSON.stringify({ error: "Connect Spotify in Settings to add songs" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

    // Refresh token if expired
    let accessToken = conn.access_token;
    if (new Date(conn.expires_at) < new Date()) {
      try {
        accessToken = await refreshSpotifyToken(supabase, userId, conn.refresh_token, clientId, clientSecret);
      } catch (err) {
        return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Get trip playlist
    const { data: tripPlaylist, error: playlistError } = await supabase
      .from("trip_playlists")
      .select("spotify_playlist_id")
      .eq("trip_id", trip_id)
      .maybeSingle();

    if (playlistError || !tripPlaylist) {
      return new Response(JSON.stringify({ error: "No playlist found for this trip" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Add track to playlist
    const addRes = await fetch(
      `https://api.spotify.com/v1/playlists/${tripPlaylist.spotify_playlist_id}/tracks`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: [track_uri] }),
      }
    );

    if (!addRes.ok) {
      const errText = await addRes.text();
      return new Response(JSON.stringify({ error: `Failed to add track: ${errText}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Notify all trip collaborators except the person who added
    try {
      const { createNotification } = await import("../create-notification/index.ts");
      const { data: tripData } = await supabase.from("trips").select("destination, user_id").eq("id", trip_id).single();
      const { data: collabs } = await supabase.from("trip_collaborators").select("user_id").eq("trip_id", trip_id).eq("status", "accepted").not("user_id", "is", null);
      const { data: adderProfile } = await supabase.from("profiles").select("name").eq("user_id", userId).single();

      const allMembers = [
        ...(tripData?.user_id ? [{ user_id: tripData.user_id }] : []),
        ...(collabs || []),
      ].filter((m) => m.user_id && m.user_id !== userId);

      for (const member of allMembers) {
        await createNotification({
          user_id: member.user_id!,
          trip_id,
          type: "track_added",
          title: `${adderProfile?.name || "Someone"} added a track to your ${tripData?.destination || ""} playlist`,
          action_url: `/trip/${trip_id}?tab=playlist`,
        });
      }
    } catch (notifErr) {
      console.error("add-to-playlist notification error:", notifErr instanceof Error ? notifErr.message : String(notifErr));
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
