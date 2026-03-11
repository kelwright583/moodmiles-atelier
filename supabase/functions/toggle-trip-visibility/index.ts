import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth, getServiceClient, AuthError } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  const corsHeaders = getCorsHeaders(req);

  try {
    const { userId } = await requireAuth(req);

    const body = await req.json();
    const { trip_id, is_public } = body as { trip_id: string; is_public: boolean };

    if (!trip_id || typeof is_public !== "boolean") {
      return new Response(JSON.stringify({ error: "trip_id and is_public are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const db = getServiceClient();

    // Verify caller owns the trip
    const { data: existing, error: fetchError } = await db
      .from("trips")
      .select("id, share_token")
      .eq("id", trip_id)
      .eq("user_id", userId)
      .single();

    if (fetchError || !existing) {
      return new Response(JSON.stringify({ error: "Trip not found or access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update visibility
    const { data: updated, error: updateError } = await db
      .from("trips")
      .update({ is_public })
      .eq("id", trip_id)
      .select("is_public, share_token")
      .single();

    if (updateError || !updated) {
      const msg = updateError instanceof Error ? updateError.message : String(updateError);
      return new Response(JSON.stringify({ error: msg || "Failed to update trip" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const siteUrl = Deno.env.get("SITE_URL") || "https://concierge-styled.com";
    const shareUrl = `${siteUrl}/trip/share/${updated.share_token}`;

    return new Response(
      JSON.stringify({
        share_token: updated.share_token,
        is_public: updated.is_public,
        share_url: shareUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
