import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth, getServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId } = await requireAuth(req);

    const body = await req.json();
    const { code, redirect_uri } = body as { code: string; redirect_uri: string };

    if (!code || !redirect_uri) {
      return new Response(JSON.stringify({ error: "Missing code or redirect_uri" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
    const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      return new Response(JSON.stringify({ error: "Spotify credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Exchange code for tokens
    const tokenParams = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(clientId + ":" + clientSecret)}`,
      },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return new Response(JSON.stringify({ error: `Token exchange failed: ${errText}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokenData as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };

    // Get Spotify user profile
    const profileRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      const errText = await profileRes.text();
      return new Response(JSON.stringify({ error: `Failed to get Spotify profile: ${errText}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const spotifyProfile = await profileRes.json();
    const expires_at = new Date(Date.now() + expires_in * 1000).toISOString();

    const supabase = getServiceClient();

    const { error: upsertError } = await supabase
      .from("spotify_connections")
      .upsert(
        {
          user_id: userId,
          access_token,
          refresh_token,
          expires_at,
          spotify_user_id: spotifyProfile.id,
          spotify_display_name: spotifyProfile.display_name ?? null,
          spotify_avatar_url: spotifyProfile.images?.[0]?.url ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        spotify_display_name: spotifyProfile.display_name ?? null,
        spotify_avatar_url: spotifyProfile.images?.[0]?.url ?? null,
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
