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
    const { query, trip_id } = body as { query: string; trip_id?: string };

    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
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

    // Search tracks
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!searchRes.ok) {
      const errText = await searchRes.text();
      return new Response(JSON.stringify({ error: `Search failed: ${errText}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const searchData = await searchRes.json();
    const tracks = (searchData.tracks?.items ?? []).map((track: any) => ({
      track_name: track.name,
      artist_name: track.artists?.[0]?.name ?? "",
      album_name: track.album?.name ?? "",
      album_art_url: track.album?.images?.[0]?.url ?? null,
      track_uri: track.uri,
      duration_ms: track.duration_ms,
      preview_url: track.preview_url ?? null,
    }));

    // Suppress unused variable warning
    void trip_id;

    return new Response(JSON.stringify(tracks), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
