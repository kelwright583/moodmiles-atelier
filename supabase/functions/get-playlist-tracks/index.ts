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
    const { trip_id } = body as { trip_id: string };

    if (!trip_id) {
      return new Response(JSON.stringify({ error: "Missing trip_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get trip playlist record
    const { data: tripPlaylist } = await supabase
      .from("trip_playlists")
      .select("*")
      .eq("trip_id", trip_id)
      .maybeSingle();

    if (!tripPlaylist) {
      return new Response(
        JSON.stringify({ tracks: [], playlist: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const playlistInfo = {
      name: tripPlaylist.playlist_name,
      url: tripPlaylist.spotify_playlist_url,
      embed_url: tripPlaylist.embed_url,
    };

    // Get Spotify connection for user
    const { data: conn } = await supabase
      .from("spotify_connections")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!conn) {
      return new Response(
        JSON.stringify({ tracks: [], playlist: playlistInfo, message: "Connect Spotify to view tracks" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

    // Refresh token if expired
    let accessToken = conn.access_token;
    if (new Date(conn.expires_at) < new Date()) {
      try {
        accessToken = await refreshSpotifyToken(supabase, userId, conn.refresh_token, clientId, clientSecret);
      } catch (err) {
        return new Response(
          JSON.stringify({
            tracks: [],
            playlist: playlistInfo,
            message: err instanceof Error ? err.message : String(err),
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch playlist tracks from Spotify
    const tracksRes = await fetch(
      `https://api.spotify.com/v1/playlists/${tripPlaylist.spotify_playlist_id}/tracks?limit=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!tracksRes.ok) {
      const errText = await tracksRes.text();
      return new Response(
        JSON.stringify({ tracks: [], playlist: playlistInfo, message: `Failed to fetch tracks: ${errText}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tracksData = await tracksRes.json();
    const items = tracksData.items ?? [];

    // Collect unique spotify_user_ids from added_by
    const spotifyUserIds: string[] = [];
    for (const item of items) {
      if (item.added_by?.id && !spotifyUserIds.includes(item.added_by.id)) {
        spotifyUserIds.push(item.added_by.id);
      }
    }

    // Get trip members' spotify connections for name resolution
    const { data: tripOwnerRow } = await supabase
      .from("trips")
      .select("user_id")
      .eq("id", trip_id)
      .maybeSingle();

    const { data: collabs } = await supabase
      .from("trip_collaborators")
      .select("user_id")
      .eq("trip_id", trip_id)
      .eq("status", "accepted");

    const memberUserIds = [
      ...(tripOwnerRow ? [tripOwnerRow.user_id] : []),
      ...(collabs ?? []).map((c: { user_id: string }) => c.user_id),
    ];

    let spotifyIdToName: Record<string, string> = {};
    if (memberUserIds.length > 0 && spotifyUserIds.length > 0) {
      const { data: memberConns } = await supabase
        .from("spotify_connections")
        .select("spotify_user_id, spotify_display_name")
        .in("user_id", memberUserIds);

      if (memberConns) {
        for (const mc of memberConns as Array<{ spotify_user_id: string; spotify_display_name: string | null }>) {
          if (mc.spotify_user_id && mc.spotify_display_name) {
            spotifyIdToName[mc.spotify_user_id] = mc.spotify_display_name;
          }
        }
      }
    }

    const tracks = items
      .filter((item: any) => item.track && item.track.id)
      .map((item: any) => ({
        track_name: item.track.name,
        artist_name: item.track.artists?.[0]?.name ?? "",
        album_name: item.track.album?.name ?? "",
        album_art_url: item.track.album?.images?.[0]?.url ?? null,
        track_uri: item.track.uri,
        duration_ms: item.track.duration_ms,
        preview_url: item.track.preview_url ?? null,
        added_by_spotify_id: item.added_by?.id ?? null,
        added_by_name: item.added_by?.id ? (spotifyIdToName[item.added_by.id] ?? null) : null,
      }));

    return new Response(
      JSON.stringify({ tracks, playlist: playlistInfo }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
