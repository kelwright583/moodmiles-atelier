/// <reference path="../deno.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { requireAuth, getServiceClient } from "../_shared/auth.ts";

const HANDLE_REGEX = /^[a-z0-9_]{3,20}$/;

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;
  const corsHeaders = getCorsHeaders(req);

  try {
    // ── Require authentication ─────────────────────────────────
    const { userId } = await requireAuth(req);
    const supabase = getServiceClient();

    const body = await req.json();
    const display_name: string | null = body.display_name?.trim() || null;
    const handle: string | null = body.handle?.toLowerCase().trim() || null;
    const avatar_url: string | null = body.avatar_url || null;
    const home_city: string | null = body.home_city?.trim() || null;
    const style_vibe: string | null = body.style_vibe || null;

    // ── Validate display_name ──────────────────────────────────
    if (!display_name || display_name.length < 2) {
      return new Response(
        JSON.stringify({ success: false, error: "Display name must be at least 2 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Validate handle if provided ────────────────────────────
    if (handle) {
      if (!HANDLE_REGEX.test(handle)) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid handle format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Check uniqueness
      const { data: existing } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("handle", handle)
        .neq("user_id", userId)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ success: false, error: "Handle already taken" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── Validate style_vibe ────────────────────────────────────
    const validVibes = ["classic", "minimalist", "bohemian", "streetwear", "resort", "eclectic", "preppy", "avant-garde"];
    if (style_vibe && !validVibes.includes(style_vibe)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid style vibe" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Build update payload ───────────────────────────────────
    const updatePayload: Record<string, unknown> = {
      name: display_name,
      onboarding_completed: true,
    };

    if (handle) {
      updatePayload.handle = handle;
      updatePayload.handle_set = true;
    }
    if (avatar_url) updatePayload.avatar_url = avatar_url;
    if (home_city) updatePayload.home_city = home_city;
    if (style_vibe) updatePayload.style_vibe = style_vibe;

    // ── Update profile ─────────────────────────────────────────
    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, profile: updated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
