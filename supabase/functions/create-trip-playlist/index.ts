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
    const { trip_id, playlist_name } = body as { trip_id: string; playlist_name?: string };

    if (!trip_id) {
      return new Response(JSON.stringify({ error: "Missing trip_id" }), {
        status: 400,
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
      return new Response(JSON.stringify({ error: "Connect Spotify first" }), {
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

    // Get trip destination for default playlist name
    let finalPlaylistName = playlist_name;
    if (!finalPlaylistName) {
      const { data: trip } = await supabase
        .from("trips")
        .select("destination")
        .eq("id", trip_id)
        .maybeSingle();
      finalPlaylistName = trip?.destination ?? "Trip Playlist";
    }

    // Create Spotify playlist
    const createRes = await fetch(
      `https://api.spotify.com/v1/users/${conn.spotify_user_id}/playlists`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: finalPlaylistName,
          collaborative: true,
          public: false,
          description: "Planned with Concierge Styled",
        }),
      }
    );

    if (!createRes.ok) {
      const errText = await createRes.text();
      return new Response(JSON.stringify({ error: `Failed to create playlist: ${errText}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const playlist = await createRes.json();
    const embed_url = `https://open.spotify.com/embed/playlist/${playlist.id}`;

    // Insert into trip_playlists
    const { error: insertError } = await supabase.from("trip_playlists").insert({
      trip_id,
      spotify_playlist_id: playlist.id,
      spotify_playlist_url: playlist.external_urls.spotify,
      embed_url,
      playlist_name: finalPlaylistName,
      created_by: userId,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        playlist_id: playlist.id,
        playlist_url: playlist.external_urls.spotify,
        embed_url,
        playlist_name: finalPlaylistName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
